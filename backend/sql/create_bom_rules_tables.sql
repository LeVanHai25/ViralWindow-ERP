-- ============================================
-- SQL Script: BOM Rules Engine Tables
-- Hệ thống rules để tính BOM tự động từ Panel Tree
-- ============================================

-- 1. Bảng aluminum_profiles - Chi tiết profile cho từng hệ nhôm
-- (Bổ sung vào bảng aluminum_profiles đã có, thêm các cột cần thiết)
ALTER TABLE `aluminum_profiles` 
ADD COLUMN IF NOT EXISTS `default_stock_length_mm` INT DEFAULT 6000 COMMENT 'Chiều dài thanh nhôm chuẩn (mm)',
ADD COLUMN IF NOT EXISTS `cut_deduction_x_mm` INT DEFAULT 0 COMMENT 'Trừ kích thước theo chiều ngang (mm)',
ADD COLUMN IF NOT EXISTS `cut_deduction_y_mm` INT DEFAULT 0 COMMENT 'Trừ kích thước theo chiều đứng (mm)',
ADD COLUMN IF NOT EXISTS `usage_type` ENUM('frame_vertical', 'frame_horizontal', 'sash_vertical', 'sash_horizontal', 'mullion_vertical', 'mullion_horizontal', 'transom', 'other') DEFAULT 'other' COMMENT 'Loại sử dụng';

-- 2. Bảng hardware_rules - Quy tắc phụ kiện theo loại panel
CREATE TABLE IF NOT EXISTS `hardware_rules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `system_id` INT NOT NULL COMMENT 'FK to aluminum_systems',
    `panel_type` VARCHAR(100) NOT NULL COMMENT 'window_turn_left, door_single_right, sliding_3, fixed, ...',
    `hardware_code` VARCHAR(100) NOT NULL COMMENT 'Mã phụ kiện (bản lề, tay nắm, khóa...)',
    `hardware_name` VARCHAR(255) NULL COMMENT 'Tên phụ kiện',
    `qty_per_panel` INT NOT NULL DEFAULT 1 COMMENT 'Số lượng mỗi panel',
    `position` VARCHAR(50) NULL COMMENT 'Vị trí: left, right, top, bottom, center',
    `is_required` TINYINT(1) DEFAULT 1 COMMENT 'Bắt buộc hay không',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_system_id (`system_id`),
    INDEX idx_panel_type (`panel_type`),
    INDEX idx_hardware_code (`hardware_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng glass_rules - Quy tắc tính kính theo hệ nhôm
CREATE TABLE IF NOT EXISTS `glass_rules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `system_id` INT NOT NULL COMMENT 'FK to aluminum_systems',
    `glass_type` VARCHAR(100) NOT NULL COMMENT '5mm clear, 8.38 cường lực, 10mm Low-E...',
    `deduction_x_mm` INT NOT NULL DEFAULT 30 COMMENT 'Trừ kích thước theo chiều ngang (mm)',
    `deduction_y_mm` INT NOT NULL DEFAULT 30 COMMENT 'Trừ kích thước theo chiều đứng (mm)',
    `is_default` TINYINT(1) DEFAULT 0 COMMENT 'Loại kính mặc định cho hệ này',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_system_id (`system_id`),
    INDEX idx_glass_type (`glass_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng gasket_rules - Quy tắc tính gioăng
CREATE TABLE IF NOT EXISTS `gasket_rules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `system_id` INT NOT NULL COMMENT 'FK to aluminum_systems',
    `gasket_code` VARCHAR(100) NOT NULL COMMENT 'Mã gioăng',
    `gasket_name` VARCHAR(255) NULL COMMENT 'Tên gioăng',
    `perimeter_factor` DECIMAL(5,3) NOT NULL DEFAULT 1.000 COMMENT 'Hệ số nhân chu vi kính',
    `usage_type` VARCHAR(50) NULL COMMENT 'glass_seal, frame_seal, ...',
    `is_required` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_system_id (`system_id`),
    INDEX idx_gasket_code (`gasket_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAMPLE DATA: Xingfa 55 System
-- ============================================

