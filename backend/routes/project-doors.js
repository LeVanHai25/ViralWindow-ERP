const express = require("express");
const router = express.Router();
const projectDoorCtrl = require("../controllers/projectDoorController");

// ============================================
// PROJECT DOORS ROUTES
// Quản lý cửa trong dự án
// ============================================

// Lấy danh sách cửa của dự án
router.get("/:projectId/doors", projectDoorCtrl.getProjectDoors);

// Thêm cửa vào dự án từ Door Catalog
router.post("/:projectId/doors", projectDoorCtrl.addDoorToProject);

// Cập nhật cửa trong dự án (số lượng, kích thước tùy chỉnh...)
router.put("/:projectId/doors/:id", projectDoorCtrl.updateProjectDoor);

// Xóa cửa khỏi dự án
router.delete("/:projectId/doors/:id", projectDoorCtrl.removeProjectDoor);

// Bóc tách BOM cho toàn bộ cửa trong dự án
router.get("/:projectId/doors/bom", projectDoorCtrl.extractBOM);

// Kiểm tra tồn kho cho các vật tư của dự án
router.get("/:projectId/doors/stock-check", projectDoorCtrl.checkStockAvailability);

// Xuất vật tư BOM ra kho
router.post("/:projectId/doors/export", projectDoorCtrl.exportBOMToWarehouse);

module.exports = router;
