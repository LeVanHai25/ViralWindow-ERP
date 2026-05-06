-- ============================================================
-- FIX: Restore missing tables and columns for Activity Logs and Notifications
-- ============================================================

USE `viral_window_db`;

-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `method` varchar(10) NOT NULL COMMENT 'GET, POST, PUT, DELETE, PATCH',
  `url` varchar(500) NOT NULL,
  `status_code` int(5) DEFAULT NULL,
  `duration_ms` int(11) DEFAULT NULL COMMENT 'Response time in ms',
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `request_body` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Sanitized request body (no passwords)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_method` (`method`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_url` (`url`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add missing columns to notifications
DROP PROCEDURE IF EXISTS fix_notification_cols;
DELIMITER $$
CREATE PROCEDURE fix_notification_cols()
BEGIN
    -- Check and add icon
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'icon') THEN
        ALTER TABLE `notifications` ADD COLUMN `icon` varchar(20) DEFAULT '📢' AFTER `message`;
    END IF;

    -- Check and add color
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'color') THEN
        ALTER TABLE `notifications` ADD COLUMN `color` varchar(20) DEFAULT 'blue' AFTER `icon`;
    END IF;

    -- Check and add priority (aliased as severity or priority depending on controller expectation)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'priority') THEN
        ALTER TABLE `notifications` ADD COLUMN `priority` varchar(20) DEFAULT 'normal' AFTER `color`;
    END IF;
END$$
DELIMITER ;
CALL fix_notification_cols();
DROP PROCEDURE IF EXISTS fix_notification_cols;

SELECT 'DATABASE FIX APPLIED' AS status;
