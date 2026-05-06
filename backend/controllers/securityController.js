/**
 * Security Controller
 * Handles login history, session management, and password change
 */

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Get login history for current user
 */
async function getLoginHistory(req, res) {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;

        const [rows] = await pool.query(`
            SELECT 
                id,
                ip_address,
                device_info,
                browser,
                os,
                location,
                status,
                failure_reason,
                created_at
            FROM login_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [userId, limit]);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error getting login history:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử đăng nhập'
        });
    }
}

/**
 * Get active sessions for current user
 */
async function getActiveSessions(req, res) {
    try {
        const userId = req.user.id;
        const currentToken = req.headers.authorization?.split(' ')[1];

        const [rows] = await pool.query(`
            SELECT 
                id,
                ip_address,
                device_info,
                browser,
                os,
                is_current,
                last_activity,
                created_at
            FROM user_sessions
            WHERE user_id = ? AND is_active = TRUE
            ORDER BY last_activity DESC
        `, [userId]);

        // Mark current session
        const sessions = rows.map(session => ({
            ...session,
            is_current: session.session_token === currentToken
        }));

        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Error getting active sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phiên đăng nhập'
        });
    }
}

/**
 * Terminate a specific session
 */
async function terminateSession(req, res) {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;

        const [result] = await pool.query(`
            UPDATE user_sessions 
            SET is_active = FALSE 
            WHERE id = ? AND user_id = ?
        `, [sessionId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiên đăng nhập'
            });
        }

        res.json({
            success: true,
            message: 'Đã đăng xuất phiên thành công'
        });
    } catch (error) {
        console.error('Error terminating session:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đăng xuất phiên'
        });
    }
}

/**
 * Terminate all sessions except current
 */
async function terminateAllSessions(req, res) {
    try {
        const userId = req.user.id;
        const currentToken = req.headers.authorization?.split(' ')[1];

        const [result] = await pool.query(`
            UPDATE user_sessions 
            SET is_active = FALSE 
            WHERE user_id = ? AND session_token != ?
        `, [userId, currentToken]);

        res.json({
            success: true,
            message: `Đã đăng xuất ${result.affectedRows} phiên khác`
        });
    } catch (error) {
        console.error('Error terminating all sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đăng xuất các phiên khác'
        });
    }
}

/**
 * Change password
 */
async function changePassword(req, res) {
    try {
        const userId = req.user.id;
        const { current_password, new_password, confirm_password } = req.body;

        // Validate input
        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }

        if (new_password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới không khớp'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
            });
        }

        // Get current user password
        const [users] = await pool.query(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await pool.query(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
            [hashedPassword, userId]
        );

        // Log password change activity
        await pool.query(`
            INSERT INTO login_history (user_id, ip_address, status, device_info, browser, os, failure_reason)
            VALUES (?, ?, 'success', 'Password Changed', 'System', 'System', NULL)
        `, [userId, req.ip || 'unknown']);

        res.json({
            success: true,
            message: 'Đã đổi mật khẩu thành công'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đổi mật khẩu'
        });
    }
}

/**
 * Log login attempt (called from auth controller)
 */
async function logLoginAttempt(userId, req, status, failureReason = null) {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

        // Parse user agent for browser/OS info
        const browserInfo = parseUserAgent(userAgent);

        await pool.query(`
            INSERT INTO login_history (user_id, ip_address, user_agent, device_info, browser, os, status, failure_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId,
            ipAddress,
            userAgent,
            browserInfo.device,
            browserInfo.browser,
            browserInfo.os,
            status,
            failureReason
        ]);
    } catch (error) {
        console.error('Error logging login attempt:', error);
    }
}

/**
 * Create session record (called from auth controller)
 */
async function createSession(userId, token, req) {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

        const browserInfo = parseUserAgent(userAgent);

        // Deactivate expired sessions
        await pool.query(`
            UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW()
        `);

        // Create new session
        await pool.query(`
            INSERT INTO user_sessions (user_id, session_token, ip_address, device_info, browser, os, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
        `, [
            userId,
            token,
            ipAddress,
            browserInfo.device,
            browserInfo.browser,
            browserInfo.os
        ]);
    } catch (error) {
        console.error('Error creating session:', error);
    }
}

/**
 * Parse user agent string to extract browser, OS, device info
 */
function parseUserAgent(userAgent) {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Unknown Device';

    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
        browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
        browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
        browser = 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
        browser = 'Opera';
    }

    // Detect OS
    if (userAgent.includes('Windows NT 10')) {
        os = 'Windows 10/11';
    } else if (userAgent.includes('Windows')) {
        os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
        os = 'macOS';
    } else if (userAgent.includes('Linux')) {
        os = 'Linux';
    } else if (userAgent.includes('Android')) {
        os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
    }

    // Device info
    if (userAgent.includes('Mobile')) {
        device = `Mobile - ${browser}`;
    } else {
        device = `Desktop - ${browser}`;
    }

    return { browser, os, device };
}

module.exports = {
    getLoginHistory,
    getActiveSessions,
    terminateSession,
    terminateAllSessions,
    changePassword,
    logLoginAttempt,
    createSession
};
