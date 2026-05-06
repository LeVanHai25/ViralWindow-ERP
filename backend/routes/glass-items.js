const express = require('express');
const router = express.Router();
const controller = require('../controllers/glassItemController');

// ============================================
// GLASS ITEMS ROUTES
// API cho quản lý bảng kính
// ============================================

// GET /api/glass-items - Lấy tất cả kính
router.get('/', controller.getAll);

// GET /api/glass-items/:id - Lấy chi tiết kính
router.get('/:id', controller.getById);

// POST /api/glass-items - Tạo mới kính
router.post('/', controller.create);

// PUT /api/glass-items/:id - Cập nhật kính
router.put('/:id', controller.update);

// DELETE /api/glass-items/:id - Xóa kính
router.delete('/:id', controller.delete);

module.exports = router;
