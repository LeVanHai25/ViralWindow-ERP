const express = require("express");
const router = express.Router();
const { authenticateToken, requirePermission } = require("../middleware/auth");
const quotationCtrl = require("../controllers/quotationController");
const quotationBOMCtrl = require("../controllers/quotationBOMController");
const quotationPDFCtrl = require("../controllers/quotationPDFController");
const quotationExcelCtrl = require("../controllers/quotationExcelController");

router.get("/", quotationCtrl.getAllQuotations);
router.get("/stats", quotationCtrl.getStatistics);
router.get("/pending", quotationCtrl.getPendingQuotations);
router.get("/:id", quotationCtrl.getById);

// Protected mutation routes (Enforce authentication for correct actor attribution)
router.post("/", authenticateToken, quotationCtrl.create);
router.post("/from-project", authenticateToken, quotationCtrl.createFromProject);
router.post("/:id/remind", authenticateToken, quotationCtrl.sendReminder);
router.post("/:id/versions", authenticateToken, quotationCtrl.createNewVersion);
router.post("/:id/sign-contract", authenticateToken, quotationCtrl.signContract);
router.put("/:id/confirm-deposit", authenticateToken, quotationCtrl.confirmDeposit);
router.put("/:id", authenticateToken, quotationCtrl.update);
router.put("/:id/status", authenticateToken, quotationCtrl.updateStatus);
router.delete("/:id", authenticateToken, quotationCtrl.delete);

// Quotation Items CRUD
router.post("/:id/items", authenticateToken, quotationCtrl.addQuotationItem);
router.put("/items/:itemId", authenticateToken, quotationCtrl.updateQuotationItem);
router.delete("/items/:itemId", authenticateToken, quotationCtrl.deleteQuotationItem);

// BOM integration routes
router.post("/calculate-from-bom", authenticateToken, quotationBOMCtrl.calculateQuotationFromBOM);
router.get("/projects/:projectId/doors", quotationBOMCtrl.getDoorsForQuotation);

// Export routes
router.get("/:id/pdf-data", quotationPDFCtrl.exportQuotationPDF);
router.get("/:id/export-excel", quotationExcelCtrl.exportQuotationToExcel);

module.exports = router;



