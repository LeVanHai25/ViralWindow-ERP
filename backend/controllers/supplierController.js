/**
 * Supplier Controller
 * CRUD API cho Nhà cung cấp
 */
const db = require('../config/db');

// GET /api/suppliers - Lấy danh sách NCC
exports.list = async (req, res) => {
    try {
        const { is_active, search } = req.query;

        let sql = 'SELECT * FROM suppliers WHERE 1=1';
        const params = [];

        if (is_active !== undefined) {
            sql += ' AND is_active = ?';
            params.push(is_active);
        }

        if (search) {
            sql += ' AND (code LIKE ? OR name LIKE ? OR contact_person LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        sql += ' ORDER BY code ASC';

        const [rows] = await db.query(sql, params);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error listing suppliers:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/suppliers/:id - Lấy chi tiết NCC
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error getting supplier:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/suppliers - Thêm NCC mới
exports.create = async (req, res) => {
    try {
        const { code, name, contact_person, phone, email, address, tax_code, bank_account, bank_name, note } = req.body;

        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Mã NCC và Tên là bắt buộc' });
        }

        // Check duplicate code
        const [existing] = await db.query('SELECT id FROM suppliers WHERE code = ?', [code]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Mã NCC đã tồn tại' });
        }

        const [result] = await db.query(`
            INSERT INTO suppliers (code, name, contact_person, phone, email, address, tax_code, bank_account, bank_name, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [code, name, contact_person || null, phone || null, email || null, address || null,
            tax_code || null, bank_account || null, bank_name || null, note || null]);

        res.status(201).json({
            success: true,
            message: 'Đã thêm nhà cung cấp',
            data: { id: result.insertId, code, name }
        });
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/suppliers/:id - Cập nhật NCC
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, contact_person, phone, email, address, tax_code, bank_account, bank_name, note, is_active } = req.body;

        // Check exists
        const [existing] = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }

        // Check duplicate code
        if (code && code !== existing[0].code) {
            const [dup] = await db.query('SELECT id FROM suppliers WHERE code = ? AND id != ?', [code, id]);
            if (dup.length > 0) {
                return res.status(400).json({ success: false, message: 'Mã NCC đã tồn tại' });
            }
        }

        await db.query(`
            UPDATE suppliers SET
                code = COALESCE(?, code),
                name = COALESCE(?, name),
                contact_person = ?,
                phone = ?,
                email = ?,
                address = ?,
                tax_code = ?,
                bank_account = ?,
                bank_name = ?,
                note = ?,
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `, [code, name, contact_person, phone, email, address, tax_code, bank_account, bank_name, note, is_active, id]);

        res.json({ success: true, message: 'Đã cập nhật nhà cung cấp' });
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/suppliers/:id - Xóa NCC (soft delete)
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if used in stock_documents
        const [used] = await db.query('SELECT COUNT(*) as count FROM stock_documents WHERE supplier_id = ?', [id]);
        if (used[0].count > 0) {
            // Soft delete - chỉ đánh dấu inactive
            await db.query('UPDATE suppliers SET is_active = 0 WHERE id = ?', [id]);
            return res.json({ success: true, message: 'Đã vô hiệu hóa nhà cung cấp (đang được sử dụng trong phiếu nhập)' });
        }

        // Hard delete
        await db.query('DELETE FROM suppliers WHERE id = ?', [id]);
        res.json({ success: true, message: 'Đã xóa nhà cung cấp' });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
