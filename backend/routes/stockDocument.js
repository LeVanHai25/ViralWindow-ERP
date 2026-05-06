/**
 * =====================================================
 * STOCK DOCUMENT ROUTES
 * =====================================================
 * 
 * Routes cho quản lý phiếu kho KiotViet style
 * 
 * @author ViralWindow Development Team
 */

const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const stockDocumentController = require('../controllers/stockDocumentController');
const stockDocumentExportController = require('../controllers/stockDocumentExportController');

// =====================================================
// DOCUMENTS
// =====================================================

// =====================================================
// LEDGER & ONHAND (must be before /:id to avoid conflict)
// =====================================================

// Get ledger (Thẻ kho)
router.get('/ledger/list', auth, stockDocumentController.getLedger);

// Monthly summary export (must be before /:id)
router.get('/ledger/monthly-summary/export-excel', auth, stockDocumentExportController.exportMonthlySummary);

// Get stock on hand (Tồn kho)
router.get('/onhand/list', auth, stockDocumentController.getOnHand);

// Get materials by project (Truy vết vật tư đã xuất cho dự án)
router.get('/by-project/:projectId', auth, stockDocumentController.getByProject);

// Export single document (must be before /:id)
router.get('/:id/export-excel', auth, stockDocumentExportController.exportSingleDocument);

// List documents (with filters)
router.get('/', auth, stockDocumentController.list);

// Get by ID
router.get('/:id', auth, stockDocumentController.getById);

// Create new document (Draft)
router.post('/', auth, stockDocumentController.create);

// Add/Update lines
router.post('/:id/lines', auth, stockDocumentController.addLines);

// Post (Hạch toán)
router.post('/:id/post', auth, stockDocumentController.post);

// Cancel (Hủy)
router.post('/:id/cancel', auth, stockDocumentController.cancel);

// Update (Sửa phiếu nháp)
router.put('/:id', auth, stockDocumentController.update);

module.exports = router;
