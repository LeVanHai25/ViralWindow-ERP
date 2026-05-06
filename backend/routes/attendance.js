const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Employee endpoints
router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.get('/today', attendanceController.getTodayStatus);
router.get('/my', attendanceController.getMyAttendance);
router.get('/weekly', attendanceController.getWeeklyData);

// Admin endpoints
router.get('/all', attendanceController.getAllAttendance);
router.get('/summary', attendanceController.getMonthlySummary);
router.get('/stats', attendanceController.getStats);
router.put('/:id', attendanceController.editAttendance);

module.exports = router;
