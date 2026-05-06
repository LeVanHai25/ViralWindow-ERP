const express = require("express");
const router = express.Router();
const aluminumBarSummaryCtrl = require("../controllers/aluminumBarSummaryController");

// Generate tổng hợp nhôm
router.post("/projects/:projectId/aluminum-summary/generate", aluminumBarSummaryCtrl.generateSummary);

// Lấy tổng hợp nhôm
router.get("/projects/:projectId/aluminum-summary", aluminumBarSummaryCtrl.getSummary);

// Lưu vào tài chính
router.post("/projects/:projectId/aluminum-summary/save-to-finance", aluminumBarSummaryCtrl.saveToFinance);

module.exports = router;














































































