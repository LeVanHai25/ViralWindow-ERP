/**
 * =====================================================
 * CHAT LOGGER — Activity Logging
 * =====================================================
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const MAX_LOG_SIZE = 50 * 1024 * 1024; // 50MB

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogPath() {
    return path.join(LOG_DIR, 'chat.log');
}

function rotateIfNeeded() {
    const logPath = getLogPath();
    try {
        if (fs.existsSync(logPath)) {
            const stats = fs.statSync(logPath);
            if (stats.size > MAX_LOG_SIZE) {
                const date = new Date().toISOString().split('T')[0];
                const archivePath = path.join(LOG_DIR, `chat_${date}.log`);
                fs.renameSync(logPath, archivePath);
            }
        }
    } catch (e) { /* ignore rotation errors */ }
}

function logChat(action, data) {
    try {
        rotateIfNeeded();
        const entry = {
            t: new Date().toISOString(),
            a: action,
            u: data.userId || null,
            c: data.conversationId || null,
            m: data.messageId || null,
            d: data.details || null
        };
        fs.appendFileSync(getLogPath(), JSON.stringify(entry) + '\n');
    } catch (e) {
        console.error('Chat log error:', e.message);
    }
}

module.exports = { logChat };
