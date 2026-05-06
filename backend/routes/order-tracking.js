// order-tracking.js - Routes cho Order Tracking Dashboard
const express = require('express');
const router = express.Router();
const orderTrackingController = require('../controllers/orderTrackingController');

// GET /api/order-tracking - Lấy danh sách đơn hàng
router.get('/', orderTrackingController.getOrders);

// GET /api/order-tracking/stats - Lấy thống kê tổng quan
router.get('/stats', orderTrackingController.getStats);

// GET /api/order-tracking/export - Export Excel
router.get('/export', orderTrackingController.exportExcel);

// GET /api/order-tracking/:id - Chi tiết đơn hàng
router.get('/:id', orderTrackingController.getOrderDetail);

// PUT /api/order-tracking/:id - Cập nhật đơn hàng
router.put('/:id', orderTrackingController.updateOrder);

module.exports = router;
