const db = require("../config/db");

/**
 * GET all profiles for a system
 */
exports.getBySystem = async (req, res) => {
    try {
        const { systemId } = req.params;

        const [rows] = await db.query(
            "SELECT * FROM aluminum_profiles WHERE system_id = ? AND is_active = 1 ORDER BY profile_type, profile_code",
            [systemId]
        );

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error getting profiles:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * POST create profile
 */
exports.create = async (req, res) => {
    try {
        const {
            system_id,
            profile_code,
            profile_name,
            profile_type,
            width_mm,
            height_mm,
            weight_per_meter,
            unit_price,
            description
        } = req.body;

        if (!system_id || !profile_code || !profile_name || !profile_type) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc"
            });
        }

        const [result] = await db.query(`
            INSERT INTO aluminum_profiles
            (system_id, profile_code, profile_name, profile_type, width_mm, height_mm,
             weight_per_meter, unit_price, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            system_id,
            profile_code,
            profile_name,
            profile_type,
            width_mm || null,
            height_mm || null,
            weight_per_meter || null,
            unit_price || 0,
            description || null
        ]);

        res.status(201).json({
            success: true,
            message: "Tạo profile thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error creating profile:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Mã profile đã tồn tại trong hệ này"
            });
        }
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo profile: " + err.message
        });
    }
};

/**
 * PUT update profile
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            profile_code,
            profile_name,
            profile_type,
            width_mm,
            height_mm,
            weight_per_meter,
            unit_price,
            description
        } = req.body;

        const [result] = await db.query(`
            UPDATE aluminum_profiles
            SET profile_code = ?, profile_name = ?, profile_type = ?,
                width_mm = ?, height_mm = ?, weight_per_meter = ?,
                unit_price = ?, description = ?
            WHERE id = ?
        `, [
            profile_code,
            profile_name,
            profile_type,
            width_mm || null,
            height_mm || null,
            weight_per_meter || null,
            unit_price || 0,
            description || null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy profile"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật profile thành công"
        });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật profile: " + err.message
        });
    }
};

/**
 * DELETE profile
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "UPDATE aluminum_profiles SET is_active = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy profile"
            });
        }

        res.json({
            success: true,
            message: "Xóa profile thành công"
        });
    } catch (err) {
        console.error('Error deleting profile:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa profile: " + err.message
        });
    }
};




























