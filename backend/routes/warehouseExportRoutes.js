const express = require("express");
const router = express.Router();
const warehouseExportCtrl = require("../controllers/warehouseExportController");

// GET /api/warehouse-export - Lấy danh sách phiếu xuất kho
router.get("/", warehouseExportCtrl.getAll);

// GET /api/warehouse-export/next-number - Lấy số phiếu tiếp theo
router.get("/next-number", warehouseExportCtrl.getNextNumber);

// GET /api/warehouse-export/:id - Lấy chi tiết phiếu
router.get("/:id", warehouseExportCtrl.getById);

// GET /api/warehouse-export/:id/excel - Xuất Excel
router.get("/:id/excel", warehouseExportCtrl.exportExcel);

// POST /api/warehouse-export - Tạo phiếu mới
router.post("/", warehouseExportCtrl.create);

// PUT /api/warehouse-export/:id - Cập nhật phiếu
router.put("/:id", warehouseExportCtrl.update);

// PUT /api/warehouse-export/:id/status - Cập nhật trạng thái phiếu
router.put("/:id/status", warehouseExportCtrl.updateStatus);

// DELETE /api/warehouse-export/:id - Xóa phiếu
router.delete("/:id", warehouseExportCtrl.delete);

// POST /api/warehouse-export/:id/add-item - Thêm vật tư
router.post("/:id/add-item", warehouseExportCtrl.addItem);

// DELETE /api/warehouse-export/:id/item/:itemId - Xóa vật tư
router.delete("/:id/item/:itemId", warehouseExportCtrl.removeItem);

module.exports = router;
