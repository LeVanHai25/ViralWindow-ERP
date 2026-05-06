const db = require('../config/db');
const { emitDataChange } = require('../services/socketService');

// Haversine distance algorithm (Meters)
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// =============================================
// CHECK-IN
// =============================================
exports.checkIn = async (req, res) => {
    try {
        const userId = req.user.id;
        const { note, lat, lng } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();

        // ---------------------------------------------
        // ANTI-FRAUD: GPS Geofencing & IP Check
        // ---------------------------------------------
        const [configData] = await db.query('SELECT office_lat, office_lng, office_radius, allowed_ips FROM company_config ORDER BY id DESC LIMIT 1');
        const config = configData.length > 0 ? configData[0] : null;

        // Xác định phương thức định vị
        let locationMethod = 'unknown';
        if (lat && lng) {
            locationMethod = 'gps';
        } else if (req.body.location_method === 'ip') {
            locationMethod = 'ip';
        } else if (req.body.location_method === 'default') {
            locationMethod = 'default';
        }
        
        if (config && config.office_lat && config.office_lng) {
            if (lat && lng) {
                // Có GPS → kiểm tra khoảng cách
                const distance = getDistance(parseFloat(lat), parseFloat(lng), parseFloat(config.office_lat), parseFloat(config.office_lng));
                if (distance > (config.office_radius || 200)) {
                    return res.status(403).json({ 
                        success: false, 
                        message: `Gian lận vị trí: Hiện tại bạn đang cách văn phòng ${Math.round(distance)} mét. Vui lòng đến công ty để chấm công!` 
                    });
                }
            }
            // Nếu không có GPS → cho phép nhưng ghi nhận source (ip/default)
        }
        
        if (config && config.allowed_ips) {
            const clientIp = req.ip || req.connection.remoteAddress || '';
            const ips = config.allowed_ips.split(',').map(ip => ip.trim());
            const ipClean = clientIp.replace('::ffff:', '');
            if (ipClean !== '127.0.0.1' && ipClean !== '::1' && !ips.includes(ipClean)) {
                return res.status(403).json({ success: false, message: 'Gian lận mạng: Bạn đang dùng Wifi ngoài luồng công ty.' });
            }
        }
        // ---------------------------------------------

        // Prevent duplicate check-in
        const [existing] = await db.query(
            'SELECT id, check_in FROM attendance_records WHERE user_id = ? AND date = ?',
            [userId, today]
        );
        if (existing.length > 0 && existing[0].check_in) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã chấm công vào hôm nay rồi',
                data: existing[0]
            });
        }

        // Detect shift assigned to user or fallback to auto-detect based on current time
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
        
        const [assigned] = await db.query(`
            SELECT ws.* FROM work_shifts ws
            INNER JOIN user_shifts us ON ws.id = us.shift_id
            WHERE us.user_id = ? AND ws.is_active = 1
            LIMIT 1
        `, [userId]);

        let shift = null;
        if (assigned.length > 0) {
            shift = assigned[0];
        } else {
            const [shifts] = await db.query(`
                SELECT * FROM work_shifts 
                WHERE is_active = 1 
                ORDER BY is_default DESC, ABS(TIMESTAMPDIFF(MINUTE, start_time, ?)) ASC 
                LIMIT 1
            `, [currentTime]);
            shift = shifts.length > 0 ? shifts[0] : null;
        }

        // Determine status: present or late
        let status = 'present';
        if (shift) {
            const shiftStart = new Date(`${today}T${shift.start_time}`);
            const diffMinutes = (now - shiftStart) / (1000 * 60);
            if (diffMinutes > shift.late_threshold_minutes) {
                status = 'late';
            }
        }

        // Get user agency
        // const [userData] = await db.query('SELECT agency_id FROM users WHERE id = ?', [userId]);
        // const agencyId = userData.length > 0 ? userData[0].agency_id : null;
        const agencyId = null; // users table does not have agency_id yet

        if (existing.length > 0) {
            // Update existing record (was pre-created as absent)
            await db.query(`
                UPDATE attendance_records 
                SET check_in = ?, check_in_lat = ?, check_in_lng = ?, check_in_note = ?, 
                    shift_id = ?, status = ?, agency_id = ?, location_method = ?
                WHERE id = ?
            `, [now, lat || null, lng || null, note || null, shift?.id || null, status, agencyId, locationMethod, existing[0].id]);
        } else {
            // Create new record
            await db.query(`
                INSERT INTO attendance_records (user_id, shift_id, date, check_in, check_in_lat, check_in_lng, check_in_note, status, agency_id, location_method)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, shift?.id || null, today, now, lat || null, lng || null, note || null, status, agencyId, locationMethod]);
        }

        // Fetch the created/updated record
        const [record] = await db.query(
            'SELECT ar.*, ws.name as shift_name FROM attendance_records ar LEFT JOIN work_shifts ws ON ar.shift_id = ws.id WHERE ar.user_id = ? AND ar.date = ?',
            [userId, today]
        );

        emitDataChange('attendance', 'checkin', { user_id: userId, date: today });

        res.json({
            success: true,
            message: status === 'late' ? 'Chấm công vào thành công (Đi muộn)' : 'Chấm công vào thành công',
            data: record[0]
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =============================================
// CHECK-OUT
// =============================================
exports.checkOut = async (req, res) => {
    try {
        const userId = req.user.id;
        const { note, lat, lng } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();

        // ---------------------------------------------
        // ANTI-FRAUD: GPS Geofencing & IP Check
        // ---------------------------------------------
        const [configData] = await db.query('SELECT office_lat, office_lng, office_radius, allowed_ips FROM company_config ORDER BY id DESC LIMIT 1');
        const config = configData.length > 0 ? configData[0] : null;

        // Xác định phương thức định vị
        let locationMethod = 'unknown';
        if (lat && lng) {
            locationMethod = 'gps';
        } else if (req.body.location_method === 'ip') {
            locationMethod = 'ip';
        } else if (req.body.location_method === 'default') {
            locationMethod = 'default';
        }
        
        if (config && config.office_lat && config.office_lng) {
            if (lat && lng) {
                const distance = getDistance(parseFloat(lat), parseFloat(lng), parseFloat(config.office_lat), parseFloat(config.office_lng));
                if (distance > (config.office_radius || 200)) {
                    return res.status(403).json({ 
                        success: false, 
                        message: `Gian lận vị trí: Hiện tại bạn đang cách văn phòng ${Math.round(distance)} mét. Vui lòng đến công ty để check-out!` 
                    });
                }
            }
        }

        if (config && config.allowed_ips) {
            const clientIp = req.ip || req.connection.remoteAddress || '';
            const ips = config.allowed_ips.split(',').map(ip => ip.trim());
            const ipClean = clientIp.replace('::ffff:', '');
            if (ipClean !== '127.0.0.1' && ipClean !== '::1' && !ips.includes(ipClean)) {
                return res.status(403).json({ success: false, message: 'Gian lận mạng: Bạn đang dùng Wifi ngoài luồng công ty.' });
            }
        }
        // ---------------------------------------------

        // Must have checked in first
        const [existing] = await db.query(
            'SELECT ar.*, ws.start_time as shift_start, ws.end_time as shift_end, ws.break_minutes, ws.early_leave_minutes FROM attendance_records ar LEFT JOIN work_shifts ws ON ar.shift_id = ws.id WHERE ar.user_id = ? AND ar.date = ?',
            [userId, today]
        );
        if (existing.length === 0 || !existing[0].check_in) {
            return res.status(400).json({
                success: false,
                message: 'Bạn chưa chấm công vào hôm nay'
            });
        }
        if (existing[0].check_out) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã chấm công ra hôm nay rồi'
            });
        }

        const record = existing[0];
        const checkInTime = new Date(record.check_in);
        const breakMinutes = record.break_minutes || 0;

        // Calculate work hours
        const totalMinutes = (now - checkInTime) / (1000 * 60);
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);
        const workHours = Math.round(workMinutes / 60 * 100) / 100;

        // Calculate overtime
        let overtimeHours = 0;
        let status = record.status; // Keep 'late' if already late
        if (record.shift_end) {
            const shiftEnd = new Date(`${today}T${record.shift_end}`);
            const shiftStart = new Date(`${today}T${record.shift_start}`);
            const shiftDuration = (shiftEnd - shiftStart) / (1000 * 60) - breakMinutes;
            
            if (workMinutes > shiftDuration) {
                overtimeHours = Math.round((workMinutes - shiftDuration) / 60 * 100) / 100;
            }

            // Check early leave
            const earlyMinutes = record.early_leave_minutes || 15;
            const minutesBeforeEnd = (shiftEnd - now) / (1000 * 60);
            if (minutesBeforeEnd > earlyMinutes) {
                status = 'early_leave';
            }
        }

        await db.query(`
            UPDATE attendance_records 
            SET check_out = ?, check_out_lat = ?, check_out_lng = ?, check_out_note = ?,
                work_hours = ?, overtime_hours = ?, status = ?
            WHERE id = ?
        `, [now, lat || null, lng || null, note || null, workHours, overtimeHours, status, record.id]);

        const [updated] = await db.query(
            'SELECT ar.*, ws.name as shift_name FROM attendance_records ar LEFT JOIN work_shifts ws ON ar.shift_id = ws.id WHERE ar.id = ?',
            [record.id]
        );

        emitDataChange('attendance', 'checkout', { user_id: userId, date: today });

        res.json({
            success: true,
            message: `Chấm công ra thành công (${workHours}h${overtimeHours > 0 ? ' + ' + overtimeHours + 'h tăng ca' : ''})`,
            data: updated[0]
        });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =============================================
// TODAY STATUS
// =============================================
exports.getTodayStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        const [records] = await db.query(`
            SELECT ar.*, ws.name as shift_name, ws.start_time as shift_start, ws.end_time as shift_end 
            FROM attendance_records ar 
            LEFT JOIN work_shifts ws ON ar.shift_id = ws.id 
            WHERE ar.user_id = ? AND ar.date = ?
        `, [userId, today]);

        // Lấy thông tin ca làm việc hiển thị trên Dashboard
        const currentTime = new Date().toTimeString().slice(0, 8);
        const [assigned] = await db.query(`
            SELECT ws.* FROM work_shifts ws
            INNER JOIN user_shifts us ON ws.id = us.shift_id
            WHERE us.user_id = ? AND ws.is_active = 1
            LIMIT 1
        `, [userId]);

        let targetShift = null;
        if (assigned.length > 0) {
            targetShift = assigned[0];
        } else {
            const [shifts] = await db.query(`
                SELECT * FROM work_shifts 
                WHERE is_active = 1 
                ORDER BY is_default DESC, ABS(TIMESTAMPDIFF(MINUTE, start_time, ?)) ASC 
                LIMIT 1
            `, [currentTime]);
            targetShift = shifts.length > 0 ? shifts[0] : null;
        }

        res.json({
            success: true,
            data: {
                record: records.length > 0 ? records[0] : null,
                default_shift: targetShift,
                server_time: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('getTodayStatus error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =============================================
// MY ATTENDANCE (Personal history)
// =============================================
exports.getMyAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month, year } = req.query;
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();

        const [records] = await db.query(`
            SELECT ar.*, ws.name as shift_name 
            FROM attendance_records ar 
            LEFT JOIN work_shifts ws ON ar.shift_id = ws.id 
            WHERE ar.user_id = ? AND MONTH(ar.date) = ? AND YEAR(ar.date) = ?
            ORDER BY ar.date ASC
        `, [userId, m, y]);

        // Summary
        const summary = {
            total_days: records.filter(r => ['present', 'late', 'early_leave'].includes(r.status)).length,
            late_days: records.filter(r => r.status === 'late').length,
            early_leave_days: records.filter(r => r.status === 'early_leave').length,
            absent_days: records.filter(r => r.status === 'absent').length,
            leave_days: records.filter(r => r.status === 'on_leave').length,
            total_work_hours: records.reduce((sum, r) => sum + (parseFloat(r.work_hours) || 0), 0),
            total_overtime: records.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0)
        };

        res.json({ success: true, data: { records, summary, month: m, year: y } });
    } catch (error) {
        console.error('getMyAttendance error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =============================================
// WEEKLY DATA (for sidebar timeline)
// =============================================
exports.getWeeklyData = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sun
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startDate = monday.toISOString().split('T')[0];
        const endDate = sunday.toISOString().split('T')[0];

        const [records] = await db.query(`
            SELECT date, status, check_in, check_out, work_hours 
            FROM attendance_records 
            WHERE user_id = ? AND date BETWEEN ? AND ?
            ORDER BY date ASC
        `, [userId, startDate, endDate]);

        res.json({ success: true, data: records });
    } catch (error) {
        console.error('getWeeklyData error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =============================================
// ADMIN: ALL ATTENDANCE
// =============================================
exports.getAllAttendance = async (req, res) => {
    try {
        const { month, year, agency_id, status } = req.query;
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();

        let query = `
            SELECT ar.*, u.full_name, u.avatar_url, u.email, ws.name as shift_name,
                   r.name as role_name
            FROM attendance_records ar
            JOIN users u ON ar.user_id = u.id
            LEFT JOIN work_shifts ws ON ar.shift_id = ws.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE MONTH(ar.date) = ? AND YEAR(ar.date) = ?
            AND (r.name IS NULL OR r.name NOT IN ('Super Admin', 'Admin', 'Giám đốc', 'Manager', 'Quản lý', 'Nhân sự'))
        `;
        const params = [m, y];

        if (agency_id) {
            query += ' AND ar.agency_id = ?';
            params.push(agency_id);
        }
        if (status && status !== 'all') {
            query += ' AND ar.status = ?';
            params.push(status);
        }

        query += ' ORDER BY ar.date DESC, u.full_name ASC';

        const [records] = await db.query(query, params);
        res.json({ success: true, data: records, month: m, year: y });
    } catch (error) {
        console.error('getAllAttendance error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =============================================
// ADMIN: MONTHLY SUMMARY
// =============================================
exports.getMonthlySummary = async (req, res) => {
    try {
        const { month, year, agency_id } = req.query;
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();

        let query = `
            SELECT u.id as user_id, u.full_name, u.avatar_url, u.email,
                   r.name as role_name,
                   COUNT(CASE WHEN ar.status IN ('present','late','early_leave') THEN 1 END) as total_days,
                   COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_days,
                   COUNT(CASE WHEN ar.status = 'early_leave' THEN 1 END) as early_leave_days,
                   COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_days,
                   COUNT(CASE WHEN ar.status = 'on_leave' THEN 1 END) as leave_days,
                   COUNT(CASE WHEN ar.status = 'holiday' THEN 1 END) as holiday_days,
                   COALESCE(SUM(ar.work_hours), 0) as total_work_hours,
                   COALESCE(SUM(ar.overtime_hours), 0) as total_overtime_hours
            FROM users u
            LEFT JOIN attendance_records ar ON u.id = ar.user_id 
                AND MONTH(ar.date) = ? AND YEAR(ar.date) = ?
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.is_active = 1
            AND u.user_type != 'admin'
            AND (r.name IS NULL OR r.name NOT IN ('Super Admin', 'Admin', 'Giám đốc', 'Manager', 'Quản lý', 'Nhân sự'))
        `;
        const params = [m, y];

        if (agency_id) {
            query += ' AND (ar.agency_id = ?)';
            params.push(agency_id);
        }

        query += ' GROUP BY u.id, u.full_name, u.avatar_url, u.email, r.name ORDER BY u.full_name ASC';

        const [data] = await db.query(query, params);
        res.json({ success: true, data, month: m, year: y });
    } catch (error) {
        console.error('getMonthlySummary error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message, stack: error.stack });
    }
};

// =============================================
// ADMIN: EDIT ATTENDANCE
// =============================================
exports.editAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { check_in, check_out, status, note } = req.body;
        const adminId = req.user.id;

        await db.query(`
            UPDATE attendance_records 
            SET check_in = COALESCE(?, check_in), 
                check_out = COALESCE(?, check_out), 
                status = COALESCE(?, status),
                check_in_note = COALESCE(?, check_in_note),
                approved_by = ?, approved_at = NOW()
            WHERE id = ?
        `, [check_in || null, check_out || null, status || null, note || null, adminId, id]);

        // Recalculate work_hours if both check_in and check_out exist
        const [record] = await db.query(`
            SELECT ar.*, ws.break_minutes 
            FROM attendance_records ar 
            LEFT JOIN work_shifts ws ON ar.shift_id = ws.id 
            WHERE ar.id = ?
        `, [id]);

        if (record.length > 0 && record[0].check_in && record[0].check_out) {
            const ci = new Date(record[0].check_in);
            const co = new Date(record[0].check_out);
            const breakMin = record[0].break_minutes || 0;
            const workHours = Math.round(((co - ci) / (1000 * 60) - breakMin) / 60 * 100) / 100;
            await db.query('UPDATE attendance_records SET work_hours = ? WHERE id = ?', [workHours, id]);
        }

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        console.error('editAttendance error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =============================================
// DASHBOARD STATS
// =============================================
exports.getStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [totalUsers] = await db.query('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1');
        const [checkedIn] = await db.query('SELECT COUNT(*) as cnt FROM attendance_records WHERE date = ? AND check_in IS NOT NULL', [today]);
        const [lateToday] = await db.query("SELECT COUNT(*) as cnt FROM attendance_records WHERE date = ? AND status = 'late'", [today]);
        const [onLeave] = await db.query("SELECT COUNT(*) as cnt FROM attendance_records WHERE date = ? AND status = 'on_leave'", [today]);
        const [pendingLeaves] = await db.query("SELECT COUNT(*) as cnt FROM leave_requests WHERE status = 'pending'");

        res.json({
            success: true,
            data: {
                total_employees: totalUsers[0].cnt,
                checked_in_today: checkedIn[0].cnt,
                late_today: lateToday[0].cnt,
                on_leave_today: onLeave[0].cnt,
                not_checked_in: totalUsers[0].cnt - checkedIn[0].cnt,
                pending_leaves: pendingLeaves[0].cnt
            }
        });
    } catch (error) {
        console.error('getStats error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
