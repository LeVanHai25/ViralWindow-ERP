const express = require('express');
const router = express.Router();
const controller = require('../controllers/projectItemController');

// ============================================
// PROJECT ITEMS ROUTES
// API quản lý sản phẩm trong dự án
// ============================================

// GET /api/projects/:projectId/items - Lấy danh sách sản phẩm của dự án
// Query params: product_type
router.get('/:projectId/items', controller.getProjectItems);

// GET /api/projects/:projectId/items/:itemId - Lấy chi tiết một sản phẩm
router.get('/:projectId/items/:itemId', controller.getProjectItemById);

// POST /api/projects/:projectId/items - Thêm sản phẩm vào dự án
router.post('/:projectId/items', controller.addItemToProject);

// POST /api/projects/:projectId/items/from-quotation - Import items từ báo giá
router.post('/:projectId/items/from-quotation', controller.createItemsFromQuotation);

// PUT /api/projects/:projectId/items/:id - Cập nhật sản phẩm (snapshot_config)
router.put('/:projectId/items/:id', controller.updateProjectItem);
router.patch('/:projectId/items/:id', controller.updateProjectItem);

// POST /api/projects/:projectId/items/:itemId/confirm-design - Xác nhận thiết kế
router.post('/:projectId/items/:itemId/confirm-design', controller.confirmDesign);

// POST /api/projects/:projectId/items/:itemId/calc - Preview BOM + giá
router.post('/:projectId/items/:itemId/calc', controller.calculateItemBomPreview);

// DELETE /api/projects/:projectId/items/:id - Xóa sản phẩm
router.delete('/:projectId/items/:id', controller.removeProjectItem);

// GET /api/projects/:projectId/bom - Bóc tách BOM toàn dự án
router.get('/:projectId/bom', controller.extractBOM);

// POST /api/projects/:projectId/snapshot - Tạo snapshot khi chốt báo giá
router.post('/:projectId/snapshot', controller.createSnapshot);

// POST /api/projects/:projectId/export-warehouse - Xuất vật tư ra kho
router.post('/:projectId/export-warehouse', controller.exportBOMToWarehouse);

module.exports = router;

