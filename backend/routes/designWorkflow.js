/**
 * =====================================================
 * DESIGN WORKFLOW ROUTES
 * =====================================================
 * 
 * All routes for Design Workflow system
 * 
 * @author ViralWindow Development Team
 */

const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');

// Controllers
const designRevisionController = require('../controllers/designRevisionController');
const designUnitController = require('../controllers/designUnitController');
// const designBOMController = require('../controllers/designBOMController');
// const designPRController = require('../controllers/designPRController');

// =====================================================
// DESIGN REVISIONS
// =====================================================

// GET all revisions (with filters)
router.get('/revisions', auth, designRevisionController.getAll);

// GET revision by ID (with units, files, BOM, PRs)
router.get('/revisions/:id', auth, designRevisionController.getById);

// CREATE new revision
router.post('/revisions', auth, designRevisionController.create);

// RECEIVE files (set received info)
router.post('/revisions/:id/receive', auth, designRevisionController.receive);

// ASSIGN designer
router.post('/revisions/:id/assign', auth, designRevisionController.assign);

// START EDITING (RECEIVED → EDITING)
router.post('/revisions/:id/start-editing', auth, designRevisionController.startEditing);

// LOCK design (EDITING → LOCKED)
router.post('/revisions/:id/lock', auth, designRevisionController.lock);

// CREATE NEW REVISION from locked (rollback via revision)
router.post('/revisions/:id/create-revision', auth, designRevisionController.createRevision);

// GET lock checklist status
router.get('/revisions/:id/lock-checklist', auth, designRevisionController.getLockChecklist);

// GET timeline/audit logs
router.get('/revisions/:id/timeline', auth, designRevisionController.getTimeline);


// =====================================================
// DESIGN UNITS
// =====================================================

// GET units by revision
router.get('/revisions/:revisionId/units', auth, designUnitController.getByRevision);

// CREATE unit
router.post('/revisions/:revisionId/units', auth, designUnitController.create);

// BULK CREATE units (from template)
router.post('/revisions/:revisionId/units/bulk', auth, designUnitController.bulkCreate);

// GET unit by ID
router.get('/units/:id', auth, designUnitController.getById);

// UPDATE unit
router.put('/units/:id', auth, designUnitController.update);

// DELETE unit
router.delete('/units/:id', auth, designUnitController.delete);


// =====================================================
// DESIGN FILES
// =====================================================

// TODO: Implement file upload/download endpoints
// router.post('/revisions/:revisionId/files', auth, upload.single('file'), designFileController.upload);
// router.get('/files/:id', auth, designFileController.download);
// router.delete('/files/:id', auth, designFileController.delete);


// =====================================================
// DESIGN BOM
// =====================================================

const designBOMController = require('../controllers/designBOMController');

// Generate BOM from units
router.post('/revisions/:revisionId/bom/generate', auth, designBOMController.generate);

// GET BOM by ID
router.get('/bom/:bomId', auth, designBOMController.getById);

// Validate BOM
router.post('/bom/:bomId/validate', auth, designBOMController.validate);

// Freeze BOM
router.post('/bom/:bomId/freeze', auth, designBOMController.freeze);

// Update BOM line (override)
router.put('/bom-lines/:lineId', auth, designBOMController.updateLine);


// =====================================================
// DESIGN PURCHASE REQUESTS
// =====================================================

const designPRController = require('../controllers/designPRController');

// Create PR from BOM
router.post('/bom/:bomId/pr/create', auth, designPRController.create);

// GET PR by ID
router.get('/pr/:prId', auth, designPRController.getById);

// Submit PR
router.post('/pr/:prId/submit', auth, designPRController.submit);

// Approve PR
router.post('/pr/:prId/approve', auth, designPRController.approve);

// Reject PR
router.post('/pr/:prId/reject', auth, designPRController.reject);

// Refresh inventory for PR
router.post('/pr/:prId/refresh-inventory', auth, designPRController.refreshInventory);


module.exports = router;

