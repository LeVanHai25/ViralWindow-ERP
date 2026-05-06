const db = require("../config/db");

/**
 * Kiểm tra tồn kho cho các item trong BOM (helper function)
 */
async function checkBOMStockAvailability(bomItems) {
    const warnings = [];
    let hasInsufficientStock = false;

    for (const item of bomItems) {
        const requiredQty = parseFloat(item.required_quantity || item.quantity) || 0;
        if (requiredQty <= 0) continue;

        let availableQty = 0;
        let stockItem = null;
        let itemCode = item.item_code || '';
        let itemName = item.item_name || '';

        // Kiểm tra trong bảng inventory (nhôm, kính, vật tư chung)
        if (item.item_type === 'frame' || item.item_type === 'glass' || item.item_type === 'material' || item.item_type === 'mullion') {
            const [inventoryRows] = await db.query(`
                SELECT id, item_code, item_name, quantity, min_stock_level, unit
                FROM inventory 
                WHERE (item_code = ? OR item_name LIKE ?) 
                AND item_type IN ('aluminum', 'glass', 'material', 'steel')
                LIMIT 1
            `, [itemCode, `%${itemName}%`]);

            if (inventoryRows.length > 0) {
                stockItem = inventoryRows[0];
                availableQty = parseFloat(stockItem.quantity) || 0;
            }
        }
        
        // Kiểm tra trong bảng accessories (phụ kiện)
        if (item.item_type === 'accessory' && itemCode) {
            const [accessoryRows] = await db.query(`
                SELECT id, code, name, stock_quantity, min_stock_level, unit
                FROM accessories 
                WHERE code = ? OR name LIKE ?
                LIMIT 1
            `, [itemCode, `%${itemName}%`]);

            if (accessoryRows.length > 0) {
                stockItem = {
                    id: accessoryRows[0].id,
                    item_code: accessoryRows[0].code,
                    item_name: accessoryRows[0].name,
                    quantity: accessoryRows[0].stock_quantity,
                    min_stock_level: accessoryRows[0].min_stock_level,
                    unit: accessoryRows[0].unit
                };
                availableQty = parseFloat(accessoryRows[0].stock_quantity) || 0;
            }
        }

        // Kiểm tra nếu không tìm thấy hoặc không đủ
        if (!stockItem) {
            warnings.push({
                item_code: itemCode,
                item_name: itemName,
                item_type: item.item_type,
                required_quantity: requiredQty,
                available_quantity: 0,
                unit: item.unit || 'N/A',
                status: 'not_found',
                message: `Không tìm thấy "${itemName}" trong kho`
            });
            hasInsufficientStock = true;
        } else if (availableQty < requiredQty) {
            const shortage = requiredQty - availableQty;
            warnings.push({
                item_code: stockItem.item_code,
                item_name: stockItem.item_name || itemName,
                item_type: item.item_type,
                required_quantity: requiredQty,
                available_quantity: availableQty,
                shortage: shortage,
                unit: item.unit || stockItem.unit || 'N/A',
                status: 'insufficient',
                message: `Không đủ tồn kho: Cần ${requiredQty} ${item.unit || ''}, Có ${availableQty} ${item.unit || ''}, Thiếu ${shortage} ${item.unit || ''}`
            });
            hasInsufficientStock = true;
        } else if (availableQty < (stockItem.min_stock_level || 0) + requiredQty) {
            // Cảnh báo nếu sau khi trừ sẽ dưới mức tối thiểu
            warnings.push({
                item_code: stockItem.item_code,
                item_name: stockItem.item_name || itemName,
                item_type: item.item_type,
                required_quantity: requiredQty,
                available_quantity: availableQty,
                unit: item.unit || stockItem.unit || 'N/A',
                status: 'low_stock_warning',
                message: `Cảnh báo: Sau khi sử dụng sẽ còn ${(availableQty - requiredQty).toFixed(2)} ${item.unit || ''}, dưới mức tối thiểu ${stockItem.min_stock_level || 0} ${item.unit || ''}`
            });
        }
    }

    return {
        warnings,
        hasInsufficientStock,
        total_warnings: warnings.length
    };
}

