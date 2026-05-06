const express = require("express");
const router = express.Router();
const summaryCtrl = require("../controllers/projectSummaryController");

// Aluminum summary
router.get("/:projectId/aluminum", summaryCtrl.getAluminumSummary);
router.post("/:projectId/aluminum", summaryCtrl.createAluminumSummary);
router.put("/:projectId/aluminum/:id", summaryCtrl.updateAluminumSummary);

// Glass summary
router.get("/:projectId/glass", summaryCtrl.getGlassSummary);
router.post("/:projectId/glass", summaryCtrl.createGlassSummary);
router.put("/:projectId/glass/:id", summaryCtrl.updateGlassSummary);

// Accessories summary
router.get("/:projectId/accessories", summaryCtrl.getAccessoriesSummary);
router.post("/:projectId/accessories", summaryCtrl.createAccessoriesSummary);
router.put("/:projectId/accessories/:id", summaryCtrl.updateAccessoriesSummary);

// Quotation summary
router.get("/:projectId/quotation", summaryCtrl.getQuotationSummary);
router.post("/:projectId/quotation", summaryCtrl.createQuotationSummary);
router.put("/:projectId/quotation/:id", summaryCtrl.updateQuotationSummary);

// Financial summary
router.get("/:projectId/financial", summaryCtrl.getFinancialSummary);
router.post("/:projectId/financial", summaryCtrl.createFinancialSummary);
router.put("/:projectId/financial/:id", summaryCtrl.updateFinancialSummary);

// Material summary (tổng hợp vật tư cho báo giá)
router.get("/:projectId/materials", summaryCtrl.getMaterialSummary);
router.post("/:projectId/materials/refresh", summaryCtrl.refreshMaterialSummary);

module.exports = router;






