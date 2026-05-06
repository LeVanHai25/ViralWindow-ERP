const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Helper for persistent debug logging
const logToFile = (data) => {
    try {
        const logPath = path.join(__dirname, '..', 'debug_catalog_log.json');
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...data
        };
        fs.appendFileSync(logPath, JSON.stringify(logEntry, null, 2) + ',\n');
    } catch (e) { console.error('Log to file failed:', e); }
};

// ============================================
// PRODUCT CATALOG CONTROLLER
// Quản lý Nhóm SP + Sản phẩm cửa
// ============================================

// ========================
// PRODUCT GROUPS
// ========================

// GET /api/product-catalog/groups
exports.getAllGroups = async (req, res) => {
    try {
        const { search, code } = req.query;
        let query = 'SELECT * FROM product_groups WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (code LIKE ? OR name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (code) {
            query += ' AND code = ?';
            params.push(code);
        }

        query += ' ORDER BY id ASC';
        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching product groups:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// POST /api/product-catalog/groups
exports.createGroup = async (req, res) => {
    try {
        const { code, name } = req.body;
        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Mã nhóm và Tên nhóm là bắt buộc' });
        }
        const [result] = await db.query(
            'INSERT INTO product_groups (code, name) VALUES (?, ?)',
            [code, name]
        );
        res.status(201).json({
            success: true,
            message: 'Tạo nhóm SP thành công',
            data: { id: result.insertId, code, name }
        });
    } catch (error) {
        console.error('Error creating product group:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// PUT /api/product-catalog/groups/:id
exports.updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name } = req.body;
        const [result] = await db.query(
            'UPDATE product_groups SET code = ?, name = ? WHERE id = ?',
            [code, name, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm SP' });
        }
        res.json({ success: true, message: 'Cập nhật nhóm SP thành công' });
    } catch (error) {
        console.error('Error updating product group:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// DELETE /api/product-catalog/groups/:id
exports.deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM product_groups WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm SP' });
        }
        res.json({ success: true, message: 'Xóa nhóm SP thành công' });
    } catch (error) {
        console.error('Error deleting product group:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// ========================
// PRODUCT CATALOG (Sản phẩm cửa)
// ========================

// GET /api/product-catalog/products
exports.getAllProducts = async (req, res) => {
    try {
        const { search, sort = 'code' } = req.query;
        let query = 'SELECT * FROM product_catalog WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (code LIKE ? OR name LIKE ? OR group_code LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (sort === 'name') query += ' ORDER BY name ASC';
        else if (sort === 'price') query += ' ORDER BY id ASC';
        else query += ' ORDER BY code ASC, id ASC';

        const [rows] = await db.query(query, params);

        // Parse JSON fields
        const data = rows.map(row => ({
            ...row,
            prices: row.prices_json ? JSON.parse(row.prices_json) : {},
            accessories: row.accessories_json ? JSON.parse(row.accessories_json) : []
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// POST /api/product-catalog/products
exports.createProduct = async (req, res) => {
    try {
        console.log(`[DEBUG] Creating product:`, JSON.stringify(req.body, null, 2));
        const { code, group_code, group_name, name, accessory, accessory_price, prices, accessories } = req.body;

        // Ensure accessories are numbers
        const sanitizedAccessories = (accessories || []).map(acc => ({
            name: String(acc.name || ''),
            price: Number(acc.price) || 0
        }));

        logToFile({ action: 'createProduct', body: req.body, sanitizedAccessories });

        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Mã SP và Tên SP là bắt buộc' });
        }
        const [result] = await db.query(
            'INSERT INTO product_catalog (code, group_code, group_name, name, accessory, accessory_price, prices_json, accessories_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [code, group_code || '', group_name || '', name, accessory || null, accessory_price || 0, JSON.stringify(prices || {}), JSON.stringify(sanitizedAccessories)]
        );
        logToFile({ action: 'createProduct_result', result });
        res.status(201).json({
            success: true,
            message: 'Tạo sản phẩm thành công',
            data: { id: result.insertId, code, group_code, group_name, name, accessory, accessory_price, prices: prices || {}, accessories: accessories || [] }
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// PUT /api/product-catalog/products/:id
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] Updating product ID ${id}:`, JSON.stringify(req.body, null, 2));
        const { code, group_code, group_name, name, accessory, accessory_price, prices, accessories } = req.body;

        // Ensure accessories are numbers
        const sanitizedAccessories = (accessories || []).map(acc => ({
            name: String(acc.name || ''),
            price: Number(acc.price) || 0
        }));

        logToFile({ action: 'updateProduct', id, body: req.body, sanitizedAccessories });

        const [result] = await db.query(
            'UPDATE product_catalog SET code = ?, group_code = ?, group_name = ?, name = ?, accessory = ?, accessory_price = ?, prices_json = ?, accessories_json = ? WHERE id = ?',
            [code, group_code || '', group_name || '', name, accessory || null, accessory_price || 0, JSON.stringify(prices || {}), JSON.stringify(sanitizedAccessories), id]
        );
        logToFile({ action: 'updateProduct_result', id, result });
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// DELETE /api/product-catalog/products/:id
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM product_catalog WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.json({ success: true, message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
