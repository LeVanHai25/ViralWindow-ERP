const express = require("express");
const router = express.Router();
const transactionCtrl = require("../controllers/inventoryTransactionController");

router.get("/", transactionCtrl.getAllTransactions);
router.post("/", transactionCtrl.create);
router.delete("/:id", transactionCtrl.delete);

module.exports = router;






