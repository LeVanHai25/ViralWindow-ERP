const express = require("express");
const router = express.Router();
const profileCtrl = require("../controllers/aluminumProfileController");

// GET all profiles for a system
router.get("/systems/:systemId", profileCtrl.getBySystem);

// POST create profile
router.post("/", profileCtrl.create);

// PUT update profile
router.put("/:id", profileCtrl.update);

// DELETE profile
router.delete("/:id", profileCtrl.delete);

module.exports = router;




























