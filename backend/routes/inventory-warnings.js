const express = require("express");
const router = express.Router();
const warningCtrl = require("../controllers/inventoryWarningController");

router.get("/", warningCtrl.getWarnings);
router.get("/stats", warningCtrl.getWarningStats);
router.post("/check-all", warningCtrl.checkAllWarnings);
router.put("/:id/acknowledge", warningCtrl.acknowledgeWarning);

module.exports = router;




























