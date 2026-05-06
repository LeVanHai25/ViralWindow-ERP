const express = require("express");
const router = express.Router();
const labelCtrl = require("../controllers/labelController");

// Get single inventory label
router.get("/inventory/:id", labelCtrl.getInventoryLabel);

// Get single door label
router.get("/doors/:id", labelCtrl.getDoorLabel);

// Batch get inventory labels
router.post("/inventory/batch", labelCtrl.getBatchInventoryLabels);

// Batch get door labels
router.post("/doors/batch", labelCtrl.getBatchDoorLabels);

// Get labels for production order
router.get("/production-orders/:orderId", labelCtrl.getProductionOrderLabels);

module.exports = router;




