/**
 * Tạo lệnh sản xuất từ báo giá đã duyệt
 * Bao gồm: danh sách cửa, BOM vật tư, bản vẽ
 */
exports.createFromQuotation = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { quotation_id, order_date, priority, expected_completion_date, assigned_to, notes } = req.body;

        if (!quotation_id) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn báo giá"
            });
        }

        // Lấy thông tin báo giá
        const [quotationRows] = await connection.query(`
            SELECT 
                q.*,
                p.id AS project_id,
                p.project_name,
                p.project_code
            FROM quotations q
            LEFT JOIN projects p ON q.project_id = p.id
            WHERE q.id = ? AND q.status = 'approved'
        `, [quotation_id]);

        if (quotationRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy báo giá đã duyệt"
            });
        }

        const quotation = quotationRows[0];

        if (!quotation.project_id) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Báo giá chưa được gán vào dự án"
            });
        }

        // Tạo mã lệnh sản xuất
        const year = new Date().getFullYear();
        const [countRows] = await connection.query(
            "SELECT COUNT(*) as count FROM production_orders WHERE YEAR(order_date) = ?",
            [year]
        );
        const count = countRows[0].count + 1;
        const order_code = `SX-${year}-${String(count).padStart(4, '0')}`;

        // Tạo lệnh sản xuất
        const [orderResult] = await connection.query(`
            INSERT INTO production_orders 
            (order_code, project_id, quotation_id, order_date, expected_completion_date, 
             priority, status, assigned_to, notes) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [
            order_code,
            quotation.project_id,
            quotation_id,
            order_date || new Date().toISOString().split('T')[0],
            expected_completion_date || null,
            priority || 'normal',
            assigned_to || null,
            notes || `Tạo từ báo giá ${quotation.quotation_code}`
        ]);

        const orderId = orderResult.insertId;

        // Lấy danh sách cửa từ dự án
        const [doors] = await connection.query(`
            SELECT 
                dd.*,
                drw.drawing_data,
                drw.image_data
            FROM door_designs dd
            LEFT JOIN door_drawings drw ON drw.door_design_id = dd.id OR drw.design_id = dd.id
            WHERE dd.project_id = ?
            ORDER BY dd.created_at ASC
        `, [quotation.project_id]);

        // Thêm cửa vào LSX
        let doorSequence = 1;
        for (const door of doors) {
            await connection.query(`
                INSERT INTO production_order_doors 
                (order_id, design_id, door_sequence, status) 
                VALUES (?, ?, ?, 'pending')
            `, [orderId, door.id, doorSequence++]);

            // Tạo tiến độ mặc định cho cửa
            const stages = ['cutting', 'welding', 'gluing', 'accessories', 'finishing', 'packaging'];
            for (const stage of stages) {
                await connection.query(`
                    INSERT INTO production_progress 
                    (order_id, design_id, stage, status) 
                    VALUES (?, ?, ?, 'pending')
                `, [orderId, door.id, stage]);
            }
        }

        // Tính BOM tổng hợp từ tất cả cửa
        const [bomItems] = await connection.query(`
            SELECT 
                bi.*,
                dd.id AS door_id,
                dd.design_code
            FROM bom_items bi
            INNER JOIN door_designs dd ON bi.design_id = dd.id
            WHERE dd.project_id = ?
            ORDER BY bi.item_type, bi.item_name
        `, [quotation.project_id]);

        // Nhóm và tổng hợp BOM
        const bomMap = {};
        bomItems.forEach(item => {
            const key = `${item.item_type}_${item.item_code || item.item_name}`;
            if (!bomMap[key]) {
                bomMap[key] = {
                    order_id: orderId,
                    item_type: item.item_type,
                    item_code: item.item_code,
                    item_name: item.item_name,
                    unit: item.unit,
                    length_mm: item.length_mm || null,
                    weight_kg: item.weight_kg || null,
                    area_m2: item.area_m2 || null,
                    required_quantity: 0,
                    issued_quantity: 0,
                    status: 'pending'
                };
            }
            bomMap[key].required_quantity += parseFloat(item.quantity) || 0;
        });

        // Lưu BOM vào production_order_bom
        for (const key in bomMap) {
            const bomItem = bomMap[key];
            await connection.query(`
                INSERT INTO production_order_bom 
                (order_id, item_type, item_code, item_name, quantity, unit, 
                 length_mm, weight_kg, area_m2, required_quantity, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `, [
                bomItem.order_id,
                bomItem.item_type,
                bomItem.item_code,
                bomItem.item_name,
                bomItem.required_quantity,
                bomItem.unit,
                bomItem.length_mm,
                bomItem.weight_kg,
                bomItem.area_m2,
                bomItem.required_quantity
            ]);
        }

        // Kiểm tra tồn kho cho BOM
        const bomItemsArray = Object.values(bomMap);
        const stockWarnings = await checkBOMStockAvailability(bomItemsArray);

        // Cập nhật tổng số cửa
        await connection.query(`
            UPDATE production_orders 
            SET total_doors = ? 
            WHERE id = ?
        `, [doors.length, orderId]);

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: stockWarnings.hasInsufficientStock 
                ? "Tạo lệnh sản xuất thành công, nhưng có cảnh báo tồn kho" 
                : "Tạo lệnh sản xuất thành công",
            data: {
                id: orderId,
                order_code,
                total_doors: doors.length,
                total_bom_items: Object.keys(bomMap).length,
                stock_warnings: stockWarnings.warnings,
                stock_status: stockWarnings.hasInsufficientStock ? 'insufficient' : 'sufficient'
            }
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error creating production order from quotation:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo lệnh sản xuất: " + err.message
        });
    }
};

/**
 * Lấy chi tiết LSX với đầy đủ thông tin
 */
exports.getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin LSX
        const [orderRows] = await db.query(`
            SELECT 
                po.*,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                q.quotation_code
            FROM production_orders po
            LEFT JOIN projects p ON po.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN quotations q ON po.quotation_id = q.id
            WHERE po.id = ?
        `, [id]);

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        const order = orderRows[0];

        // Lấy danh sách cửa
        const [doors] = await db.query(`
            SELECT 
                pod.*,
                dd.design_code,
                dd.door_type,
                dd.width_mm,
                dd.height_mm,
                dd.aluminum_system_id,
                a.code AS aluminum_code,
                a.name AS aluminum_name,
                drw.drawing_data,
                drw.image_data
            FROM production_order_doors pod
            INNER JOIN door_designs dd ON pod.design_id = dd.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            LEFT JOIN door_drawings drw ON drw.door_design_id = dd.id OR drw.design_id = dd.id
            WHERE pod.order_id = ?
            ORDER BY pod.door_sequence ASC
        `, [id]);

        // Lấy BOM vật tư
        const [bomItems] = await db.query(`
            SELECT * FROM production_order_bom
            WHERE order_id = ?
            ORDER BY item_type, item_name
        `, [id]);

        // Tính tiến độ
        const completedDoors = doors.filter(d => d.status === 'completed').length;
        const progressPercent = doors.length > 0 ? (completedDoors / doors.length) * 100 : 0;

        res.json({
            success: true,
            data: {
                order,
                doors,
                bom: bomItems,
                statistics: {
                    total_doors: doors.length,
                    completed_doors: completedDoors,
                    progress_percent: progressPercent,
                    total_bom_items: bomItems.length,
                    pending_bom_items: bomItems.filter(b => b.status === 'pending').length,
                    completed_bom_items: bomItems.filter(b => b.status === 'completed').length
                }
            }
        });
    } catch (err) {
        console.error('Error getting order details:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy chi tiết LSX: " + err.message
        });
    }
};

/**
 * Lấy danh sách báo giá đã duyệt để tạo LSX
 */
exports.getApprovedQuotations = async (req, res) => {
    try {
        const [quotations] = await db.query(`
            SELECT 
                q.*,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name,
                (SELECT COUNT(*) FROM door_designs WHERE project_id = p.id) as door_count,
                (SELECT COUNT(*) FROM production_orders WHERE quotation_id = q.id) as existing_orders
            FROM quotations q
            LEFT JOIN projects p ON q.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE q.status = 'approved'
            ORDER BY q.quotation_date DESC
        `);

        res.json({
            success: true,
            data: quotations
        });
    } catch (err) {
        console.error('Error getting approved quotations:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách báo giá: " + err.message
        });
    }
};








