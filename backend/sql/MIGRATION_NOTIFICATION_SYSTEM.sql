-- ============================================================
-- MIGRATION: Tạo bảng event_types và activity_logs
-- Chạy trong phpMyAdmin hoặc MySQL CLI
-- Ngày: 2026-03-06
-- ============================================================

USE `viral_window_db`;

-- ============================================================
-- 1. BẢNG event_types - Template thông báo theo event code
-- ============================================================

CREATE TABLE IF NOT EXISTS `event_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_code` varchar(100) NOT NULL COMMENT 'Unique event identifier',
  `module` varchar(50) NOT NULL COMMENT 'Module: project, customer, quotation, inventory, production, finance, system',
  `action` varchar(50) NOT NULL COMMENT 'Action: created, updated, deleted, status_changed, etc.',
  `title_template` varchar(255) NOT NULL COMMENT 'Title template with {placeholders}',
  `message_template` text NOT NULL COMMENT 'Message template with {placeholders}',
  `icon` varchar(10) DEFAULT '📢',
  `color` varchar(20) DEFAULT 'blue',
  `severity` enum('info','important','urgent') DEFAULT 'info',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_code` (`event_code`),
  KEY `idx_module` (`module`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default event templates
INSERT IGNORE INTO `event_types` (`event_code`, `module`, `action`, `title_template`, `message_template`, `icon`, `color`, `severity`) VALUES
-- PROJECT
('project.created', 'project', 'created', '🏗️ Dự án mới', 'Dự án "{entity_name}" vừa được tạo bởi {actor_name}', '🏗️', 'blue', 'info'),
('project.updated', 'project', 'updated', '📝 Cập nhật dự án', 'Dự án "{entity_name}" đã được cập nhật bởi {actor_name}', '📝', 'blue', 'info'),
('project.deleted', 'project', 'deleted', '🗑️ Xóa dự án', 'Dự án "{entity_name}" đã bị xóa bởi {actor_name}', '🗑️', 'red', 'important'),
('project.cancelled', 'project', 'cancelled', '❌ Hủy dự án', 'Dự án "{entity_name}" đã bị hủy bởi {actor_name}', '❌', 'red', 'important'),
('project.restored', 'project', 'restored', '♻️ Khôi phục dự án', 'Dự án "{entity_name}" đã được khôi phục bởi {actor_name}', '♻️', 'green', 'info'),
('project.status_changed', 'project', 'status_changed', '🔄 Đổi trạng thái dự án', 'Dự án "{entity_name}" chuyển sang trạng thái mới bởi {actor_name}', '🔄', 'purple', 'important'),
-- CUSTOMER
('customer.created', 'customer', 'created', '👤 Khách hàng mới', 'Khách hàng "{entity_name}" vừa được thêm bởi {actor_name}', '👤', 'blue', 'info'),
('customer.updated', 'customer', 'updated', '📝 Cập nhật khách hàng', 'Khách hàng "{entity_name}" đã được cập nhật bởi {actor_name}', '📝', 'blue', 'info'),
('customer.deleted', 'customer', 'deleted', '🗑️ Xóa khách hàng', 'Khách hàng "{entity_name}" đã bị xóa bởi {actor_name}', '🗑️', 'red', 'important'),
-- QUOTATION
('quotation.created', 'quotation', 'created', '📄 Báo giá mới', 'Báo giá "{entity_name}" vừa được tạo bởi {actor_name}', '📄', 'blue', 'info'),
('quotation.updated', 'quotation', 'updated', '📝 Cập nhật báo giá', 'Báo giá "{entity_name}" đã được cập nhật bởi {actor_name}', '📝', 'blue', 'info'),
('quotation.status_changed', 'quotation', 'status_changed', '🔄 Đổi trạng thái báo giá', 'Báo giá "{entity_name}" đã chuyển trạng thái bởi {actor_name}', '🔄', 'purple', 'important'),
('quotation.deleted', 'quotation', 'deleted', '🗑️ Xóa báo giá', 'Báo giá "{entity_name}" đã bị xóa bởi {actor_name}', '🗑️', 'red', 'important'),
('quotation.signed', 'quotation', 'signed', '✅ Ký hợp đồng', 'Báo giá "{entity_name}" đã ký hợp đồng bởi {actor_name}', '✅', 'green', 'important'),
-- INVENTORY
('inventory.imported', 'inventory', 'imported', '📥 Nhập kho', 'Phiếu nhập kho "{entity_name}" được tạo bởi {actor_name}', '📥', 'green', 'info'),
('inventory.exported', 'inventory', 'exported', '📤 Xuất kho', 'Phiếu xuất kho "{entity_name}" được tạo bởi {actor_name}', '📤', 'orange', 'info'),
('inventory.low_stock', 'inventory', 'low_stock', '⚠️ Vật tư sắp hết', 'Vật tư "{entity_name}" dưới mức tối thiểu', '⚠️', 'orange', 'urgent'),
-- PRODUCTION
('production.order_created', 'production', 'created', '🏭 Lệnh sản xuất mới', 'LSX "{entity_name}" được tạo bởi {actor_name}', '🏭', 'purple', 'info'),
('production.progress_updated', 'production', 'updated', '📊 Cập nhật tiến độ SX', 'LSX "{entity_name}" đã cập nhật tiến độ bởi {actor_name}', '📊', 'blue', 'info'),
('production.completed', 'production', 'completed', '✅ Sản xuất hoàn thành', 'LSX "{entity_name}" đã hoàn thành 100%', '✅', 'green', 'important'),
-- FINANCE
('finance.transaction_created', 'finance', 'created', '💰 Giao dịch tài chính mới', 'Phiếu "{entity_name}" được tạo bởi {actor_name}', '💰', 'green', 'info'),
('finance.transaction_posted', 'finance', 'posted', '📋 Ghi sổ giao dịch', 'Phiếu "{entity_name}" đã ghi sổ bởi {actor_name}', '📋', 'blue', 'important'),
('finance.transaction_cancelled', 'finance', 'cancelled', '❌ Hủy giao dịch', 'Phiếu "{entity_name}" đã bị hủy bởi {actor_name}', '❌', 'red', 'important'),
-- SYSTEM / USER
('system.user_login', 'system', 'login', '🔐 Đăng nhập', 'Người dùng "{entity_name}" đã đăng nhập', '🔐', 'blue', 'info'),
('system.user_created', 'system', 'created', '👤 Tài khoản mới', 'Tài khoản "{entity_name}" được tạo bởi {actor_name}', '👤', 'blue', 'info'),
('system.user_updated', 'system', 'updated', '📝 Cập nhật tài khoản', 'Tài khoản "{entity_name}" được cập nhật bởi {actor_name}', '📝', 'blue', 'info'),
('system.user_deactivated', 'system', 'deactivated', '🚫 Vô hiệu hóa tài khoản', 'Tài khoản "{entity_name}" đã bị vô hiệu hóa bởi {actor_name}', '🚫', 'red', 'important'),
('system.password_reset', 'system', 'password_reset', '🔑 Reset mật khẩu', 'Mật khẩu tài khoản "{entity_name}" đã được reset bởi {actor_name}', '🔑', 'orange', 'important');

-- ============================================================
-- 2. BẢNG activity_logs - Ghi nhẹ mọi API request
-- ============================================================

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

-- ============================================================
-- 3. Thêm cột audit_log_id vào notifications (nếu chưa có)
-- ============================================================

-- Dùng procedure để an toàn khi cột đã tồn tại
DROP PROCEDURE IF EXISTS add_audit_log_id_col;
DELIMITER $$
CREATE PROCEDURE add_audit_log_id_col()
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
    ALTER TABLE `notifications` ADD COLUMN `audit_log_id` bigint(20) DEFAULT NULL AFTER `entity_id`;
    ALTER TABLE `notifications` ADD COLUMN `entity_type` varchar(50) DEFAULT NULL;
    ALTER TABLE `notifications` ADD COLUMN `entity_id` int(11) DEFAULT NULL;
END$$
DELIMITER ;
CALL add_audit_log_id_col();
DROP PROCEDURE IF EXISTS add_audit_log_id_col;

-- ============================================================
-- 4. Thêm index cho audit_logs (nếu chưa có)
-- ============================================================

DROP PROCEDURE IF EXISTS add_audit_indexes;
DELIMITER $$
CREATE PROCEDURE add_audit_indexes()
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
    ALTER TABLE `audit_logs` ADD INDEX `idx_event_code` (`event_code`);
    ALTER TABLE `audit_logs` ADD INDEX `idx_entity` (`entity_type`, `entity_id`);
    ALTER TABLE `audit_logs` ADD INDEX `idx_actor` (`actor_user_id`);
    ALTER TABLE `audit_logs` ADD INDEX `idx_created_at` (`created_at`);
END$$
DELIMITER ;
CALL add_audit_indexes();
DROP PROCEDURE IF EXISTS add_audit_indexes;

SELECT 'MIGRATION COMPLETED!' AS status;
