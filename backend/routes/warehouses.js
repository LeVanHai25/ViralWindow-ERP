const express = require("express");
const router = express.Router();
const warehouseCtrl = require("../controllers/warehouseController");
const auth = require("../middleware/auth"); // Giả định middleware auth tồn tại dựa trên context

router.get("/", warehouseCtrl.getWarehouses);
router.put("/:id", warehouseCtrl.updateWarehouse);

module.exports = router;
