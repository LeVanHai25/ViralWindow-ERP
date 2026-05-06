-- ============================================
-- SQL Script: Tạo bảng accessory_applications
-- Quy tắc áp dụng phụ kiện theo loại sản phẩm
-- Quyết định #3: Phụ kiện quản lý chung + rules per product_type
-- ============================================

-- Bảng rules: phụ kiện áp dụng cho loại sản phẩm nào
CREATE TABLE IF NOT EXISTS `accessory_applications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `accessory_id` INT NOT NULL COMMENT 'FK to accessories',
    `product_type` ENUM('door', 'window', 'glass_wall', 'railing', 'roof', 'stair', 'other') 
        NOT NULL COMMENT 'Áp dụng cho loại sản phẩm nào',
    `required_per` ENUM('per_item', 'per_leaf', 'per_meter', 'per_m2') 
        NOT NULL DEFAULT 'per_item' COMMENT 'Tính theo đơn vị nào',
    `default_quantity` DECIMAL(10,2) NOT NULL DEFAULT 1 COMMENT 'Số lượng mặc định',
    `is_required` TINYINT(1) DEFAULT 1 COMMENT 'Bắt buộc hay không',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_accessory_id` (`accessory_id`),
    INDEX `idx_product_type` (`product_type`),
    UNIQUE KEY `uk_accessory_product` (`accessory_id`, `product_type`),
    
    CONSTRAINT `fk_aa_accessory` FOREIGN KEY (`accessory_id`) 
        REFERENCES `accessories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Quy tắc áp dụng phụ kiện theo loại sản phẩm';

-- Bảng override: template cụ thể dùng phụ kiện khác chuẩn
CREATE TABLE IF NOT EXISTS `product_template_accessories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_template_id` INT NOT NULL COMMENT 'FK to product_templates',
    `accessory_id` INT NOT NULL COMMENT 'FK to accessories',
    `quantity_override` DECIMAL(10,2) NULL COMMENT 'NULL = dùng default từ accessory_applications',
    `is_excluded` TINYINT(1) DEFAULT 0 COMMENT 'True = không dùng phụ kiện này cho template',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_template_id` (`product_template_id`),
    INDEX `idx_accessory_id` (`accessory_id`),
    UNIQUE KEY `uk_template_accessory` (`product_template_id`, `accessory_id`),
    
    CONSTRAINT `fk_pta_template` FOREIGN KEY (`product_template_id`) 
        REFERENCES `product_templates`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pta_accessory` FOREIGN KEY (`accessory_id`) 
        REFERENCES `accessories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Override phụ kiện cho template cụ thể';

-- ============================================
-- Sample Data: Quy tắc phụ kiện cơ bản
-- Chạy sau khi đã có data trong bảng accessories
-- ============================================

-- Lưu ý: Uncomment và chỉnh accessory_id phù hợp

/*
-- Bản lề: 3 cái/cánh cho cửa đi, 2 cái/cánh cho cửa sổ
INSERT INTO accessory_applications (accessory_id, product_type, required_per, default_quantity, notes) VALUES
(1, 'door', 'per_leaf', 3.00, 'Bản lề 3D - 3 cái/cánh cửa đi'),
(1, 'window', 'per_leaf', 2.00, 'Bản lề - 2 cái/cánh cửa sổ');

-- Tay nắm: 1 bộ/cửa
INSERT INTO accessory_applications (accessory_id, product_type, required_per, default_quantity, notes) VALUES
(2, 'door', 'per_item', 1.00, 'Tay nắm cửa đi'),
(2, 'window', 'per_item', 1.00, 'Tay nắm cửa sổ');

-- Khóa: 1 bộ/cửa
INSERT INTO accessory_applications (accessory_id, product_type, required_per, default_quantity, notes) VALUES
(3, 'door', 'per_item', 1.00, 'Khóa cửa đi'),
(3, 'window', 'per_item', 1.00, 'Khóa cửa sổ');

-- Kẹp kính cho lan can: 3 cái/m dài
INSERT INTO accessory_applications (accessory_id, product_type, required_per, default_quantity, notes) VALUES
(5, 'railing', 'per_meter', 3.00, 'Kẹp kính inox - 3 cái/m');

-- Trụ lan can: 1 cái/m dài
INSERT INTO accessory_applications (accessory_id, product_type, required_per, default_quantity, notes) VALUES
(6, 'railing', 'per_meter', 1.00, 'Trụ inox - 1 cái/m');

-- Tay vịn: 1 thanh/m dài
INSERT INTO accessory_applications (accessory_id, product_type, required_per, default_quantity, notes) VALUES
(7, 'railing', 'per_meter', 1.00, 'Tay vịn inox - 1 thanh/m');
*/
