/**
 * =====================================================
 * AI BRAIN — PERSISTENT MEMORY & ANALYTICS (Layer 6)
 * =====================================================
 * Quản lý Trí nhớ dài hạn (Lịch sử Chat) cho từng User và
 * lưu trữ Log phân tích hiệu suất của AI Brain.
 *
 * @author ViralWindow AI Brain
 */

const db = require('../config/db');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID(); // Sử dụng Node.js crypto thay vì thư viện ngoài

// =====================================================
// 1. CHAT SESSIONS & HISTORY MEMORY
// =====================================================

/**
 * Lấy hoặc tạo một Session Chat mới cho User
 * @param {number} userId 
 * @param {string} sessionId (Tùy chọn) Nếu truyền lên sẽ dùng cái này
 * @returns {string} sessionId
 */
async function getOrCreateSession(userId, sessionId = null) {
    if (!userId) return null;

    try {
        if (sessionId) {
            // Kiểm tra xem session có tồn tại và thuộc về user này không
            const [rows] = await db.query('SELECT id FROM ai_chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
            if (rows.length > 0) {
                // Cập nhật last active
                await db.query('UPDATE ai_chat_sessions SET last_active_at = NOW() WHERE id = ?', [sessionId]);
                return sessionId;
            }
        }

        // Tạo mới session
        const newSessionId = uuidv4();
        await db.query(
            'INSERT INTO ai_chat_sessions (id, user_id, title) VALUES (?, ?, ?)',
            [newSessionId, userId, 'Hội thoại mới']
        );
        return newSessionId;
    } catch (err) {
        console.error('❌ Memory Error (getOrCreateSession):', err.message);
        return null;
    }
}

/**
 * Lưu 1 tin nhắn vào lịch sử (của user hoặc của AI)
 * @param {string} sessionId 
 * @param {string} role 'user' | 'assistant'
 * @param {string} content Nội dung tin nhắn
 * @param {Object} meta Thông tin thêm (tools_used, data_context...)
 */
async function saveMessage(sessionId, role, content, meta = {}) {
    if (!sessionId) return false;

    try {
        const toolsJson = meta.tools_used && meta.tools_used.length > 0 ? JSON.stringify(meta.tools_used) : null;
        
        // Chỉ lưu 1 phần data_context nếu quá lớn để debug, không nên lưu full DB response
        let dataContextStr = null;
        if (meta.data_context) {
            const keys = Object.keys(meta.data_context).filter(k => !k.startsWith('_'));
            // Chỉ lưu danh sách key hoặc 500 ký tự đầu tiên
            dataContextStr = JSON.stringify({
                keys_loaded: keys,
                preview: JSON.stringify(meta.data_context).substring(0, 500) + '...'
            });
        }

        await db.query(
            'INSERT INTO ai_chat_messages (session_id, role, content, tools_used, data_context) VALUES (?, ?, ?, ?, ?)',
            [sessionId, role, content, toolsJson, dataContextStr]
        );

        // Auto-generate title nếu đây là tin nhắn đầu tiên của user
        if (role === 'user') {
            const [msgCount] = await db.query('SELECT COUNT(*) as count FROM ai_chat_messages WHERE session_id = ? AND role = "user"', [sessionId]);
            if (msgCount[0].count === 1) {
                const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
                await db.query('UPDATE ai_chat_sessions SET title = ? WHERE id = ?', [title, sessionId]);
            }
        }

        return true;
    } catch (err) {
        console.error('❌ Memory Error (saveMessage):', err.message);
        return false;
    }
}

/**
 * Load lịch sử chat để nhúng vào Prompt
 * @param {string} sessionId 
 * @param {number} limitLimit Số lượng tin nhắn gần nhất cần lấy
 * @returns {Array<{role: string, content: string}>}
 */
async function loadSessionHistory(sessionId, limit = 10) {
    if (!sessionId) return [];

    try {
        // Lấy n tin nhắn gần nhất, sắp xếp ASC để gửi cho AI theo đúng thứ tự
        const [rows] = await db.query(
            `SELECT role, content 
             FROM (
                SELECT role, content, created_at 
                FROM ai_chat_messages 
                WHERE session_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
             ) as recent_messages
             ORDER BY created_at ASC`,
            [sessionId, limit]
        );
        return rows;
    } catch (err) {
        console.error('❌ Memory Error (loadSessionHistory):', err.message);
        return [];
    }
}

/**
 * Lấy danh sách các phiên chat của 1 User
 * @param {number} userId 
 */
async function getUserSessions(userId) {
    if (!userId) return [];
    try {
        const [rows] = await db.query(
            'SELECT id, title, last_active_at FROM ai_chat_sessions WHERE user_id = ? AND status = "active" ORDER BY last_active_at DESC LIMIT 20',
            [userId]
        );
        return rows;
    } catch (err) {
        console.error('❌ Memory Error (getUserSessions):', err.message);
        return [];
    }
}

// =====================================================
// 2. AI ANALYTICS & LOGGING
// =====================================================

/**
 * Ghi log query của AI để report và phân tích
 * @param {Object} logData
 * {
 *   user_id: 1, session_id: 'abc', intent: 'query_data', category: 'projects',
 *   query_text: 'Dự án anh Minh?', tools_executed: 2, processing_ms: 1500,
 *   token_metrics: { prompt: 100, completion: 50, total: 150 }
 * }
 */
async function logAnalytics(logData) {
    try {
        const {
            user_id = null,
            session_id = null,
            intent = 'general',
            category = 'overview',
            query_text = '',
            response_preview = '',
            tools_executed = 0,
            processing_ms = 0,
            token_metrics = {}
        } = logData;

        // Truncate preview
        const preview = response_preview ? response_preview.substring(0, 500) : null;

        await db.query(
            `INSERT INTO ai_analytics_logs 
            (user_id, session_id, intent, category, query_text, response_preview, tools_executed, processing_ms, token_metrics)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id, session_id, intent, category, query_text, preview, tools_executed, processing_ms,
                JSON.stringify(token_metrics)
            ]
        );
        return true;
    } catch (err) {
        console.error('❌ Analytics Error (logAnalytics):', err.message);
        // Không crash app nếu ghi log lỗi
        return false;
    }
}

module.exports = {
    getOrCreateSession,
    saveMessage,
    loadSessionHistory,
    getUserSessions,
    logAnalytics
};
