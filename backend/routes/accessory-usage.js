const express = require("express");
const router = express.Router();
const usageCtrl = require("../controllers/accessoryUsageController");

// GET all usage rules for an accessory
router.get("/accessories/:accessoryId", usageCtrl.getByAccessory);

// GET usage rules by door type
router.get("/door-types/:doorType", usageCtrl.getByDoorType);

// GET recommended accessories for a door type
router.get("/recommended/:doorType", usageCtrl.getRecommended);

// POST create usage rule
router.post("/", usageCtrl.create);

// PUT update usage rule
router.put("/:id", usageCtrl.update);

// DELETE usage rule
router.delete("/:id", usageCtrl.delete);

module.exports = router;




























