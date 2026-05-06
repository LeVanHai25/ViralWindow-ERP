const db = require("../config/db");

/**
 * Lấy danh sách dự án đang ở giai đoạn sản xuất với thông tin sản phẩm và vật tư
 */
exports.getProductionProjects = async (req, res) => {
    try {
        // Lấy các dự án có production_order HOẶC đã đến giai đoạn sản xuất
        // Logic này phải khớp với logic đếm trong dashboard
        const [projects] = await db.query(`
            SELECT DISTINCT
                p.id,
                p.project_code,
                p.project_name,
                p.status,
                p.progress_percent,
                p.start_date,
                p.deadline,
                c.full_name AS customer_name,
                c.phone AS customer_phone
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN production_orders po ON po.project_id = p.id
            WHERE p.status NOT IN ('cancelled', 'closed')
            AND (
                -- Có production_order và status không phải completed/cancelled/closed
                (po.id IS NOT NULL AND (po.status IS NULL OR po.status = '' OR po.status NOT IN ('completed', 'cancelled', 'closed')))
                OR
                -- Hoặc dự án đã đến giai đoạn sản xuất
                p.status IN ('in_production', 'cutting', 'welding', 'gluing', 'accessories', 'finishing', 'packaging')
                OR
                (p.status = 'designing' AND p.progress_percent >= 40)
            )
            ORDER BY p.created_at DESC
        `);

        // Lấy thông tin chi tiết cho từng dự án
        const projectsWithDetails = await Promise.all(
            projects.map(async (project) => {
                // Lấy quotation_id của dự án
                const [quotationRows] = await db.query(`
                    SELECT id FROM quotations 
                    WHERE project_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 1
                `, [project.id]);

                let products = [];

                // Ưu tiên lấy từ quotation_items (danh sách sản phẩm trong báo giá)
                if (quotationRows.length > 0) {
                    const quotationId = quotationRows[0].id;

                    const [quotationItems] = await db.query(`
                        SELECT 
                            qi.id,
                            qi.code,
                            qi.item_name,
                            qi.spec,
                            qi.glass,
                            qi.accessories,
                            qi.width,
                            qi.height,
                            qi.area,
                            qi.quantity,
                            qi.unit,
                            qi.unit_price,
                            qi.total_price,
                            qi.item_type
                        FROM quotation_items qi
                        WHERE qi.quotation_id = ?
                        ORDER BY qi.id
                    `, [quotationId]);

                    // Tách sản phẩm có quantity > 1 thành nhiều item riêng
                    for (const item of quotationItems) {
                        const qty = parseInt(item.quantity) || 1;
                        const baseCode = item.code || `SP-${item.id}`;
                        const productName = item.item_name || item.spec || `Sản phẩm`;

                        for (let i = 1; i <= qty; i++) {
                            const productCode = qty > 1 ? `${baseCode}_C${String(i).padStart(3, '0')}` : baseCode;

                            products.push({
                                id: `${item.id}_${i}`, // Unique ID cho mỗi item
                                original_id: item.id, // ID gốc từ quotation_items
                                design_code: productCode,
                                door_type: item.item_type || 'material',
                                template_name: productName,
                                template_code: item.code || null,
                                width_mm: parseFloat(item.width) || 0,
                                height_mm: parseFloat(item.height) || 0,
                                number_of_panels: 1,
                                quantity: 1, // Mỗi item là 1 sản phẩm riêng
                                spec: item.spec || null,
                                glass: item.glass || null,
                                accessories: item.accessories || null,
                                aluminum_system_name: item.accessories || null,
                                aluminum_system_code: null,
                                item_index: i,
                                total_in_group: qty
                            });
                        }
                    }
                }

                // Nếu không có từ quotation_items, thử lấy từ door_designs
                if (products.length === 0) {
                    const [doors] = await db.query(`
                        SELECT 
                            dd.id,
                            dd.design_code,
                            dd.door_type,
                            dd.width_mm,
                            dd.height_mm,
                            dd.number_of_panels,
                            dt.name AS template_name,
                            dt.code AS template_code,
                            a.name AS aluminum_system_name,
                            a.code AS aluminum_system_code
                        FROM door_designs dd
                        LEFT JOIN door_templates dt ON dd.template_id = dt.id
                        LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
                        WHERE dd.project_id = ?
                        ORDER BY dd.design_code
                    `, [project.id]);

                    products = doors;
                }

                // Lấy tiến độ hoàn thiện cho từng sản phẩm
                const doorsWithProgress = await Promise.all(
                    products.map(async (door) => {
                        // Tìm hoặc tạo door_design_id
                        let designId = door.id;
                        let isFromQuotationItem = false;

                        // Kiểm tra xem có phải là door_designs.id không
                        const [doorDesignRows] = await db.query(`
                            SELECT id FROM door_designs WHERE id = ? AND project_id = ?
                        `, [door.id, project.id]);

                        if (doorDesignRows.length === 0) {
                            // Có thể là quotation_item với composite ID
                            isFromQuotationItem = true;

                            // Try to find by design_code (more reliable for composite IDs)
                            const [designRows] = await db.query(`
                                SELECT id FROM door_designs 
                                WHERE project_id = ? 
                                AND design_code = ?
                                LIMIT 1
                            `, [project.id, door.design_code]);

                            if (designRows.length > 0) {
                                designId = designRows[0].id;
                            } else {
                                // Will be created when user marks as complete
                                designId = null;
                            }
                        }

                        // Lấy production order của dự án
                        const [orderRows] = await db.query(`
                            SELECT id FROM production_orders 
                            WHERE project_id = ? 
                            ORDER BY created_at DESC 
                            LIMIT 1
                        `, [project.id]);

                        let progressPercent = 0;
                        let isCompleted = false;

                        // NEW LOGIC: Read from production_progress to match updateProductCompletion
                        // Only check if we have a valid designId
                        if (designId && orderRows.length > 0) {
                            const orderId = orderRows[0].id;

                            // Query production_progress for this product
                            const [progressRows] = await db.query(`
                                SELECT stage, status 
                                FROM production_progress 
                                WHERE order_id = ? AND design_id = ?
                            `, [orderId, designId]);

                            // Check if 'completed' stage exists and is completed
                            const completedStage = progressRows.find(row => row.stage === 'completed' && row.status === 'completed');
                            isCompleted = !!completedStage;

                            // Calculate progress based on number of completed stages
                            // Stages: cutting, welding, accessories, gluing, finishing, packaging, completed (7 total)
                            const totalStages = 7;
                            const completedStages = progressRows.filter(row => row.status === 'completed').length;
                            progressPercent = Math.round((completedStages / totalStages) * 100);
                        }

                        // Lấy vật tư đã sử dụng cho sản phẩm này (từ BOM)
                        let bomItems = [];
                        if (designId) {
                            const [bomRows] = await db.query(`
                                SELECT 
                                    bi.id as bom_id,
                                    bi.item_type,
                                    bi.item_code,
                                    bi.item_name,
                                    bi.quantity,
                                    bi.unit,
                                    bi.length_mm,
                                    bi.weight_kg,
                                    bi.area_m2
                                FROM bom_items bi
                                WHERE bi.design_id = ?
                                ORDER BY bi.item_type, bi.item_name
                            `, [designId]);
                            bomItems = bomRows;
                        }

                        // Phân loại vật tư
                        const materials = {
                            aluminum: bomItems.filter(item =>
                                item.item_type === 'frame' ||
                                item.item_type === 'mullion' ||
                                item.item_type === 'aluminum'
                            ),
                            glass: bomItems.filter(item => item.item_type === 'glass'),
                            accessories: bomItems.filter(item => item.item_type === 'accessory'),
                            other: bomItems.filter(item =>
                                item.item_type !== 'frame' &&
                                item.item_type !== 'mullion' &&
                                item.item_type !== 'aluminum' &&
                                item.item_type !== 'glass' &&
                                item.item_type !== 'accessory'
                            )
                        };

                        return {
                            ...door,
                            progress_percent: Math.round(progressPercent),
                            is_completed: isCompleted,
                            materials: materials,
                            total_materials: bomItems.length,
                            design_id: designId, // Lưu design_id để dùng khi thêm vật tư
                            is_from_quotation_item: isFromQuotationItem
                        };
                    })
                );

                // Lấy vật tư đã xuất của dự án
                const [exportedMaterials] = await db.query(`
                    SELECT 
                        pm.material_type,
                        pm.material_id,
                        pm.material_name,
                        pm.quantity,
                        pm.unit,
                        pm.unit_price,
                        pm.total_cost,
                        pm.notes,
                        pm.created_at
                    FROM project_materials pm
                    WHERE pm.project_id = ?
                    ORDER BY pm.material_type, pm.material_name
                `, [project.id]);

                // Phân loại vật tư đã xuất
                const exportedMaterialsByType = {
                    aluminum: exportedMaterials.filter(item =>
                        item.material_type === 'aluminum'
                    ),
                    glass: exportedMaterials.filter(item => item.material_type === 'glass'),
                    accessories: exportedMaterials.filter(item => item.material_type === 'accessory'),
                    other: exportedMaterials.filter(item =>
                        item.material_type === 'other'
                    )
                };

                // Tính tổng tiến độ của dự án (trung bình của tất cả sản phẩm)
                const totalProgress = doorsWithProgress.length > 0
                    ? Math.round(doorsWithProgress.reduce((sum, door) => sum + door.progress_percent, 0) / doorsWithProgress.length)
                    : 0;

                // Kiểm tra xem tất cả sản phẩm đã hoàn thành chưa
                const allProductsCompleted = doorsWithProgress.length > 0 &&
                    doorsWithProgress.every(door => door.is_completed);

                return {
                    ...project,
                    products: doorsWithProgress,
                    exported_materials: exportedMaterials,
                    exported_materials_by_type: exportedMaterialsByType,
                    total_products: doorsWithProgress.length,
                    completed_products: doorsWithProgress.filter(d => d.is_completed).length,
                    total_progress: totalProgress,
                    all_products_completed: allProductsCompleted,
                    total_exported_materials: exportedMaterials.length
                };
            })
        );

        res.json({
            success: true,
            data: projectsWithDetails
        });
    } catch (err) {
        console.error('Error getting production projects:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Cập nhật trạng thái hoàn thành của sản phẩm
 */
exports.updateProductCompletion = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { projectId, productId } = req.params;
        const { is_completed } = req.body;

        // Tìm hoặc tạo door_design_id từ productId
        let designId = productId;
        let productCode = null; // To construct design_code

        // Kiểm tra xem productId có phải là door_designs.id không
        const [doorDesignRows] = await connection.query(`
            SELECT id FROM door_designs WHERE id = ? AND project_id = ?
        `, [productId, projectId]);

        if (doorDesignRows.length === 0) {
            // ProductId không phải door_design.id trực tiếp
            // Có thể là quotation_item hoặc composite ID như "525_1"

            // Extract original ID nếu composite (e.g., "525_1" -> 525)
            let originalId = productId;
            let itemIndex = 1;
            if (String(productId).includes('_')) {
                const parts = String(productId).split('_');
                originalId = parts[0];
                itemIndex = parseInt(parts[1]) || 1;
            }

            const [quotationRows] = await connection.query(`
                SELECT q.id as quotation_id 
                FROM quotations q 
                WHERE q.project_id = ?
                ORDER BY q.created_at DESC 
                LIMIT 1
            `, [projectId]);

            if (quotationRows.length > 0) {
                const quotationId = quotationRows[0].quotation_id;

                // Lấy thông tin quotation_item using original ID
                const [itemRows] = await connection.query(`
                    SELECT * FROM quotation_items 
                    WHERE id = ? AND quotation_id = ?
                `, [originalId, quotationId]);

                if (itemRows.length > 0) {
                    const item = itemRows[0];
                    const qty = parseInt(item.quantity) || 1;

                    // Construct design_code matching what getProductionProjects creates
                    const baseCode = item.code || `SP-${item.id}`;
                    if (qty > 1) {
                        productCode = `${baseCode}_C${String(itemIndex).padStart(3, '0')}`;
                    } else {
                        productCode = baseCode;
                    }

                    // Try to find existing door_design by design_code
                    const [existingDesignRows] = await connection.query(`
                        SELECT id FROM door_designs 
                        WHERE project_id = ? AND design_code = ?
                        LIMIT 1
                    `, [projectId, productCode]);

                    if (existingDesignRows.length > 0) {
                        designId = existingDesignRows[0].id;
                    } else {
                        // Tạo door_design mới từ quotation_item with proper design_code
                        // Tìm aluminum_system_id phù hợp từ thông tin quotation_item
                        let aluminumSystemId = 1; // Giá trị mặc định

                        // Thử tìm từ spec hoặc accessories (có thể chứa tên hệ nhôm)
                        const specInfo = item.spec || item.accessories || '';
                        if (specInfo) {
                            const [aluminumRows] = await connection.query(`
                                SELECT id FROM aluminum_systems 
                                WHERE name LIKE ? OR code LIKE ?
                                LIMIT 1
                            `, [`%${specInfo}%`, `%${specInfo}%`]);

                            if (aluminumRows.length > 0) {
                                aluminumSystemId = aluminumRows[0].id;
                            }
                        }

                        // Nếu không tìm được, lấy aluminum_system đầu tiên có sẵn
                        if (!aluminumSystemId || aluminumSystemId === 1) {
                            const [defaultAluminum] = await connection.query(`
                                SELECT id FROM aluminum_systems ORDER BY id LIMIT 1
                            `);
                            if (defaultAluminum.length > 0) {
                                aluminumSystemId = defaultAluminum[0].id;
                            }
                        }

                        const [result] = await connection.query(`
                            INSERT INTO door_designs
                            (project_id, design_code, door_type, width_mm, height_mm, number_of_panels, aluminum_system_id)
                            VALUES (?, ?, ?, ?, ?, 1, ?)
                        `, [
                            projectId,
                            productCode, // Use the constructed code that matches frontend
                            item.item_type || 'material',
                            parseFloat(item.width) || 0,
                            parseFloat(item.height) || 0,
                            aluminumSystemId
                        ]);

                        designId = result.insertId;
                        console.log(`✅ Created door_design ${designId} with code ${productCode}`);
                    }
                } else {
                    await connection.rollback();
                    connection.release();
                    return res.status(404).json({
                        success: false,
                        message: "Không tìm thấy sản phẩm"
                    });
                }
            } else {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy báo giá cho dự án này"
                });
            }
        }

        // Lấy production order của dự án, nếu chưa có thì tự động tạo
        let [orderRows] = await connection.query(`
            SELECT id FROM production_orders 
            WHERE project_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [projectId]);

        let orderId;
        if (orderRows.length === 0) {
            // Tự động tạo production order nếu chưa có
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

            // Lấy quotation_id nếu có
            const [quotationRows] = await connection.query(`
                SELECT id FROM quotations 
                WHERE project_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [projectId]);
            const quotationId = quotationRows.length > 0 ? quotationRows[0].id : null;

            const [orderResult] = await connection.query(`
                INSERT INTO production_orders 
                (order_code, project_id, quotation_id, order_date, status, priority, notes) 
                VALUES (?, ?, ?, ?, 'pending', 'normal', ?)
            `, [
                order_code,
                projectId,
                quotationId,
                new Date().toISOString().split('T')[0],
                `Tự động tạo khi đánh dấu hoàn thành sản phẩm`
            ]);

            orderId = orderResult.insertId;
            console.log(`✅ Đã tự động tạo production order ${order_code} (ID: ${orderId}) cho dự án ${projectId}`);
        } else {
            orderId = orderRows[0].id;
        }

        if (is_completed) {
            // Đánh dấu tất cả các giai đoạn là completed
            const stages = ['cutting', 'welding', 'accessories', 'gluing', 'finishing', 'packaging', 'completed'];

            for (const stage of stages) {
                // Kiểm tra xem đã có progress chưa
                const [existingRows] = await connection.query(`
                    SELECT * FROM production_progress
                    WHERE order_id = ? AND design_id = ? AND stage = ?
                `, [orderId, designId, stage]);

                if (existingRows.length > 0) {
                    // Cập nhật
                    await connection.query(`
                        UPDATE production_progress
                        SET status = 'completed',
                            completed_at = NOW(),
                            updated_at = NOW()
                        WHERE order_id = ? AND design_id = ? AND stage = ?
                    `, [orderId, designId, stage]);
                } else {
                    // Tạo mới
                    await connection.query(`
                        INSERT INTO production_progress
                        (order_id, design_id, stage, status, started_at, completed_at)
                        VALUES (?, ?, ?, 'completed', NOW(), NOW())
                    `, [orderId, designId, stage]);
                }
            }
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: "Cập nhật trạng thái sản phẩm thành công"
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error updating product completion:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Chuyển dự án sang giai đoạn tiếp theo (chỉ khi tất cả sản phẩm đã hoàn thành)
 */
exports.moveToNextStage = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { projectId } = req.params;

        // Lấy thông tin dự án
        const [projectRows] = await connection.query(`
            SELECT * FROM projects WHERE id = ?
        `, [projectId]);

        if (projectRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dự án"
            });
        }

        const project = projectRows[0];

        if (project.status !== 'in_production') {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Dự án không ở giai đoạn sản xuất"
            });
        }

        // Lấy production order, nếu chưa có thì tự động tạo
        let [orderRows] = await connection.query(`
            SELECT id FROM production_orders 
            WHERE project_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [projectId]);

        let orderId;
        if (orderRows.length === 0) {
            // Tự động tạo production order nếu chưa có
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

            // Lấy quotation_id nếu có
            const [quotRows] = await connection.query(`
                SELECT id FROM quotations 
                WHERE project_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [projectId]);
            const quotationId = quotRows.length > 0 ? quotRows[0].id : null;

            const [orderResult] = await connection.query(`
                INSERT INTO production_orders 
                (order_code, project_id, quotation_id, order_date, status, priority, notes) 
                VALUES (?, ?, ?, ?, 'pending', 'normal', ?)
            `, [
                order_code,
                projectId,
                quotationId,
                new Date().toISOString().split('T')[0],
                `Tự động tạo khi chuyển giai đoạn sản xuất`
            ]);

            orderId = orderResult.insertId;
            console.log(`✅ Đã tự động tạo production order ${order_code} (ID: ${orderId}) cho dự án ${projectId}`);
        } else {
            orderId = orderRows[0].id;
        }

        // Lấy tất cả sản phẩm của dự án - ưu tiên từ quotation_items
        let productDesignIds = [];

        // Thử lấy từ quotation_items trước
        const [quotationRows] = await connection.query(`
            SELECT id FROM quotations 
            WHERE project_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [projectId]);

        if (quotationRows.length > 0) {
            const quotationId = quotationRows[0].id;
            const [quotationItems] = await connection.query(`
                SELECT id, code FROM quotation_items WHERE quotation_id = ?
            `, [quotationId]);

            // Tìm door_designs tương ứng hoặc tạo mới
            for (const item of quotationItems) {
                const [designRows] = await connection.query(`
                    SELECT id FROM door_designs 
                    WHERE project_id = ? AND design_code = ?
                    LIMIT 1
                `, [projectId, item.code || `SP-${item.id}`]);

                if (designRows.length > 0) {
                    productDesignIds.push(designRows[0].id);
                } else {
                    // Tạo door_design nếu chưa có
                    let aluminumSystemId = null;
                    const [defaultAluminum] = await connection.query(`
                        SELECT id FROM aluminum_systems ORDER BY id LIMIT 1
                    `);
                    if (defaultAluminum.length > 0) {
                        aluminumSystemId = defaultAluminum[0].id;
                    }

                    const [result] = await connection.query(`
                        INSERT INTO door_designs
                        (project_id, design_code, door_type, width_mm, height_mm, number_of_panels, aluminum_system_id)
                        VALUES (?, ?, ?, 0, 0, 1, ?)
                    `, [projectId, item.code || `SP-${item.id}`, 'material', aluminumSystemId]);

                    productDesignIds.push(result.insertId);
                }
            }
        }

        // Nếu không có từ quotation_items, lấy từ door_designs
        if (productDesignIds.length === 0) {
            const [doors] = await connection.query(`
                SELECT id FROM door_designs WHERE project_id = ?
            `, [projectId]);
            productDesignIds = doors.map(d => d.id);
        }

        if (productDesignIds.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Dự án chưa có sản phẩm nào"
            });
        }

        // Kiểm tra xem tất cả sản phẩm đã hoàn thành chưa
        let allCompleted = true;
        for (const designId of productDesignIds) {
            const [progressRows] = await connection.query(`
                SELECT * FROM production_progress
                WHERE order_id = ? AND design_id = ? AND stage = 'completed' AND status = 'completed'
            `, [orderId, designId]);

            if (progressRows.length === 0) {
                allCompleted = false;
                break;
            }
        }

        if (!allCompleted) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Không thể chuyển quy trình. Vui lòng hoàn thành tất cả sản phẩm trước."
            });
        }

        // Chuyển sang giai đoạn Lắp đặt
        await connection.query(`
            UPDATE projects
            SET status = 'installation',
                progress_percent = 85
            WHERE id = ?
        `, [projectId]);

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: "Đã chuyển dự án sang giai đoạn Lắp đặt"
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error moving to next stage:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Lấy danh sách vật tư theo loại
 */
exports.getMaterialsByType = async (req, res) => {
    try {
        const { type } = req.params;
        let materials = [];

        if (type === 'aluminum' || type === 'frame') {
            // Lấy từ bảng aluminum_inventory
            const [rows] = await db.query(`
                SELECT 
                    id,
                    code,
                    name,
                    'cây' as unit,
                    length_standard,
                    stock_quantity,
                    'inventory' as source
                FROM aluminum_inventory
                WHERE stock_quantity > 0
                ORDER BY code
            `);
            materials = rows;
        } else if (type === 'glass') {
            // Lấy từ bảng glass_inventory
            const [rows] = await db.query(`
                SELECT 
                    id,
                    code,
                    name,
                    'tấm' as unit,
                    stock_quantity,
                    'inventory' as source
                FROM glass_inventory
                WHERE stock_quantity > 0
                ORDER BY code
            `);
            materials = rows;
        } else if (type === 'accessory') {
            // Lấy từ bảng accessories
            const [rows] = await db.query(`
                SELECT 
                    id,
                    code,
                    name,
                    unit,
                    stock_quantity,
                    'inventory' as source
                FROM accessories
                WHERE stock_quantity > 0
                ORDER BY code
            `);
            materials = rows;
        } else if (type === 'other') {
            // Lấy từ bảng other_inventory
            const [rows] = await db.query(`
                SELECT 
                    id,
                    code,
                    name,
                    unit,
                    stock_quantity,
                    'inventory' as source
                FROM other_inventory
                WHERE stock_quantity > 0
                ORDER BY code
            `);
            materials = rows;
        }

        res.json({
            success: true,
            data: materials
        });
    } catch (err) {
        console.error('Error getting materials by type:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Thêm vật tư vào BOM cho sản phẩm
 */
exports.addMaterialToProduct = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { projectId, productId } = req.params;
        const { item_type, item_code, item_name, quantity, unit, material_id, source } = req.body;

        // Tìm hoặc tạo door_design_id
        let designId = productId;

        // Kiểm tra xem productId có phải là door_designs.id không
        const [doorDesignRows] = await connection.query(`
            SELECT id FROM door_designs WHERE id = ? AND project_id = ?
        `, [productId, projectId]);

        if (doorDesignRows.length === 0) {
            // Có thể là quotation_item, tìm hoặc tạo door_design tương ứng
            const [quotationRows] = await connection.query(`
                SELECT q.id as quotation_id 
                FROM quotations q 
                WHERE q.project_id = ?
                ORDER BY q.created_at DESC 
                LIMIT 1
            `, [projectId]);

            if (quotationRows.length > 0) {
                const quotationId = quotationRows[0].quotation_id;

                const [itemRows] = await connection.query(`
                    SELECT * FROM quotation_items WHERE id = ? AND quotation_id = ?
                `, [productId, quotationId]);

                if (itemRows.length > 0) {
                    const item = itemRows[0];

                    // Tìm door_design theo design_code
                    const [existingDesignRows] = await connection.query(`
                        SELECT id FROM door_designs 
                        WHERE project_id = ? AND design_code = ?
                        LIMIT 1
                    `, [projectId, item.code || `SP-${item.id}`]);

                    if (existingDesignRows.length > 0) {
                        designId = existingDesignRows[0].id;
                    } else {
                        // Tạo door_design mới từ quotation_item
                        // Tìm aluminum_system_id phù hợp từ thông tin quotation_item
                        let aluminumSystemId = 1; // Giá trị mặc định

                        // Thử tìm từ spec hoặc accessories (có thể chứa tên hệ nhôm)
                        const specInfo = item.spec || item.accessories || '';
                        if (specInfo) {
                            const [aluminumRows] = await connection.query(`
                                SELECT id FROM aluminum_systems 
                                WHERE name LIKE ? OR code LIKE ?
                                LIMIT 1
                            `, [`%${specInfo}%`, `%${specInfo}%`]);

                            if (aluminumRows.length > 0) {
                                aluminumSystemId = aluminumRows[0].id;
                            }
                        }

                        // Nếu không tìm được, lấy aluminum_system đầu tiên có sẵn
                        if (!aluminumSystemId || aluminumSystemId === 1) {
                            const [defaultAluminum] = await connection.query(`
                                SELECT id FROM aluminum_systems ORDER BY id LIMIT 1
                            `);
                            if (defaultAluminum.length > 0) {
                                aluminumSystemId = defaultAluminum[0].id;
                            }
                        }

                        const [result] = await connection.query(`
                            INSERT INTO door_designs
                            (project_id, design_code, door_type, width_mm, height_mm, number_of_panels, aluminum_system_id)
                            VALUES (?, ?, ?, ?, ?, 1, ?)
                        `, [
                            projectId,
                            item.code || `SP-${item.id}`,
                            item.item_type || 'material',
                            parseFloat(item.width) || 0,
                            parseFloat(item.height) || 0,
                            aluminumSystemId
                        ]);

                        designId = result.insertId;
                    }
                }
            }
        }

        // Thêm vào bảng bom_items
        await connection.query(`
            INSERT INTO bom_items
            (design_id, item_type, item_code, item_name, quantity, unit)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [designId, item_type, item_code, item_name, quantity, unit]);

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: "Đã thêm vật tư vào BOM"
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error adding material to product:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Xóa vật tư khỏi BOM
 */
