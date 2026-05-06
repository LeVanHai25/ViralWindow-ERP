-- ============================================
-- TABLE: notifications
-- Lưu trữ tất cả thông báo trong hệ thống
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL COMMENT 'NULL = broadcast to all users',
    type VARCHAR(50) NOT NULL COMMENT 'project, quotation, production, inventory, finance, system',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500) NULL COMMENT 'URL to related page',
    icon VARCHAR(20) DEFAULT '📢' COMMENT 'Emoji icon',
    color VARCHAR(20) DEFAULT 'blue' COMMENT 'blue, green, red, yellow, orange, purple',
    priority VARCHAR(20) DEFAULT 'normal' COMMENT 'normal, high, urgent',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_type (type),
    INDEX idx_priority (priority),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEMO DATA
-- ============================================

INSERT INTO notifications (user_id, type, title, message, link, icon, color, priority, is_read, created_at) VALUES
(NULL, 'project', '🏗️ Dự án mới được tạo', 'Dự án "Nhà S10-Anh Triệu" vừa được tạo cho khách hàng "Anh Triệu"', 'projects.html', '🏗️', 'blue', 'normal', 0, NOW()),
(NULL, 'quotation', '📄 Báo giá mới chờ duyệt', 'Báo giá BG2025-001 cho khách hàng "Anh Triệu" đang chờ phê duyệt', 'sales.html', '📄', 'yellow', 'high', 0, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(NULL, 'inventory', '⚠️ Vật tư sắp hết', 'Thanh nhôm Y6501 còn 5 cây, dưới mức tồn kho tối thiểu (20 cây)', 'inventory.html', '📦', 'orange', 'high', 0, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(NULL, 'production', '✅ Lệnh sản xuất hoàn thành', 'LSX-2025-001 đã hoàn thành 100%, sẵn sàng lắp đặt', 'production.html', '🏭', 'green', 'normal', 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(NULL, 'finance', '💰 Công nợ quá hạn', 'Khách hàng "Công ty ABC" có khoản nợ 50.000.000đ quá hạn 7 ngày', 'finance-debt.html', '💰', 'red', 'urgent', 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(NULL, 'project', '⏰ Dự án gần deadline', 'Dự án "Nhà Cẩm Ly" cần hoàn thành trong 3 ngày', 'projects.html', '⏰', 'red', 'urgent', 0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(NULL, 'system', '✅ Thiết kế hoàn thành', 'Dự án "Biệt thự Hải" đã hoàn thành bóc tách vật tư', 'design-new.html', '✅', 'green', 'normal', 1, DATE_SUB(NOW(), INTERVAL 4 DAY));

-- Verify
SELECT COUNT(*) as total_notifications FROM notifications;
SELECT COUNT(*) as unread_notifications FROM notifications WHERE is_read = 0;

SELECT 
    type,
    COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;





