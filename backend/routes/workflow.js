const express = require("express");
const router = express.Router();
const workflowCtrl = require("../controllers/workflowController");

// Approve quotation and trigger workflow
// Support both plural and singular forms
router.post("/quotations/:id/approve", workflowCtrl.approveQuotation);
router.post("/quotation/:id/approve", workflowCtrl.approveQuotation); // Also support singular

// Create inventory issue from production order
router.post("/production-orders/:orderId/create-inventory-issue", workflowCtrl.createInventoryIssueFromOrder);

// Complete production order
router.post("/production-orders/:orderId/complete", workflowCtrl.completeProductionOrder);

// Get project workflow status
router.get("/projects/:projectId", workflowCtrl.getProjectWorkflow);

// Get workflow dashboard
router.get("/dashboard", workflowCtrl.getWorkflowDashboard);

module.exports = router;




