exports.removeMaterialFromProduct = async (req, res) => {
    try {
        const { bomItemId } = req.params;

        await db.query(`
            DELETE FROM bom_items WHERE id = ?
        `, [bomItemId]);

        res.json({
            success: true,
            message: "Đã xóa vật tư khỏi BOM"
        });
    } catch (err) {
        console.error('Error removing material from product:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Lấy chi tiết sản phẩm với danh sách vật tư và trạng thái xuất kho
 * Kiểm tra chéo với vật tư đã xuất để xác định % hoàn thành
 */
exports.getProductDetail = async (req, res) => {
    try {
        const { projectId, productId } = req.params;

        // 1. Lấy thông tin sản phẩm (ưu tiên từ quotation_items)
        const [quotationRows] = await db.query(`
            SELECT id FROM quotations 
            WHERE project_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [projectId]);

        let product = null;
        let designId = null;
        let isFromQuotationItem = false;

        if (quotationRows.length > 0) {
            const quotationId = quotationRows[0].id;

            // Thử lấy từ quotation_items
            const [itemRows] = await db.query(`
                SELECT 
                    qi.id,
                    qi.code,
                    qi.item_name,
                    qi.spec,
                    qi.glass,
                    qi.accessories,
                    qi.width,
                    qi.height,
                    qi.area,
                    qi.quantity,
                    qi.unit,
                    qi.item_type
                FROM quotation_items qi
                WHERE qi.id = ? AND qi.quotation_id = ?
            `, [productId, quotationId]);

            if (itemRows.length > 0) {
                const item = itemRows[0];
                isFromQuotationItem = true;
                product = {
                    id: item.id,
                    design_code: item.code || `SP-${item.id}`,
                    template_name: item.item_name || item.spec || 'Sản phẩm',
                    width_mm: parseFloat(item.width) || 0,
                    height_mm: parseFloat(item.height) || 0,
                    quantity: parseFloat(item.quantity) || 1,
                    spec: item.spec,
                    glass: item.glass,
                    accessories: item.accessories,
                    item_type: item.item_type
                };

                // Tìm door_design tương ứng
                const [designRows] = await db.query(`
                    SELECT id FROM door_designs 
                    WHERE project_id = ? AND design_code = ?
                    LIMIT 1
                `, [projectId, product.design_code]);

                if (designRows.length > 0) {
                    designId = designRows[0].id;
                }
            }
        }

        // Nếu không tìm được từ quotation_items, thử từ door_designs
        if (!product) {
            const [doorRows] = await db.query(`
                SELECT 
                    dd.id,
                    dd.design_code,
                    dd.door_type,
                    dd.width_mm,
                    dd.height_mm,
                    dd.number_of_panels,
                    dt.name AS template_name,
                    dt.code AS template_code,
                    a.name AS aluminum_system_name
                FROM door_designs dd
                LEFT JOIN door_templates dt ON dd.template_id = dt.id
                LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
                WHERE dd.id = ? AND dd.project_id = ?
            `, [productId, projectId]);

            if (doorRows.length > 0) {
                product = doorRows[0];
                designId = product.id;
            }
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm"
            });
        }

        // 2. Lấy danh sách vật tư đã gán cho sản phẩm này (từ product_materials)
        const [productMaterials] = await db.query(`
            SELECT 
                pm.id,
                pm.material_type as item_type,
                pm.material_code as item_code,
                pm.material_name as item_name,
                pm.required_qty,
                pm.exported_qty,
                pm.unit,
                pm.is_completed,
                pm.notes
            FROM product_materials pm
            WHERE pm.project_id = ? AND pm.product_id = ?
            ORDER BY pm.material_type, pm.material_name
        `, [projectId, productId]);

        // 3. Lấy vật tư đã xuất cho dự án này (để cross-check)
        const [exportedMaterials] = await db.query(`
            SELECT 
                pjm.material_type,
                pjm.material_id,
                pjm.material_name,
                pjm.item_name,
                SUM(pjm.quantity) as total_exported,
                pjm.unit
            FROM project_materials pjm
            WHERE pjm.project_id = ?
            GROUP BY pjm.material_type, pjm.material_name, pjm.item_name, pjm.unit
        `, [projectId]);

        // 4. Cross-check: Kiểm tra từng vật tư đã gán xem đã xuất chưa
        const materialsWithStatus = productMaterials.map(pm => {
            // Tìm vật tư đã xuất tương ứng
            const exported = exportedMaterials.find(exp => {
                const expName = (exp.material_name || exp.item_name || '').toLowerCase();
                const pmName = (pm.item_name || '').toLowerCase();
                return expName && pmName && (expName.includes(pmName) || pmName.includes(expName));
            });

            const exportedFromProject = exported ? parseFloat(exported.total_exported) || 0 : 0;
            const requiredQty = parseFloat(pm.required_qty) || 0;

            return {
                ...pm,
                actual_exported: exportedFromProject,
                // is_completed từ DB (user đánh dấu thủ công)
                is_completed: pm.is_completed || false
            };
        });

        // 5. Không cần fallback vì user tự thêm vật tư

        // 6. Tính % hoàn thành vật tư dựa trên is_completed (user đánh dấu)
        const totalMaterials = materialsWithStatus.length;
        const completedMaterials = materialsWithStatus.filter(m => m.is_completed).length;
        const completionPercent = totalMaterials > 0
            ? Math.round((completedMaterials / totalMaterials) * 100)
            : 0;

        // 7. Phân loại vật tư theo loại
        const materialsByType = {
            aluminum: materialsWithStatus.filter(m =>
                m.item_type === 'frame' || m.item_type === 'mullion' || m.item_type === 'aluminum'
            ),
            glass: materialsWithStatus.filter(m => m.item_type === 'glass'),
            accessories: materialsWithStatus.filter(m => m.item_type === 'accessory'),
            other: materialsWithStatus.filter(m =>
                m.item_type !== 'frame' && m.item_type !== 'mullion' &&
                m.item_type !== 'aluminum' && m.item_type !== 'glass' &&
                m.item_type !== 'accessory'
            )
        };

        // 8. Kiểm tra trạng thái hoàn thành (từ production_progress)
        let isCompleted = false;
        if (designId) {
            const [orderRows] = await db.query(`
                SELECT id FROM production_orders 
                WHERE project_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [projectId]);

            if (orderRows.length > 0) {
                const orderId = orderRows[0].id;
                const [progressRows] = await db.query(`
                    SELECT * FROM production_progress
                    WHERE order_id = ? AND design_id = ? AND stage = 'completed' AND status = 'completed'
                `, [orderId, designId]);
                isCompleted = progressRows.length > 0;
            }
        }

        res.json({
            success: true,
            data: {
                product: {
                    ...product,
                    design_id: designId,
                    is_from_quotation_item: isFromQuotationItem
                },
                materials: materialsWithStatus,
                materials_by_type: materialsByType,
                summary: {
                    total_materials: totalMaterials,
                    completed_materials: completedMaterials,
                    completion_percent: completionPercent,
                    can_mark_complete: completionPercent === 100 || totalMaterials === 0,
                    is_completed: isCompleted
                }
            }
        });
    } catch (err) {
        console.error('Error getting product detail:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Lấy danh sách vật tư ĐÃ XUẤT KHO cho dự án để chọn thêm vào sản phẩm
 * Tính số lượng còn lại = đã xuất - đã gán cho các sản phẩm
 */
exports.getAvailableMaterials = async (req, res) => {
    try {
        const { projectId } = req.params;
        console.log('getAvailableMaterials (with remaining qty) for project:', projectId);

        // 1. Lấy vật tư đã xuất từ project_materials (GROUP BY để tính tổng)
        const [exportedMaterials] = await db.query(`
            SELECT 
                pm.material_type as item_type,
                pm.material_id as item_code,
                pm.material_name as item_name,
                pm.unit,
                SUM(pm.quantity) as exported_qty
            FROM project_materials pm
            WHERE pm.project_id = ?
            GROUP BY pm.material_type, pm.material_name, pm.material_id, pm.unit
            ORDER BY pm.material_type, pm.material_name
        `, [projectId]);

        console.log('Exported materials found:', exportedMaterials.length);

        // 2. Lấy số lượng đã gán cho các sản phẩm (từ product_materials)
        const [assignedMaterials] = await db.query(`
            SELECT 
                pm.material_name as item_name,
                SUM(pm.required_qty) as assigned_qty
            FROM product_materials pm
            WHERE pm.project_id = ?
            GROUP BY pm.material_name
        `, [projectId]);

        console.log('Assigned materials found:', assignedMaterials.length);

        // Tạo map để tra cứu nhanh (normalize tên để so khớp chính xác)
        const assignedMap = {};
        assignedMaterials.forEach(a => {
            const normalizedName = (a.item_name || '').trim().toLowerCase();
            assignedMap[normalizedName] = (assignedMap[normalizedName] || 0) + (parseFloat(a.assigned_qty) || 0);
        });

        console.log('Assigned map:', assignedMap);

        // 3. Tính số lượng còn lại cho mỗi vật tư
        const allMaterials = exportedMaterials.map(m => {
            const exportedQty = parseFloat(m.exported_qty) || 0;
            const normalizedName = (m.item_name || '').trim().toLowerCase();
            const assignedQty = assignedMap[normalizedName] || 0;
            const remainingQty = Math.max(0, exportedQty - assignedQty);

            console.log(`Material "${m.item_name}": exported=${exportedQty}, assigned=${assignedQty}, remaining=${remainingQty}`);

            return {
                item_type: m.item_type || 'other',
                item_code: m.item_code || '',
                item_name: (m.item_name || '').trim(), // Trim whitespace
                unit: m.unit || 'cái',
                exported_qty: exportedQty,      // Tổng đã xuất
                assigned_qty: assignedQty,       // Đã gán cho sản phẩm
                remaining_qty: remainingQty,     // Còn lại có thể chọn
                source: 'exported'
            };
        });

        // Nhóm theo loại
        const materialsByType = {
            aluminum: allMaterials.filter(m =>
                m.item_type === 'nhom' || m.item_type === 'aluminum' || m.item_type === 'Hệ nhôm'
            ).map(m => ({ ...m, material_type: 'aluminum' })),
            glass: allMaterials.filter(m =>
                m.item_type === 'kinh' || m.item_type === 'glass' || m.item_type === 'Kính'
            ).map(m => ({ ...m, material_type: 'glass' })),
            accessory: allMaterials.filter(m =>
                m.item_type === 'phukien' || m.item_type === 'accessory' || m.item_type === 'Phụ kiện'
            ).map(m => ({ ...m, material_type: 'accessory' })),
            other: allMaterials.filter(m =>
                m.item_type !== 'nhom' && m.item_type !== 'aluminum' && m.item_type !== 'Hệ nhôm' &&
                m.item_type !== 'kinh' && m.item_type !== 'glass' && m.item_type !== 'Kính' &&
                m.item_type !== 'phukien' && m.item_type !== 'accessory' && m.item_type !== 'Phụ kiện'
            ).map(m => ({ ...m, material_type: 'other' }))
        };

        res.json({
            success: true,
            data: {
                all: allMaterials,
                by_type: materialsByType
            }
        });
    } catch (err) {
        console.error('Error getting available materials:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Thêm vật tư vào sản phẩm (lưu vào product_materials)
 */
exports.addProductMaterial = async (req, res) => {
    try {
        const { projectId, productId } = req.params;
        const { material_type, material_name, material_code, required_qty, unit, notes } = req.body;

        if (!material_name || !required_qty) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập tên vật tư và số lượng"
            });
        }

        // Kiểm tra xem vật tư này đã tồn tại cho sản phẩm chưa
        const [existing] = await db.query(`
            SELECT id FROM product_materials 
            WHERE project_id = ? AND product_id = ? AND material_name = ?
        `, [projectId, productId, material_name]);

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Vật tư này đã được thêm. Vui lòng cập nhật số lượng."
            });
        }

        // Thêm vật tư mới
        const [result] = await db.query(`
            INSERT INTO product_materials 
            (project_id, product_id, material_type, material_name, material_code, required_qty, unit, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [projectId, productId, material_type || 'other', material_name, material_code || '', required_qty, unit || 'cái', notes || '']);

        res.json({
            success: true,
            message: "Đã thêm vật tư vào sản phẩm",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error adding product material:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Cập nhật vật tư của sản phẩm
 */
exports.updateProductMaterial = async (req, res) => {
    try {
        const { materialId } = req.params;
        const { required_qty, exported_qty, is_completed, notes } = req.body;

        const updates = [];
        const values = [];

        if (required_qty !== undefined) {
            updates.push('required_qty = ?');
            values.push(required_qty);
        }
        if (exported_qty !== undefined) {
            updates.push('exported_qty = ?');
            values.push(exported_qty);
        }
        if (is_completed !== undefined) {
            updates.push('is_completed = ?');
            values.push(is_completed);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có dữ liệu để cập nhật"
            });
        }

        values.push(materialId);

        await db.query(`
            UPDATE product_materials 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, values);

        res.json({
            success: true,
            message: "Đã cập nhật vật tư"
        });
    } catch (err) {
        console.error('Error updating product material:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * Xóa vật tư khỏi sản phẩm
 */
exports.removeProductMaterial = async (req, res) => {
    try {
        const { materialId } = req.params;

        await db.query(`
            DELETE FROM product_materials WHERE id = ?
        `, [materialId]);

        res.json({
            success: true,
            message: "Đã xóa vật tư khỏi sản phẩm"
        });
    } catch (err) {
        console.error('Error removing product material:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};
