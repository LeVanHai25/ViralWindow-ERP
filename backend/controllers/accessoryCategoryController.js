const pool = require("../config/db");

// GET all accessory categories
exports.getCategories = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM accessory_categories ORDER BY name ASC");
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error("Error getting accessory categories:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách danh mục phụ kiện"
        });
    }
};

// CREATE a new category
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục không được để trống"
            });
        }

        const [result] = await pool.query(
            "INSERT INTO accessory_categories (name, description) VALUES (?, ?)",
            [name, description || null]
        );

        res.json({
            success: true,
            message: "Thêm danh mục thành công",
            data: { id: result.insertId, name, description }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục đã tồn tại"
            });
        }
        console.error("Error creating accessory category:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi thêm danh mục"
        });
    }
};

// UPDATE a category
exports.updateCategory = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục không được để trống"
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Get old name for updating accessory category field
        const [oldRows] = await connection.query("SELECT name FROM accessory_categories WHERE id = ?", [id]);
        if (oldRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
        }
        const oldName = oldRows[0].name;

        // Update category
        await connection.query(
            "UPDATE accessory_categories SET name = ?, description = ? WHERE id = ?",
            [name, description || null, id]
        );

        // Update accessories that were using the old name
        if (oldName !== name) {
            await connection.query(
                "UPDATE accessories SET category = ? WHERE category = ?",
                [name, oldName]
            );
        }

        await connection.commit();
        res.json({
            success: true,
            message: "Cập nhật danh mục thành công"
        });
    } catch (err) {
        if (connection) await connection.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục mới đã tồn tại"
            });
        }
        console.error("Error updating accessory category:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật danh mục"
        });
    } finally {
        if (connection) connection.release();
    }
};

// DELETE a category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if items are still using this category
        const [rows] = await pool.query("SELECT name FROM accessory_categories WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
        }
        const categoryName = rows[0].name;

        const [itemRows] = await pool.query(
            "SELECT COUNT(*) as count FROM accessories WHERE category = ? AND is_active = 1",
            [categoryName]
        );

        if (itemRows[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Không thể xóa danh mục đang có ${itemRows[0].count} phụ kiện. Vui lòng chuyển các phụ kiện này sang danh mục khác trước.`
            });
        }

        await pool.query("DELETE FROM accessory_categories WHERE id = ?", [id]);

        res.json({
            success: true,
            message: "Xóa danh mục thành công"
        });
    } catch (err) {
        console.error("Error deleting accessory category:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa danh mục"
        });
    }
};
