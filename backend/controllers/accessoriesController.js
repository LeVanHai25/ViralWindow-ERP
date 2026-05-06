const db = require("../config/db");
const { emitDataChange } = require('../services/socketService');

// GET all accessories
exports.getAllAccessories = async (req, res) => {
    try {
        const { search, category, categories } = req.query;
        let query = "SELECT * FROM accessories WHERE is_active = 1";
        let params = [];

        if (search) {
            query += " AND (code LIKE ? OR name LIKE ?)";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        // Support single category
        if (category && category !== 'all') {
            query += " AND category = ?";
            params.push(category);
        }

        // Support multiple categories (comma-separated)
        if (categories) {
            const catList = categories.split(',').map(c => c.trim());
            const placeholders = catList.map(() => '?').join(',');
            query += ` AND category IN (${placeholders})`;
            params.push(...catList);
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
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            "SELECT * FROM accessories WHERE id = ? AND is_active = 1",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ kiện"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET statistics
exports.getStatistics = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN stock_quantity >= min_stock_level THEN 1 ELSE 0 END) as in_stock,
                SUM(CASE WHEN stock_quantity < min_stock_level THEN 1 ELSE 0 END) as need_restock,
                COUNT(DISTINCT category) as categories
            FROM accessories
            WHERE is_active = 1
        `);

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// POST create
exports.create = async (req, res) => {
    try {
        const {
            code, name, category, unit, purchase_price, sale_price, stock_quantity, min_stock_level, max_stock_level, description,
            supplier, supplier_code, application_types, usage_rules
        } = req.body;

        // Handle uploaded image
        let image_path = null;
        if (req.file) {
            image_path = '/uploads/accessories/' + req.file.filename;
        }

        const [result] = await db.query(
            `INSERT INTO accessories 
             (code, name, category, unit, purchase_price, sale_price, stock_quantity, min_stock_level, max_stock_level, description,
              supplier, supplier_code, application_types, usage_rules, image_path) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                code, name, category, unit, purchase_price || 0, sale_price || 0, stock_quantity || 0, min_stock_level || 10, max_stock_level || 100, description || null,
                supplier || null, supplier_code || null,
                application_types ? JSON.stringify(application_types) : null,
                usage_rules ? JSON.stringify(usage_rules) : null,
                image_path
            ]
        );

        res.status(201).json({
            success: true,
            message: "Thêm phụ kiện thành công",
            data: { id: result.insertId, image_path }
        });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Mã phụ kiện đã tồn tại"
            });
        }
        res.status(500).json({
            success: false,
            message: "Lỗi khi thêm phụ kiện"
        });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code, name, category, unit, purchase_price, sale_price, stock_quantity, min_stock_level, max_stock_level, description,
            supplier, supplier_code, application_types, usage_rules
        } = req.body;

        // Handle uploaded image
        let image_path = req.body.image_path; // Keep existing if no new upload
        if (req.file) {
            image_path = '/uploads/accessories/' + req.file.filename;
        }

        let query, params;
        if (image_path !== undefined) {
            query = `UPDATE accessories 
                 SET code = ?, name = ?, category = ?, unit = ?, purchase_price = ?, sale_price = ?, 
                     stock_quantity = ?, min_stock_level = ?, max_stock_level = ?, description = ?,
                     supplier = ?, supplier_code = ?, application_types = ?, usage_rules = ?, image_path = ?
                 WHERE id = ?`;
            params = [
                code, name, category, unit, purchase_price, sale_price, stock_quantity, min_stock_level, max_stock_level, description || null,
                supplier || null, supplier_code || null,
                application_types ? JSON.stringify(application_types) : null,
                usage_rules ? JSON.stringify(usage_rules) : null,
                image_path,
                id
            ];
        } else {
            query = `UPDATE accessories 
                 SET code = ?, name = ?, category = ?, unit = ?, purchase_price = ?, sale_price = ?, 
                     stock_quantity = ?, min_stock_level = ?, max_stock_level = ?, description = ?,
                     supplier = ?, supplier_code = ?, application_types = ?, usage_rules = ?
                 WHERE id = ?`;
            params = [
                code, name, category, unit, purchase_price, sale_price, stock_quantity, min_stock_level, max_stock_level, description || null,
                supplier || null, supplier_code || null,
                application_types ? JSON.stringify(application_types) : null,
                usage_rules ? JSON.stringify(usage_rules) : null,
                id
            ];
        }

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ kiện"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật phụ kiện thành công",
            data: { image_path }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật phụ kiện"
        });
    }
};

// Upload image separately
exports.uploadImage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn file ảnh"
            });
        }

        const image_path = '/uploads/accessories/' + req.file.filename;

        const [result] = await db.query(
            "UPDATE accessories SET image_path = ? WHERE id = ?",
            [image_path, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ kiện"
            });
        }

        res.json({
            success: true,
            message: "Upload ảnh thành công",
            data: { image_path }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi upload ảnh"
        });
    }
};

// DELETE (soft delete)
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "UPDATE accessories SET is_active = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ kiện"
            });
        }

        res.json({
            success: true,
            message: "Xóa phụ kiện thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa phụ kiện"
        });
    }
};






