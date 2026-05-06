-- 0. ĐẢM BẢO DÙNG ĐÚNG DATABASE
-- Nếu database của bạn có tên khác, hãy sửa tên này
USE `viral_window_db`;

-- 1. Xóa bảng cũ nếu có (để chạy lại script sạch sẽ)
DROP TABLE IF EXISTS `aluminum_warehouse_stock`;
DROP TABLE IF EXISTS `inventory_warehouses`;

-- 2. Tạo bảng quản lý kho
CREATE TABLE `inventory_warehouses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `warehouse_name` VARCHAR(255) NOT NULL,
  `warehouse_code` VARCHAR(50) NOT NULL UNIQUE,
  `inventory_type` ENUM('aluminum', 'accessory', 'glass', 'other') NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tạo bảng quan hệ tồn kho
CREATE TABLE `aluminum_warehouse_stock` (
  `aluminum_system_id` INT NOT NULL,
  `warehouse_id` INT NOT NULL,
  `quantity` DECIMAL(10, 2) DEFAULT 0,
  PRIMARY KEY (`aluminum_system_id`, `warehouse_id`),
  FOREIGN KEY (`aluminum_system_id`) REFERENCES `aluminum_systems`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`warehouse_id`) REFERENCES `inventory_warehouses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Thêm cột vào bảng transactions (nếu chưa có)
SET @dbname = DATABASE();
SET @tablename = 'inventory_transactions';
SET @columnname = 'warehouse_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT "Column already exists" as result',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL AFTER inventory_id')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Khởi tạo 2 kho mặc định cho Nhôm
INSERT INTO `inventory_warehouses` (`id`, `warehouse_name`, `warehouse_code`, `inventory_type`) VALUES 
(1, 'Kho Nhôm Chính', 'ALU_MAIN', 'aluminum'),
(2, 'Kho Nhôm Phụ', 'ALU_SUB', 'aluminum');

-- 6. DI CHUYỂN DỮ LIỆU CŨ VÀO KHO CHÍNH
-- Bước này cực kỳ quan trọng để không bị mất số liệu tồn kho cũ
INSERT INTO `aluminum_warehouse_stock` (`aluminum_system_id`, `warehouse_id`, `quantity`)
SELECT `id`, 1, `quantity` FROM `aluminum_systems`
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`);

-- KIỂM TRA KẾT QUẢ VÀ THÔNG BÁO
SELECT 'BƯỚC 1: Bảng inventory_warehouses:' as info, COUNT(*) as count FROM inventory_warehouses;
SELECT 'BƯỚC 2: Bảng aluminum_warehouse_stock:' as info, COUNT(*) as count FROM aluminum_warehouse_stock;
SELECT 'SUCCESS: Hoàn tất cấu hình 2 kho và di chuyển dữ liệu thành công!' as status;
