const db = require('../config/db');

// Get all shifts
exports.getShifts = async (req, res) => {
    try {
        const [shifts] = await db.query('SELECT * FROM work_shifts ORDER BY is_default DESC, start_time ASC');
        res.json({ success: true, data: shifts });
    } catch (error) {
        console.error('getShifts error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Create shift
exports.createShift = async (req, res) => {
    try {
        const { name, start_time, end_time, break_minutes, late_threshold_minutes, early_leave_minutes, is_default, agency_id } = req.body;
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên ca, giờ bắt đầu và kết thúc' });
        }

        // If setting as default, unset others
        if (is_default) {
            await db.query('UPDATE work_shifts SET is_default = 0');
        }

        const [result] = await db.query(`
            INSERT INTO work_shifts (name, start_time, end_time, break_minutes, late_threshold_minutes, early_leave_minutes, is_default, agency_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, start_time, end_time, break_minutes || 0, late_threshold_minutes || 15, early_leave_minutes || 15, is_default ? 1 : 0, agency_id || null]);

        res.status(201).json({ success: true, message: 'Tạo ca làm thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('createShift error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Update shift
exports.updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, break_minutes, late_threshold_minutes, early_leave_minutes, is_default, is_active, agency_id } = req.body;

        if (is_default) {
            await db.query('UPDATE work_shifts SET is_default = 0');
        }

        await db.query(`
            UPDATE work_shifts 
            SET name = ?, start_time = ?, end_time = ?, break_minutes = ?, 
                late_threshold_minutes = ?, early_leave_minutes = ?, 
                is_default = ?, is_active = ?, agency_id = ?
            WHERE id = ?
        `, [name, start_time, end_time, break_minutes || 0, late_threshold_minutes || 15, early_leave_minutes || 15, is_default ? 1 : 0, is_active !== undefined ? is_active : 1, agency_id || null, id]);

        res.json({ success: true, message: 'Cập nhật ca làm thành công' });
    } catch (error) {
        console.error('updateShift error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Delete shift
exports.deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const [shift] = await db.query('SELECT is_default FROM work_shifts WHERE id = ?', [id]);
        if (shift.length > 0 && shift[0].is_default) {
            return res.status(400).json({ success: false, message: 'Không thể xóa ca mặc định' });
        }
        await db.query('DELETE FROM work_shifts WHERE id = ?', [id]);
        res.json({ success: true, message: 'Đã xóa ca làm' });
    } catch (error) {
        console.error('deleteShift error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Get shift assignments for all users
exports.getAssignments = async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.full_name, u.email, u.user_type, r.name as role_name, us.shift_id, ws.name as shift_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN user_shifts us ON u.id = us.user_id
            LEFT JOIN work_shifts ws ON us.shift_id = ws.id
            ORDER BY u.full_name ASC
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('getAssignments error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Assign or Update shift for user
exports.assignShift = async (req, res) => {
    try {
        const { user_id, shift_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin user' });
        }
        
        if (!shift_id) {
            // Unassign
            await db.query('DELETE FROM user_shifts WHERE user_id = ?', [user_id]);
            return res.json({ success: true, message: 'Đã gỡ ca làm việc, quay về ca mặc định' });
        }

        // Use UPSERT syntax
        await db.query(`
            INSERT INTO user_shifts (user_id, shift_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id)
        `, [user_id, shift_id]);
        
        res.json({ success: true, message: 'Cập nhật gán ca thành công' });
    } catch (error) {
        console.error('assignShift error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
