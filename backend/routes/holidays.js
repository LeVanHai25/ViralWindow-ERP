const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', holidayController.getHolidays);
router.post('/', holidayController.createHoliday);
router.put('/:id', holidayController.updateHoliday);
router.delete('/:id', holidayController.deleteHoliday);

module.exports = router;
