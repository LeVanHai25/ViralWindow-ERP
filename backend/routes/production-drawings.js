const express = require("express");
const router = express.Router();
const drawingCtrl = require("../controllers/productionDrawingController");
const pdfCtrl = require("../controllers/productionDrawingPDFController");

// Lấy bản vẽ sản xuất cho một cửa
router.get("/projects/:projectId/doors/:doorId", drawingCtrl.getDoorProductionDrawing);

// Lấy bản vẽ sản xuất cho toàn bộ dự án
router.get("/projects/:projectId", drawingCtrl.getProjectProductionDrawings);

// Xuất PDF bản vẽ sản xuất
router.get("/projects/:projectId/doors/:doorId/pdf", pdfCtrl.exportDoorPDF);

module.exports = router;

