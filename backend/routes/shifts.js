const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/assignments', shiftController.getAssignments);
router.post('/assignments', shiftController.assignShift);

router.get('/', shiftController.getShifts);
router.post('/', shiftController.createShift);
router.put('/:id', shiftController.updateShift);
router.delete('/:id', shiftController.deleteShift);

module.exports = router;
