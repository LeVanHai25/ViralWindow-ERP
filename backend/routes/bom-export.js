const express = require("express");
const router = express.Router();
const bomExportCtrl = require("../controllers/bomExportController");
const purchaseRequestExportCtrl = require("../controllers/purchaseRequestExportController");
const { authenticateToken } = require("../middleware/auth");

// Export Excel routes - require authentication
router.post("/:projectId/aluminum", authenticateToken, bomExportCtrl.exportAluminumBreakdown);
router.post("/:projectId/glass", authenticateToken, bomExportCtrl.exportGlassBreakdown);
router.post("/:projectId/accessories", authenticateToken, bomExportCtrl.exportAccessoriesBreakdown);
router.post("/:projectId/combined", authenticateToken, bomExportCtrl.exportCombinedBreakdown);
router.post("/:projectId/product-list", authenticateToken, bomExportCtrl.exportProductList);

// Purchase Request Export
router.post("/purchase-request", purchaseRequestExportCtrl.exportPurchaseRequest);

// Material Request Export
router.post("/material-request", bomExportCtrl.exportMaterialRequest);

module.exports = router;

