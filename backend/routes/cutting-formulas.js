const express = require("express");
const router = express.Router();
const formulaCtrl = require("../controllers/cuttingFormulaController");

// GET all formulas for a system
router.get("/systems/:systemId", formulaCtrl.getBySystem);

// Calculate cutting dimensions
router.get("/calculate", formulaCtrl.calculate);

// POST create formula
router.post("/", formulaCtrl.create);

// PUT update formula
router.put("/:id", formulaCtrl.update);

// DELETE formula
router.delete("/:id", formulaCtrl.delete);

module.exports = router;




























