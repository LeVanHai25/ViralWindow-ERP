-- =====================================================
-- Migration: Security Tables
-- Purpose: Login history and session management
-- Created: 2026-02-07
-- =====================================================

-- Login History Table - Tracks all login attempts
CREATE TABLE IF NOT EXISTS login_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),
    location VARCHAR(255),
    status ENUM('success', 'failed') DEFAULT 'success',
    failure_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Active Sessions Table - Tracks active login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45),
    device_info VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),
    is_current BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token(255)),
    INDEX idx_is_active (is_active)
);

-- =====================================================
-- Verify tables were created
-- =====================================================
SHOW TABLES LIKE '%login_history%';
SHOW TABLES LIKE '%user_sessions%';
