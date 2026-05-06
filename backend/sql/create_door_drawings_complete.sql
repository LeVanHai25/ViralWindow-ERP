-- ============================================
-- SQL Script: Tạo bảng door_drawings và các bảng BOM liên quan
-- Khớp với code trong doorDrawingController.js
-- ============================================

-- 1. Bảng door_drawings – Lưu bản vẽ cửa
CREATE TABLE IF NOT EXISTS `door_drawings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `door_design_id` INT NULL,
    `template_id` INT NULL,
    `template_code` VARCHAR(100) NULL,
    `drawing_data` JSON NULL,
    `svg_data` TEXT NULL,
    `image_data` TEXT NULL,
    `width_mm` INT NOT NULL,
    `height_mm` INT NOT NULL,
    `params_json` JSON NULL,
    `calculated_dimensions` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_id (`project_id`),
    INDEX idx_door_design_id (`door_design_id`),
    INDEX idx_template_id (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng door_bom_lines – BOM chi tiết từng cửa
-- Note: Sử dụng door_drawing_id để khớp với bảng door_drawings
CREATE TABLE IF NOT EXISTS `door_bom_lines` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `door_drawing_id` INT NOT NULL,
    `material_id` INT NULL,
    
    `item_type` VARCHAR(50) NOT NULL, 
    -- profile / glass / accessory / gasket / screw / hinge ...
    
    `item_code` VARCHAR(100) NULL,
    `description` VARCHAR(255),
    `length_mm` INT DEFAULT NULL,         -- Với profile
    `width_mm` INT DEFAULT NULL,          -- Với kính
    `height_mm` INT DEFAULT NULL,         -- Với kính
    
    `qty` DECIMAL(10,3) NOT NULL DEFAULT 1,
    `waste_mm` INT DEFAULT NULL,          -- Hao hụt
    
    `note` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_door_drawing_id (`door_drawing_id`),
    INDEX idx_item_type (`item_type`),
    INDEX idx_material_id (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng door_cutting_plan – Tối ưu cắt thanh nhôm
CREATE TABLE IF NOT EXISTS `door_cutting_plan` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `door_drawing_id` INT NOT NULL,
    `profile_code` VARCHAR(100) NOT NULL,   -- VD: "NHOM-55", "XINGFA-93"
    `stock_length_mm` INT NOT NULL DEFAULT 6000,
    `total_bars` INT NOT NULL,              -- Số thanh 6m cần dùng
    `total_waste_mm` INT NOT NULL,          -- Tổng hao hụt
    `efficiency` DECIMAL(5,2) DEFAULT NULL, -- Hiệu suất sử dụng (%)
    
    `plan_json` JSON NOT NULL,
    -- VD:
    -- [
    --   { "bar": 1, "cuts": [{"code": "FRAME_TOP", "length": 1800}, ...], "waste": 600 },
    --   { "bar": 2, "cuts": [...], "waste": 2000 }
    -- ]
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_door_drawing_id (`door_drawing_id`),
    INDEX idx_profile_code (`profile_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng materials (nếu chưa có)
