-- ============================================
-- HỆ THỐNG THÔNG BÁO 3 LỚP: Event → Rule → Notification
-- ============================================

-- Bảng notifications: Lưu thông báo
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL COMMENT 'Loại event: project.created, quotation.approved, etc.',
    title VARCHAR(255) NOT NULL COMMENT 'Tiêu đề thông báo',
    message TEXT NOT NULL COMMENT 'Nội dung thông báo',
    level ENUM('info', 'important', 'urgent') DEFAULT 'info' COMMENT 'Mức độ quan trọng',
    entity_type VARCHAR(50) NULL COMMENT 'Loại entity: project, quotation, material, etc.',
    entity_id INT NULL COMMENT 'ID của entity liên quan',
    data_json JSON NULL COMMENT 'Payload bổ sung',
    created_by INT NULL COMMENT 'User tạo thông báo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng notification_recipients: Lưu người nhận thông báo
CREATE TABLE IF NOT EXISTS notification_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_id INT NOT NULL,
    user_id INT NOT NULL,
    is_read TINYINT(1) DEFAULT 0 COMMENT '0: chưa đọc, 1: đã đọc',
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_notification (notification_id),
    UNIQUE KEY unique_user_notification (notification_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng notification_rules: Luật gửi thông báo (tùy chọn, để mở rộng sau)
CREATE TABLE IF NOT EXISTS notification_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL COMMENT 'Loại event: project.created, etc.',
    recipient_roles JSON NULL COMMENT 'Danh sách role nhận: ["manager", "sales"]',
    recipient_user_ids JSON NULL COMMENT 'Danh sách user ID cụ thể',
    level ENUM('info', 'important', 'urgent') DEFAULT 'info',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default rules
INSERT INTO notification_rules (event_type, recipient_roles, level) VALUES
('project.created', '["manager", "sales"]', 'info'),
('project.status_changed', '["manager", "sales"]', 'important'),
('quotation.created', '["manager"]', 'info'),
('quotation.submitted', '["manager"]', 'important'),
('quotation.approved', '["manager", "sales"]', 'important'),
('inventory.low_stock', '["warehouse", "manager"]', 'urgent'),
('inventory.out_of_stock', '["warehouse", "manager"]', 'urgent'),
('production.order_created', '["production", "manager"]', 'info'),
('production.completed', '["production", "manager", "installation"]', 'important'),
('finance.debt_overdue', '["finance", "manager"]', 'urgent')
ON DUPLICATE KEY UPDATE event_type=event_type;

