-- ============================================
-- COMPREHENSIVE NOTIFICATION SYSTEM SCHEMA
-- Includes: Event Types, Audit Logs, Notification Templates
-- ============================================

-- 1. Event Types Dictionary (Từ điển sự kiện)
CREATE TABLE IF NOT EXISTS event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_code VARCHAR(100) NOT NULL UNIQUE COMMENT 'e.g. project.created, quotation.approved',
    module VARCHAR(50) NOT NULL COMMENT 'customer, project, quotation, inventory, production, finance',
    action VARCHAR(50) NOT NULL COMMENT 'created, updated, deleted, status_changed, approved, etc.',
    severity ENUM('info', 'important', 'urgent') DEFAULT 'info',
    title_template VARCHAR(255) NOT NULL COMMENT 'Template for notification title',
    message_template TEXT NOT NULL COMMENT 'Template for notification message with {placeholders}',
    icon VARCHAR(20) DEFAULT '📢',
    color VARCHAR(20) DEFAULT 'blue',
    channels JSON DEFAULT '["in_app"]' COMMENT '["in_app", "email", "telegram"]',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_module (module),
    INDEX idx_event_code (event_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Audit Logs (Ghi lại mọi thay đổi)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_code VARCHAR(100) NOT NULL COMMENT 'References event_types.event_code',
    entity_type VARCHAR(50) NOT NULL COMMENT 'customer, project, quotation, etc.',
    entity_id INT NOT NULL,
    entity_name VARCHAR(255) NULL COMMENT 'Name/Code for display',
    actor_user_id INT NULL COMMENT 'User who performed the action',
    actor_name VARCHAR(100) NULL COMMENT 'User name for display',
    action VARCHAR(50) NOT NULL COMMENT 'created, updated, deleted, etc.',
    before_data JSON NULL COMMENT 'State before change',
    after_data JSON NULL COMMENT 'State after change',
    changed_fields JSON NULL COMMENT 'List of changed field names',
    reason TEXT NULL COMMENT 'Optional reason/note',
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_actor (actor_user_id),
    INDEX idx_event_code (event_code),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Update notifications table (if needed columns are missing)
-- Add audit_log_id to link notification to audit log
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS audit_log_id BIGINT NULL COMMENT 'Link to audit_logs';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id INT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity ENUM('info', 'important', 'urgent') DEFAULT 'info';

-- 4. User Notification Settings (Cài đặt cá nhân)
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    channel_in_app TINYINT(1) DEFAULT 1,
    channel_email TINYINT(1) DEFAULT 0,
    channel_telegram TINYINT(1) DEFAULT 0,
    mute_modules JSON NULL COMMENT 'List of muted modules',
    quiet_hours_start TIME NULL COMMENT 'Start of quiet hours',
    quiet_hours_end TIME NULL COMMENT 'End of quiet hours',
    email_digest ENUM('realtime', 'daily', 'weekly', 'none') DEFAULT 'realtime',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user (user_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Entity Subscriptions (Theo dõi dự án/khách hàng cụ thể)
CREATE TABLE IF NOT EXISTS entity_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_subscription (user_id, entity_type, entity_id),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT EVENT TYPES
-- ============================================

INSERT INTO event_types (event_code, module, action, severity, title_template, message_template, icon, color) VALUES
-- Customer Events
('customer.created', 'customer', 'created', 'info', '👤 Khách hàng mới', 'Khách hàng "{customer_name}" đã được thêm bởi {actor_name}', '👤', 'blue'),
('customer.updated', 'customer', 'updated', 'info', '👤 Cập nhật khách hàng', 'Thông tin khách hàng "{customer_name}" đã được cập nhật', '👤', 'blue'),
('customer.deleted', 'customer', 'deleted', 'important', '🗑️ Xóa khách hàng', 'Khách hàng "{customer_name}" đã bị xóa', '🗑️', 'red'),

-- Project Events
('project.created', 'project', 'created', 'info', '🏗️ Dự án mới', 'Dự án "{project_name}" đã được tạo cho khách hàng "{customer_name}"', '🏗️', 'blue'),
('project.status_changed', 'project', 'status_changed', 'important', '📊 Cập nhật trạng thái dự án', 'Dự án "{project_name}" chuyển từ "{old_status}" sang "{new_status}"', '📊', 'yellow'),
('project.deadline_changed', 'project', 'updated', 'important', '⏰ Thay đổi deadline', 'Deadline dự án "{project_name}" đã thay đổi thành {new_deadline}', '⏰', 'yellow'),
('project.overdue', 'project', 'overdue', 'urgent', '🚨 Dự án quá hạn', 'Dự án "{project_name}" đã quá hạn {days_overdue} ngày', '🚨', 'red'),
('project.assigned', 'project', 'assigned', 'info', '👷 Giao dự án', 'Dự án "{project_name}" đã được giao cho {assignee_name}', '👷', 'blue'),

-- Quotation Events
('quotation.created', 'quotation', 'created', 'info', '📄 Báo giá mới', 'Báo giá {quotation_code} đã được tạo cho dự án "{project_name}"', '📄', 'blue'),
('quotation.sent', 'quotation', 'sent', 'info', '📤 Gửi báo giá', 'Báo giá {quotation_code} đã được gửi cho khách hàng', '📤', 'blue'),
('quotation.approved', 'quotation', 'approved', 'important', '✅ Chốt báo giá', 'Báo giá {quotation_code} đã được chốt. Giá trị: {total_amount}', '✅', 'green'),
('quotation.rejected', 'quotation', 'rejected', 'important', '❌ Từ chối báo giá', 'Báo giá {quotation_code} đã bị từ chối', '❌', 'red'),
('quotation.locked', 'quotation', 'locked', 'important', '🔒 Chốt hợp đồng', 'Hợp đồng cho báo giá {quotation_code} đã được ký', '🔒', 'green'),

-- Inventory Events
('inventory.stock_in', 'inventory', 'stock_in', 'info', '📦 Nhập kho', '{material_name}: Nhập {quantity} {unit}. Tồn mới: {new_stock}', '📦', 'green'),
('inventory.stock_out', 'inventory', 'stock_out', 'info', '📤 Xuất kho', '{material_name}: Xuất {quantity} {unit} cho dự án "{project_name}"', '📤', 'blue'),
('inventory.below_min', 'inventory', 'warning', 'urgent', '⚠️ Tồn kho thấp', '{material_name} còn {current_stock} {unit}, dưới mức tối thiểu ({min_stock})', '⚠️', 'orange'),
('inventory.negative', 'inventory', 'error', 'urgent', '🚨 Tồn kho âm', '{material_name} tồn âm: {current_stock} {unit}. Cần kiểm tra!', '🚨', 'red'),

-- Production Events
('production.created', 'production', 'created', 'info', '🏭 Lệnh sản xuất mới', 'Lệnh sản xuất {order_code} cho dự án "{project_name}" đã được tạo', '🏭', 'blue'),
('production.started', 'production', 'started', 'info', '▶️ Bắt đầu sản xuất', 'Lệnh sản xuất {order_code} đã bắt đầu thực hiện', '▶️', 'blue'),
('production.completed', 'production', 'completed', 'important', '✅ Hoàn thành sản xuất', 'Lệnh sản xuất {order_code} đã hoàn thành 100%', '✅', 'green'),
('production.delayed', 'production', 'delayed', 'urgent', '⏰ Trễ tiến độ', 'Lệnh sản xuất {order_code} trễ {days_delayed} ngày', '⏰', 'red'),

-- Finance Events
('finance.payment_received', 'finance', 'payment_received', 'info', '💰 Nhận thanh toán', 'Nhận {amount} từ khách hàng "{customer_name}" cho dự án "{project_name}"', '💰', 'green'),
('finance.invoice_overdue', 'finance', 'overdue', 'urgent', '🚨 Công nợ quá hạn', 'Khách hàng "{customer_name}" có khoản nợ {amount} quá hạn {days_overdue} ngày', '🚨', 'red'),
('finance.debt_created', 'finance', 'created', 'info', '📝 Công nợ mới', 'Tạo công nợ {amount} cho dự án "{project_name}"', '📝', 'blue'),

-- System Events
('system.backup_completed', 'system', 'completed', 'info', '💾 Backup hoàn thành', 'Sao lưu hệ thống hoàn thành lúc {timestamp}', '💾', 'green'),
('system.error', 'system', 'error', 'urgent', '❌ Lỗi hệ thống', '{error_message}', '❌', 'red')

ON DUPLICATE KEY UPDATE 
    title_template = VALUES(title_template),
    message_template = VALUES(message_template);

-- Verify
SELECT 'Event Types Created:' as info, COUNT(*) as count FROM event_types;
SELECT module, COUNT(*) as count FROM event_types GROUP BY module ORDER BY count DESC;
