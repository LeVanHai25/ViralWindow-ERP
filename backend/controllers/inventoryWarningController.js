const db = require("../config/db");

/**
 * Lấy danh sách cảnh báo tồn kho
 */
exports.getWarnings = async (req, res) => {
    try {
        const { status, warning_type } = req.query;

        let query = `
            SELECT 
                w.*,
                i.item_code,
                i.item_name,
                i.item_type,
                i.unit,
                i.location
            FROM inventory_warnings w
            INNER JOIN inventory i ON w.inventory_id = i.id
            WHERE 1=1
        `;
        let params = [];

        if (status && status !== 'all') {
            query += " AND w.status = ?";
            params.push(status);
        }

        if (warning_type && warning_type !== 'all') {
            query += " AND w.warning_type = ?";
            params.push(warning_type);
        }

        query += " ORDER BY w.created_at DESC";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error getting warnings:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách cảnh báo: " + err.message
        });
    }
};

/**
 * Đánh dấu cảnh báo đã xử lý
 */
exports.acknowledgeWarning = async (req, res) => {
    try {
        const { id } = req.params;
        const { acknowledged_by } = req.body;

        const [result] = await db.query(`
            UPDATE inventory_warnings 
            SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = ?
            WHERE id = ? AND status = 'active'
        `, [acknowledged_by || null, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cảnh báo hoặc đã được xử lý"
            });
        }

        res.json({
            success: true,
            message: "Đã đánh dấu cảnh báo"
        });
    } catch (err) {
        console.error('Error acknowledging warning:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xử lý cảnh báo: " + err.message
        });
    }
};

/**
 * Kiểm tra và tạo cảnh báo cho tất cả vật tư
 */
exports.checkAllWarnings = async (req, res) => {
    try {
        const [items] = await db.query(`
            SELECT id, quantity, min_stock_level 
            FROM inventory 
            WHERE min_stock_level > 0
        `);

        let warningsCreated = 0;
        let warningsUpdated = 0;

        for (const item of items) {
            const currentQty = parseFloat(item.quantity) || 0;
            const minLevel = parseFloat(item.min_stock_level) || 0;

            if (currentQty < minLevel) {
                const warningType = currentQty <= 0 ? 'out_of_stock' : 'low_stock';

                // Kiểm tra xem đã có cảnh báo active chưa
                const [existingWarnings] = await db.query(`
                    SELECT id FROM inventory_warnings 
                    WHERE inventory_id = ? AND status = 'active'
                `, [item.id]);

                if (existingWarnings.length === 0) {
                    await db.query(`
                        INSERT INTO inventory_warnings 
                        (inventory_id, warning_type, current_quantity, min_stock_level, status, notified_at) 
                        VALUES (?, ?, ?, ?, 'active', NOW())
                    `, [item.id, warningType, currentQty, minLevel]);
                    warningsCreated++;
                } else {
                    await db.query(`
                        UPDATE inventory_warnings 
                        SET current_quantity = ?, warning_type = ?, notified_at = NOW()
                        WHERE inventory_id = ? AND status = 'active'
                    `, [currentQty, warningType, item.id]);
                    warningsUpdated++;
                }
            } else {
                // Đánh dấu cảnh báo là resolved nếu tồn kho đã đủ
                await db.query(`
                    UPDATE inventory_warnings 
                    SET status = 'resolved', resolved_at = NOW() 
                    WHERE inventory_id = ? AND status = 'active'
                `, [item.id]);
            }
        }

        res.json({
            success: true,
            message: "Đã kiểm tra cảnh báo tồn kho",
            data: {
                warnings_created: warningsCreated,
                warnings_updated: warningsUpdated,
                total_checked: items.length
            }
        });
    } catch (err) {
        console.error('Error checking all warnings:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi kiểm tra cảnh báo: " + err.message
        });
    }
};

/**
 * Lấy thống kê cảnh báo
 */
exports.getWarningStats = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN warning_type = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock,
                SUM(CASE WHEN warning_type = 'low_stock' THEN 1 ELSE 0 END) as low_stock
            FROM inventory_warnings
            WHERE status = 'active'
        `);

        res.json({
            success: true,
            data: stats[0] || {
                total: 0,
                active: 0,
                out_of_stock: 0,
                low_stock: 0
            }
        });
    } catch (err) {
        console.error('Error getting warning stats:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy thống kê cảnh báo: " + err.message
        });
    }
};




























