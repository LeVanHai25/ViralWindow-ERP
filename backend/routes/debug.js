const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * Debug API - Chỉ dùng để kiểm tra data trong development
 * KHÔNG sử dụng trên production!
 */

// GET /api/debug/roles - Xem tất cả roles
router.get('/roles', async (req, res) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles ORDER BY id');
        const [users] = await db.query(`
            SELECT u.id, u.full_name, u.email, u.user_type, u.role_id, 
                   r.name as role_name, r.description as role_description
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id
        `);

        res.json({
            success: true,
            data: {
                roles_count: roles.length,
                users_count: users.length,
                roles,
                users
            }
        });
    } catch (err) {
        console.error('Debug error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/debug/fix-roles - Fix role data
router.post('/fix-roles', async (req, res) => {
    try {
        // Reset roles table với data chuẩn
        await db.query('DELETE FROM roles WHERE id > 0');

        await db.query(`
            INSERT INTO roles (id, name, description, is_system, is_active) VALUES
            (1, 'Super Admin', 'Quản trị viên cao nhất - Full quyền hệ thống', TRUE, TRUE),
            (2, 'Quản lý', 'Quản lý công ty - Có hầu hết các quyền', FALSE, TRUE),
            (3, 'Kế toán', 'Bộ phận kế toán - Quản lý tài chính', FALSE, TRUE),
            (4, 'Thiết kế', 'Nhân viên thiết kế - Xử lý bản vẽ, BOM', FALSE, TRUE),
            (5, 'Sản xuất', 'Bộ phận sản xuất - Theo dõi sản xuất', FALSE, TRUE),
            (6, 'Kho', 'Nhân viên kho - Quản lý kho hàng', FALSE, TRUE),
            (7, 'Lắp đặt', 'Đội lắp đặt - Bàn giao công trình', FALSE, TRUE),
            (8, 'Kinh doanh', 'Bộ phận kinh doanh - Báo giá, dự án', FALSE, TRUE)
        `);

        // Update users không có role → Kinh doanh (8)
        const [updateResult1] = await db.query(
            "UPDATE users SET role_id = 8 WHERE role_id IS NULL"
        );

        // Update admin users → Super Admin (1)
        const [updateResult2] = await db.query(
            "UPDATE users SET role_id = 1 WHERE user_type = 'admin'"
        );

        // Verify
        const [roles] = await db.query('SELECT * FROM roles ORDER BY id');
        const [users] = await db.query(`
            SELECT u.id, u.full_name, u.email, u.role_id, r.name as role_name
            FROM users u LEFT JOIN roles r ON u.role_id = r.id
        `);

        res.json({
            success: true,
            message: 'Roles đã được reset và users đã được cập nhật',
            data: {
                roles_reset: roles.length,
                users_updated_default: updateResult1.affectedRows,
                users_updated_admin: updateResult2.affectedRows,
                roles,
                users
            }
        });
    } catch (err) {
        console.error('Fix roles error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
