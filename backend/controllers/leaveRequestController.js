const db = require('../config/db');
const { emitDataChange } = require('../services/socketService');

// Create leave request
exports.createLeave = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, start_date, end_date, days_count, reason } = req.body;

        if (!type || !start_date || !end_date || !reason) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Calculate days if not provided
        let days = parseFloat(days_count);
        if (!days || isNaN(days)) {
            const start = new Date(start_date);
            const end = new Date(end_date);
            days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        const [result] = await db.query(`
            INSERT INTO leave_requests (user_id, type, start_date, end_date, days_count, reason)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, type, start_date, end_date, days, reason]);

        emitDataChange('leave_requests', 'created', { id: result.insertId, user_id: userId });

        res.status(201).json({
            success: true,
            message: 'Đã gửi đơn xin phép',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('createLeave error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Get my leave requests
exports.getMyLeaves = async (req, res) => {
    try {
        const userId = req.user.id;
        const { year } = req.query;
        const y = parseInt(year) || new Date().getFullYear();

        const [leaves] = await db.query(`
            SELECT lr.*, u.full_name as approved_by_name
            FROM leave_requests lr
            LEFT JOIN users u ON lr.approved_by = u.id
            WHERE lr.user_id = ? AND YEAR(lr.start_date) = ?
            ORDER BY lr.created_at DESC
        `, [userId, y]);

        // Summary
        const approved = leaves.filter(l => l.status === 'approved');
        const summary = {
            total_requested: leaves.length,
            pending: leaves.filter(l => l.status === 'pending').length,
            approved: approved.length,
            rejected: leaves.filter(l => l.status === 'rejected').length,
            total_days_used: approved.reduce((sum, l) => sum + parseFloat(l.days_count), 0)
        };

        res.json({ success: true, data: { leaves, summary } });
    } catch (error) {
        console.error('getMyLeaves error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Admin: Get all leave requests
exports.getAllLeaves = async (req, res) => {
    try {
        const { status, month, year } = req.query;

        let query = `
            SELECT lr.*, u.full_name, u.avatar_url, u.email,
                   approver.full_name as approved_by_name
            FROM leave_requests lr
            JOIN users u ON lr.user_id = u.id
            LEFT JOIN users approver ON lr.approved_by = approver.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND lr.status = ?';
            params.push(status);
        }
        if (year) {
            query += ' AND YEAR(lr.start_date) = ?';
            params.push(parseInt(year));
        }
        if (month) {
            query += ' AND MONTH(lr.start_date) = ?';
            params.push(parseInt(month));
        }

        query += ' ORDER BY lr.created_at DESC';

        const [leaves] = await db.query(query, params);
        res.json({ success: true, data: leaves });
    } catch (error) {
        console.error('getAllLeaves error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Admin: Approve leave
exports.approveLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        const [leave] = await db.query('SELECT * FROM leave_requests WHERE id = ?', [id]);
        if (leave.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn phép' });
        }
        if (leave[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Đơn đã được xử lý' });
        }

        await db.query(`
            UPDATE leave_requests SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?
        `, [adminId, id]);

        // Create attendance records as 'on_leave' for each day
        const start = new Date(leave[0].start_date);
        const end = new Date(leave[0].end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            await db.query(`
                INSERT INTO attendance_records (user_id, date, status) VALUES (?, ?, 'on_leave')
                ON DUPLICATE KEY UPDATE status = 'on_leave'
            `, [leave[0].user_id, dateStr]);
        }

        emitDataChange('leave_requests', 'approved', { id, user_id: leave[0].user_id });

        res.json({ success: true, message: 'Đã duyệt đơn xin phép' });
    } catch (error) {
        console.error('approveLeave error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Admin: Reject leave
exports.rejectLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { reject_reason } = req.body;
        const adminId = req.user.id;

        await db.query(`
            UPDATE leave_requests SET status = 'rejected', approved_by = ?, approved_at = NOW(), reject_reason = ? WHERE id = ?
        `, [adminId, reject_reason || null, id]);

        emitDataChange('leave_requests', 'rejected', { id });

        res.json({ success: true, message: 'Đã từ chối đơn xin phép' });
    } catch (error) {
        console.error('rejectLeave error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Delete leave request (only pending)
exports.deleteLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [leave] = await db.query('SELECT * FROM leave_requests WHERE id = ? AND user_id = ?', [id, userId]);
        if (leave.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn phép' });
        }
        if (leave[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn chưa duyệt' });
        }

        await db.query('DELETE FROM leave_requests WHERE id = ?', [id]);
        res.json({ success: true, message: 'Đã hủy đơn xin phép' });
    } catch (error) {
        console.error('deleteLeave error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