CREATE TABLE IF NOT EXISTS `materials` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(50) NOT NULL, 
    -- profile / glass / accessory / gasket / screw
    
    `length_mm` INT DEFAULT NULL,  -- profile length 6000
    `width_mm` INT DEFAULT NULL,
    `height_mm` INT DEFAULT NULL,
    `thickness_mm` DECIMAL(10,2) DEFAULT NULL,
    `price` DECIMAL(15,2) DEFAULT NULL,
    `unit` VARCHAR(50) DEFAULT 'pcs',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code (`code`),
    INDEX idx_type (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng door_bom_summary – Tổng hợp BOM theo nhóm vật tư
CREATE TABLE IF NOT EXISTS `door_bom_summary` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `door_drawing_id` INT NOT NULL,
    `item_type` VARCHAR(50),
    `total_qty` DECIMAL(10,3),
    `total_length_mm` INT,
    `total_area_m2` DECIMAL(10,3), -- Cho kính
    `total_cost` DECIMAL(15,2),
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_door_drawing_id (`door_drawing_id`),
    INDEX idx_item_type (`item_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng projects_material_summary – Tổng hợp BOM toàn dự án
CREATE TABLE IF NOT EXISTS `projects_material_summary` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `material_id` INT NULL,
    `item_type` VARCHAR(50),
    `item_code` VARCHAR(100),
    `total_qty` DECIMAL(10,3),
    `total_length_mm` INT,
    `total_area_m2` DECIMAL(10,3), -- Cho kính
    `total_cost` DECIMAL(15,2),
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_id (`project_id`),
    INDEX idx_material_id (`material_id`),
    INDEX idx_item_type (`item_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Thêm Foreign Keys (chạy sau khi các bảng chính đã tồn tại)
-- ============================================

-- Foreign keys cho door_drawings
-- ALTER TABLE `door_drawings` 
--     ADD CONSTRAINT fk_drawing_project FOREIGN KEY (`project_id`)
--     REFERENCES projects(id) ON DELETE CASCADE;

-- ALTER TABLE `door_drawings` 
--     ADD CONSTRAINT fk_drawing_door_design FOREIGN KEY (`door_design_id`)
--     REFERENCES door_designs(id) ON DELETE SET NULL;

-- ALTER TABLE `door_drawings` 
--     ADD CONSTRAINT fk_drawing_template FOREIGN KEY (`template_id`)
--     REFERENCES door_templates(id) ON DELETE SET NULL;

-- Foreign keys cho door_bom_lines
-- ALTER TABLE `door_bom_lines` 
--     ADD CONSTRAINT fk_bom_door FOREIGN KEY (`door_drawing_id`)
--     REFERENCES door_drawings(id) ON DELETE CASCADE;

-- ALTER TABLE `door_bom_lines` 
--     ADD CONSTRAINT fk_bom_material FOREIGN KEY (`material_id`)
--     REFERENCES materials(id) ON DELETE SET NULL;

-- Foreign keys cho door_cutting_plan
-- ALTER TABLE `door_cutting_plan` 
--     ADD CONSTRAINT fk_cutting_door FOREIGN KEY (`door_drawing_id`)
--     REFERENCES door_drawings(id) ON DELETE CASCADE;

-- Foreign keys cho door_bom_summary
-- ALTER TABLE `door_bom_summary` 
--     ADD CONSTRAINT fk_summary_door FOREIGN KEY (`door_drawing_id`)
--     REFERENCES door_drawings(id) ON DELETE CASCADE;

-- Foreign keys cho projects_material_summary
-- ALTER TABLE `projects_material_summary` 
--     ADD CONSTRAINT fk_summary_project FOREIGN KEY (`project_id`)
--     REFERENCES projects(id) ON DELETE CASCADE;

-- ALTER TABLE `projects_material_summary` 
--     ADD CONSTRAINT fk_summary_material FOREIGN KEY (`material_id`)
--     REFERENCES materials(id) ON DELETE SET NULL;

-- ============================================
-- Dữ liệu mẫu để test (chỉ insert nếu chưa có)
-- ============================================

-- Insert materials mẫu (chỉ nếu chưa tồn tại)
INSERT IGNORE INTO materials (code, name, type, length_mm, price, unit) VALUES
('XFA55-KD', 'Khung đứng Xingfa hệ 55', 'profile', 6000, 185000, 'm'),
('XFA55-KN', 'Khung ngang Xingfa hệ 55', 'profile', 6000, 185000, 'm'),
('XFA55-ND', 'Nẹp đố Xingfa hệ 55', 'profile', 6000, 160000, 'm'),
('XFA55-CD', 'Cánh đứng Xingfa hệ 55', 'profile', 6000, 175000, 'm'),
('K-8MM', 'Kính cường lực 8mm', 'glass', NULL, 450000, 'm2'),
('K-10MM', 'Kính cường lực 10mm', 'glass', NULL, 550000, 'm2'),
('BL-HAFELE', 'Bản lề Hafele', 'accessory', NULL, 55000, 'pcs'),
('KHOA-3D', 'Khóa 3 điểm', 'accessory', NULL, 250000, 'pcs'),
('GIOANG-EPDM', 'Gioăng EPDM', 'gasket', NULL, 15000, 'm');






















