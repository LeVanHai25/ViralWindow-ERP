/**
 * =====================================================
 * CHAT CONTROLLER — Business Logic
 * =====================================================
 */
const chatService = require('../services/chatService');
const { logChat } = require('../services/chatLogger');
const path = require('path');
const fs = require('fs');

// Ensure upload dir exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// GET /api/chat/conversations
exports.getConversations = async (req, res) => {
    try {
        const conversations = await chatService.getConversationsByUser(req.user.id);
        res.json({ success: true, data: conversations });
    } catch (err) {
        console.error('Chat getConversations error:', err);
        res.status(500).json({ success: false, message: 'Lỗi tải danh sách trò chuyện' });
    }
};

// POST /api/chat/conversations
exports.createConversation = async (req, res) => {
    try {
        const { type, name, description, member_ids } = req.body;
        const userId = req.user.id;

        if (type === 'private') {
            if (!member_ids || member_ids.length !== 1) {
                return res.status(400).json({ success: false, message: 'Chat riêng cần chọn đúng 1 người' });
            }
            // Check existing private conversation
            const existing = await chatService.findPrivateConversation(userId, member_ids[0]);
            if (existing) {
                return res.json({ success: true, data: { id: existing }, message: 'Đã có cuộc trò chuyện' });
            }
        }

        if (type === 'group' && !name) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên nhóm' });
        }

        const convId = await chatService.createConversation(
            type, name, description, userId, member_ids || []
        );

        // System message
        if (type === 'group') {
            await chatService.createMessage(convId, userId,
                `đã tạo nhóm "${escapeHtml(name)}"`, 'system');
        }

        logChat('create_conversation', { userId, conversationId: convId, details: type === 'group' ? name : 'private' });
        res.status(201).json({ success: true, data: { id: convId }, message: 'Tạo cuộc trò chuyện thành công' });
    } catch (err) {
        console.error('Chat createConversation error:', err);
        res.status(500).json({ success: false, message: 'Lỗi tạo cuộc trò chuyện' });
    }
};

// PUT /api/chat/conversations/:id
exports.updateConversation = async (req, res) => {
    try {
        const { name, description, avatar_url } = req.body;
        await chatService.updateConversation(req.params.id, { name, description, avatar_url });
        logChat('update_conversation', { userId: req.user.id, conversationId: req.params.id });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('Chat updateConversation error:', err);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
    }
};

// DELETE /api/chat/conversations/:id
exports.deleteConversation = async (req, res) => {
    try {
        await chatService.deleteConversation(req.params.id, req.user.id);
        logChat('delete_conversation', { userId: req.user.id, conversationId: req.params.id });
        res.json({ success: true, message: 'Đã xoá cuộc trò chuyện' });
    } catch (err) {
        console.error('Chat deleteConversation error:', err);
        res.status(500).json({ success: false, message: 'Lỗi xoá' });
    }
};

// GET /api/chat/conversations/:id/members (WITH presence)
exports.getMembers = async (req, res) => {
    try {
        const members = await chatService.getConversationMembersWithPresence(req.params.id);
        res.json({ success: true, data: members });
    } catch (err) {
        console.error('Chat getMembers error:', err);
        res.status(500).json({ success: false, message: 'Lỗi tải thành viên' });
    }
};

// POST /api/chat/conversations/:id/members
exports.addMember = async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ success: false, message: 'Thiếu user_id' });

        await chatService.addMember(req.params.id, user_id);

        // System message
        const [users] = await require('../config/db').query('SELECT full_name FROM users WHERE id = ?', [user_id]);
        const name = users.length > 0 ? users[0].full_name : 'Người dùng';
        await chatService.createMessage(req.params.id, req.user.id,
            `đã thêm ${escapeHtml(name)} vào nhóm`, 'system');

        logChat('add_member', { userId: req.user.id, conversationId: req.params.id, details: `user ${user_id}` });
        res.json({ success: true, message: 'Đã thêm thành viên' });
    } catch (err) {
        console.error('Chat addMember error:', err);
        res.status(500).json({ success: false, message: 'Lỗi thêm thành viên' });
    }
};

