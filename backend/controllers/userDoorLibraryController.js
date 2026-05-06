const db = require("../config/db");

// Lấy thư viện cửa tự tạo của user hiện tại
exports.getMyLibrary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { family, search } = req.query;

        let query = `
            SELECT 
                udl.*,
                dt.code AS template_code,
                dt.name AS template_name,
                a.brand,
                a.name AS aluminum_system_name
            FROM user_door_library udl
            LEFT JOIN door_templates dt ON udl.template_id = dt.id
            LEFT JOIN aluminum_systems a ON udl.aluminum_system_id = a.id
            WHERE udl.user_id = ? AND udl.is_active = 1
        `;
        const params = [userId];

        if (family) {
            query += ` AND udl.family = ?`;
            params.push(family);
        }

        if (search) {
            query += ` AND (udl.custom_name LIKE ? OR udl.custom_code LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY udl.created_at DESC`;

        const [rows] = await db.query(query, params);

        // Parse JSON fields
        const library = rows.map(row => ({
            ...row,
            param_schema: typeof row.param_schema === 'string' 
                ? JSON.parse(row.param_schema) 
                : row.param_schema,
            params_json: typeof row.params_json === 'string' 
                ? JSON.parse(row.params_json) 
                : row.params_json
        }));

        res.json({ success: true, data: library });
    } catch (err) {
        console.error("Error getting user door library:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Lấy cửa tự tạo theo ID
exports.getById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT 
                udl.*,
                dt.code AS template_code,
                dt.name AS template_name,
                a.brand,
                a.name AS aluminum_system_name
            FROM user_door_library udl
            LEFT JOIN door_templates dt ON udl.template_id = dt.id
            LEFT JOIN aluminum_systems a ON udl.aluminum_system_id = a.id
            WHERE udl.id = ? AND udl.user_id = ? AND udl.is_active = 1`,
            [id, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Door library item not found" });
        }

        const item = rows[0];
        item.param_schema = typeof item.param_schema === 'string' 
            ? JSON.parse(item.param_schema) 
            : item.param_schema;
        item.params_json = typeof item.params_json === 'string' 
            ? JSON.parse(item.params_json) 
            : item.params_json;

        res.json({ success: true, data: item });
    } catch (err) {
        console.error("Error getting user door library item:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Tạo cửa tự tạo mới
exports.create = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            template_id,
            custom_name,
            custom_code,
            custom_image,
            family,
            param_schema,
            params_json,
            aluminum_system_id,
            description
        } = req.body;

        if (!custom_name || !family) {
            return res.status(400).json({
                success: false,
                message: "Custom name and family are required"
            });
        }

        const [result] = await db.query(
            `INSERT INTO user_door_library 
            (user_id, template_id, custom_name, custom_code, custom_image, family, 
             param_schema, params_json, aluminum_system_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                template_id || null,
                custom_name,
                custom_code || null,
                custom_image || null,
                family,
                param_schema ? JSON.stringify(param_schema) : null,
                params_json ? JSON.stringify(params_json) : null,
                aluminum_system_id || null,
                description || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Door library item created successfully",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error("Error creating user door library item:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Cập nhật cửa tự tạo
exports.update = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const {
            custom_name,
            custom_code,
            custom_image,
            family,
            param_schema,
            params_json,
            aluminum_system_id,
            description,
            is_active
        } = req.body;

        // Kiểm tra quyền sở hữu
        const [checkRows] = await db.query(
            "SELECT id FROM user_door_library WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (checkRows.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to update this item"
            });
        }

        const updateFields = [];
        const params = [];

        if (custom_name !== undefined) {
            updateFields.push("custom_name = ?");
            params.push(custom_name);
        }
        if (custom_code !== undefined) {
            updateFields.push("custom_code = ?");
            params.push(custom_code);
        }
        if (custom_image !== undefined) {
            updateFields.push("custom_image = ?");
            params.push(custom_image);
        }
        if (family !== undefined) {
            updateFields.push("family = ?");
            params.push(family);
        }
        if (param_schema !== undefined) {
            updateFields.push("param_schema = ?");
            params.push(JSON.stringify(param_schema));
        }
        if (params_json !== undefined) {
            updateFields.push("params_json = ?");
            params.push(JSON.stringify(params_json));
        }
        if (aluminum_system_id !== undefined) {
            updateFields.push("aluminum_system_id = ?");
            params.push(aluminum_system_id);
        }
        if (description !== undefined) {
            updateFields.push("description = ?");
            params.push(description);
        }
        if (is_active !== undefined) {
            updateFields.push("is_active = ?");
            params.push(is_active);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        params.push(id, userId);

        await db.query(
            `UPDATE user_door_library SET ${updateFields.join(", ")} 
            WHERE id = ? AND user_id = ?`,
            params
        );

        res.json({ success: true, message: "Door library item updated successfully" });
    } catch (err) {
        console.error("Error updating user door library item:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Xóa cửa tự tạo (soft delete)
exports.delete = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Kiểm tra quyền sở hữu
        const [checkRows] = await db.query(
            "SELECT id FROM user_door_library WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (checkRows.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to delete this item"
            });
        }

        await db.query(
            "UPDATE user_door_library SET is_active = 0 WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        res.json({ success: true, message: "Door library item deleted successfully" });
    } catch (err) {
        console.error("Error deleting user door library item:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};






