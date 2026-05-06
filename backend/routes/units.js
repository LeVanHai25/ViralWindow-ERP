// units.js - Routes for units (đơn vị/chi nhánh)
const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');

// GET all units
router.get('/', unitController.getUnits);

// GET unit by ID
router.get('/:id', unitController.getUnitById);

// POST create unit
router.post('/', unitController.createUnit);

// PUT update unit
router.put('/:id', unitController.updateUnit);

// DELETE unit
router.delete('/:id', unitController.deleteUnit);

// GET customers by unit
router.get('/:id/customers', unitController.getCustomersByUnit);

module.exports = router;
