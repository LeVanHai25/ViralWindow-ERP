const express = require("express");
const router = express.Router();
const companyCtrl = require("../controllers/companySettingsController");

router.get("/", companyCtrl.getSettings);
router.put("/", companyCtrl.updateSettings);
router.post("/", companyCtrl.createSettings);

module.exports = router;






