const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const SystemNotifier = require("../services/SystemNotifier");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

// Register
exports.register = async (req, res) => {
    try {
        const { full_name, phone, email, address, password, user_type } = req.body;

        // Validate required fields
        if (!full_name || !phone || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng điền đầy đủ thông tin bắt buộc"
            });
        }

        // Check if email already exists
        const [emailExists] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (emailExists.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email đã được sử dụng"
            });
        }

        // Check if phone already exists
        const [phoneExists] = await db.query(
            "SELECT id FROM users WHERE phone = ?",
            [phone]
        );

        if (phoneExists.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Số điện thoại đã được sử dụng"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine default role_id based on user_type
        // Admin → Super Admin (role_id = 1)
        // User → Kinh doanh (role_id = 8) - default role for regular users
        const userType = user_type || 'user';
        const defaultRoleId = userType === 'admin' ? 1 : 8;

        // Create user with default role
        // Generate next ID (TiDB doesn't support AUTO_INCREMENT)
        const [maxIdResult] = await db.query("SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM users");
        const nextId = maxIdResult[0].nextId;

        const [result] = await db.query(
            `INSERT INTO users (id, full_name, phone, email, address, password, user_type, role_id, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [nextId, full_name, phone, email, address || null, hashedPassword, userType, defaultRoleId]
        );

        // Fetch role name for response
        const [roleData] = await db.query(
            'SELECT name as role_name FROM roles WHERE id = ?',
            [defaultRoleId]
        );
        const roleName = roleData.length > 0 ? roleData[0].role_name : 'Chưa phân quyền';

        // Generate token with role_id and role_name
        const token = jwt.sign(
            {
                id: result.insertId,
                email,
                full_name,
                user_type: userType,
                role_id: defaultRoleId,
                role_name: 'Nhân viên' // Default role for new register
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: "Đăng ký thành công",
            data: {
                token,
                user: {
                    id: result.insertId,
                    full_name,
                    email,
                    phone,
                    user_type: userType,
                    role_id: defaultRoleId,
                    role_name: roleName
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password, remember_me } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập email và mật khẩu"
            });
        }

        // Find user with role info - JOIN với bảng roles để lấy tên chức vụ
        const [users] = await db.query(`
            SELECT u.*, r.name as role_name, r.description as role_description
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.email = ? AND u.is_active = 1
        `, [email]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không đúng"
            });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không đúng"
            });
        }

        // Generate token - thêm role_id, role_name và full_name vào JWT
        const expiresIn = remember_me ? "30d" : JWT_EXPIRES_IN;
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                user_type: user.user_type,
                role_id: user.role_id || null,
                role_name: user.role_name || 'Nhân viên'
            },
            JWT_SECRET,
            { expiresIn }
        );

        // Update last login
        await db.query(
            "UPDATE users SET last_login = NOW() WHERE id = ?",
            [user.id]
        );

        // Log successful login to login_history and create session
        try {
            const securityController = require('./securityController');
            await securityController.logLoginAttempt(user.id, req, 'success');
            await securityController.createSession(user.id, token, req);
        } catch (securityError) {
            console.error('Security logging error (non-critical):', securityError);
            // Continue even if security logging fails
        }

        // Response với đầy đủ role info

        // Ghi log đăng nhập
        try {
            await SystemNotifier.notify('system.user_login', {
                entityName: user.full_name,
                entityId: user.id,
                actor: { id: user.id, name: user.full_name, ip: req.ip, userAgent: req.headers['user-agent'] },
            });
        } catch (e) { /* không block */ }

        res.json({
            success: true,
            message: "Đăng nhập thành công",
            data: {
                token,
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    user_type: user.user_type,
                    role_id: user.role_id,
                    role_name: user.role_name || 'Chưa phân quyền',
                    role_description: user.role_description,
                    avatar_url: user.avatar_url
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập email"
            });
        }

        // Find user
        const [users] = await db.query(
            "SELECT id, email FROM users WHERE email = ? AND is_active = 1",
            [email]
        );

        if (users.length === 0) {
            // Don't reveal if email exists for security
            return res.json({
                success: true,
                message: "Nếu email tồn tại, mã xác nhận đã được gửi"
            });
        }

        // Generate reset code (6 digits)
        const resetCode = crypto.randomInt(100000, 999999).toString();
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Save reset code to database
        await db.query(
            `INSERT INTO password_resets (user_id, email, reset_code, reset_token, expires_at) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             reset_code = VALUES(reset_code),
             reset_token = VALUES(reset_token),
             expires_at = VALUES(expires_at),
             created_at = NOW()`,
            [users[0].id, email, resetCode, resetToken, expiresAt]
        );

        // In production, send email here
        console.log(`Reset code for ${email}: ${resetCode}`);

        res.json({
            success: true,
            message: "Mã xác nhận đã được gửi đến email của bạn",
            data: {
                // In development, return code for testing
                code: process.env.NODE_ENV === 'development' ? resetCode : undefined
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Verify Reset Code
exports.verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập email và mã xác nhận"
            });
        }

        // Find reset record
        const [resets] = await db.query(
            `SELECT * FROM password_resets 
             WHERE email = ? AND reset_code = ? AND expires_at > NOW() AND used = 0
             ORDER BY created_at DESC LIMIT 1`,
            [email, code]
        );

        if (resets.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Mã xác nhận không đúng hoặc đã hết hạn"
            });
        }

        res.json({
            success: true,
            message: "Mã xác nhận hợp lệ",
            data: {
                token: resets[0].reset_token
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { email, token, new_password } = req.body;

        if (!email || !token || !new_password) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin"
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu phải có ít nhất 6 ký tự"
            });
        }

        // Verify reset token
        const [resets] = await db.query(
            `SELECT * FROM password_resets 
             WHERE email = ? AND reset_token = ? AND expires_at > NOW() AND used = 0
             ORDER BY created_at DESC LIMIT 1`,
            [email, token]
        );

        if (resets.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Token không hợp lệ hoặc đã hết hạn"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await db.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email]
        );

        // Mark reset as used
        await db.query(
            "UPDATE password_resets SET used = 1 WHERE id = ?",
            [resets[0].id]
        );

        res.json({
            success: true,
            message: "Đặt lại mật khẩu thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Get Current User
exports.getMe = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await db.query(`
            SELECT u.id, u.full_name, u.email, u.phone, u.address, u.user_type, 
                   u.avatar_url, u.created_at, u.role_id,
                   u.timezone, u.date_format, u.language, u.remember_me,
                   r.name as role_name, r.description as role_description
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        const user = users[0];
        // Đảm bảo role_name có giá trị mặc định
        user.role_name = user.role_name || 'Chưa phân quyền';

        res.json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, phone, address, avatar_url, current_password, new_password, timezone, date_format, language, remember_me } = req.body;

        // If password change is requested
        if (new_password) {
            if (!current_password) {
                return res.status(400).json({
                    success: false,
                    message: "Vui lòng nhập mật khẩu hiện tại"
                });
            }

            // Get current user
            const [users] = await db.query(
                "SELECT password FROM users WHERE id = ?",
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy người dùng"
                });
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(current_password, users[0].password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: "Mật khẩu hiện tại không đúng"
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);

            // Update password
            await db.query(
                "UPDATE users SET password = ? WHERE id = ?",
                [hashedPassword, userId]
            );
        }

        // Update profile info
        const updateFields = [];
        const updateValues = [];

        if (full_name !== undefined) {
            updateFields.push("full_name = ?");
            updateValues.push(full_name);
        }
        if (phone !== undefined) {
            // Check if phone already exists for another user
            const [phoneExists] = await db.query(
                "SELECT id FROM users WHERE phone = ? AND id != ?",
                [phone, userId]
            );

            if (phoneExists.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Số điện thoại đã được sử dụng bởi tài khoản khác"
                });
            }
            updateFields.push("phone = ?");
            updateValues.push(phone);
        }
        if (address !== undefined) {
            updateFields.push("address = ?");
            updateValues.push(address);
        }
        if (avatar_url !== undefined && avatar_url !== null) {
            updateFields.push("avatar_url = ?");
            updateValues.push(avatar_url);
        }
        if (timezone !== undefined) {
            updateFields.push("timezone = ?");
            updateValues.push(timezone);
        }
        if (date_format !== undefined) {
            updateFields.push("date_format = ?");
            updateValues.push(date_format);
        }
        if (language !== undefined) {
            updateFields.push("language = ?");
            updateValues.push(language);
        }
        if (remember_me !== undefined) {
            updateFields.push("remember_me = ?");
            updateValues.push(remember_me ? 1 : 0);
        }

        if (updateFields.length > 0) {
            updateValues.push(userId);
            const [result] = await db.query(
                `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
                updateValues
            );

            // Log để debug
            console.log(`Updated user ${userId} with fields: ${updateFields.join(", ")}`);
        }

        // Return updated user data with role info
        const [updatedUsers] = await db.query(`
            SELECT u.id, u.full_name, u.email, u.phone, u.address, u.user_type, 
                   u.avatar_url, u.created_at, u.role_id,
                   u.timezone, u.date_format, u.language, u.remember_me,
                   r.name as role_name, r.description as role_description
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [userId]);

        res.json({
            success: true,
            message: "Cập nhật thông tin thành công",
            data: updatedUsers[0] || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// Logout
exports.logout = async (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // You can implement token blacklisting here if needed
    res.json({
        success: true,
        message: "Đăng xuất thành công"
    });
};

