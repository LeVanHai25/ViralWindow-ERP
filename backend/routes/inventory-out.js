const express = require("express");
const router = express.Router();
const inventoryOutCtrl = require("../controllers/inventoryOutController");

router.get("/", inventoryOutCtrl.getIssues);
router.post("/from-production-order", inventoryOutCtrl.createIssueFromProductionOrder);
router.post("/manual", inventoryOutCtrl.createManualIssue);

module.exports = router;




























