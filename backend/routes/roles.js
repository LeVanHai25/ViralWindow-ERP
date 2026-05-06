/**
 * Roles Routes - API Quản lý Chức Vụ
 * ViralWindow RBAC System
 */

const express = require("express");
const router = express.Router();
const roleCtrl = require("../controllers/roleController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Tất cả routes đều yêu cầu xác thực và quyền admin
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/roles - Lấy danh sách chức vụ
router.get("/", roleCtrl.getRoles);

// GET /api/roles/:id - Lấy chi tiết chức vụ
router.get("/:id", roleCtrl.getRole);

// POST /api/roles - Tạo chức vụ mới
router.post("/", roleCtrl.createRole);

// PUT /api/roles/:id - Cập nhật chức vụ
router.put("/:id", roleCtrl.updateRole);

// DELETE /api/roles/:id - Xóa chức vụ
router.delete("/:id", roleCtrl.deleteRole);

// GET /api/roles/:id/permissions - Lấy quyền của chức vụ
router.get("/:id/permissions", roleCtrl.getRolePermissions);

// PUT /api/roles/:id/permissions - Cập nhật quyền cho chức vụ
router.put("/:id/permissions", roleCtrl.updateRolePermissions);

module.exports = router;
