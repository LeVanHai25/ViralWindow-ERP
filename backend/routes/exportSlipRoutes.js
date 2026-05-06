/**
 * Export Slip Routes
 * API endpoints cho hệ thống phiếu xuất kho
 */

const express = require('express');
const router = express.Router();
const exportSlipController = require('../controllers/exportSlipController');

// Lấy danh sách vật tư của dự án với phân loại real-time
// GET /api/export-slips/project/:projectId/materials
router.get('/project/:projectId/materials', exportSlipController.getProjectMaterialsClassified);

// Xác nhận xuất kho - Tạo phiếu xuất và trừ kho
// POST /api/export-slips/project/:projectId/confirm
router.post('/project/:projectId/confirm', exportSlipController.confirmExport);

// Lấy danh sách phiếu xuất kho của dự án
// GET /api/export-slips/project/:projectId
router.get('/project/:projectId', exportSlipController.getProjectExportSlips);

// Lấy tất cả phiếu xuất kho (có phân trang)
// GET /api/export-slips
router.get('/', exportSlipController.getAllExportSlips);

// Lấy chi tiết phiếu xuất kho
// GET /api/export-slips/:slipId
router.get('/:slipId', exportSlipController.getExportSlipDetail);

module.exports = router;
