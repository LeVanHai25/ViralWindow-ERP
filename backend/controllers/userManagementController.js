/**
 * User Management Controller - Quản lý Người Dùng
 * ViralWindow RBAC System
 */

const db = require("../config/db");
const bcrypt = require("bcryptjs");
const SystemNotifier = require("../services/SystemNotifier");

/**
 * Lấy danh sách người dùng (có pagination và filter)
 */
exports.getUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            role_id,
            is_active,
            search
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = [];
        let params = [];

        // Filter by role
        if (role_id) {
            whereConditions.push("u.role_id = ?");
            params.push(role_id);
        }

        // Filter by active status
        if (is_active !== undefined) {
            whereConditions.push("u.is_active = ?");
            params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
        }

        // Search by name, email, phone
        if (search) {
            whereConditions.push("(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)");
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        const whereClause = whereConditions.length > 0
            ? "WHERE " + whereConditions.join(" AND ")
            : "";

        // Count total
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM users u ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get users
        const [users] = await db.query(`
            SELECT u.id, u.full_name, u.email, u.phone, u.address,
                   u.user_type, u.role_id, u.is_active, u.avatar_url,
                   u.last_login, u.created_at,
                   r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Error getting users:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách người dùng"
        });
    }
};

/**
 * Lấy chi tiết một người dùng
 */
exports.getUser = async (req, res) => {
    try {
        const { id } = req.params;

        const [users] = await db.query(`
            SELECT u.id, u.full_name, u.email, u.phone, u.address,
                   u.user_type, u.role_id, u.is_active, u.avatar_url,
                   u.last_login, u.created_at,
                   r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [id]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (err) {
        console.error("Error getting user:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy thông tin người dùng"
        });
    }
};

/**
 * Tạo người dùng mới (bởi Admin)
 */
exports.createUser = async (req, res) => {
    try {
        const { full_name, email, phone, password, role_id, address } = req.body;

        // Validate required fields
        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Họ tên, email và mật khẩu là bắt buộc"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Email không đúng định dạng"
            });
        }

        // Check email exists
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

        // Check phone exists (if provided)
        if (phone) {
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
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate next ID (TiDB doesn't support AUTO_INCREMENT)
        const [maxIdResult] = await db.query("SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM users");
        const nextId = maxIdResult[0].nextId;

        // Create user
        const [result] = await db.query(`
            INSERT INTO users (id, full_name, email, phone, password, role_id, address, user_type, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 1)
        `, [nextId, full_name, email, phone || null, hashedPassword, role_id || null, address || null]);

        // Gửi thông báo tạo user
        try {
            await SystemNotifier.notify('system.user_created', {
                entityName: full_name,
                entityId: result.insertId,
                actor: SystemNotifier.getActor(req),
            });
        } catch (e) { /* không block */ }

        res.status(201).json({
            success: true,
            message: "Tạo người dùng thành công",
            data: {
                id: result.insertId,
                full_name,
                email,
                phone,
                role_id
            }
        });
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo người dùng"
        });
    }
};

/**
 * Cập nhật người dùng
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, phone, address, role_id } = req.body;

        // Check user exists
        const [users] = await db.query(
            "SELECT * FROM users WHERE id = ?",
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        // Không cho sửa thông tin Super Admin bởi người khác (trừ chính họ)
        if (users[0].user_type === 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({
                success: false,
                message: "Không thể sửa thông tin quản trị viên"
            });
        }

        // Build update query
        const updates = [];
        const params = [];

        if (full_name !== undefined) {
            updates.push("full_name = ?");
            params.push(full_name);
        }

        // Allow email update with duplicate check
        if (email !== undefined && email !== users[0].email) {
            // Check if new email already exists
            const [existingEmail] = await db.query(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                [email, id]
            );
            if (existingEmail.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Email đã được sử dụng bởi tài khoản khác"
                });
            }
            updates.push("email = ?");
            params.push(email);
        }

        if (phone !== undefined && phone !== users[0].phone) {
            // Check if phone already exists
            const [existingPhone] = await db.query(
                "SELECT id FROM users WHERE phone = ? AND id != ?",
                [phone, id]
            );
            if (existingPhone.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Số điện thoại đã được sử dụng bởi tài khoản khác"
                });
            }
            updates.push("phone = ?");
            params.push(phone);
        }
        if (address !== undefined) {
            updates.push("address = ?");
            params.push(address);
        }
        if (role_id !== undefined) {
            updates.push("role_id = ?");
            params.push(role_id || null);
        }

        if (updates.length > 0) {
            params.push(id);
            await db.query(
                `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
                params
            );
        }

        // Gửi thông báo cập nhật user
        try {
            await SystemNotifier.notify('system.user_updated', {
                entityName: full_name || users[0].full_name,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
                changedFields: updates.map(u => u.split(' = ')[0]),
            });
        } catch (e) { /* không block */ }

        res.json({
            success: true,
            message: "Cập nhật người dùng thành công"
        });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật người dùng"
        });
    }
};

/**
 * Kích hoạt/Vô hiệu hóa tài khoản
 */
exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Check user exists
        const [users] = await db.query(
            "SELECT * FROM users WHERE id = ?",
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        // Không cho vô hiệu hóa Super Admin
        if (users[0].user_type === 'admin') {
            return res.status(403).json({
                success: false,
                message: "Không thể vô hiệu hóa quản trị viên"
            });
        }

        const newStatus = users[0].is_active ? 0 : 1;
        await db.query(
            "UPDATE users SET is_active = ? WHERE id = ?",
            [newStatus, id]
        );

        // Gửi thông báo toggle status
        try {
            await SystemNotifier.notify(newStatus ? 'system.user_updated' : 'system.user_deactivated', {
                entityName: users[0].full_name,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
            });
        } catch (e) { /* không block */ }

        res.json({
            success: true,
            message: newStatus ? "Kích hoạt tài khoản thành công" : "Vô hiệu hóa tài khoản thành công",
            data: { is_active: !!newStatus }
        });
    } catch (err) {
        console.error("Error toggling user status:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi thay đổi trạng thái"
        });
    }
};

/**
 * Reset mật khẩu người dùng
 */
exports.resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu mới phải có ít nhất 6 ký tự"
            });
        }

        // Check user exists
        const [users] = await db.query(
            "SELECT * FROM users WHERE id = ?",
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        await db.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, id]
        );

        // Gửi thông báo reset password
        try {
            await SystemNotifier.notify('system.password_reset', {
                entityName: users[0].full_name,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
            });
        } catch (e) { /* không block */ }

        res.json({
            success: true,
            message: "Đặt lại mật khẩu thành công"
        });
    } catch (err) {
        console.error("Error resetting password:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi đặt lại mật khẩu"
        });
    }
};

/**
 * Xóa người dùng (soft delete)
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check user exists
        const [users] = await db.query(
            "SELECT * FROM users WHERE id = ?",
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        // Không cho xóa Super Admin
        if (users[0].user_type === 'admin') {
            return res.status(403).json({
                success: false,
                message: "Không thể xóa quản trị viên"
            });
        }

        // Không cho tự xóa bản thân
        if (req.user.id === parseInt(id)) {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa tài khoản của chính bạn"
            });
        }

        // Hard delete - xóa hoàn toàn khỏi database
        await db.query(
            "DELETE FROM users WHERE id = ?",
            [id]
        );

        // Gửi thông báo xóa user
        try {
            await SystemNotifier.notify('system.user_deactivated', {
                entityName: users[0].full_name,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
            });
        } catch (e) { /* không block */ }

        res.json({
            success: true,
            message: "Xóa người dùng thành công"
        });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa người dùng"
        });
    }
};
