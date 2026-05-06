const jwt = require("jsonwebtoken");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

exports.authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Không có token xác thực"
        });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);

        // Check if session is still active in database (non-blocking)
        try {
            const [sessions] = await db.query(
                "SELECT id FROM user_sessions WHERE session_token = ? AND is_active = TRUE LIMIT 1",
                [token]
            );

            // If session was terminated, check if it was explicitly revoked
            if (sessions.length === 0) {
                const [revokedSessions] = await db.query(
                    "SELECT id FROM user_sessions WHERE session_token = ? AND is_active = FALSE LIMIT 1",
                    [token]
                );

                // Only reject if this specific token was explicitly revoked
                if (revokedSessions.length > 0) {
                    return res.status(401).json({
                        success: false,
                        message: "Phiên đăng nhập đã hết hạn hoặc đã bị đăng xuất",
                        code: "SESSION_EXPIRED"
                    });
                }
                // If token not found in sessions table at all, allow through
                // (login controller may not create session records)
            }
        } catch (sessionError) {
            // If user_sessions table doesn't exist or query fails, skip session check
            console.error("Session check error (non-critical):", sessionError.message);
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: "Token không hợp lệ"
        });
    }
};

exports.requireAdmin = (req, res, next) => {
    if (req.user.user_type !== 'admin') {
        return res.status(403).json({
            success: false,
            message: "Chỉ quản trị viên mới có quyền truy cập"
        });
    }
    next();
};

/**
 * Optional authentication - allows requests without token to pass through
 * Sets req.user to null if no token provided
 */
exports.optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

/**
 * Middleware kiểm tra quyền động
 * Sử dụng: requirePermission('projects.create')
 * @param {string} permissionCode - Mã quyền cần kiểm tra (vd: 'projects.view')
 */
exports.requirePermission = (permissionCode) => {
    return async (req, res, next) => {
        try {
            const db = require("../config/db");
            const userId = req.user.id;

            // Lấy thông tin user
            const [users] = await db.query(
                "SELECT role_id, user_type FROM users WHERE id = ?",
                [userId]
            );

            if (users.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "Không tìm thấy người dùng"
                });
            }

            const user = users[0];

            // Admin cũ (user_type = 'admin') có full quyền
            if (user.user_type === 'admin') {
                return next();
            }

            // Không có role = không có quyền
            if (!user.role_id) {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền thực hiện hành động này"
                });
            }

            // Kiểm tra permission trong role
            const [result] = await db.query(`
                SELECT 1 FROM role_permissions rp
                INNER JOIN permissions p ON rp.permission_id = p.id
                WHERE rp.role_id = ? AND p.code = ?
                LIMIT 1
            `, [user.role_id, permissionCode]);

            if (result.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền thực hiện hành động này",
                    requiredPermission: permissionCode
                });
            }

            next();
        } catch (err) {
            console.error("Error checking permission:", err);
            res.status(500).json({
                success: false,
                message: "Lỗi khi kiểm tra quyền"
            });
        }
    };
};

