const express = require('express');
const router = express.Router();
const aluminumSystemController = require('../controllers/aluminumSystemController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.get('/ping', (req, res) => res.json({ success: true, message: 'Aluminum Catalog API is reacting' }));
router.get('/', aluminumSystemController.getAllSystems);
router.post('/', aluminumSystemController.createSystem);
router.put('/:id', aluminumSystemController.updateSystem);
router.delete('/:id', aluminumSystemController.deleteSystem);

console.log('🚀 Aluminum System Router Initialized');

module.exports = router;
