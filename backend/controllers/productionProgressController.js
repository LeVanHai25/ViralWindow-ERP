const db = require("../config/db");

/**
 * Lấy tiến độ sản xuất của một lệnh sản xuất
 */
exports.getProgress = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Lấy thông tin lệnh sản xuất
        const [orderRows] = await db.query(`
            SELECT 
                po.*,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name
            FROM production_orders po
            LEFT JOIN projects p ON po.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE po.id = ?
        `, [orderId]);

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        const order = orderRows[0];

        // Lấy danh sách cửa trong dự án
        const [doors] = await db.query(`
            SELECT 
                dd.*,
                dt.code AS template_code,
                dt.name AS template_name
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            WHERE dd.project_id = ?
            ORDER BY dd.created_at ASC
        `, [order.project_id]);

        // Lấy tiến độ cho từng cửa
        const doorsWithProgress = await Promise.all(doors.map(async (door) => {
            const [progressRows] = await db.query(`
                SELECT * FROM production_progress
                WHERE order_id = ? AND design_id = ?
                ORDER BY stage, updated_at DESC
            `, [orderId, door.id]);

            // Tạo các stage mặc định nếu chưa có - theo quy trình sản xuất chuẩn
            const stages = ['cutting', 'welding', 'accessories', 'gluing', 'finishing', 'packaging', 'completed'];
            const progressMap = {};
            
            progressRows.forEach(prog => {
                progressMap[prog.stage] = prog;
            });

            const doorProgress = stages.map(stage => {
                if (progressMap[stage]) {
                    return progressMap[stage];
                }
                return {
                    id: null,
                    order_id: parseInt(orderId),
                    design_id: door.id,
                    stage: stage,
                    status: 'pending',
                    started_at: null,
                    completed_at: null,
                    notes: null,
                    updated_at: null
                };
            });

            // Tính phần trăm hoàn thành
            const completedStages = doorProgress.filter(p => p.status === 'completed').length;
            const progressPercent = (completedStages / stages.length) * 100;

            return {
                ...door,
                progress: doorProgress,
                progress_percent: progressPercent
            };
        }));

        // Tính tổng tiến độ
        const totalProgress = doorsWithProgress.length > 0
            ? doorsWithProgress.reduce((sum, door) => sum + door.progress_percent, 0) / doorsWithProgress.length
            : 0;

        res.json({
            success: true,
            data: {
                order: order,
                doors: doorsWithProgress,
                total_progress_percent: totalProgress
            }
        });
    } catch (err) {
        console.error('Error getting production progress:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Cập nhật tiến độ một công đoạn
 */
exports.updateProgress = async (req, res) => {
    try {
        const { orderId, designId, stage } = req.params;
        const { status, notes } = req.body;

        if (!['pending', 'in_progress', 'completed', 'on_hold'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Trạng thái không hợp lệ"
            });
        }

        // Kiểm tra xem đã có progress record chưa
        const [existingRows] = await db.query(`
            SELECT * FROM production_progress
            WHERE order_id = ? AND design_id = ? AND stage = ?
        `, [orderId, designId, stage]);

        let result;
        if (existingRows.length > 0) {
            // Update existing
            const updateFields = ['status = ?'];
            const params = [status];

            if (status === 'in_progress' && !existingRows[0].started_at) {
                updateFields.push('started_at = NOW()');
            }

            if (status === 'completed') {
                updateFields.push('completed_at = NOW()');
                if (!existingRows[0].started_at) {
                    updateFields.push('started_at = NOW()');
                }
            }

            if (notes !== undefined) {
                updateFields.push('notes = ?');
                params.push(notes || null);
            }

            params.push(orderId, designId, stage);

            [result] = await db.query(`
                UPDATE production_progress
                SET ${updateFields.join(', ')}
                WHERE order_id = ? AND design_id = ? AND stage = ?
            `, params);
        } else {
            // Create new
            const startedAt = status === 'in_progress' || status === 'completed' ? new Date() : null;
            const completedAt = status === 'completed' ? new Date() : null;

            [result] = await db.query(`
                INSERT INTO production_progress
                (order_id, design_id, stage, status, started_at, completed_at, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [orderId, designId, stage, status, startedAt, completedAt, notes || null]);
        }

        // Cập nhật trạng thái tổng thể của lệnh sản xuất
        await updateOrderStatus(orderId);

        res.json({
            success: true,
            message: "Cập nhật tiến độ thành công"
        });
    } catch (err) {
        console.error('Error updating progress:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Cập nhật tiến độ nhiều công đoạn cùng lúc (batch update)
 */
exports.batchUpdateProgress = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { updates } = req.body; // Array of {design_id, stage, status, notes}

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu cập nhật không hợp lệ"
            });
        }

        for (const update of updates) {
            const { design_id, stage, status, notes } = update;

            if (!['pending', 'in_progress', 'completed', 'on_hold'].includes(status)) {
                continue;
            }

            // Kiểm tra xem đã có progress record chưa
            const [existingRows] = await db.query(`
                SELECT * FROM production_progress
                WHERE order_id = ? AND design_id = ? AND stage = ?
            `, [orderId, design_id, stage]);

            if (existingRows.length > 0) {
                const updateFields = ['status = ?'];
                const params = [status];

                if (status === 'in_progress' && !existingRows[0].started_at) {
                    updateFields.push('started_at = NOW()');
                }

                if (status === 'completed') {
                    updateFields.push('completed_at = NOW()');
                    if (!existingRows[0].started_at) {
                        updateFields.push('started_at = NOW()');
                    }
                }

                if (notes !== undefined) {
                    updateFields.push('notes = ?');
                    params.push(notes || null);
                }

                params.push(orderId, design_id, stage);

                await db.query(`
                    UPDATE production_progress
                    SET ${updateFields.join(', ')}
                    WHERE order_id = ? AND design_id = ? AND stage = ?
                `, params);
            } else {
                const startedAt = status === 'in_progress' || status === 'completed' ? new Date() : null;
                const completedAt = status === 'completed' ? new Date() : null;

                await db.query(`
                    INSERT INTO production_progress
                    (order_id, design_id, stage, status, started_at, completed_at, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [orderId, design_id, stage, status, startedAt, completedAt, notes || null]);
            }
        }

        // Cập nhật trạng thái tổng thể của lệnh sản xuất
        await updateOrderStatus(orderId);

        res.json({
            success: true,
            message: "Cập nhật tiến độ thành công"
        });
    } catch (err) {
        console.error('Error batch updating progress:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Lấy thống kê tiến độ
 */
exports.getStatistics = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Lấy tổng số cửa
        const [orderRows] = await db.query(`
            SELECT project_id FROM production_orders WHERE id = ?
        `, [orderId]);

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        const [doorCount] = await db.query(`
            SELECT COUNT(*) as count FROM door_designs WHERE project_id = ?
        `, [orderRows[0].project_id]);

        const totalDoors = doorCount[0].count;

        // Lấy thống kê theo stage
        const [stageStats] = await db.query(`
            SELECT 
                stage,
                status,
                COUNT(*) as count
            FROM production_progress
            WHERE order_id = ?
            GROUP BY stage, status
        `, [orderId]);

        // Tính phần trăm hoàn thành cho từng stage - theo thứ tự quy trình sản xuất
        const stages = ['cutting', 'welding', 'accessories', 'gluing', 'finishing', 'packaging'];
        const stageProgress = {};

        stages.forEach(stage => {
            const stageData = stageStats.filter(s => s.stage === stage);
            const completed = stageData.find(s => s.status === 'completed')?.count || 0;
            const inProgress = stageData.find(s => s.status === 'in_progress')?.count || 0;
            const total = stageData.reduce((sum, s) => sum + s.count, 0);

            stageProgress[stage] = {
                completed: completed,
                in_progress: inProgress,
                pending: total - completed - inProgress,
                total: total,
                percent: total > 0 ? (completed / total) * 100 : 0
            };
        });

        res.json({
            success: true,
            data: {
                total_doors: totalDoors,
                stage_progress: stageProgress
            }
        });
    } catch (err) {
        console.error('Error getting statistics:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Chuyển đổi stage cho toàn bộ order (tất cả cửa)
 */
exports.moveOrderToStage = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { orderId } = req.params;
        const { newStage, completeCurrentStage = true } = req.body;

        // Danh sách các stage hợp lệ theo thứ tự
        const validStages = ['pending', 'cutting', 'welding', 'accessories', 'gluing', 'finishing', 'packaging', 'completed'];
        
        if (!validStages.includes(newStage)) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Stage không hợp lệ"
            });
        }

        // Lấy tất cả cửa trong order
        const [orderRows] = await connection.query(`
            SELECT po.*, p.id as project_id
            FROM production_orders po
            LEFT JOIN projects p ON po.project_id = p.id
            WHERE po.id = ?
        `, [orderId]);

        if (orderRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        const order = orderRows[0];
        
        // Lấy tất cả cửa trong dự án
        const [doors] = await connection.query(`
            SELECT id FROM door_designs WHERE project_id = ?
        `, [order.project_id]);

        if (doors.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Dự án chưa có cửa nào"
            });
        }

        // Xác định stage hiện tại và stage cần hoàn thành
        const currentStageIndex = validStages.indexOf(newStage);
        const previousStage = currentStageIndex > 0 ? validStages[currentStageIndex - 1] : null;

        // Cập nhật progress cho tất cả cửa
        for (const door of doors) {
            // Hoàn thành stage trước đó nếu cần
            if (completeCurrentStage && previousStage && previousStage !== 'pending') {
                await connection.query(`
                    INSERT INTO production_progress 
                    (order_id, design_id, stage, status, started_at, completed_at, updated_at)
                    VALUES (?, ?, ?, 'completed', NOW(), NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    status = 'completed',
                    completed_at = NOW(),
                    updated_at = NOW()
                `, [orderId, door.id, previousStage]);
            }

            // Cập nhật hoặc tạo progress cho stage mới
            if (newStage === 'completed') {
                // Hoàn thành tất cả các stage
                for (const stage of validStages.slice(1, -1)) { // Bỏ pending và completed
                    await connection.query(`
                        INSERT INTO production_progress 
                        (order_id, design_id, stage, status, started_at, completed_at, updated_at)
                        VALUES (?, ?, ?, 'completed', NOW(), NOW(), NOW())
                        ON DUPLICATE KEY UPDATE 
                        status = 'completed',
                        completed_at = COALESCE(completed_at, NOW()),
                        updated_at = NOW()
                    `, [orderId, door.id, stage]);
                }
            } else if (newStage !== 'pending') {
                // Bắt đầu stage mới
                await connection.query(`
                    INSERT INTO production_progress 
                    (order_id, design_id, stage, status, started_at, updated_at)
                    VALUES (?, ?, ?, 'in_progress', NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    status = 'in_progress',
                    started_at = COALESCE(started_at, NOW()),
                    updated_at = NOW()
                `, [orderId, door.id, newStage]);
            }
        }

        // Cập nhật trạng thái order
        await connection.query(`
            UPDATE production_orders SET status = ? WHERE id = ?
        `, [newStage, orderId]);

        // Cập nhật trạng thái dự án nếu hoàn thành sản xuất
        if (newStage === 'completed' && order.project_id) {
            // Kiểm tra xem còn lệnh sản xuất nào khác chưa hoàn thành không
            const [otherOrders] = await connection.query(`
                SELECT COUNT(*) as count FROM production_orders 
                WHERE project_id = ? AND id != ? AND status != 'completed'
            `, [order.project_id, orderId]);

            // Nếu tất cả lệnh sản xuất đã hoàn thành, cập nhật dự án
            if (otherOrders[0].count === 0) {
                await connection.query(`
                    UPDATE projects 
                    SET status = 'completed', 
                        progress_percent = 100
                    WHERE id = ?
                `, [order.project_id]);
            } else {
                // Tính progress_percent dựa trên số orders đã hoàn thành
                const [allOrders] = await connection.query(`
                    SELECT COUNT(*) as total,
                           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                    FROM production_orders
                    WHERE project_id = ? AND status != 'cancelled'
                `, [order.project_id]);
                
                const totalOrders = allOrders[0]?.total || 0;
                const completedOrders = allOrders[0]?.completed || 0;
                const progressPercent = totalOrders > 0 
                    ? Math.min(95, Math.round((completedOrders / totalOrders) * 100))
                    : 0;

                // Cập nhật dự án sang "Đang sản xuất" nếu chưa
                await connection.query(`
                    UPDATE projects 
                    SET status = 'in_production',
                        progress_percent = ?
                    WHERE id = ? AND status NOT IN ('completed', 'cancelled')
                `, [progressPercent, order.project_id]);
            }
        } else if (newStage !== 'pending' && newStage !== 'completed' && order.project_id) {
            // Tính progress_percent dựa trên số orders đã hoàn thành
            const [allOrders] = await connection.query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM production_orders
                WHERE project_id = ? AND status != 'cancelled'
            `, [order.project_id]);
            
            const totalOrders = allOrders[0]?.total || 0;
            const completedOrders = allOrders[0]?.completed || 0;
            const progressPercent = totalOrders > 0 
                ? Math.min(95, Math.round((completedOrders / totalOrders) * 100))
                : 0;

            // Cập nhật dự án sang "Đang sản xuất" khi bắt đầu sản xuất
            await connection.query(`
                UPDATE projects 
                SET status = 'in_production',
                    progress_percent = ?
                WHERE id = ? AND status NOT IN ('completed', 'cancelled')
            `, [progressPercent, order.project_id]);
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: `Đã chuyển lệnh sản xuất sang giai đoạn: ${newStage}`
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error moving order to stage:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Helper function: Cập nhật trạng thái tổng thể của lệnh sản xuất
 */
async function updateOrderStatus(orderId) {
    try {
        // Lấy tất cả progress của order
        const [progressRows] = await db.query(`
            SELECT stage, status FROM production_progress
            WHERE order_id = ?
        `, [orderId]);

        if (progressRows.length === 0) {
            return;
        }

        // Xác định trạng thái tổng thể - theo thứ tự quy trình sản xuất
        const stages = ['cutting', 'welding', 'accessories', 'gluing', 'finishing', 'packaging'];
        let currentStage = null;
        let allCompleted = true;

        for (const stage of stages) {
            const stageProgress = progressRows.filter(p => p.stage === stage);
            if (stageProgress.length === 0) {
                allCompleted = false;
                if (!currentStage) {
                    currentStage = 'pending';
                }
                break;
            }

            const hasInProgress = stageProgress.some(p => p.status === 'in_progress');
            const allStageCompleted = stageProgress.every(p => p.status === 'completed');

            if (hasInProgress) {
                currentStage = stage;
                allCompleted = false;
                break;
            } else if (!allStageCompleted) {
                if (!currentStage) {
                    currentStage = stage;
                }
                allCompleted = false;
            }
        }

        // Cập nhật trạng thái order
        const newStatus = allCompleted ? 'completed' : (currentStage || 'pending');
        await db.query(`
            UPDATE production_orders SET status = ? WHERE id = ?
        `, [newStatus, orderId]);

        // Cập nhật trạng thái dự án dựa trên tất cả các orders
        // Lấy project_id từ order
        const [orderInfo] = await db.query(`
            SELECT project_id FROM production_orders WHERE id = ?
        `, [orderId]);

        if (orderInfo.length > 0 && orderInfo[0].project_id) {
            const projectId = orderInfo[0].project_id;

            // Kiểm tra tất cả orders của dự án
            const [allOrders] = await db.query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                       SUM(CASE WHEN status IN ('cutting', 'welding', 'accessories', 'gluing', 'finishing', 'packaging', 'in_progress') THEN 1 ELSE 0 END) as in_production
                FROM production_orders
                WHERE project_id = ? AND status != 'cancelled'
            `, [projectId]);

            const totalOrders = allOrders[0]?.total || 0;
            const completedOrders = allOrders[0]?.completed || 0;
            const inProductionOrders = allOrders[0]?.in_production || 0;

            // Nếu tất cả orders đã hoàn thành, cập nhật dự án thành completed
            if (totalOrders > 0 && completedOrders === totalOrders) {
                await db.query(`
                    UPDATE projects 
                    SET status = 'completed', 
                        progress_percent = 100
                    WHERE id = ?
                `, [projectId]);
            } 
            // Nếu có ít nhất 1 order đang sản xuất, cập nhật dự án thành in_production
            else if (inProductionOrders > 0) {
                // Tính progress_percent dựa trên số orders đã hoàn thành
                const progressPercent = totalOrders > 0 
                    ? Math.min(95, Math.round((completedOrders / totalOrders) * 100))
                    : 0;

                await db.query(`
                    UPDATE projects 
                    SET status = 'in_production',
                        progress_percent = ?
                    WHERE id = ? AND status NOT IN ('completed', 'cancelled')
                `, [progressPercent, projectId]);
            }
        }
    } catch (err) {
        console.error('Error updating order status:', err);
    }
}
































