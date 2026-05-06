const express = require("express");
const router = express.Router();
const reportCtrl = require("../controllers/reportController");
const reportsController = require("../controllers/reportsController");
const { authenticateToken: auth } = require("../middleware/auth");

router.get("/dashboard", reportCtrl.getDashboard);
router.get("/dashboard/stats", reportCtrl.getDashboardStats);
router.get("/revenue-month", reportCtrl.getRevenueByMonth);
router.get("/conversion-rate", reportCtrl.getConversionRate);
router.get("/revenue-sales", reportCtrl.getRevenueBySales);
router.get("/production", reportCtrl.getProductionReport);
router.get("/inventory", reportCtrl.getInventoryReport);
router.get("/financial", reportCtrl.getFinancialReport);

// Warehouse report export by date range (NEW)
router.get("/warehouse/export-excel", auth, reportsController.exportWarehouseReport);

module.exports = router;






