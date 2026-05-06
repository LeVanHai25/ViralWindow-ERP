-- ============================================
-- SQL Script: Tạo bảng project_door_items
-- Liên kết cửa từ Door Catalog với Dự án
-- ============================================

CREATE TABLE IF NOT EXISTS `project_door_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL COMMENT 'ID dự án',
    `door_template_id` INT NOT NULL COMMENT 'ID mẫu cửa từ door_templates',
    `aluminum_system` VARCHAR(50) NOT NULL COMMENT 'Hệ nhôm được chọn: XINGFA_55, PMI, VW-D-001...',
    `quantity` INT NOT NULL DEFAULT 1 COMMENT 'Số lượng cửa',
    
    -- Override kích thước nếu khác mặc định
    `custom_width_mm` INT NULL COMMENT 'Chiều rộng tùy chỉnh (NULL = dùng mặc định)',
    `custom_height_mm` INT NULL COMMENT 'Chiều cao tùy chỉnh (NULL = dùng mặc định)',
    
    -- Override loại kính và phụ kiện
    `custom_glass_type` VARCHAR(100) NULL COMMENT 'Loại kính tùy chỉnh',
    `custom_accessories_json` JSON NULL COMMENT 'Phụ kiện tùy chỉnh',
    
    -- Thông tin bổ sung
    `location` VARCHAR(255) NULL COMMENT 'Vị trí lắp đặt: Phòng khách, Tầng 2...',
    `notes` TEXT NULL COMMENT 'Ghi chú',
    
    -- Timestamps
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX `idx_project_id` (`project_id`),
    INDEX `idx_door_template_id` (`door_template_id`),
    INDEX `idx_aluminum_system` (`aluminum_system`),
    
    -- Foreign keys
    CONSTRAINT `fk_pdi_project` FOREIGN KEY (`project_id`) 
        REFERENCES `projects`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pdi_door_template` FOREIGN KEY (`door_template_id`) 
        REFERENCES `door_templates`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Bảng liên kết cửa với dự án - cho phép chọn hệ nhôm và override thông số';

-- ============================================
-- View hỗ trợ: project_doors_view
-- Kết hợp thông tin cửa + dự án để query nhanh
-- ============================================

CREATE OR REPLACE VIEW `project_doors_view` AS
SELECT 
    pdi.id,
    pdi.project_id,
    p.name as project_name,
    pdi.door_template_id,
    dt.code as door_code,
    dt.name as door_name,
    dt.category as door_category,
    pdi.aluminum_system,
    pdi.quantity,
    COALESCE(pdi.custom_width_mm, dt.default_width_mm) as width_mm,
    COALESCE(pdi.custom_height_mm, dt.default_height_mm) as height_mm,
    COALESCE(pdi.custom_glass_type, dt.glass_type) as glass_type,
    dt.preview_image,
    pdi.location,
    pdi.notes,
    pdi.created_at,
    pdi.updated_at
FROM project_door_items pdi
JOIN door_templates dt ON dt.id = pdi.door_template_id
JOIN projects p ON p.id = pdi.project_id
WHERE dt.status = 'active';
