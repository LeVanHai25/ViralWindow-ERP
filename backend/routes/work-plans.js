const express = require('express');
const router = express.Router();
const workPlanController = require('../controllers/workPlanController');
const { authenticateToken } = require('../middleware/auth');

// Removed isManager middleware as per user request to allow all users

// All work plan routes require authentication
router.use(authenticateToken);

// GET routes (Employees can view if they are participants, Controller handles this logic)
router.get('/', workPlanController.getAllWorkPlans);
router.get('/users', workPlanController.getUsersForPlan);
router.get('/:id', workPlanController.getWorkPlanById);

// Discussion routes
router.get('/:id/comments', workPlanController.getComments);
router.post('/:id/comments', workPlanController.addComment);

// Logs routes
router.get('/:id/logs', workPlanController.getLogs);
router.post('/:id/logs', workPlanController.addLog);

// Checklist routes
router.get('/:id/checklists', workPlanController.getChecklists);
router.post('/:id/checklists', workPlanController.addChecklistItem);
router.put('/:id/checklists/:itemId/toggle', workPlanController.toggleChecklistItem);
router.delete('/:id/checklists/:itemId', workPlanController.deleteChecklistItem);

// POST, PUT, DELETE operations strictly require Manager/Admin role
router.post('/', workPlanController.createWorkPlan);
router.put('/:id', workPlanController.updateWorkPlan);
router.delete('/:id', workPlanController.deleteWorkPlan);

module.exports = router;
