const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const workPlanTypeController = require('../controllers/workPlanTypeController');

router.use(authenticateToken);

router.get('/', workPlanTypeController.getAllTypes);
router.get('/:id', workPlanTypeController.getTypeById);
router.post('/', workPlanTypeController.createType);
router.put('/:id', workPlanTypeController.updateType);
router.delete('/:id', workPlanTypeController.deleteType);

module.exports = router;
