/**
 * Production Excel Routes
 * Standard Logic Implementation - synced with Kanban
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/productionExcelController');

// ============================================
// Excel View API Contract
// ============================================

// GET /api/production/excel/orders - List orders with computed fields
router.get('/excel/orders', controller.listOrders);

// GET /api/production/excel/kpi - KPI computed from filtered data
router.get('/excel/kpi', controller.getKpi);

// GET /api/production/excel/orders/:id - Single order detail
router.get('/excel/orders/:id', controller.getOrderDetail);

// PATCH /api/production/excel/orders/:id - Update order fields
router.patch('/excel/orders/:id', controller.updateOrder);

// PATCH /api/production/excel/orders/:id/materials/:group - Update material status
router.patch('/excel/orders/:id/materials/:group', controller.updateMaterialStatus);

// GET /api/production/excel/orders/:id/materials/:group/details - Get material details with stock info
router.get('/excel/orders/:id/materials/:group/details', controller.getMaterialDetails);

// GET /api/production/excel/orders/:id/history - Order audit trail
router.get('/excel/orders/:id/history', controller.getOrderHistory);

// GET /api/production/excel/export - Export to Excel
router.get('/excel/export', controller.exportExcel);

// ============================================
// Legacy routes (backward compatibility)
// ============================================
router.get('/excel-orders', controller.listOrders);
router.get('/excel-kpi', controller.getKpi);
router.get('/excel-export', controller.exportExcel);
router.get('/excel-orders/:id', controller.getOrderDetail);
router.patch('/excel-orders/:id', controller.updateOrder);

module.exports = router;
