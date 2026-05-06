/**
 * =====================================================
 * CHAT AUTH — Authorization Middleware
 * =====================================================
 */
const chatService = require('../services/chatService');

const ROLE_HIERARCHY = { owner: 3, admin: 2, member: 1 };

// Check if user is a member of conversation
async function isConversationMember(req, res, next) {
    const userId = req.user?.id;
    const convId = req.params.id || req.params.conversationId;
    if (!userId || !convId) return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });

    const role = await chatService.getMemberRole(convId, userId);
    if (!role) return res.status(403).json({ success: false, message: 'Bạn không phải thành viên cuộc trò chuyện này' });

    req.memberRole = role;
    next();
}

// Check if user is admin or owner
async function isConversationAdmin(req, res, next) {
    const userId = req.user?.id;
    const convId = req.params.id || req.params.conversationId;
    if (!userId || !convId) return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });

    const role = await chatService.getMemberRole(convId, userId);
    if (!role || ROLE_HIERARCHY[role] < ROLE_HIERARCHY['admin']) {
        return res.status(403).json({ success: false, message: 'Chỉ quản trị viên nhóm mới có quyền này' });
    }

    req.memberRole = role;
    next();
}

// Check if user is owner
async function isConversationOwner(req, res, next) {
    const userId = req.user?.id;
    const convId = req.params.id || req.params.conversationId;
    if (!userId || !convId) return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });

    const role = await chatService.getMemberRole(convId, userId);
    
    // Check if it's a private chat
    const db = require('../config/db');
    const [[conv]] = await db.query('SELECT type FROM conversations WHERE id = ?', [convId]);
    
    if (conv && conv.type === 'private') {
        if (!role) {
            return res.status(403).json({ success: false, message: 'Bạn không phải thành viên cuộc trò chuyện này' });
        }
    } else {
        if (role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Chỉ chủ nhóm mới có quyền này' });
        }
    }

    req.memberRole = role;
    next();
}

// Rate limiting for messages
const rateLimits = new Map();
const MESSAGE_LIMIT = 20;
const WINDOW_MS = 60000;

function messageRateLimit(req, res, next) {
    const userId = req.user?.id;
    if (!userId) return next();

    const now = Date.now();
    const entry = rateLimits.get(userId) || { count: 0, reset: now + WINDOW_MS };

    if (now > entry.reset) {
        entry.count = 0;
        entry.reset = now + WINDOW_MS;
    }

    entry.count++;
    rateLimits.set(userId, entry);

    if (entry.count > MESSAGE_LIMIT) {
        return res.status(429).json({
            success: false,
            message: `Bạn gửi quá nhanh. Tối đa ${MESSAGE_LIMIT} tin nhắn/phút. Vui lòng chờ.`
        });
    }
    next();
}

module.exports = { isConversationMember, isConversationAdmin, isConversationOwner, messageRateLimit };
