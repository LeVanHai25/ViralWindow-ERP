const express = require("express");
const router = express.Router();
const financialCtrl = require("../controllers/financialController");
const financialExportCtrl = require("../controllers/financialExportController");
const { authenticateToken, optionalAuth, requireAdmin } = require("../middleware/auth");

// ============================================
// AUTH: optionalAuth cho GET (xem), authenticateToken cho POST/PUT/DELETE (sửa đổi)
// TODO: Chuyển sang authenticateToken cho tất cả khi frontend sẵn sàng
// ============================================

// Get all transactions (xem - không bắt buộc auth)
router.get("/transactions", optionalAuth, financialCtrl.getAllTransactions);

// Get statistics (xem - không bắt buộc auth)
router.get("/statistics", optionalAuth, financialCtrl.getStatistics);

// Get transaction by ID (xem - không bắt buộc auth)
router.get("/transactions/:id", optionalAuth, financialCtrl.getById);

// Export transaction to Excel
router.get("/transactions/:id/export-excel", optionalAuth, financialExportCtrl.exportPayment);

// Create transaction (tạo mới - BẮT BUỘC auth)
router.post("/transactions", authenticateToken, financialCtrl.create);

// Update transaction (sửa - BẮT BUỘC auth)
router.put("/transactions/:id", authenticateToken, financialCtrl.update);

// Delete transaction (xóa - BẮT BUỘC auth + admin)
router.delete("/transactions/:id", authenticateToken, requireAdmin, financialCtrl.delete);

// Post transaction (Ghi sổ - BẮT BUỘC auth)
router.post("/transactions/:id/post", authenticateToken, financialCtrl.postTransaction);

// Cancel transaction (Hủy - BẮT BUỘC auth)
router.post("/transactions/:id/cancel", authenticateToken, financialCtrl.cancelTransaction);

// Sync data from projects (BẮT BUỘC auth)
router.post("/sync", authenticateToken, financialCtrl.syncFromProjects);

// Get dashboard summary (xem - không bắt buộc auth)
router.get("/dashboard", optionalAuth, financialCtrl.getDashboardSummary);

// Migration: Add status column (chỉ admin)
router.get("/migrate-add-status", authenticateToken, requireAdmin, financialCtrl.migrateAddStatus);

// Sync payable debts (BẮT BUỘC auth)
router.post("/sync-payable-debts", authenticateToken, financialCtrl.syncPayableDebts);

// Branch Project Report (Báo cáo tổng hợp chi nhánh)
router.get("/branch-report", optionalAuth, financialCtrl.getBranchProjectReport);

// Báo cáo chuyên nghiệp mới
router.get("/profit-loss-report", optionalAuth, financialCtrl.getProfitLossReport);
router.get("/material-cost-report", optionalAuth, financialCtrl.getMaterialCostReport);
router.get("/advanced-cash-flow-report", optionalAuth, financialCtrl.getAdvancedCashFlowReport);

// --- EXCEL EXPORT ROUTES ---

// 1. Single Debt Voucher (Specific route first)
router.get("/debt/:id/export-excel", optionalAuth, financialExportCtrl.exportSingleDebt);

// 2. Debt Report (General route)
router.get("/debt/export-excel", optionalAuth, financialExportCtrl.exportDebtReport);

// 3. Receipt Export
router.get("/receipts/:id/export-excel", optionalAuth, financialExportCtrl.exportReceipt);

// 4. Financial Reports Exports
router.get("/export-cash-flow", optionalAuth, financialExportCtrl.exportCashFlowReport);
router.get("/export-profit-loss", optionalAuth, financialExportCtrl.exportProfitLossReport);
router.get("/export-material-cost", optionalAuth, financialExportCtrl.exportMaterialCostReport);
router.get("/export-branch-report", optionalAuth, financialExportCtrl.exportBranchReport);

module.exports = router;




























