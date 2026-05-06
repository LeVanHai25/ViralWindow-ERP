const db = require("../config/db");
const NotificationEventService = require("../services/notificationEventService");

/**
 * Nhập kho - Hỗ trợ nhiều loại nguồn nhập
 */
exports.createReceipt = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { receipt_date, items, source_type, source_reference, supplier, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Vui lòng thêm ít nhất một vật tư"
            });
        }

        // Tạo mã phiếu nhập
        const year = new Date().getFullYear();
        const [countRows] = await connection.query(
            "SELECT COUNT(*) as count FROM inventory_in WHERE YEAR(receipt_date) = ?",
            [year]
        );
        const count = countRows[0].count + 1;
        const receipt_code = `NK-${year}-${String(count).padStart(4, '0')}`;

        const receiptDate = receipt_date || new Date().toISOString().split('T')[0];
        const receiptItems = [];

        // Xử lý từng vật tư
        for (const item of items) {
            const {
                item_type,
                item_code,
                item_name,
                quantity,
                unit,
                unit_price,
                location
            } = item;

            const totalPrice = (parseFloat(unit_price) || 0) * (parseFloat(quantity) || 0);

            // Tạo phiếu nhập
            const [result] = await connection.query(`
                INSERT INTO inventory_in 
                (receipt_code, receipt_date, item_type, item_code, item_name, 
                 quantity, unit, unit_price, total_price, supplier, 
                 source_type, source_reference, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                receipt_code,
                receiptDate,
                item_type,
                item_code,
                item_name,
                quantity,
                unit,
                unit_price || 0,
                totalPrice,
                supplier || null,
                source_type || 'purchase',
                source_reference || null,
                notes || null
            ]);

            // Nếu là phụ kiện, cập nhật bảng accessories
            if (item_type === 'accessory') {
                const [existingAccessories] = await connection.query(
                    "SELECT id, stock_quantity, purchase_price, sale_price FROM accessories WHERE code = ?",
                    [item_code]
                );

                if (existingAccessories.length > 0) {
                    // Cập nhật tồn kho phụ kiện
                    const existingAccessory = existingAccessories[0];
                    const newQuantity = parseFloat(existingAccessory.stock_quantity || 0) + parseFloat(quantity);
                    const newPurchasePrice = unit_price || existingAccessory.purchase_price;

                    await connection.query(`
                        UPDATE accessories 
                        SET stock_quantity = ?, purchase_price = COALESCE(?, purchase_price)
                        WHERE id = ?
                    `, [newQuantity, newPurchasePrice, existingAccessory.id]);
                } else {
                    // Tạo mới phụ kiện nếu chưa có (từ nhập kho)
                    await connection.query(`
                        INSERT INTO accessories 
                        (code, name, category, unit, purchase_price, sale_price, stock_quantity, min_stock_level, is_active) 
                        VALUES (?, ?, 'Phụ kiện khác', ?, ?, ?, ?, 10, 1)
                    `, [
                        item_code,
                        item_name,
                        unit,
                        unit_price || 0,
                        unit_price || 0, // Mặc định sale_price = purchase_price
                        quantity,
                    ]);
                }
            }

            // Cập nhật hoặc tạo inventory item
            const [existingItems] = await connection.query(
                "SELECT id, quantity, unit_price FROM inventory WHERE item_code = ?",
                [item_code]
            );

            if (existingItems.length > 0) {
                // Cập nhật tồn kho
                const existingItem = existingItems[0];
                const newQuantity = parseFloat(existingItem.quantity) + parseFloat(quantity);
                // Cập nhật giá nếu có giá mới
                const newPrice = unit_price || existingItem.unit_price;

                await connection.query(`
                    UPDATE inventory 
                    SET quantity = ?, unit_price = ?, location = COALESCE(?, location)
                    WHERE id = ?
                `, [newQuantity, newPrice, location, existingItem.id]);

                // Kiểm tra cảnh báo tồn kho
                await checkAndCreateWarning(connection, existingItem.id, newQuantity);
            } else {
                // Tạo mới inventory item
                const [inventoryResult] = await connection.query(`
                    INSERT INTO inventory 
                    (item_type, item_code, item_name, quantity, unit, unit_price, location) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    item_type,
                    item_code,
                    item_name,
                    quantity,
                    unit,
                    unit_price || 0,
                    location || null
                ]);

                const inventoryId = inventoryResult.insertId;
                // Kiểm tra cảnh báo tồn kho
                await checkAndCreateWarning(connection, inventoryId, parseFloat(quantity));
            }

            receiptItems.push({
                id: result.insertId,
                item_name,
                quantity,
                unit,
                unit_price,
                total_price: totalPrice
            });
        }

        await connection.commit();
        connection.release();

        // Tạo thông báo nhập kho (Event-based)
        try {
            for (const item of receiptItems) {
                await NotificationEventService.emit('inventory.imported', {
                    item_id: item.item_id,
                    item_name: item.item_name,
                    item_code: item.item_code,
                    quantity: item.quantity,
                    unit: item.unit,
                    receipt_code: receipt_code
                }, {
                    createdBy: req.user?.id,
                    entityType: 'inventory',
                    entityId: item.item_id
                });
            }
        } catch (notifErr) {
            console.error('Error creating notification:', notifErr);
        }

        res.status(201).json({
            success: true,
            message: "Nhập kho thành công",
            data: {
                receipt_code,
                receipt_date: receiptDate,
                items: receiptItems
            }
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error creating receipt:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi nhập kho: " + err.message
        });
    }
};

