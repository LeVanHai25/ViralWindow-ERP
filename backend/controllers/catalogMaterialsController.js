const db = require("../config/db");

// GET all catalog materials
exports.getAll = async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = "SELECT * FROM catalog_materials WHERE is_active = 1";
        let params = [];

        if (search) {
            query += " AND (code LIKE ? OR name LIKE ?)";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (category && category !== 'all') {
            query += " AND category = ?";
            params.push(category);
        }

        query += " ORDER BY code ASC";
        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// GET by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            "SELECT * FROM catalog_materials WHERE id = ? AND is_active = 1",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy vật tư" });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// POST create
exports.create = async (req, res) => {
    try {
        const { code, name, unit, sale_price, category } = req.body;

        if (!code || !name) {
            return res.status(400).json({ success: false, message: "Mã và tên vật tư là bắt buộc" });
        }

        const [result] = await db.query(
            "INSERT INTO catalog_materials (code, name, unit, sale_price, category) VALUES (?, ?, ?, ?, ?)",
            [code, name, unit || 'cái', sale_price || 0, category || null]
        );

        res.status(201).json({
            success: true,
            message: "Thêm vật tư danh mục thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Mã vật tư đã tồn tại" });
        }
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, unit, sale_price, category } = req.body;

        const [result] = await db.query(
            "UPDATE catalog_materials SET name = ?, unit = ?, sale_price = ?, category = ? WHERE id = ?",
            [name, unit, sale_price, category, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy vật tư" });
        }

        res.json({ success: true, message: "Cập nhật vật tư thành công" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// DELETE delete (soft delete)
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            "UPDATE catalog_materials SET is_active = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy vật tư" });
        }

        res.json({ success: true, message: "Xóa vật tư thành công" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};
