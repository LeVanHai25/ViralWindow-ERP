/**
 * =====================================================
 * SOCKET SERVICE — WebSocket Realtime Handler
 * =====================================================
 * Handles: connection, disconnect, messaging, typing, presence
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('./chatService');
const { logChat } = require('./chatLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

let io = null;

// Rate limit for WebSocket messages
const wsRateLimits = new Map();
const WS_MSG_LIMIT = 20;
const WS_WINDOW_MS = 60000;

function checkWsRateLimit(userId) {
    const now = Date.now();
    const entry = wsRateLimits.get(userId) || { count: 0, reset: now + WS_WINDOW_MS };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + WS_WINDOW_MS; }
    entry.count++;
    wsRateLimits.set(userId, entry);
    return entry.count <= WS_MSG_LIMIT;
}

// Typing throttle
const typingTimers = new Map();

function initSocketIO(httpServer) {
    io = new Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        pingTimeout: 30000,
        pingInterval: 10000
    });

    // =====================================================
    // JWT Authentication Middleware
    // =====================================================
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Xác thực thất bại: thiếu token'));

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.id;
            socket.userName = decoded.full_name || decoded.name || 'User';
            next();
        } catch (err) {
            next(new Error('Token không hợp lệ'));
        }
    });

    // =====================================================
    // Connection Handler
    // =====================================================
    io.on('connection', async (socket) => {
        const userId = socket.userId;
        const userName = socket.userName;
        console.log(`💬 [Chat] ${userName} (ID:${userId}) đã kết nối`);

        // Set user online
        await chatService.setUserOnline(userId, socket.id);
        io.emit('user_online', { userId, userName });

        // Auto-join all conversation rooms
        try {
            const conversations = await chatService.getConversationsByUser(userId);
            conversations.forEach(c => {
                socket.join(`conv_${c.id}`);
            });
        } catch (e) {
            console.error('Error joining rooms:', e.message);
        }

        // -------------------------------------------------
        // JOIN CONVERSATION ROOM
        // -------------------------------------------------
        socket.on('join_conversation', async (data) => {
            const convId = data.conversationId;
            const role = await chatService.getMemberRole(convId, userId);
            if (role) {
                socket.join(`conv_${convId}`);
                socket.emit('joined_conversation', { conversationId: convId });
            }
        });

        // -------------------------------------------------
        // LEAVE CONVERSATION ROOM
        // -------------------------------------------------
        socket.on('leave_conversation', (data) => {
            socket.leave(`conv_${data.conversationId}`);
        });

        // -------------------------------------------------
        // SEND MESSAGE (Realtime)
        // -------------------------------------------------
        socket.on('send_message', async (data) => {
            try {
                const { conversationId, content, type, replyToId, fileData } = data;

                // Authorization check
                const role = await chatService.getMemberRole(conversationId, userId);
                if (!role) return socket.emit('error', { message: 'Không có quyền gửi tin nhắn' });

                // Rate limit
                if (!checkWsRateLimit(userId)) {
                    return socket.emit('error', { message: 'Bạn gửi quá nhanh. Chờ 1 phút.' });
                }

                // Sanitize content
                const sanitized = type === 'text'
                    ? (content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    : content;

                const message = await chatService.createMessage(
                    conversationId, userId, sanitized, type || 'text', fileData || null, replyToId || null
                );

                // Broadcast to room
                io.to(`conv_${conversationId}`).emit('new_message', message);

                // Parse @mentions and notify
                if (type === 'text' && content) {
                    const mentionRegex = /@([^\s@]+)/g;
                    let match;
                    const mentioned = new Set();
                    while ((match = mentionRegex.exec(content)) !== null) {
                        mentioned.add(match[1]);
                    }
                    if (mentioned.size > 0) {
                        try {
                            const members = await chatService.getConversationMembers(conversationId);
                            members.forEach(m => {
                                const names = [m.full_name, m.full_name?.split(' ').pop()];
                                const isMentioned = names.some(n => n && mentioned.has(n));
                                if (isMentioned && m.user_id !== userId) {
                                    io.emit('mention_notification', {
                                        userId: m.user_id,
                                        conversationId,
                                        messageId: message.id,
                                        mentionedBy: userName,
                                        content: sanitized?.substring(0, 100)
                                    });
                                }
                            });
                        } catch (e) { /* ignore mention errors */ }
                    }
                }

                logChat('send_message', { userId, conversationId, messageId: message.id });
            } catch (err) {
                console.error('WS send_message error:', err.message);
                socket.emit('error', { message: 'Lỗi gửi tin nhắn' });
            }
        });

        // -------------------------------------------------
        // REACTION (Realtime)
        // -------------------------------------------------
        socket.on('add_reaction', async (data) => {
            try {
                const { messageId, emoji, conversationId } = data;
                if (!messageId || !emoji) return;

                const db = require('../config/db');
                const [existing] = await db.query(
                    'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
                    [messageId, userId, emoji]
                );

                if (existing.length > 0) {
                    await chatService.removeReaction(messageId, userId, emoji);
                } else {
                    await chatService.addReaction(messageId, userId, emoji);
                }

                const reactions = await chatService.getReactions(messageId);
                io.to(`conv_${conversationId}`).emit('reaction_update', { messageId, reactions });
            } catch (err) {
                console.error('WS add_reaction error:', err.message);
            }
        });

        // -------------------------------------------------
        // TYPING INDICATOR (throttled)
        // -------------------------------------------------
        socket.on('typing', (data) => {
            const key = `${userId}_${data.conversationId}`;
            if (typingTimers.has(key)) return; // throttle

            typingTimers.set(key, true);
            socket.to(`conv_${data.conversationId}`).emit('user_typing', {
                userId, userName, conversationId: data.conversationId
            });

            setTimeout(() => typingTimers.delete(key), 300);
        });

        socket.on('stop_typing', (data) => {
            socket.to(`conv_${data.conversationId}`).emit('user_stop_typing', {
                userId, conversationId: data.conversationId
            });
        });

        // -------------------------------------------------
        // MESSAGE READ
        // -------------------------------------------------
        socket.on('message_read', async (data) => {
            try {
                await chatService.markAsRead(data.messageId, userId);
                io.to(`conv_${data.conversationId}`).emit('read_receipt', {
                    messageId: data.messageId, userId, userName
                });
            } catch (e) { /* ignore */ }
        });

        // -------------------------------------------------
        // MODULE ROOMS (Realtime data updates)
        // -------------------------------------------------
        socket.on('join_module', (data) => {
            const mod = data.module;
            if (mod && typeof mod === 'string') {
                socket.join(`module_${mod}`);
                console.log(`📡 ${userName} joined module: ${mod}`);
            }
        });

        socket.on('leave_module', (data) => {
            const mod = data.module;
            if (mod && typeof mod === 'string') {
                socket.leave(`module_${mod}`);
            }
        });

        // keepalive pong (Render Free Plan: prevent 15-min sleep)
        socket.on('keepalive', () => {
            socket.emit('keepalive_ack', { ts: Date.now() });
        });

        // -------------------------------------------------
        // DISCONNECT
        // -------------------------------------------------
        socket.on('disconnect', async () => {
            console.log(`💬 [Chat] ${userName} (ID:${userId}) đã ngắt kết nối`);
            await chatService.setUserOffline(userId);
            io.emit('user_offline', { userId, lastSeen: new Date().toISOString() });
        });
    });

    console.log('💬 Socket.io Chat + Realtime Server đã khởi tạo');
    return io;
}

function getIO() {
    return io;
}

/**
 * Emit a data change event to all clients listening on a module.
 * Usage from any controller:
 *   const { emitDataChange } = require('../services/socketService');
 *   emitDataChange('projects', 'created', { id: 1, name: 'Test' });
 *
 * @param {string} module - Module name: projects, inventory, quotations, finance, orders, bom
 * @param {string} action - Action: created, updated, deleted, status_changed
 * @param {object} data - Payload (partial data, e.g. { id, name })
 * @param {object} [options] - { excludeSocketId, room }
 */
function emitDataChange(module, action, data, options = {}) {
    if (!io) return;
    const event = 'data_changed';
    const payload = { module, action, data, timestamp: Date.now() };

    if (options.room) {
        io.to(options.room).emit(event, payload);
    } else {
        // Emit to module room + broadcast globally
        io.to(`module_${module}`).emit(event, payload);
    }
}

module.exports = { initSocketIO, getIO, emitDataChange };
