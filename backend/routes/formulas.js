const express = require("express");
const router = express.Router();
const formulaCtrl = require("../controllers/formulaController");

router.get("/", formulaCtrl.getAllFormulas);
router.get("/:id", formulaCtrl.getById);
router.post("/", formulaCtrl.create);
router.put("/:id", formulaCtrl.update);
router.delete("/:id", formulaCtrl.delete);

module.exports = router;






