/**
 * Role Controller - Quản lý Chức Vụ
 * ViralWindow RBAC System
 */

const db = require("../config/db");

/**
 * Lấy danh sách tất cả chức vụ
 */
exports.getRoles = async (req, res) => {
    try {
        const [roles] = await db.query(`
            SELECT r.*, 
                   COUNT(DISTINCT rp.permission_id) as permission_count,
                   COUNT(DISTINCT u.id) as user_count
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN users u ON r.id = u.role_id
            WHERE r.is_active = TRUE
            GROUP BY r.id
            ORDER BY r.is_system DESC, r.name ASC
        `);

        res.json({
            success: true,
            data: roles
        });
    } catch (err) {
        console.error("Error getting roles:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách chức vụ"
        });
    }
};

/**
 * Lấy chi tiết một chức vụ
 */
exports.getRole = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin role
        const [roles] = await db.query(
            "SELECT * FROM roles WHERE id = ?",
            [id]
        );

        if (roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy chức vụ"
            });
        }

        // Lấy danh sách permissions của role
        const [permissions] = await db.query(`
            SELECT p.* FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            ORDER BY p.sort_order
        `, [id]);

        // Lấy danh sách users có role này
        const [users] = await db.query(`
            SELECT id, full_name, email, phone, is_active 
            FROM users WHERE role_id = ?
        `, [id]);

        res.json({
            success: true,
            data: {
                ...roles[0],
                permissions,
                users
            }
        });
    } catch (err) {
        console.error("Error getting role:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy thông tin chức vụ"
        });
    }
};

/**
 * Tạo chức vụ mới
 */
exports.createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Tên chức vụ là bắt buộc"
            });
        }

        // Kiểm tra tên đã tồn tại chưa
        const [existing] = await db.query(
            "SELECT id FROM roles WHERE name = ?",
            [name]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Tên chức vụ đã tồn tại"
            });
        }

        // Tạo role mới
        const [result] = await db.query(
            "INSERT INTO roles (name, description) VALUES (?, ?)",
            [name, description || null]
        );

        const roleId = result.insertId;

        // Gán permissions nếu có
        if (permissions && permissions.length > 0) {
            const permissionValues = permissions.map(pId => [roleId, pId]);
            await db.query(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                [permissionValues]
            );
        }

        res.status(201).json({
            success: true,
            message: "Tạo chức vụ thành công",
            data: { id: roleId, name, description }
        });
    } catch (err) {
        console.error("Error creating role:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo chức vụ"
        });
    }
};

/**
 * Cập nhật chức vụ
 */
exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;

        // Kiểm tra role có tồn tại không
        const [roles] = await db.query(
            "SELECT * FROM roles WHERE id = ?",
            [id]
        );

        if (roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy chức vụ"
            });
        }

        // Không cho sửa role hệ thống
        if (roles[0].is_system && name && name !== roles[0].name) {
            return res.status(400).json({
                success: false,
                message: "Không thể đổi tên chức vụ hệ thống"
            });
        }

        // Cập nhật thông tin role
        await db.query(
            "UPDATE roles SET name = ?, description = ? WHERE id = ?",
            [name || roles[0].name, description, id]
        );

        // Cập nhật permissions nếu được gửi lên
        if (permissions !== undefined) {
            // Xóa permissions cũ
            await db.query(
                "DELETE FROM role_permissions WHERE role_id = ?",
                [id]
            );

            // Thêm permissions mới
            if (permissions.length > 0) {
                const permissionValues = permissions.map(pId => [id, pId]);
                await db.query(
                    "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                    [permissionValues]
                );
            }
        }

        res.json({
            success: true,
            message: "Cập nhật chức vụ thành công"
        });
    } catch (err) {
        console.error("Error updating role:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật chức vụ"
        });
    }
};

/**
 * Xóa chức vụ
 */
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra role
        const [roles] = await db.query(
            "SELECT * FROM roles WHERE id = ?",
            [id]
        );

        if (roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy chức vụ"
            });
        }

        // Không cho xóa role hệ thống
        if (roles[0].is_system) {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa chức vụ hệ thống"
            });
        }

        // Kiểm tra có user nào đang dùng role này không
        const [users] = await db.query(
            "SELECT COUNT(*) as count FROM users WHERE role_id = ?",
            [id]
        );

        if (users[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Không thể xóa, có ${users[0].count} người dùng đang sử dụng chức vụ này`
            });
        }

        // Soft delete - chỉ đánh dấu inactive
        await db.query(
            "UPDATE roles SET is_active = FALSE WHERE id = ?",
            [id]
        );

        res.json({
            success: true,
            message: "Xóa chức vụ thành công"
        });
    } catch (err) {
        console.error("Error deleting role:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa chức vụ"
        });
    }
};

/**
 * Lấy quyền của một chức vụ
 */
exports.getRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;

        const [permissions] = await db.query(`
            SELECT p.* FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            ORDER BY p.module, p.sort_order
        `, [id]);

        res.json({
            success: true,
            data: permissions
        });
    } catch (err) {
        console.error("Error getting role permissions:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy quyền của chức vụ"
        });
    }
};

/**
 * Cập nhật quyền cho chức vụ
 */
exports.updateRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                message: "Danh sách quyền không hợp lệ"
            });
        }

        // Xóa permissions cũ
        await db.query(
            "DELETE FROM role_permissions WHERE role_id = ?",
            [id]
        );

        // Thêm permissions mới
        if (permissions.length > 0) {
            const permissionValues = permissions.map(pId => [id, pId]);
            await db.query(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                [permissionValues]
            );
        }

        res.json({
            success: true,
            message: "Cập nhật quyền thành công"
        });
    } catch (err) {
        console.error("Error updating role permissions:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật quyền"
        });
    }
};