// DELETE /api/chat/conversations/:id/members/:userId
exports.removeMember = async (req, res) => {
    try {
        const targetId = parseInt(req.params.userId);
        const targetRole = await chatService.getMemberRole(req.params.id, targetId);
        if (targetRole === 'owner') {
            return res.status(403).json({ success: false, message: 'Không thể xoá chủ nhóm' });
        }

        await chatService.removeMember(req.params.id, targetId);

        const [users] = await require('../config/db').query('SELECT full_name FROM users WHERE id = ?', [targetId]);
        const name = users.length > 0 ? users[0].full_name : 'Người dùng';
        await chatService.createMessage(req.params.id, req.user.id,
            `đã xoá ${escapeHtml(name)} khỏi nhóm`, 'system');

        logChat('remove_member', { userId: req.user.id, conversationId: req.params.id, details: `user ${targetId}` });
        res.json({ success: true, message: 'Đã xoá thành viên' });
    } catch (err) {
        console.error('Chat removeMember error:', err);
        res.status(500).json({ success: false, message: 'Lỗi xoá thành viên' });
    }
};

// GET /api/chat/conversations/:id/messages (WITH reactions batch)
exports.getMessages = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const before = req.query.before ? parseInt(req.query.before) : null;
        const messages = await chatService.getMessages(req.params.id, req.user.id, limit, before);

        // Batch load reactions for all messages
        const msgIds = messages.map(m => m.id);
        const reactionsMap = await chatService.getMessageReactionsBatch(msgIds);
        messages.forEach(m => { m.reactions = reactionsMap[m.id] || []; });

        res.json({ success: true, data: messages });
    } catch (err) {
        console.error('Chat getMessages error:', err);
        res.status(500).json({ success: false, message: 'Lỗi tải tin nhắn' });
    }
};

// POST /api/chat/conversations/:id/messages
exports.sendMessage = async (req, res) => {
    try {
        const { content, type, reply_to_id } = req.body;
        if (!content && type === 'text') {
            return res.status(400).json({ success: false, message: 'Tin nhắn không được trống' });
        }

        const sanitized = type === 'text' ? escapeHtml(content) : content;
        const message = await chatService.createMessage(
            req.params.id, req.user.id, sanitized, type || 'text', null, reply_to_id
        );

        // Broadcast via Socket.io if available
        const io = req.app.get('io');
        if (io) {
            io.to(`conv_${req.params.id}`).emit('new_message', message);
        }

        logChat('send_message', { userId: req.user.id, conversationId: req.params.id, messageId: message.id });
        res.status(201).json({ success: true, data: message });
    } catch (err) {
        console.error('Chat sendMessage error:', err);
        res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn' });
    }
};

