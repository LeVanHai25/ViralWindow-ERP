-- ============================================
-- SQL Script: Tạo bảng project_items
-- Liên kết sản phẩm từ Product Catalog với Dự án
-- Hỗ trợ snapshot_config và bom_override
-- ============================================

CREATE TABLE IF NOT EXISTS `project_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL COMMENT 'ID dự án',
    `product_template_id` INT NOT NULL COMMENT 'ID mẫu sản phẩm từ product_templates',
    `aluminum_system` VARCHAR(50) NOT NULL COMMENT 'Hệ nhôm được chọn',
    `quantity` INT NOT NULL DEFAULT 1 COMMENT 'Số lượng',
    
    -- Override kích thước nếu khác mặc định
    `custom_width_mm` INT NULL COMMENT 'Chiều rộng tùy chỉnh (NULL = dùng mặc định)',
    `custom_height_mm` INT NULL COMMENT 'Chiều cao tùy chỉnh (NULL = dùng mặc định)',
    
    -- Override loại kính và phụ kiện
    `custom_glass_type` VARCHAR(100) NULL COMMENT 'Loại kính tùy chỉnh',
    `custom_accessories_json` JSON NULL COMMENT 'Phụ kiện tùy chỉnh',
    
    -- Snapshot và BOM override (Quyết định #5)
    `snapshot_config` JSON NULL COMMENT 'Snapshot cấu hình tại thời điểm chốt báo giá',
    `bom_override` JSON NULL COMMENT 'Override BOM nếu cần điều chỉnh thủ công',
    
    -- Thông tin bổ sung
    `location` VARCHAR(255) NULL COMMENT 'Vị trí lắp đặt: Phòng khách, Tầng 2...',
    `notes` TEXT NULL COMMENT 'Ghi chú',
    
    -- Timestamps
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX `idx_project_id` (`project_id`),
    INDEX `idx_product_template_id` (`product_template_id`),
    INDEX `idx_aluminum_system` (`aluminum_system`),
    
    -- Foreign keys
    CONSTRAINT `fk_pi_project` FOREIGN KEY (`project_id`) 
        REFERENCES `projects`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pi_product_template` FOREIGN KEY (`product_template_id`) 
        REFERENCES `product_templates`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Bảng liên kết sản phẩm với dự án - hỗ trợ snapshot và override';

-- ============================================
-- View hỗ trợ: project_items_view
-- Kết hợp thông tin sản phẩm + dự án để query nhanh
-- ============================================

CREATE OR REPLACE VIEW `project_items_view` AS
SELECT 
    pi.id,
    pi.project_id,
    p.project_name as project_name,
    pi.product_template_id,
    pt.code as product_code,
    pt.name as product_name,
    pt.product_type,
    pt.category as product_category,
    pi.aluminum_system,
    pi.quantity,
    COALESCE(pi.custom_width_mm, pt.default_width_mm) as width_mm,
    COALESCE(pi.custom_height_mm, pt.default_height_mm) as height_mm,
    COALESCE(pi.custom_glass_type, pt.glass_type) as glass_type,
    pt.preview_image,
    pi.location,
    pi.notes,
    pi.snapshot_config,
    pi.bom_override,
    pi.created_at,
    pi.updated_at
FROM project_items pi
JOIN product_templates pt ON pt.id = pi.product_template_id
JOIN projects p ON p.id = pi.project_id
WHERE pt.is_active = 1;

-- ============================================
-- View backward compatible: project_doors_view
-- Cho các query cũ sử dụng project_door_items
-- ============================================

CREATE OR REPLACE VIEW `project_doors_compat_view` AS
SELECT 
    pi.id,
    pi.project_id,
    p.project_name as project_name,
    pi.product_template_id as door_template_id,
    pt.code as door_code,
    pt.name as door_name,
    pt.category as door_category,
    pi.aluminum_system,
    pi.quantity,
    COALESCE(pi.custom_width_mm, pt.default_width_mm) as width_mm,
    COALESCE(pi.custom_height_mm, pt.default_height_mm) as height_mm,
    COALESCE(pi.custom_glass_type, pt.glass_type) as glass_type,
    pt.preview_image,
    pi.location,
    pi.notes,
    pi.created_at,
    pi.updated_at
FROM project_items pi
JOIN product_templates pt ON pt.id = pi.product_template_id
JOIN projects p ON p.id = pi.project_id
WHERE pt.product_type IN ('door', 'window') AND pt.is_active = 1;
