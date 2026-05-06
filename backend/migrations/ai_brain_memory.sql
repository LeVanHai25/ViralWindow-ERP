DROP TABLE IF EXISTS ai_analytics_logs;
DROP TABLE IF EXISTS ai_chat_messages;
DROP TABLE IF EXISTS ai_chat_sessions;

CREATE TABLE ai_chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT 'New Chat',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
);

CREATE TABLE ai_chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    tools_used JSON DEFAULT NULL,
    data_context JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id)
);

CREATE TABLE ai_analytics_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    session_id VARCHAR(36) DEFAULT NULL,
    intent VARCHAR(50) DEFAULT NULL,
    category VARCHAR(50) DEFAULT NULL,
    query_text TEXT,
    response_preview TEXT,
    tools_executed INT DEFAULT 0,
    processing_ms INT DEFAULT 0,
    token_metrics JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_intent (intent),
    INDEX idx_created_at (created_at)
);