// PUT /api/chat/messages/:id/pin
exports.togglePin = async (req, res) => {
    try {
        await chatService.togglePin(req.params.id);
        // Broadcast pin update via socket
        const io = req.app.get('io');
        if (io) io.emit('pin_update', { messageId: parseInt(req.params.id) });
        res.json({ success: true, message: 'Đã cập nhật ghim' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi ghim tin nhắn' });
    }
};

// DELETE /api/chat/messages/:id
exports.deleteMessage = async (req, res) => {
    try {
        await chatService.deleteMessage(req.params.id, req.user.id);
        res.json({ success: true, message: 'Đã xoá tin nhắn' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi xoá tin nhắn' });
    }
};

// POST /api/chat/messages/:id/reactions (toggle)
exports.toggleReaction = async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji) return res.status(400).json({ success: false, message: 'Thiếu emoji' });

        const db = require('../config/db');
        const [existing] = await db.query(
            'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
            [req.params.id, req.user.id, emoji]
        );

        if (existing.length > 0) {
            await chatService.removeReaction(req.params.id, req.user.id, emoji);
        } else {
            await chatService.addReaction(req.params.id, req.user.id, emoji);
        }

        const reactions = await chatService.getReactions(req.params.id);
        const io = req.app.get('io');
        if (io) io.emit('reaction_update', { messageId: parseInt(req.params.id), reactions });

        res.json({ success: true, data: reactions });
    } catch (err) {
        console.error('Chat toggleReaction error:', err);
        res.status(500).json({ success: false, message: 'Lỗi reaction' });
    }
};

// GET /api/chat/messages/:id/reactions
exports.getReactions = async (req, res) => {
    try {
        const reactions = await chatService.getReactions(req.params.id);
        res.json({ success: true, data: reactions });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi tải reactions' });
    }
};

// GET /api/chat/conversations/:id/pinned
exports.getPinnedMessages = async (req, res) => {
    try {
        const pinned = await chatService.getPinnedMessages(req.params.id, req.user.id);
        res.json({ success: true, data: pinned });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi tải tin ghim' });
    }
};

// POST /api/chat/messages/:id/read
exports.markAsRead = async (req, res) => {
    try {
        await chatService.markAsRead(req.params.id, req.user.id);

        const io = req.app.get('io');
        if (io) {
            // Notify sender that message was read
            io.emit('read_receipt', { messageId: parseInt(req.params.id), userId: req.user.id });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi đánh dấu đã đọc' });
    }
};

// GET /api/chat/search
exports.searchMessages = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ success: true, data: [] });

        const results = await chatService.searchMessages(req.user.id, q);
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi tìm kiếm' });
    }
};

// POST /api/chat/upload
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Không có file' });

        const file = req.file;
        const fileUrl = `/uploads/chat/${file.filename}`;
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'file';

        res.json({
            success: true,
            data: { url: fileUrl, name: file.originalname, size: file.size, type: fileType }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi upload file' });
    }
};

// GET /api/chat/users
exports.getUsers = async (req, res) => {
    try {
        const users = await chatService.getAllUsers();
        const online = await chatService.getOnlineUsers();
        const onlineSet = new Set(online);
        users.forEach(u => { u.is_online = onlineSet.has(u.id); });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi tải danh sách người dùng' });
    }
};

// GET /api/chat/conversations/:id/media?type=image|file|link
exports.getSharedMedia = async (req, res) => {
    try {
        const type = req.query.type || 'image'; // image | file | link
        const media = await chatService.getSharedMedia(req.params.id, req.user.id, type);
        res.json({ success: true, data: media });
    } catch (err) {
        console.error('Chat getSharedMedia error:', err);
        res.status(500).json({ success: false, message: 'Lỗi tải media' });
    }
};

// DELETE /api/chat/conversations/:id/messages (clear all history)
exports.clearHistory = async (req, res) => {
    try {
        await chatService.clearHistory(req.params.id, req.user.id);
        logChat('clear_history', { userId: req.user.id, conversationId: req.params.id });
        res.json({ success: true, message: 'Đã xoá lịch sử trò chuyện' });
    } catch (err) {
        console.error('Chat clearHistory error:', err);
        res.status(500).json({ success: false, message: 'Lỗi xoá lịch sử' });
    }
};

// GET /api/chat/admin/stats
exports.getStats = async (req, res) => {
    try {
        const db = require('../config/db');
        const [[{ total_conversations }]] = await db.query('SELECT COUNT(*) AS total_conversations FROM conversations');
        const [[{ total_messages }]] = await db.query('SELECT COUNT(*) AS total_messages FROM messages');
        const [[{ messages_today }]] = await db.query("SELECT COUNT(*) AS messages_today FROM messages WHERE DATE(created_at) = CURDATE()");
        const online = await chatService.getOnlineUsers();
        const io = req.app.get('io');
        res.json({
            success: true, data: {
                total_conversations, total_messages, messages_today,
                online_users: online.length,
                active_connections: io ? io.engine.clientsCount : 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi thống kê' });
    }
};
