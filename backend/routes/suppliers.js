/**
 * Supplier Routes
 * API routes cho quản lý Nhà cung cấp
 */
const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const supplierController = require('../controllers/supplierController');

// CRUD routes
router.get('/', auth, supplierController.list);
router.get('/:id', auth, supplierController.getById);
router.post('/', auth, supplierController.create);
router.put('/:id', auth, supplierController.update);
router.delete('/:id', auth, supplierController.delete);

module.exports = router;
