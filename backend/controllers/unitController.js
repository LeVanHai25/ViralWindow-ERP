// unitController.js - Controller for units (đơn vị/chi nhánh)
const pool = require('../config/db');

// Get all units
const getUnits = async (req, res) => {
    try {
        const [units] = await pool.query(`
            SELECT u.*, 
                   (SELECT COUNT(*) FROM customers WHERE unit_id = u.id) as customer_count
            FROM units u 
            WHERE u.status = 'active'
            ORDER BY u.name
        `);
        res.json({ success: true, data: units });
    } catch (error) {
        console.error('Error getting units:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get unit by ID
const getUnitById = async (req, res) => {
    try {
        const { id } = req.params;
        const [units] = await pool.query('SELECT * FROM units WHERE id = ?', [id]);
        if (units.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn vị' });
        }
        res.json({ success: true, data: units[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create unit
const createUnit = async (req, res) => {
    try {
        const { name, code, address, phone, manager_name } = req.body;
        const [result] = await pool.query(
            'INSERT INTO units (name, code, address, phone, manager_name) VALUES (?, ?, ?, ?, ?)',
            [name, code, address, phone, manager_name]
        );
        res.json({ success: true, data: { id: result.insertId, name, code } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update unit
const updateUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, address, phone, manager_name, status } = req.body;
        await pool.query(
            'UPDATE units SET name = ?, code = ?, address = ?, phone = ?, manager_name = ?, status = ? WHERE id = ?',
            [name, code, address, phone, manager_name, status, id]
        );
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete unit
const deleteUnit = async (req, res) => {
    try {
        const { id } = req.params;
        // Set customers to null before delete
        await pool.query('UPDATE customers SET unit_id = NULL WHERE unit_id = ?', [id]);
        await pool.query('DELETE FROM units WHERE id = ?', [id]);
        res.json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get customers by unit
const getCustomersByUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const [customers] = await pool.query(`
            SELECT c.*, u.name as unit_name, u.code as unit_code
            FROM customers c
            LEFT JOIN units u ON c.unit_id = u.id
            WHERE c.unit_id = ?
            ORDER BY c.name
        `, [id]);
        res.json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getUnits,
    getUnitById,
    createUnit,
    updateUnit,
    deleteUnit,
    getCustomersByUnit
};
