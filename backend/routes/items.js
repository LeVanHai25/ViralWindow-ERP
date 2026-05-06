/**
 * Items Routes
 * Unified API for managing items across all warehouse types
 */

const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const itemsController = require('../controllers/itemsController');

// Get units enum (public for dropdowns)
router.get('/units', itemsController.getUnits);

// Get categories by item type
router.get('/categories', itemsController.getCategories);

// Get next auto-generated code
router.get('/next-code', auth, itemsController.getNextCode);

// Get items by type with search
router.get('/', auth, itemsController.getItems);

// Create new item
router.post('/', auth, itemsController.createItem);

module.exports = router;
