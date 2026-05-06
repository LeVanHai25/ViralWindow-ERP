const express = require('express');
const router = express.Router();
const controller = require('../controllers/productTemplateController');

// ============================================
// PRODUCT TEMPLATES ROUTES
// API mới cho tất cả loại sản phẩm
// ============================================

// GET /api/product-templates - Lấy tất cả templates
// Query params: product_type, family, category, aluminum_system, search, limit
router.get('/', controller.getAllTemplates);

// GET /api/product-templates/types - Lấy danh sách product types và categories
router.get('/types', controller.getProductTypes);

// GET /api/product-templates/families - Lấy danh sách families
router.get('/families', controller.getFamilies);

// GET /api/product-templates/systems - Lấy danh sách hệ nhôm
router.get('/systems', controller.getAvailableSystems);

// GET /api/product-templates/:id - Lấy chi tiết template
router.get('/:id', controller.getById);

// GET /api/product-templates/:id/bom-preview - Preview BOM
router.get('/:id/bom-preview', controller.getBomPreview);

// POST /api/product-templates - Tạo mới template
router.post('/', controller.create);

// PUT /api/product-templates/:id - Cập nhật template
router.put('/:id', controller.update);

// DELETE /api/product-templates/:id - Xóa template (soft delete)
router.delete('/:id', controller.delete);

module.exports = router;
