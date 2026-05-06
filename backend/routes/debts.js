const express = require("express");
const router = express.Router();
const debtCtrl = require("../controllers/debtController");
const { authenticateToken, optionalAuth, requireAdmin } = require("../middleware/auth");

// ============================================
// AUTH: Công nợ là dữ liệu nhạy cảm - BẢO VỆ
// ============================================

// Get all debts (xem - cho phép không auth để không break frontend)
router.get("/", optionalAuth, debtCtrl.getAllDebts);

// Get statistics (xem)
router.get("/statistics", optionalAuth, debtCtrl.getStatistics);

// Get debt by ID (xem)
router.get("/:id", optionalAuth, debtCtrl.getById);

// Get payment history for a debt (timeline)
router.get("/:id/payments", optionalAuth, debtCtrl.getPayments);

// Create debt (tạo - BẮT BUỘC auth)
router.post("/", authenticateToken, debtCtrl.create);

// Update debt (sửa - BẮT BUỘC auth)
router.put("/:id", authenticateToken, debtCtrl.update);

// Record payment (ghi nhận thanh toán - BẮT BUỘC auth)
router.post("/:id/payment", authenticateToken, debtCtrl.recordPayment);

// Delete debt (xóa - BẮT BUỘC auth + admin)
router.delete("/:id", authenticateToken, requireAdmin, debtCtrl.delete);

module.exports = router;




























