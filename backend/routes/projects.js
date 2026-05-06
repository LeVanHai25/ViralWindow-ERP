const express = require("express");
const router = express.Router();
const projectCtrl = require("../controllers/projectController");
const doorCalcCtrl = require("../controllers/doorCalculationController");
const projectMaterialCtrl = require("../controllers/projectMaterialController");

// ========== STATIC ROUTES (no parameters) ==========
router.get("/", projectCtrl.getAllProjects);
router.get("/stats/summary", projectCtrl.getStatistics);
router.get("/cancelled", projectCtrl.getCancelledProjects); // Must be before /:id

// ========== SPECIFIC PARAMETERIZED ROUTES ==========
// These must be before /:id to avoid being matched as id
router.get("/:id/doors/:doorId", projectCtrl.getDoorById);
router.get("/:id/doors/:doorId/aluminum-cutting", doorCalcCtrl.calculateAluminumCutting);
router.get("/:id/doors/:doorId/glass-dimensions", doorCalcCtrl.calculateGlassDimensions);
router.get("/:id/doors/:doorId/accessories", doorCalcCtrl.getDoorAccessories);
router.get("/:id/doors/:doorId/gaskets", doorCalcCtrl.getDoorGaskets);
router.get("/:id/doors/:doorId/price", doorCalcCtrl.calculateDoorPrice);
router.get("/:id/doors", projectCtrl.getProjectDoors);
router.get("/:id/logs-full", projectCtrl.getProjectLogsFull);
router.get("/:id/logs", projectCtrl.getProjectLogs);
router.get("/:id/materials", projectMaterialCtrl.getProjectMaterials);
router.get("/:id/detail", projectCtrl.getDetail);
router.get("/:id/files", (req, res) => {
    res.json({ success: true, data: [] });
});
router.get("/:id/quotation-items-for-design", projectCtrl.getQuotationItemsForDesign);
router.get("/:projectId/items/:itemId/bom-detail", projectCtrl.getProjectItemBOMDetail);
router.get("/:id/operation-status", projectCtrl.getOperationStatus);
router.get("/:id/material-status", projectCtrl.getMaterialStatus);
router.get("/:id/activity-logs", projectCtrl.getActivityLogs);
router.get("/:id/export-report", projectCtrl.exportReport);

// PATCH routes with specific paths
router.patch("/:id/cancel", projectCtrl.cancelProject);
router.patch("/:id/restore", projectCtrl.restoreProject);

// PUT routes with specific paths  
router.put("/:id/status", projectCtrl.update);
router.put("/:id/operation-status", projectCtrl.updateOperationStatus);
router.put("/:id/material-status", projectCtrl.updateMaterialStatus);
router.put("/:id/doors/:doorId", projectCtrl.updateDoor);

// POST routes
router.post("/", projectCtrl.create);
router.post("/:id/doors", projectCtrl.createDoor);
router.post("/:id/doors/from-quotation", projectCtrl.importDoorsFromQuotation);
router.post("/:id/auto-import-from-quotation", projectCtrl.autoImportFromQuotation);
router.post("/:id/design-items", projectCtrl.createDesignItemFromQuotation);
router.post("/:id/material-status/confirm-arrival", projectCtrl.confirmMaterialArrival);
router.post("/:id/activity-logs", projectCtrl.addActivityLog);

// DELETE routes with specific paths
router.delete("/:id/materials/:materialId", projectMaterialCtrl.deleteProjectMaterial);
router.delete("/:id/doors/:doorId", projectCtrl.deleteDoor);

// ========== GENERIC ROUTES (must be LAST) ==========
router.get("/:id", projectCtrl.getById); // Must be last GET route
router.put("/:id", projectCtrl.update); // Must be last PUT route  
router.delete("/:id", projectCtrl.delete); // Must be last DELETE route

module.exports = router;

