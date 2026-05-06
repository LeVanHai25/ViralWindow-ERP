const express = require("express");
const router = express.Router();
const productionCtrl = require("../controllers/productionOrderController");
const productionOrderV2Ctrl = require("../controllers/productionOrderV2Controller");

router.get("/", productionCtrl.getAllOrders);
router.get("/approved-quotations", productionOrderV2Ctrl.getApprovedQuotations);
router.get("/:id/details", productionOrderV2Ctrl.getOrderDetails);
router.get("/:id", productionCtrl.getById);
router.post("/", productionCtrl.create);
router.post("/from-quotation", productionOrderV2Ctrl.createFromQuotation);
router.put("/:id", productionCtrl.update);
router.put("/:id/status", productionCtrl.updateStatus);
router.delete("/:id", productionCtrl.delete);

module.exports = router;