-- 1. Update aluminum_profiles với rules cho Xingfa 55
-- (Giả sử system_id = 1 là Xingfa 55)
UPDATE `aluminum_profiles` 
SET 
    `default_stock_length_mm` = 6000,
    `cut_deduction_x_mm` = CASE 
        WHEN `profile_type` = 'frame_horizontal' THEN 76
        WHEN `profile_type` = 'sash_horizontal' THEN 46
        WHEN `profile_type` = 'mullion' THEN 10
        ELSE 0
    END,
    `cut_deduction_y_mm` = CASE 
        WHEN `profile_type` = 'frame_vertical' THEN 76
        WHEN `profile_type` = 'sash_vertical' THEN 76
        WHEN `profile_type` = 'mullion' THEN 10
        ELSE 0
    END,
    `usage_type` = CASE 
        WHEN `profile_type` = 'frame_vertical' THEN 'frame_vertical'
        WHEN `profile_type` = 'frame_horizontal' THEN 'frame_horizontal'
        WHEN `profile_type` = 'panel_left' OR `profile_type` = 'panel_right' THEN 'sash_vertical'
        ELSE 'other'
    END
WHERE `system_id` = 1;

-- 2. Insert hardware_rules cho Xingfa 55
INSERT INTO `hardware_rules` (`system_id`, `panel_type`, `hardware_code`, `hardware_name`, `qty_per_panel`, `position`, `is_required`) VALUES
-- Cửa sổ quay trái
(1, 'window-turn-left', 'VW-H-001', 'Bản lề 3D cao cấp', 3, 'left', 1),
(1, 'window-turn-left', 'VW-K-001', 'Tay nắm nhôm đúc', 1, 'right', 1),
(1, 'window-turn-left', 'VW-L-003', 'Khóa cửa sổ', 1, 'right', 1),
(1, 'window-turn-left', 'VW-G-001', 'Gioăng cao su EPDM', 1, NULL, 1),

-- Cửa sổ quay phải
(1, 'window-turn-right', 'VW-H-001', 'Bản lề 3D cao cấp', 3, 'right', 1),
(1, 'window-turn-right', 'VW-K-001', 'Tay nắm nhôm đúc', 1, 'left', 1),
(1, 'window-turn-right', 'VW-L-003', 'Khóa cửa sổ', 1, 'left', 1),
(1, 'window-turn-right', 'VW-G-001', 'Gioăng cao su EPDM', 1, NULL, 1),

-- Cửa sổ hất (Tilt)
(1, 'window-tilt', 'VW-H-002', 'Bản lề cửa sổ', 2, 'top', 1),
(1, 'window-tilt', 'VW-K-001', 'Tay nắm nhôm đúc', 1, 'bottom', 1),
(1, 'window-tilt', 'VW-L-003', 'Khóa cửa sổ', 1, 'bottom', 1),
(1, 'window-tilt', 'VW-G-001', 'Gioăng cao su EPDM', 1, NULL, 1),

-- Cửa sổ Tilt & Turn
(1, 'window-tilt-turn', 'VW-H-001', 'Bản lề 3D cao cấp', 3, 'left', 1),
(1, 'window-tilt-turn', 'VW-K-001', 'Tay nắm nhôm đúc', 1, 'right', 1),
(1, 'window-tilt-turn', 'VW-L-003', 'Khóa cửa sổ Tilt&Turn', 1, 'right', 1),
(1, 'window-tilt-turn', 'VW-G-001', 'Gioăng cao su EPDM', 1, NULL, 1),

-- Cửa sổ cố định
(1, 'window-fixed', 'VW-G-001', 'Gioăng cao su EPDM', 1, NULL, 1),

-- Cửa đi 1 cánh trái
(1, 'door-single-left', 'VW-H-001', 'Bản lề 3D cao cấp', 3, 'left', 1),
(1, 'door-single-left', 'VW-K-001', 'Tay nắm nhôm đúc', 1, 'right', 1),
(1, 'door-single-left', 'VW-L-001', 'Khóa tay gạt inox 304', 1, 'right', 1),
(1, 'door-single-left', 'VW-G-001', 'Gioăng cao su EPDM', 1, NULL, 1),

-- Cửa đi 1 cánh phải
(1, 'door-single-right', 'VW-H-001', 'Bản lề 3D cao cấp', 3, 'right', 1),
(1, 'door-single-right', 'VW-K-001', 'Tay nắm nhôm đúc', 1, 'left', 1),
(1, 'door-single-right', 'VW-L-001', 'Khóa tay gạt inox 304', 1, 'left', 1),
(1, 'door-single-right', 'VW-G-001', 'Gioăng cao su EPDM', 1, NULL, 1),

