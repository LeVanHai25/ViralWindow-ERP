const pool = require("../config/db");

// GET all other item categories
exports.getCategories = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM other_item_categories ORDER BY name ASC");
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error("Error getting other item categories:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách danh mục vật tư phụ"
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
            "INSERT INTO other_item_categories (name, description) VALUES (?, ?)",
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
        console.error("Error creating other item category:", err);
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

        // Get old name for updating inventory notes
        const [oldRows] = await connection.query("SELECT name FROM other_item_categories WHERE id = ?", [id]);
        if (oldRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
        }
        const oldName = oldRows[0].name;

        // Update category
        await connection.query(
            "UPDATE other_item_categories SET name = ?, description = ? WHERE id = ?",
            [name, description || null, id]
        );

        // Update items that were using the old name in notes (standard way for this project)
        if (oldName !== name) {
            await connection.query(
                "UPDATE inventory SET notes = ? WHERE item_type = 'other' AND notes = ?",
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
        console.error("Error updating other item category:", err);
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

        // Optionally check if items are still using this category
        const [rows] = await pool.query("SELECT name FROM other_item_categories WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
        }
        const categoryName = rows[0].name;

        const [itemRows] = await pool.query(
            "SELECT COUNT(*) as count FROM inventory WHERE item_type = 'other' AND notes = ?",
            [categoryName]
        );

        if (itemRows[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Không thể xóa danh mục đang có ${itemRows[0].count} vật tư. Vui lòng chuyển các vật tư này sang danh mục khác trước.`
            });
        }

        await pool.query("DELETE FROM other_item_categories WHERE id = ?", [id]);

        res.json({
            success: true,
            message: "Xóa danh mục thành công"
        });
    } catch (err) {
        console.error("Error deleting other item category:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa danh mục"
        });
    }
};
