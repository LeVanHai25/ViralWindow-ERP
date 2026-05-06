const db = require('../config/db');

// Get all holidays
exports.getHolidays = async (req, res) => {
    try {
        const { year } = req.query;
        const y = parseInt(year) || new Date().getFullYear();

        const [holidays] = await db.query(`
            SELECT * FROM holidays 
            WHERE year = ? OR (is_recurring = 1 AND (year IS NULL OR year = ?))
            ORDER BY date ASC
        `, [y, y]);

        res.json({ success: true, data: holidays });
    } catch (error) {
        console.error('getHolidays error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Create holiday
exports.createHoliday = async (req, res) => {
    try {
        const { name, date, is_recurring, year } = req.body;
        if (!name || !date) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên và ngày lễ' });
        }

        const [result] = await db.query(`
            INSERT INTO holidays (name, date, is_recurring, year) VALUES (?, ?, ?, ?)
        `, [name, date, is_recurring ? 1 : 0, year || null]);

        res.status(201).json({ success: true, message: 'Thêm ngày lễ thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('createHoliday error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Update holiday
exports.updateHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, date, is_recurring, year } = req.body;

        await db.query(`
            UPDATE holidays SET name = ?, date = ?, is_recurring = ?, year = ? WHERE id = ?
        `, [name, date, is_recurring ? 1 : 0, year || null, id]);

        res.json({ success: true, message: 'Cập nhật ngày lễ thành công' });
    } catch (error) {
        console.error('updateHoliday error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Delete holiday
exports.deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM holidays WHERE id = ?', [id]);
        res.json({ success: true, message: 'Đã xóa ngày lễ' });
    } catch (error) {
        console.error('deleteHoliday error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
