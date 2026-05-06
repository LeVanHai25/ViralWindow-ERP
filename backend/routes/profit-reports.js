const express = require("express");
const router = express.Router();
const profitReportCtrl = require("../controllers/profitReportController");

router.get("/", profitReportCtrl.getProfitReport);
router.get("/projects/:projectId", profitReportCtrl.getProjectProfit);

module.exports = router;




























