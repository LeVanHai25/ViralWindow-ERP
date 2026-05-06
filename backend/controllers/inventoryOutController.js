const db = require("../config/db");

/**
 * Xuất kho theo LSX - Tự động trừ vật tư theo BOM
 */
exports.createIssueFromProductionOrder = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { production_order_id, issue_date, notes } = req.body;

        // Lấy BOM từ production_order_bom
        const [bomItems] = await connection.query(`
            SELECT * FROM production_order_bom
            WHERE order_id = ? AND status != 'completed'
            ORDER BY item_type, item_name
        `, [production_order_id]);

        if (bomItems.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "LSX này chưa có BOM hoặc đã xuất kho hết"
            });
        }

        // Lấy thông tin LSX
        const [orderRows] = await connection.query(`
            SELECT order_code, project_id FROM production_orders WHERE id = ?
        `, [production_order_id]);

        if (orderRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lệnh sản xuất"
            });
        }

        const order = orderRows[0];
        const issueDate = issue_date || new Date().toISOString().split('T')[0];
        const year = new Date().getFullYear();
        const issueRecords = [];
        const errors = [];

        // Xử lý từng vật tư trong BOM
        for (const bomItem of bomItems) {
            const requiredQty = parseFloat(bomItem.required_quantity) || 0;
            const issuedQty = parseFloat(bomItem.issued_quantity) || 0;
            const remainingQty = requiredQty - issuedQty;

            if (remainingQty <= 0) continue;

            // Tìm inventory item
            const [inventoryRows] = await connection.query(`
                SELECT id, quantity, item_name, item_code 
                FROM inventory 
                WHERE item_code = ? OR (item_name = ? AND item_type = ?)
                LIMIT 1
            `, [bomItem.item_code, bomItem.item_name, bomItem.item_type]);

            if (inventoryRows.length === 0) {
                errors.push({
                    item: bomItem.item_name,
                    error: "Không tìm thấy trong kho"
                });
                continue;
            }

            const inventoryItem = inventoryRows[0];
            const availableQty = parseFloat(inventoryItem.quantity) || 0;

            if (availableQty < remainingQty) {
                errors.push({
                    item: bomItem.item_name,
                    error: `Không đủ tồn kho (cần: ${remainingQty}, có: ${availableQty})`
                });
                continue;
            }

            // Tạo mã phiếu xuất
            const [countRows] = await connection.query(
                "SELECT COUNT(*) as count FROM inventory_out WHERE YEAR(issue_date) = ?",
                [year]
            );
            const count = countRows[0].count + issueRecords.length + 1;
            const issue_code = `XK-${year}-${String(count).padStart(4, '0')}`;

            // Tạo phiếu xuất
            await connection.query(`
                INSERT INTO inventory_out 
                (issue_code, issue_date, inventory_id, item_type, item_code, item_name, 
                 quantity, issued_quantity, unit, project_id, production_order_id, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                issue_code,
                issueDate,
                inventoryItem.id,
                bomItem.item_type,
                bomItem.item_code || inventoryItem.item_code,
                bomItem.item_name,
                remainingQty,
                remainingQty,
                bomItem.unit,
                order.project_id,
                production_order_id,
                notes || `Xuất kho cho LSX ${order.order_code}`
            ]);

            // Trừ tồn kho
            const newQuantity = availableQty - remainingQty;
            await connection.query(`
                UPDATE inventory 
                SET quantity = ?
                WHERE id = ?
            `, [newQuantity, inventoryItem.id]);

            // Nếu là phụ kiện, cập nhật bảng accessories
            if (bomItem.item_type === 'accessory' && bomItem.item_code) {
                await connection.query(`
                    UPDATE accessories 
                    SET stock_quantity = stock_quantity - ?
                    WHERE code = ?
                `, [remainingQty, bomItem.item_code]);
            }

            // Cập nhật BOM - đánh dấu đã xuất
            const newIssuedQty = issuedQty + remainingQty;
            const bomStatus = newIssuedQty >= requiredQty ? 'completed' : 'partial';
            await connection.query(`
                UPDATE production_order_bom 
                SET issued_quantity = ?, status = ?
                WHERE id = ?
            `, [newIssuedQty, bomStatus, bomItem.id]);

            // Kiểm tra cảnh báo tồn kho
            await checkAndCreateWarning(connection, inventoryItem.id, newQuantity);

            issueRecords.push({
                issue_code,
                item_name: bomItem.item_name,
                quantity: remainingQty,
                unit: bomItem.unit
            });
        }

        if (issueRecords.length === 0 && errors.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Không thể xuất kho",
                errors: errors
            });
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: `Xuất kho thành công ${issueRecords.length} vật tư`,
            data: {
                production_order_id,
                order_code: order.order_code,
                issues: issueRecords,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error creating issue from production order:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xuất kho: " + err.message
        });
    }
};

/**
 * Xuất kho thủ công
 */
exports.createManualIssue = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { issue_date, items, project_id, production_order_id, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Vui lòng thêm ít nhất một vật tư"
            });
        }

        const issueDate = issue_date || new Date().toISOString().split('T')[0];
        const year = new Date().getFullYear();
        const issueRecords = [];
        const errors = [];

        for (const item of items) {
            const { inventory_id, item_code, quantity } = item;

            // Tìm inventory item
            let inventoryItem;
            if (inventory_id) {
                const [rows] = await connection.query(
                    "SELECT * FROM inventory WHERE id = ?",
                    [inventory_id]
                );
                inventoryItem = rows[0];
            } else if (item_code) {
                const [rows] = await connection.query(
                    "SELECT * FROM inventory WHERE item_code = ?",
                    [item_code]
                );
                inventoryItem = rows[0];
            }

            if (!inventoryItem) {
                errors.push({
                    item: item_code || 'N/A',
                    error: "Không tìm thấy trong kho"
                });
                continue;
            }

            const availableQty = parseFloat(inventoryItem.quantity) || 0;
            const issueQty = parseFloat(quantity) || 0;

            if (availableQty < issueQty) {
                errors.push({
                    item: inventoryItem.item_name,
                    error: `Không đủ tồn kho (cần: ${issueQty}, có: ${availableQty})`
                });
                continue;
            }

            // Tạo mã phiếu xuất
            const [countRows] = await connection.query(
                "SELECT COUNT(*) as count FROM inventory_out WHERE YEAR(issue_date) = ?",
                [year]
            );
            const count = countRows[0].count + issueRecords.length + 1;
            const issue_code = `XK-${year}-${String(count).padStart(4, '0')}`;

            // Tạo phiếu xuất
            await connection.query(`
                INSERT INTO inventory_out 
                (issue_code, issue_date, inventory_id, item_type, item_code, item_name, 
                 quantity, issued_quantity, unit, project_id, production_order_id, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                issue_code,
                issueDate,
                inventoryItem.id,
                inventoryItem.item_type,
                inventoryItem.item_code,
                inventoryItem.item_name,
                issueQty,
                issueQty,
                inventoryItem.unit,
                project_id || null,
                production_order_id || null,
                notes || null
            ]);

            // Trừ tồn kho
            const newQuantity = availableQty - issueQty;
            await connection.query(`
                UPDATE inventory 
                SET quantity = ?
                WHERE id = ?
            `, [newQuantity, inventoryItem.id]);

            // Nếu là phụ kiện, cập nhật bảng accessories
            if (inventoryItem.item_type === 'accessory' && inventoryItem.item_code) {
                await connection.query(`
                    UPDATE accessories 
                    SET stock_quantity = stock_quantity - ?
                    WHERE code = ?
                `, [issueQty, inventoryItem.item_code]);
            }

            // Kiểm tra cảnh báo tồn kho
            await checkAndCreateWarning(connection, inventoryItem.id, newQuantity);

            issueRecords.push({
                issue_code,
                item_name: inventoryItem.item_name,
                quantity: issueQty,
                unit: inventoryItem.unit
            });
        }

        if (issueRecords.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Không thể xuất kho",
                errors: errors
            });
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: `Xuất kho thành công ${issueRecords.length} vật tư`,
            data: {
                issues: issueRecords,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error creating manual issue:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xuất kho: " + err.message
        });
    }
};

