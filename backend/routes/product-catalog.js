const express = require('express');
const router = express.Router();
const controller = require('../controllers/productCatalogController');

// ============================================
// PRODUCT CATALOG ROUTES
// API cho quản lý Nhóm SP + Sản phẩm cửa
// ============================================

// --- PRODUCT GROUPS ---
router.get('/groups', controller.getAllGroups);
router.post('/groups', controller.createGroup);
router.put('/groups/:id', controller.updateGroup);
router.delete('/groups/:id', controller.deleteGroup);

// --- PRODUCT CATALOG (Sản phẩm cửa) ---
router.get('/products', controller.getAllProducts);
router.post('/products', controller.createProduct);
router.put('/products/:id', controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);

module.exports = router;
