const db = require("../config/db");

/**
 * GET all usage rules for an accessory
 */
exports.getByAccessory = async (req, res) => {
    try {
        const { accessoryId } = req.params;

        const [rows] = await db.query(
            "SELECT * FROM accessory_usage_rules WHERE accessory_id = ? ORDER BY door_type, position",
            [accessoryId]
        );

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error getting usage rules:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * GET usage rules by door type
 */
exports.getByDoorType = async (req, res) => {
    try {
        const { doorType } = req.params;

        const [rows] = await db.query(`
            SELECT 
                aur.*,
                a.code as accessory_code,
                a.name as accessory_name,
                a.category,
                a.unit
            FROM accessory_usage_rules aur
            LEFT JOIN accessories a ON aur.accessory_id = a.id
            WHERE aur.door_type = ? AND a.is_active = 1
            ORDER BY a.category, a.code
        `, [doorType]);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error getting usage rules by door type:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * POST create usage rule
 */
exports.create = async (req, res) => {
    try {
        const {
            accessory_id,
            door_type,
            quantity,
            position,
            description,
            is_required
        } = req.body;

        if (!accessory_id || !door_type || !quantity) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc"
            });
        }

        const [result] = await db.query(`
            INSERT INTO accessory_usage_rules
            (accessory_id, door_type, quantity, position, description, is_required)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            accessory_id,
            door_type,
            quantity,
            position || null,
            description || null,
            is_required !== false
        ]);

        res.status(201).json({
            success: true,
            message: "Tạo quy tắc sử dụng thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error creating usage rule:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Quy tắc này đã tồn tại"
            });
        }
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo quy tắc: " + err.message
        });
    }
};

/**
 * PUT update usage rule
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            door_type,
            quantity,
            position,
            description,
            is_required
        } = req.body;

        const [result] = await db.query(`
            UPDATE accessory_usage_rules
            SET door_type = ?, quantity = ?, position = ?, description = ?, is_required = ?
            WHERE id = ?
        `, [
            door_type,
            quantity,
            position || null,
            description || null,
            is_required !== false,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy quy tắc"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật quy tắc thành công"
        });
    } catch (err) {
        console.error('Error updating usage rule:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật quy tắc: " + err.message
        });
    }
};

/**
 * DELETE usage rule
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "DELETE FROM accessory_usage_rules WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy quy tắc"
            });
        }

        res.json({
            success: true,
            message: "Xóa quy tắc thành công"
        });
    } catch (err) {
        console.error('Error deleting usage rule:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa quy tắc: " + err.message
        });
    }
};

/**
 * GET recommended accessories for a door type
 */
exports.getRecommended = async (req, res) => {
    try {
        const { doorType } = req.params;

        const [rows] = await db.query(`
            SELECT 
                a.*,
                aur.quantity,
                aur.position,
                aur.description as usage_description,
                aur.is_required
            FROM accessories a
            INNER JOIN accessory_usage_rules aur ON a.id = aur.accessory_id
            WHERE aur.door_type = ? AND a.is_active = 1
            ORDER BY aur.is_required DESC, a.category, a.code
        `, [doorType]);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error getting recommended accessories:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};




























