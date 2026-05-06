const express = require("express");
const router = express.Router();
const inventoryInCtrl = require("../controllers/inventoryInController");

router.get("/", inventoryInCtrl.getReceipts);
router.get("/:receipt_code", inventoryInCtrl.getReceiptDetails);
router.post("/", inventoryInCtrl.createReceipt);
router.post("/production-return", inventoryInCtrl.createProductionReturn);

module.exports = router;




























