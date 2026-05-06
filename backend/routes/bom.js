const express = require("express");
const router = express.Router();
const bomCtrl = require("../controllers/bomController");
const bomCtrlV2 = require("../controllers/bomControllerV2");

// Calculate BOM for a door (new version with cutting formulas)
router.get("/projects/:projectId/doors/:doorId/calculate", bomCtrlV2.calculateBOM);

// Legacy endpoint (keep for backward compatibility)
router.get("/projects/:projectId/doors/:doorId/calculate-legacy", bomCtrl.calculateBOM);

// Get saved BOM for a door
router.get("/projects/:projectId/doors/:doorId", bomCtrl.getBOM);

// Save BOM for a door
router.post("/projects/:projectId/doors/:doorId", bomCtrl.saveBOM);

// Calculate BOM for entire project
router.get("/projects/:projectId/calculate", bomCtrl.calculateProjectBOM);

module.exports = router;

