const express = require("express");
const router = express.Router();
const progressCtrl = require("../controllers/productionProgressController");

// Get progress for an order
router.get("/orders/:orderId", progressCtrl.getProgress);

// Get statistics
router.get("/orders/:orderId/statistics", progressCtrl.getStatistics);

// Update progress for a door stage
router.put("/orders/:orderId/doors/:designId/stages/:stage", progressCtrl.updateProgress);

// Batch update progress
router.put("/orders/:orderId/batch", progressCtrl.batchUpdateProgress);

// Move order to next stage (chuyển đổi stage cho toàn bộ order)
router.post("/orders/:orderId/move-stage", progressCtrl.moveOrderToStage);

module.exports = router;