/**
 * Nhập kho từ sản xuất trả về
 */
exports.createProductionReturn = async (req, res) => {
    const { production_order_id, receipt_date, items, notes } = req.body;

    // Gọi createReceipt với source_type = 'production_return'
    req.body.source_type = 'production_return';
    req.body.source_reference = `LSX-${production_order_id}`;
    req.body.notes = notes || `Nhập kho từ sản xuất trả về - LSX #${production_order_id}`;

    return exports.createReceipt(req, res);
};

/**
 * Lấy danh sách phiếu nhập
 */
exports.getReceipts = async (req, res) => {
    try {
        const { source_type, start_date, end_date, supplier } = req.query;

        let query = `
            SELECT 
                receipt_code,
                receipt_date,
                source_type,
                source_reference,
                supplier,
                COUNT(*) as item_count,
                SUM(total_price) as total_value
            FROM inventory_in
            WHERE 1=1
        `;
        let params = [];

        if (source_type && source_type !== 'all') {
            query += " AND source_type = ?";
            params.push(source_type);
        }

        if (start_date) {
            query += " AND receipt_date >= ?";
            params.push(start_date);
        }

        if (end_date) {
            query += " AND receipt_date <= ?";
            params.push(end_date);
        }

        if (supplier) {
            query += " AND supplier LIKE ?";
            params.push(`%${supplier}%`);
        }

        query += " GROUP BY receipt_code, receipt_date, source_type, source_reference, supplier ORDER BY receipt_date DESC";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Error getting receipts:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách phiếu nhập: " + err.message
        });
    }
};

/**
 * Lấy chi tiết phiếu nhập
 */
exports.getReceiptDetails = async (req, res) => {
    try {
        const { receipt_code } = req.params;

        const [items] = await db.query(`
            SELECT * FROM inventory_in
            WHERE receipt_code = ?
            ORDER BY id
        `, [receipt_code]);

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phiếu nhập"
            });
        }

        res.json({
            success: true,
            data: {
                receipt_code: items[0].receipt_code,
                receipt_date: items[0].receipt_date,
                source_type: items[0].source_type,
                source_reference: items[0].source_reference,
                supplier: items[0].supplier,
                notes: items[0].notes,
                items: items
            }
        });
    } catch (err) {
        console.error('Error getting receipt details:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy chi tiết phiếu nhập: " + err.message
        });
    }
};

/**
 * Kiểm tra và tạo cảnh báo tồn kho
 */
async function checkAndCreateWarning(connection, inventoryId, currentQuantity) {
    try {
        const [inventoryRows] = await connection.query(
            "SELECT min_stock_level FROM inventory WHERE id = ?",
            [inventoryId]
        );

        if (inventoryRows.length === 0) return;

        const minStockLevel = parseFloat(inventoryRows[0].min_stock_level) || 0;

        if (minStockLevel > 0 && currentQuantity < minStockLevel) {
            // Kiểm tra xem đã có cảnh báo active chưa
            const [existingWarnings] = await connection.query(`
                SELECT id FROM inventory_warnings 
                WHERE inventory_id = ? AND status = 'active'
            `, [inventoryId]);

            if (existingWarnings.length === 0) {
                // Tạo cảnh báo mới
                const warningType = currentQuantity <= 0 ? 'out_of_stock' : 'low_stock';
                await connection.query(`
                    INSERT INTO inventory_warnings 
                    (inventory_id, warning_type, current_quantity, min_stock_level, status) 
                    VALUES (?, ?, ?, ?, 'active')
                `, [inventoryId, warningType, currentQuantity, minStockLevel]);

                // TODO: Gửi thông báo
            }
        } else {
            // Nếu tồn kho đã đủ, đánh dấu cảnh báo là resolved
            await connection.query(`
                UPDATE inventory_warnings 
                SET status = 'resolved', resolved_at = NOW() 
                WHERE inventory_id = ? AND status = 'active'
            `, [inventoryId]);
        }
    } catch (err) {
        console.error('Error checking warning:', err);
        // Không throw error để không ảnh hưởng đến quá trình nhập kho
    }
}








