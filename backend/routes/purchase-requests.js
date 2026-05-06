const express = require("express");
const router = express.Router();
const purchaseRequestCtrl = require("../controllers/purchaseRequestController");
const purchaseRequestExcelCtrl = require("../controllers/purchaseRequestExcelController");
const { authenticateToken } = require("../middleware/auth");

// Tất cả routes đều cần authentication
router.use(authenticateToken);

// GET /api/purchase-requests - Lấy danh sách phiếu yêu cầu
router.get("/", purchaseRequestCtrl.getAll);
// GET /api/purchase-requests/pending-count - Đếm số phiếu yêu cầu đang chờ duyệt (draft/submitted)
router.get("/pending-count", purchaseRequestCtrl.getPendingCount);

// GET /api/purchase-requests/:id/export-excel - Xuất Excel (PHẢI đặt trước /:id)
router.get("/:id/export-excel", purchaseRequestExcelCtrl.exportExcel);

// GET /api/purchase-requests/:id - Lấy chi tiết phiếu yêu cầu
router.get("/:id", purchaseRequestCtrl.getById);

// POST /api/purchase-requests - Tạo phiếu yêu cầu mới
router.post("/", purchaseRequestCtrl.create);

// PUT /api/purchase-requests/:id - Cập nhật phiếu yêu cầu
router.put("/:id", purchaseRequestCtrl.update);

// DELETE /api/purchase-requests/:id - Xóa phiếu yêu cầu
router.delete("/:id", purchaseRequestCtrl.delete);

// PUT /api/purchase-requests/:id/status - Cập nhật trạng thái
router.put("/:id/status", purchaseRequestCtrl.updateStatus);

// PUT /api/purchase-requests/:id/read - Đánh dấu là đã đọc
router.put("/:id/read", purchaseRequestCtrl.markAsRead);

module.exports = router;

