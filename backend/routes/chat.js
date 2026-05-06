/**
 * =====================================================
 * CHAT ROUTES — REST API Endpoints
 * =====================================================
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const chatController = require('../controllers/chatController');
const { isConversationMember, isConversationAdmin, isConversationOwner, messageRateLimit } = require('../middleware/chatAuth');
const { authenticateToken } = require('../middleware/auth');
const requireAuth = authenticateToken;

// File upload config
const ALLOWED_MIMES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain', 'application/zip'
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'chat');
        const fs = require('fs');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const prefix = file.mimetype.startsWith('image/') ? 'img' : 'file';
        const uid = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);
        cb(null, `${prefix}_${uid}_${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Loại file không được hỗ trợ. Chấp nhận: ảnh, PDF, Word, Excel, Text, ZIP'));
        }
    }
});

// === CONVERSATIONS ===
router.get('/conversations', requireAuth, chatController.getConversations);
router.post('/conversations', requireAuth, chatController.createConversation);
router.put('/conversations/:id', requireAuth, isConversationAdmin, chatController.updateConversation);
router.delete('/conversations/:id', requireAuth, isConversationOwner, chatController.deleteConversation);

// === MEMBERS ===
router.get('/conversations/:id/members', requireAuth, isConversationMember, chatController.getMembers);
router.post('/conversations/:id/members', requireAuth, isConversationAdmin, chatController.addMember);
router.delete('/conversations/:id/members/:userId', requireAuth, isConversationAdmin, chatController.removeMember);

// === MESSAGES ===
router.get('/conversations/:id/messages', requireAuth, isConversationMember, chatController.getMessages);
router.post('/conversations/:id/messages', requireAuth, isConversationMember, messageRateLimit, chatController.sendMessage);

// === MESSAGE ACTIONS ===
router.put('/messages/:id/pin', requireAuth, chatController.togglePin);
router.delete('/messages/:id', requireAuth, chatController.deleteMessage);
router.post('/messages/:id/read', requireAuth, chatController.markAsRead);

// === REACTIONS ===
router.post('/messages/:id/reactions', requireAuth, chatController.toggleReaction);
router.get('/messages/:id/reactions', requireAuth, chatController.getReactions);

// === PINNED MESSAGES ===
router.get('/conversations/:id/pinned', requireAuth, isConversationMember, chatController.getPinnedMessages);

// === SHARED MEDIA ===
router.get('/conversations/:id/media', requireAuth, isConversationMember, chatController.getSharedMedia);

// === CLEAR HISTORY ===
router.delete('/conversations/:id/messages', requireAuth, isConversationMember, chatController.clearHistory);

// === SEARCH ===
router.get('/search', requireAuth, chatController.searchMessages);

// === FILE UPLOAD ===
router.post('/upload', requireAuth, upload.single('file'), chatController.uploadFile);

// === USERS (for member picker) ===
router.get('/users', requireAuth, chatController.getUsers);

// === ADMIN STATS ===
router.get('/admin/stats', requireAuth, chatController.getStats);

// Error handling for multer
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ success: false, message: 'File quá lớn. Tối đa 10MB.' });
        }
    }
    if (err.message && err.message.includes('Loại file')) {
        return res.status(415).json({ success: false, message: err.message });
    }
    next(err);
});

module.exports = router;
