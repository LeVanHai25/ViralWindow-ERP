const db = require("../config/db");

/**
 * Approve quotation and trigger workflow
 * - Create production order
 * - Create receivable debt
 * - Create commission for sales
 * - Update project status
 */
exports.approveQuotation = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { id } = req.params;
        const { createProductionOrder = true, createDebt = true, createCommission = true, assignedEmployeeId = null } = req.body;

        // Get quotation details
        const [quotationRows] = await connection.query(`
            SELECT 
                q.*,
                q.project_id,
                q.customer_id,
                c.full_name AS customer_name
            FROM quotations q
            LEFT JOIN projects p ON q.project_id = p.id
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = ?
        `, [id]);

        if (quotationRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy báo giá"
            });
        }

        const quotation = quotationRows[0];

        // Update quotation status
        await connection.query(
            "UPDATE quotations SET status = 'approved' WHERE id = ?",
            [id]
        );

        const results = {
            quotation_updated: true,
            production_order: null,
            debt: null,
            commission: null,
            project_updated: false
        };

        // 1. Create production order if requested
        if (createProductionOrder && quotation.project_id) {
            const year = new Date().getFullYear();
            const prefix = `SX-${year}-`;
            const [maxRows] = await connection.query(
                `SELECT MAX(CAST(SUBSTRING_INDEX(order_code, '-', -1) AS UNSIGNED)) as max_num 
                 FROM production_orders 
                 WHERE order_code LIKE ?`,
                [`${prefix}%`]
            );
            const maxNum = (maxRows[0]?.max_num || 0) + 1;
            const order_code = `${prefix}${String(maxNum).padStart(4, '0')}`;

            const [orderResult] = await connection.query(`
                INSERT INTO production_orders 
                (order_code, project_id, quotation_id, order_date, status, priority, notes) 
                VALUES (?, ?, ?, ?, 'pending', 'normal', ?)
            `, [
                order_code,
                quotation.project_id,
                id,
                new Date().toISOString().split('T')[0],
                `Tự động tạo từ báo giá ${quotation.quotation_code}`
            ]);

            results.production_order = {
                id: orderResult.insertId,
                order_code: order_code
            };
        }

        // 2. Create receivable debt if requested
        if (createDebt && quotation.customer_id) {
            const [debtResult] = await connection.query(`
                INSERT INTO debts
                (debt_type, customer_id, project_id, quotation_id, total_amount,
                 paid_amount, remaining_amount, status, notes)
                VALUES ('receivable', ?, ?, ?, ?, 0, ?, 'pending', ?)
            `, [
                quotation.customer_id,
                quotation.project_id || null,
                id,
                quotation.total_amount,
                quotation.total_amount,
                `Công nợ từ báo giá ${quotation.quotation_code}`
            ]);

            results.debt = {
                id: debtResult.insertId
            };
        }

        // 3. Create commission if requested and employee assigned
        if (createCommission && assignedEmployeeId) {
            // Default commission rate: 2% of total amount
            const commissionRate = 2.0;
            const commissionAmount = (quotation.total_amount * commissionRate) / 100;

            const [commResult] = await connection.query(`
                INSERT INTO commissions
                (employee_id, quotation_id, project_id, commission_type, base_amount,
                 commission_rate, commission_amount, commission_month, status, notes)
                VALUES (?, ?, ?, 'sales', ?, ?, ?, ?, 'pending', ?)
            `, [
                assignedEmployeeId,
                id,
                quotation.project_id || null,
                quotation.total_amount,
                commissionRate,
                commissionAmount,
                new Date().toISOString().substring(0, 7) + '-01',
                `Hoa hồng từ báo giá ${quotation.quotation_code}`
            ]);

            results.commission = {
                id: commResult.insertId,
                amount: commissionAmount
            };
        }

        // 4. Tự động tạo door_designs từ quotation_items
        // Để bước 2 (Danh sách Hạng mục Thiết kế) có dữ liệu ngay khi chuyển sang Thiết kế
        if (quotation.project_id) {
            try {
                // Lấy các items từ báo giá
                const [quotationItems] = await connection.query(
                    `SELECT * FROM quotation_items WHERE quotation_id = ?`,
                    [quotation.id]
                );

                // Đếm số door_designs hiện có
                const [existingDesigns] = await connection.query(
                    `SELECT COUNT(*) as count FROM door_designs WHERE project_id = ?`,
                    [quotation.project_id]
                );

                const existingCount = parseInt(existingDesigns[0]?.count || 0);
                let createdCount = 0;

                for (let i = 0; i < quotationItems.length; i++) {
                    const item = quotationItems[i];

                    // Parse kích thước từ item_name (ví dụ: "Cửa đi 1 cánh mở ngoài (1200×2200mm)")
                    const sizeMatch = item.item_name.match(/\((\d+)[×x](\d+)mm?\)/i);
                    let width = 1200, height = 2200;
                    if (sizeMatch) {
                        width = parseInt(sizeMatch[1]) || 1200;
                        height = parseInt(sizeMatch[2]) || 2200;
                    }

                    // Xác định loại cửa từ tên
                    let doorType = 'swing';
                    const itemNameLower = item.item_name.toLowerCase();
                    if (itemNameLower.includes('trượt') || itemNameLower.includes('lùa')) {
                        doorType = 'sliding';
                    } else if (itemNameLower.includes('fix') || itemNameLower.includes('cố định')) {
                        doorType = 'fixed';
                    } else if (itemNameLower.includes('xếp')) {
                        doorType = 'folding';
                    }

                    // Xác định template_code từ tên
                    let templateCode = 'door_swing';
                    if (itemNameLower.includes('sổ') || itemNameLower.includes('cửa sổ')) {
                        templateCode = itemNameLower.includes('lùa') ? 'window_sliding' : 'window_swing';
                    } else if (itemNameLower.includes('lùa') || itemNameLower.includes('trượt')) {
                        templateCode = 'door_sliding';
                    } else if (itemNameLower.includes('vách') || itemNameLower.includes('kính')) {
                        templateCode = 'glass_wall';
                    } else if (itemNameLower.includes('cầu thang') || itemNameLower.includes('tay vịn')) {
                        templateCode = 'railing';
                    }

                    // Tạo số lượng door_designs theo quantity trong báo giá
                    const quantity = parseInt(item.quantity) || 1;
                    for (let q = 0; q < quantity; q++) {
                        const designIndex = existingCount + createdCount + 1;

                        // Lấy project_code
                        const [projectRows] = await connection.query(
                            `SELECT project_code FROM projects WHERE id = ?`,
                            [quotation.project_id]
                        );
                        const projectCode = projectRows[0]?.project_code || `CT2025-${quotation.project_id}`;

                        const designCode = `${projectCode}-C${String(designIndex).padStart(3, '0')}`;

                        await connection.query(`
                            INSERT INTO door_designs 
                            (project_id, design_code, door_type, aluminum_system_id, 
                             width_mm, height_mm, number_of_panels, template_code)
                            VALUES (?, ?, ?, 1, ?, ?, 1, ?)
                        `, [
                            quotation.project_id,
                            designCode,
                            doorType,
                            width,
                            height,
                            templateCode
                        ]);

                        createdCount++;
                    }
                }

                console.log(`✅ Đã tạo ${createdCount} door_designs từ báo giá cho project ${quotation.project_id}`);
                results.door_designs_created = createdCount;

            } catch (designErr) {
                console.error('Lỗi khi tạo door_designs:', designErr);
                // Không throw để không làm gián đoạn workflow
                results.door_designs_error = designErr.message;
            }
        }

        // 5. Update project status - Chuyển sang 'designing' (Thiết kế) thay vì 'in_production'
        // Workflow: Báo giá → Thiết kế → Bóc tách → Sản xuất → Lắp đặt → Bàn giao
        if (quotation.project_id) {
            await connection.query(`
                UPDATE projects 
                SET status = 'designing', 
                    progress_percent = 25,
                    total_value = ?,
                    quote_locked = 1
                WHERE id = ?
            `, [quotation.total_amount, quotation.project_id]);

            results.project_updated = true;
            results.quote_locked = true;
        }

        await connection.commit();

        res.json({
            success: true,
            message: "Duyệt báo giá thành công và đã kích hoạt workflow",
            data: results
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error approving quotation workflow:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi duyệt báo giá: " + err.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Create inventory issue from production order BOM
 */
exports.createInventoryIssueFromOrder = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { orderId } = req.params;

        // Get production order
        const [orderRows] = await connection.query(`
            SELECT * FROM production_orders WHERE id = ?
        `, [orderId]);

        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        const order = orderRows[0];

        // Get all doors in the project
        const [doors] = await connection.query(`
            SELECT id FROM door_designs WHERE project_id = ?
        `, [order.project_id]);

        if (doors.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Dự án không có cửa nào"
            });
        }

        // Get BOM items for all doors
        const doorIds = doors.map(d => d.id);
        const placeholders = doorIds.map(() => '?').join(',');

        const [bomItems] = await connection.query(`
            SELECT 
                bi.*,
                i.item_code,
                i.item_name,
                i.unit,
                i.unit_price
            FROM bom_items bi
            LEFT JOIN inventory i ON bi.item_code = i.item_code
            WHERE bi.design_id IN (${placeholders})
            AND bi.item_type IN ('frame', 'accessory')
        `, doorIds);

        if (bomItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Không có vật tư nào trong BOM"
            });
        }

        // Group by item and sum quantities
        const itemMap = {};
        bomItems.forEach(item => {
            const key = item.item_code || item.item_name;
            if (!itemMap[key]) {
                itemMap[key] = {
                    item_code: item.item_code,
                    item_name: item.item_name || item.item_code,
                    item_type: item.item_type === 'frame' ? 'aluminum' : 'accessory',
                    quantity: 0,
                    unit: item.unit || 'm',
                    unit_price: item.unit_price || 0
                };
            }
            itemMap[key].quantity += parseFloat(item.quantity) || 0;
        });

        // Create inventory out records
        const year = new Date().getFullYear();
        const today = new Date().toISOString().split('T')[0];
        const issueRecords = [];

        for (const [key, item] of Object.entries(itemMap)) {
            const [countRows] = await connection.query(
                "SELECT COUNT(*) as count FROM inventory_out WHERE YEAR(issue_date) = ?",
                [year]
            );
            const count = countRows[0].count + issueRecords.length + 1;
            const issue_code = `XK-${year}-${String(count).padStart(4, '0')}`;

            await connection.query(`
                INSERT INTO inventory_out
                (issue_code, issue_date, item_type, item_code, item_name, quantity, unit,
                 project_id, production_order_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                issue_code,
                today,
                item.item_type,
                item.item_code || key,
                item.item_name,
                item.quantity,
                item.unit,
                order.project_id,
                orderId,
                `Xuất kho cho lệnh SX ${order.order_code}`
            ]);

            // Update inventory quantity
            if (item.item_code) {
                await connection.query(`
                    UPDATE inventory 
                    SET quantity = quantity - ?
                    WHERE item_code = ?
                `, [item.quantity, item.item_code]);
            }

            issueRecords.push({
                issue_code,
                item_name: item.item_name,
                quantity: item.quantity,
                unit: item.unit
            });
        }

        await connection.commit();

        res.json({
            success: true,
            message: `Tạo ${issueRecords.length} phiếu xuất kho thành công`,
            data: {
                order_id: orderId,
                order_code: order.order_code,
                issues: issueRecords
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error creating inventory issue:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo phiếu xuất kho: " + err.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Complete production order and update project
 */
exports.completeProductionOrder = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { orderId } = req.params;

        // Get production order
        const [orderRows] = await connection.query(`
            SELECT * FROM production_orders WHERE id = ?
        `, [orderId]);

        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        const order = orderRows[0];

        // Update order status
        await connection.query(
            "UPDATE production_orders SET status = 'completed' WHERE id = ?",
            [orderId]
        );

        // Check if all orders in project are completed
        const [projectOrders] = await connection.query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM production_orders
            WHERE project_id = ?
        `, [order.project_id]);

        // Update project status and progress
        if (projectOrders[0].total === projectOrders[0].completed) {
            // All orders completed
            await connection.query(`
                UPDATE projects 
                SET status = 'completed', 
                    progress_percent = 100
                WHERE id = ?
            `, [order.project_id]);
        } else {
            // Some orders still in progress
            const progressPercent = Math.min(90, (projectOrders[0].completed / projectOrders[0].total) * 100);
            await connection.query(`
                UPDATE projects 
                SET progress_percent = ?
                WHERE id = ?
            `, [progressPercent, order.project_id]);
        }

        await connection.commit();

        res.json({
            success: true,
            message: "Hoàn thành lệnh sản xuất thành công",
            data: {
                order_id: orderId,
                project_id: order.project_id,
                all_orders_completed: projectOrders[0].total === projectOrders[0].completed
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error completing production order:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi hoàn thành lệnh sản xuất: " + err.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Get workflow status for a project
 */
exports.getProjectWorkflow = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Get project info
        const [projectRows] = await db.query(`
            SELECT * FROM projects WHERE id = ?
        `, [projectId]);

        if (projectRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dự án"
            });
        }

        const project = projectRows[0];

        // Get quotations
        const [quotations] = await db.query(`
            SELECT id, quotation_code, status, total_amount, created_at
            FROM quotations
            WHERE project_id = ?
            ORDER BY created_at DESC
        `, [projectId]);

        // Get production orders
        const [orders] = await db.query(`
            SELECT id, order_code, status, created_at
            FROM production_orders
            WHERE project_id = ?
            ORDER BY created_at DESC
        `, [projectId]);

        // Get debts
        const [debts] = await db.query(`
            SELECT id, debt_type, total_amount, paid_amount, remaining_amount, status
            FROM debts
            WHERE project_id = ?
        `, [projectId]);

        // Get BOM status
        const [bomStatus] = await db.query(`
            SELECT COUNT(DISTINCT design_id) as doors_with_bom
            FROM bom_items
            WHERE design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
        `, [projectId]);

        // Get inventory issues
        const [inventoryIssues] = await db.query(`
            SELECT COUNT(*) as total_issues
            FROM inventory_out
            WHERE project_id = ?
        `, [projectId]);

        res.json({
            success: true,
            data: {
                project: project,
                workflow: {
                    quotations: quotations,
                    production_orders: orders,
                    debts: debts,
                    bom_status: {
                        doors_with_bom: bomStatus[0].doors_with_bom || 0
                    },
                    inventory_issues: inventoryIssues[0].total_issues || 0
                }
            }
        });
    } catch (err) {
        console.error('Error getting project workflow:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Get workflow dashboard
 */
exports.getWorkflowDashboard = async (req, res) => {
    try {
        // Pending quotations
        const [pendingQuotations] = await db.query(`
            SELECT COUNT(*) as count
            FROM quotations
            WHERE status IN ('pending', 'sent')
        `);

        // Approved quotations without production orders
        const [approvedWithoutOrder] = await db.query(`
            SELECT COUNT(*) as count
            FROM quotations q
            LEFT JOIN production_orders po ON q.id = po.quotation_id
            WHERE q.status = 'approved' AND po.id IS NULL
        `);

        // Production orders pending inventory
        const [ordersPendingInventory] = await db.query(`
            SELECT COUNT(DISTINCT po.id) as count
            FROM production_orders po
            LEFT JOIN inventory_out io ON po.id = io.production_order_id
            WHERE po.status != 'completed' AND io.id IS NULL
        `);

        // Overdue debts
        const today = new Date().toISOString().split('T')[0];
        const [overdueDebts] = await db.query(`
            SELECT COUNT(*) as count
            FROM debts
            WHERE due_date < ? AND status != 'paid'
        `, [today]);

        // Projects in progress
        const [projectsInProgress] = await db.query(`
            SELECT COUNT(*) as count
            FROM projects
            WHERE status = 'in_production'
        `);

        res.json({
            success: true,
            data: {
                pending_quotations: pendingQuotations[0].count || 0,
                approved_without_order: approvedWithoutOrder[0].count || 0,
                orders_pending_inventory: ordersPendingInventory[0].count || 0,
                overdue_debts: overdueDebts[0].count || 0,
                projects_in_progress: projectsInProgress[0].count || 0
            }
        });
    } catch (err) {
        console.error('Error getting workflow dashboard:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};




