-- Cửa Pháp (French Door)
(1, 'door-french', 'VW-H-001', 'Bản lề 3D cao cấp', 3, 'left', 1),
(1, 'door-french', 'VW-H-001', 'Bản lề 3D cao cấp', 3, 'right', 1),
(1, 'door-french', 'VW-K-001', 'Tay nắm nhôm đúc', 2, NULL, 1),
(1, 'door-french', 'VW-L-001', 'Khóa tay gạt inox 304', 1, 'master', 1),
(1, 'door-french', 'VW-L-002', 'Khóa chốt cửa đi', 1, 'slave', 1),
(1, 'door-french', 'VW-G-001', 'Gioăng cao su EPDM', 2, NULL, 1),

-- Cửa trượt 2 cánh
(1, 'sliding-2', 'VW-SL-001', 'Bánh xe lùa inox', 2, 'bottom', 1),
(1, 'sliding-2', 'VW-SL-002', 'Ray trượt cửa lùa', 1, 'bottom', 1),
(1, 'sliding-2', 'VW-K-001', 'Tay nắm nhôm đúc', 2, NULL, 1),
(1, 'sliding-2', 'VW-G-003', 'Gioăng cửa lùa', 2, NULL, 1),

-- Cửa trượt 3 cánh
(1, 'sliding-3', 'VW-SL-001', 'Bánh xe lùa inox', 3, 'bottom', 1),
(1, 'sliding-3', 'VW-SL-002', 'Ray trượt cửa lùa', 1, 'bottom', 1),
(1, 'sliding-3', 'VW-K-001', 'Tay nắm nhôm đúc', 3, NULL, 1),
(1, 'sliding-3', 'VW-G-003', 'Gioăng cửa lùa', 3, NULL, 1),

-- Cửa trượt 4 cánh
(1, 'sliding-4', 'VW-SL-001', 'Bánh xe lùa inox', 4, 'bottom', 1),
(1, 'sliding-4', 'VW-SL-002', 'Ray trượt cửa lùa', 1, 'bottom', 1),
(1, 'sliding-4', 'VW-K-001', 'Tay nắm nhôm đúc', 4, NULL, 1),
(1, 'sliding-4', 'VW-G-003', 'Gioăng cửa lùa', 4, NULL, 1);

-- 3. Insert glass_rules cho Xingfa 55
INSERT INTO `glass_rules` (`system_id`, `glass_type`, `deduction_x_mm`, `deduction_y_mm`, `is_default`) VALUES
(1, '8ly', 30, 30, 1),  -- 8mm Low-E (mặc định)
(1, '10ly', 32, 32, 0), -- 10mm Low-E
(1, '8k', 30, 30, 0),   -- 8mm Clear
(1, '10k', 32, 32, 0);  -- 10mm Clear

-- 4. Insert gasket_rules cho Xingfa 55
INSERT INTO `gasket_rules` (`system_id`, `gasket_code`, `gasket_name`, `perimeter_factor`, `usage_type`, `is_required`) VALUES
(1, 'VW-G-001', 'Gioăng cao su EPDM', 1.000, 'glass_seal', 1),
(1, 'VW-G-002', 'Gioăng kính', 1.000, 'glass_seal', 1),
(1, 'VW-G-003', 'Gioăng cửa lùa', 1.000, 'sliding_seal', 1);

-- ============================================
-- Foreign Keys (uncomment if needed)
-- ============================================
-- ALTER TABLE `hardware_rules` ADD CONSTRAINT `fk_hardware_rules_system` 
--     FOREIGN KEY (`system_id`) REFERENCES `aluminum_systems`(`id`) ON DELETE CASCADE;
-- 
-- ALTER TABLE `glass_rules` ADD CONSTRAINT `fk_glass_rules_system` 
--     FOREIGN KEY (`system_id`) REFERENCES `aluminum_systems`(`id`) ON DELETE CASCADE;
-- 
-- ALTER TABLE `gasket_rules` ADD CONSTRAINT `fk_gasket_rules_system` 
--     FOREIGN KEY (`system_id`) REFERENCES `aluminum_systems`(`id`) ON DELETE CASCADE;






















