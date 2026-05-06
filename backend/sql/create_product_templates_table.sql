-- ============================================
-- SQL Script: Tạo bảng product_templates
-- Mở rộng từ door_templates để hỗ trợ nhiều loại sản phẩm
-- ============================================

-- Bảng product_templates - Core table cho tất cả loại sản phẩm
CREATE TABLE IF NOT EXISTS `product_templates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã template: D1, W1, RAIL1, ROOF1...',
    `name` VARCHAR(255) NOT NULL COMMENT 'Tên template',
    
    -- Phân loại sản phẩm (6 loại core + extensible)
    `product_type` ENUM('door', 'window', 'glass_wall', 'railing', 'roof', 'stair', 'other') 
        NOT NULL DEFAULT 'door' COMMENT 'Loại sản phẩm chính',
    `category` VARCHAR(50) NOT NULL COMMENT 'door_out, door_in, window_swing, glass_railing...',
    `sub_type` VARCHAR(50) NULL COMMENT 'swing, tilt, slide, folding, fixed',
    `family` VARCHAR(50) NULL COMMENT 'door_out_1l, win_swing_2lr...',
    
    -- Hệ nhôm
    `aluminum_system` VARCHAR(50) NOT NULL COMMENT 'XINGFA_55, VW-D-001...',
    `aluminum_system_id` INT NULL COMMENT 'FK to aluminum_systems',
    
    -- Ảnh preview
    `preview_image` VARCHAR(255) NULL COMMENT 'Đường dẫn ảnh preview',
    
    -- JSON configs
    `template_json` LONGTEXT NULL COMMENT 'JSON chứa toàn bộ template (meta, panel_tree, bom)',
    `param_schema` JSON NULL COMMENT 'Schema cho parameters (defaultWidth, defaultHeight...)',
    `structure_json` JSON NULL COMMENT 'Panel tree structure',
    `bom_rules` JSON NULL COMMENT 'Quy tắc BOM riêng cho template này',
    
    -- Kích thước mặc định
    `default_width_mm` INT DEFAULT 1200 COMMENT 'Chiều rộng mặc định (mm)',
    `default_height_mm` INT DEFAULT 2200 COMMENT 'Chiều cao mặc định (mm)',
    `glass_type` VARCHAR(100) NULL COMMENT 'Loại kính mặc định',
    
    -- Metadata
    `description` TEXT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `display_order` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX `idx_product_type` (`product_type`),
    INDEX `idx_category` (`category`),
    INDEX `idx_sub_type` (`sub_type`),
    INDEX `idx_family` (`family`),
    INDEX `idx_aluminum_system` (`aluminum_system`),
    INDEX `idx_code` (`code`),
    INDEX `idx_is_active` (`is_active`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Bảng lưu tất cả mẫu sản phẩm (cửa, lan can, mái, cầu thang...)';

-- ============================================
-- View helper: Lấy templates theo product_type (backward compatible)
-- ============================================

-- View cho door templates (backward compatible với API cũ)
CREATE OR REPLACE VIEW `door_templates_view` AS
SELECT * FROM product_templates 
WHERE product_type IN ('door', 'window') AND is_active = 1;

-- View cho railing templates
CREATE OR REPLACE VIEW `railing_templates_view` AS
SELECT * FROM product_templates 
WHERE product_type = 'railing' AND is_active = 1;

-- View cho roof templates
CREATE OR REPLACE VIEW `roof_templates_view` AS
SELECT * FROM product_templates 
WHERE product_type = 'roof' AND is_active = 1;

-- View cho stair templates
CREATE OR REPLACE VIEW `stair_templates_view` AS
SELECT * FROM product_templates 
WHERE product_type = 'stair' AND is_active = 1;
