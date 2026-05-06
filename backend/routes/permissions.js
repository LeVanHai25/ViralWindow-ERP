/**
 * Permissions Routes - API Quản lý Quyền
 * ViralWindow RBAC System
 */

const express = require("express");
const router = express.Router();
const permissionCtrl = require("../controllers/permissionController");
const { authenticateToken } = require("../middleware/auth");

// Tất cả routes đều yêu cầu xác thực
router.use(authenticateToken);

// GET /api/permissions - Lấy tất cả permissions
router.get("/", permissionCtrl.getPermissions);

// GET /api/permissions/grouped - Lấy permissions theo module
router.get("/grouped", permissionCtrl.getPermissionsByModule);

// GET /api/permissions/my - Lấy permissions của user hiện tại
router.get("/my", permissionCtrl.getMyPermissions);

// GET /api/permissions/check/:permission - Kiểm tra một quyền cụ thể
router.get("/check/:permission", permissionCtrl.checkPermission);

module.exports = router;
