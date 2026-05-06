/**
 * User Management Routes - API Quản lý Người Dùng
 * ViralWindow RBAC System
 */

const express = require("express");
const router = express.Router();
const userMgmtCtrl = require("../controllers/userManagementController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Tất cả routes đều yêu cầu xác thực và quyền admin
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/user-management - Lấy danh sách người dùng
router.get("/", userMgmtCtrl.getUsers);

// GET /api/user-management/:id - Lấy chi tiết người dùng
router.get("/:id", userMgmtCtrl.getUser);

// POST /api/user-management - Tạo người dùng mới
router.post("/", userMgmtCtrl.createUser);

// PUT /api/user-management/:id - Cập nhật người dùng
router.put("/:id", userMgmtCtrl.updateUser);

// PATCH /api/user-management/:id/toggle-status - Kích hoạt/Vô hiệu hóa
router.patch("/:id/toggle-status", userMgmtCtrl.toggleUserStatus);

// POST /api/user-management/:id/reset-password - Đặt lại mật khẩu
router.post("/:id/reset-password", userMgmtCtrl.resetUserPassword);

// DELETE /api/user-management/:id - Xóa người dùng
router.delete("/:id", userMgmtCtrl.deleteUser);

module.exports = router;
