const express = require("express");
const router = express.Router();
const notificationCtrl = require("../controllers/notificationController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// Routes that require authentication
router.get("/", authenticateToken, notificationCtrl.getAllNotifications);
// Routes with optional auth (return 0 count if not logged in)
router.get("/unread-count", optionalAuth, notificationCtrl.getUnreadCount);
router.get("/unread", optionalAuth, notificationCtrl.getUnreadCount); // Alias for compatibility
router.post("/:id/read", authenticateToken, notificationCtrl.markAsRead);
router.post("/read-all", authenticateToken, notificationCtrl.markAllAsRead);
router.delete("/:id", authenticateToken, notificationCtrl.deleteNotification);
router.delete("/delete-read", authenticateToken, notificationCtrl.deleteAllRead);
router.post("/", authenticateToken, notificationCtrl.create);

// NEW: Notification detail with audit log info
router.get("/:id/detail", authenticateToken, notificationCtrl.getDetail);

// NEW: Audit log routes
router.get("/audit-logs", authenticateToken, notificationCtrl.getAuditLogs);
router.get("/audit-logs/entity/:type/:id", authenticateToken, notificationCtrl.getEntityHistory);
router.get("/event-types", authenticateToken, notificationCtrl.getEventTypes);
router.get('/activity-logs', authenticateToken, notificationCtrl.getActivityLogs);
router.get('/audit-logs', authenticateToken, notificationCtrl.getAuditLogs);

module.exports = router;
