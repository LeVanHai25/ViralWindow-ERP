-- ============================================
-- MIGRATION: Fix notifications table to add missing columns
-- Run this script if you get "Unknown column 'icon'" error
-- ============================================

-- Add user_id column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'user_id');
SET @add_user_id = IF(@col_exists = 0, 
    'ALTER TABLE notifications ADD COLUMN user_id INT NULL COMMENT "NULL = broadcast to all users" AFTER id', 
    'SELECT "Column user_id already exists"');
PREPARE stmt FROM @add_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add icon column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'icon');
SET @add_icon = IF(@col_exists = 0, 
    'ALTER TABLE notifications ADD COLUMN icon VARCHAR(20) DEFAULT "📢" COMMENT "Emoji icon"', 
    'SELECT "Column icon already exists"');
PREPARE stmt FROM @add_icon;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add color column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'color');
SET @add_color = IF(@col_exists = 0, 
    'ALTER TABLE notifications ADD COLUMN color VARCHAR(20) DEFAULT "blue" COMMENT "blue, green, red, yellow, orange, purple"', 
    'SELECT "Column color already exists"');
PREPARE stmt FROM @add_color;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add priority column if not exists  
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'priority');
SET @add_priority = IF(@col_exists = 0, 
    'ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT "normal" COMMENT "normal, high, urgent"', 
    'SELECT "Column priority already exists"');
PREPARE stmt FROM @add_priority;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add link column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'link');
SET @add_link = IF(@col_exists = 0, 
    'ALTER TABLE notifications ADD COLUMN link VARCHAR(500) NULL COMMENT "URL to related page"', 
    'SELECT "Column link already exists"');
PREPARE stmt FROM @add_link;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_read column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'is_read');
SET @add_is_read = IF(@col_exists = 0, 
    'ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT 0', 
    'SELECT "Column is_read already exists"');
PREPARE stmt FROM @add_is_read;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add updated_at column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'updated_at');
SET @add_updated_at = IF(@col_exists = 0, 
    'ALTER TABLE notifications ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 
    'SELECT "Column updated_at already exists"');
PREPARE stmt FROM @add_updated_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify columns
DESCRIBE notifications;
