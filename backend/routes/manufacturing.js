const express = require('express');
const router = express.Router();
const manufacturingController = require('../controllers/manufacturingController');

/**
 * Manufacturing Routes - Smart Status Tracking
 */

// Get all manufacturing projects with products
router.get('/projects', manufacturingController.getManufacturingProjects);

// Start manufacturing a product
router.post('/products/:productId/start', manufacturingController.startManufacturing);

// Complete manufacturing a product
router.post('/products/:productId/complete', manufacturingController.completeManufacturing);

// Quick complete (skip manufacturing stage)
router.post('/products/:productId/quick-complete', manufacturingController.quickComplete);

// Get materials for a product
router.get('/products/:productId/materials', manufacturingController.getProductMaterials);

// Add material to a product
router.post('/products/:productId/materials', manufacturingController.addProductMaterial);

// Mark all materials as ready (100%)
router.post('/products/:productId/mark-materials-ready', manufacturingController.markMaterialsReady);

// Update production info for a project (date, notes, progress, step, photos)
router.put('/projects/:projectId/production-info', manufacturingController.updateProductionInfo);

// Update production step only (for quick status change)
router.put('/projects/:projectId/production-step', manufacturingController.updateProductionStep);

module.exports = router;
