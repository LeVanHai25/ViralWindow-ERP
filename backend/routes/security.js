/**
 * Security Routes
 * Login history, session management, password change
 */

const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Login history
router.get('/login-history', securityController.getLoginHistory);

// Session management  
router.get('/sessions', securityController.getActiveSessions);
router.post('/sessions/:id/terminate', securityController.terminateSession);
router.post('/sessions/terminate-all', securityController.terminateAllSessions);

// Password change
router.post('/change-password', securityController.changePassword);

module.exports = router;
