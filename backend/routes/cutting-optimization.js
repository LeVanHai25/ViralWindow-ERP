const express = require("express");
const router = express.Router();
const cuttingOptCtrl = require("../controllers/cuttingOptimizationController");

// Optimize cutting for a door
router.get("/projects/:projectId/doors/:doorId/optimize", cuttingOptCtrl.optimizeDoorCutting);

// Optimize cutting for entire project
router.get("/projects/:projectId/optimize", cuttingOptCtrl.optimizeProjectCutting);

// Compare algorithms
router.get("/projects/:projectId/doors/:doorId/compare", cuttingOptCtrl.compareAlgorithms);

// Save optimization result
router.post("/projects/:projectId/doors/:doorId/save", cuttingOptCtrl.saveOptimization);

// Get saved optimization
router.get("/projects/:projectId/doors/:doorId/saved", cuttingOptCtrl.getOptimization);

module.exports = router;

