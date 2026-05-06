-- Tạo bảng door_templates với cấu trúc tối ưu cho 100 mẫu cửa
-- Nếu bảng đã tồn tại, sẽ bỏ qua lỗi

CREATE TABLE IF NOT EXISTS `door_templates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Mã template: D1, D2, W1, SL1...',
    `name` VARCHAR(255) NOT NULL COMMENT 'Tên template',
    `category` VARCHAR(50) NOT NULL COMMENT 'door, window, sliding, folding',
    `sub_type` VARCHAR(50) NULL COMMENT 'swing, tilt, slide, folding, fixed',
    `family` ENUM('door_out', 'door_in', 'window_swing', 'window_sliding', 'door_sliding', 'window_tilt', 'fixed', 'wall_window', 'other') DEFAULT 'other',
    `aluminum_system` VARCHAR(50) NOT NULL COMMENT 'XINGFA_55, VW-D-001...',
    `aluminum_system_id` INT NULL COMMENT 'FK to aluminum_systems',
    `preview_image` VARCHAR(255) NULL COMMENT 'Đường dẫn ảnh preview',
    `template_json` LONGTEXT NULL COMMENT 'JSON chứa toàn bộ template (meta, panel_tree, bom_profiles, bom_glass, bom_hardware)',
    `param_schema` JSON NULL COMMENT 'Schema cho parameters (defaultWidth, defaultHeight...)',
    `structure_json` JSON NULL COMMENT 'Panel tree structure (tương thích với code cũ)',
    `description` TEXT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `display_order` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_category` (`category`),
    INDEX `idx_sub_type` (`sub_type`),
    INDEX `idx_family` (`family`),
    INDEX `idx_aluminum_system` (`aluminum_system`),
    INDEX `idx_code` (`code`),
    INDEX `idx_is_active` (`is_active`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng lưu 100 mẫu cửa template';

-- Thêm cột template_json nếu bảng đã tồn tại nhưng chưa có cột này
-- Lưu ý: MySQL không hỗ trợ IF NOT EXISTS cho ALTER TABLE, sẽ xử lý lỗi trong script

