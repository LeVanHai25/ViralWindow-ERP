-- Bảng lưu kết quả tổng hợp nhôm nguyên cây
CREATE TABLE IF NOT EXISTS `aluminum_bar_summary` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `profile_id` INT NULL COMMENT 'FK to aluminum_profiles',
    `profile_code` VARCHAR(50) NOT NULL COMMENT 'Mã profile nhôm',
    `profile_name` VARCHAR(255) NOT NULL COMMENT 'Tên profile nhôm',
    `system_id` INT NULL COMMENT 'FK to aluminum_systems',
    `system_code` VARCHAR(50) NULL COMMENT 'Mã hệ nhôm',
    `total_length_mm` DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'Tổng chiều dài (mm)',
    `total_length_m` DECIMAL(10, 3) NOT NULL DEFAULT 0 COMMENT 'Tổng chiều dài (m)',
    `required_bars` INT NOT NULL DEFAULT 0 COMMENT 'Số cây nguyên cần mua',
    `bar_length_mm` INT NOT NULL DEFAULT 6000 COMMENT 'Chiều dài cây nhôm (mm)',
    `total_weight_kg` DECIMAL(10, 3) NOT NULL DEFAULT 0 COMMENT 'Tổng trọng lượng (kg)',
    `weight_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'Tỷ trọng (%)',
    `unit_price_per_kg` DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'Đơn giá (VND/kg)',
    `total_cost_vnd` DECIMAL(15, 2) NOT NULL DEFAULT 0 COMMENT 'Thành tiền (VND)',
    `last_generated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tính toán',
    `bom_version` INT NULL COMMENT 'Version BOM khi tính toán',
    INDEX `idx_project_id` (`project_id`),
    INDEX `idx_profile_id` (`profile_id`),
    INDEX `idx_system_id` (`system_id`),
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`profile_id`) REFERENCES `aluminum_profiles`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`system_id`) REFERENCES `aluminum_systems`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tổng hợp nhôm nguyên cây theo project';














































































