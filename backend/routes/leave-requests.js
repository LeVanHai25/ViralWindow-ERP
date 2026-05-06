const express = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leaveRequestController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Employee endpoints
router.post('/', leaveRequestController.createLeave);
router.get('/my', leaveRequestController.getMyLeaves);
router.delete('/:id', leaveRequestController.deleteLeave);

// Admin endpoints
router.get('/all', leaveRequestController.getAllLeaves);
router.put('/:id/approve', leaveRequestController.approveLeave);
router.put('/:id/reject', leaveRequestController.rejectLeave);

module.exports = router;