/**
 * Lấy danh sách phiếu xuất
 */
exports.getIssues = async (req, res) => {
    try {
        const { production_order_id, project_id, start_date, end_date } = req.query;

        let query = `
            SELECT 
                issue_code,
                issue_date,
                project_id,
                production_order_id,
                COUNT(*) as item_count,
                SUM(quantity) as total_quantity
            FROM inventory_out
            WHERE 1=1
        `;
        let params = [];

        if (production_order_id) {
            query += " AND production_order_id = ?";
            params.push(production_order_id);
        }

        if (project_id) {
            query += " AND project_id = ?";
            params.push(project_id);
        }

        if (start_date) {
            query += " AND issue_date >= ?";
            params.push(start_date);
        }

        if (end_date) {
            query += " AND issue_date <= ?";
            params.push(end_date);
        }

        query += " GROUP BY issue_code, issue_date, project_id, production_order_id ORDER BY issue_date DESC";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Error getting issues:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách phiếu xuất: " + err.message
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
            const [existingWarnings] = await connection.query(`
                SELECT id FROM inventory_warnings 
                WHERE inventory_id = ? AND status = 'active'
            `, [inventoryId]);

            if (existingWarnings.length === 0) {
                const warningType = currentQuantity <= 0 ? 'out_of_stock' : 'low_stock';
                await connection.query(`
                    INSERT INTO inventory_warnings 
                    (inventory_id, warning_type, current_quantity, min_stock_level, status, notified_at) 
                    VALUES (?, ?, ?, ?, 'active', NOW())
                `, [inventoryId, warningType, currentQuantity, minStockLevel]);
            } else {
                // Cập nhật cảnh báo hiện tại
                await connection.query(`
                    UPDATE inventory_warnings 
                    SET current_quantity = ?, warning_type = ?, notified_at = NOW()
                    WHERE inventory_id = ? AND status = 'active'
                `, [
                    currentQuantity,
                    currentQuantity <= 0 ? 'out_of_stock' : 'low_stock',
                    inventoryId
                ]);
            }
        } else {
            // Đánh dấu cảnh báo là resolved
            await connection.query(`
                UPDATE inventory_warnings 
                SET status = 'resolved', resolved_at = NOW() 
                WHERE inventory_id = ? AND status = 'active'
            `, [inventoryId]);
        }
    } catch (err) {
        console.error('Error checking warning:', err);
    }
}








