const express = require("express");
const router = express.Router();
const doorDrawingCtrl = require("../controllers/doorDrawingController");

router.get("/", doorDrawingCtrl.getAllDrawings);
router.get("/:id", doorDrawingCtrl.getById);
router.post("/", doorDrawingCtrl.create);
router.put("/:id", doorDrawingCtrl.update);
router.delete("/:id", doorDrawingCtrl.delete);
router.post("/:id/calculate", doorDrawingCtrl.calculateDimensions);
router.post("/:id/generate-bom", doorDrawingCtrl.generateBOM);
router.get("/:id/bom", doorDrawingCtrl.getBOM);
router.post("/:id/cutting-plan/generate", doorDrawingCtrl.generateCuttingPlan);
router.get("/:id/cutting-plan", doorDrawingCtrl.getCuttingPlan);

module.exports = router;






