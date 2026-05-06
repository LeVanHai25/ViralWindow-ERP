const express = require('express');
const router = express.Router();
const doorTemplateFullCtrl = require('../controllers/doorTemplateFullController');

// Tạo template hoàn chỉnh
router.post('/full', doorTemplateFullCtrl.createFullTemplate);

// Lấy template hoàn chỉnh
router.get('/full/:id', doorTemplateFullCtrl.getFullTemplate);

// Cập nhật template hoàn chỉnh
router.put('/full/:id', doorTemplateFullCtrl.updateFullTemplate);

// Import template từ JSON
router.post('/full/import', doorTemplateFullCtrl.importFullTemplate);

module.exports = router;














































































