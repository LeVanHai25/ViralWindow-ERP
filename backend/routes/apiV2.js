/**
 * =====================================================
 * API V2 ROUTES
 * ACT Style Architecture
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const itemCtrl = require('../controllers/projectItemV2Controller');

// =====================================================
// PROJECT ITEMS V2
// =====================================================

// CRUD
router.get('/project-items', itemCtrl.getAll);
router.get('/project-items/:id', itemCtrl.getById);
router.post('/project-items', itemCtrl.create);
router.put('/project-items/:id/config', itemCtrl.updateConfig);
router.delete('/project-items/:id', itemCtrl.delete);

// BOM
router.post('/project-items/:id/calculate-bom', itemCtrl.calculateBOM);
router.get('/project-items/:id/bom', itemCtrl.getBOM);

// Rules
router.get('/rules', itemCtrl.getRules);

// Templates V2
router.get('/templates', itemCtrl.getTemplates);

module.exports = router;

