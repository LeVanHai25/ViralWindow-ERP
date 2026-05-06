const pool = require('../config/db');

// ============================================
// GLASS ITEMS CONTROLLER
// Quản lý bảng kính
// ============================================

// Lấy tất cả kính
exports.getAll = async (req, res) => {
    try {
        const { search, sort = 'id' } = req.query;

        let query = `
            SELECT g.*, s.name as supplier_name 
            FROM glass_items g 
            LEFT JOIN suppliers s ON g.supplier_id = s.id 
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ' AND (g.name LIKE ? OR g.code LIKE ? OR g.structure LIKE ? OR g.glass_type LIKE ? OR g.notes LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Sắp xếp
        if (sort === 'name') {
            query += ' ORDER BY g.name ASC';
        } else if (sort === 'price') {
            query += ' ORDER BY g.price ASC';
        } else if (sort === 'code') {
            query += ' ORDER BY g.code ASC';
        } else {
            query += ' ORDER BY g.id DESC';
        }

        const [rows] = await pool.query(query, params);

        // Debug: Log first few items to see fields
        if (rows.length > 0) {
            console.log('🔍 Glass items API - Sample fields:', {
                id: rows[0].id,
                code: rows[0].code,
                name: rows[0].name,
                structure: rows[0].structure
            });
        }

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching glass items:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy chi tiết kính
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT g.*, s.name as supplier_name 
            FROM glass_items g 
            LEFT JOIN suppliers s ON g.supplier_id = s.id 
            WHERE g.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy kính' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error fetching glass item:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Tạo mới kính
exports.create = async (req, res) => {
    try {
        const { code, name, glass_type, structure, price, notes, quantity, supplier_id, min_stock_level, max_stock_level } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên kính là bắt buộc' });
        }

        const [result] = await pool.query(
            'INSERT INTO glass_items (code, name, glass_type, structure, price, notes, quantity, supplier_id, min_stock_level, max_stock_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [code || null, name, glass_type || null, structure || null, price || 0, notes || null, quantity || 0, supplier_id || null, min_stock_level || 10, max_stock_level || 100]
        );

        res.status(201).json({
            success: true,
            message: 'Tạo kính thành công',
            data: { id: result.insertId, code, name, glass_type, structure, price: price || 0, notes }
        });
    } catch (error) {
        console.error('Error creating glass item:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật kính
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, glass_type, structure, price, notes, quantity, supplier_id, min_stock_level, max_stock_level } = req.body;

        const [result] = await pool.query(
            'UPDATE glass_items SET code = ?, name = ?, glass_type = ?, structure = ?, price = ?, notes = ?, quantity = ?, supplier_id = ?, min_stock_level = ?, max_stock_level = ? WHERE id = ?',
            [code || null, name, glass_type || null, structure || null, price || 0, notes || null, quantity || 0, supplier_id || null, min_stock_level || 10, max_stock_level || 100, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy kính' });
        }

        res.json({ success: true, message: 'Cập nhật kính thành công' });
    } catch (error) {
        console.error('Error updating glass item:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Xóa kính
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query('DELETE FROM glass_items WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy kính' });
        }

        res.json({ success: true, message: 'Xóa kính thành công' });
    } catch (error) {
        console.error('Error deleting glass item:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
