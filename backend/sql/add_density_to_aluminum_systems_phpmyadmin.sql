-- Migration: Thêm cột density (tỉ trọng thô) và cross_section_image vào bảng aluminum_systems
-- Tương thích với phpMyAdmin
-- Date: 2025

-- Bước 1: Kiểm tra và thêm cột density nếu chưa tồn tại
-- (Chạy từng câu lệnh một trong phpMyAdmin)

-- Kiểm tra xem cột density đã tồn tại chưa
SELECT COUNT(*) as column_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'aluminum_systems' 
  AND COLUMN_NAME = 'density';

-- Nếu kết quả = 0, chạy câu lệnh sau để thêm cột density:
ALTER TABLE `aluminum_systems` 
ADD COLUMN `density` DECIMAL(10,3) NULL COMMENT 'Tỉ trọng thô (kg/m³)' 
AFTER `weight_per_meter`;

-- Bước 2: Kiểm tra và thêm/đổi tên cột cross_section_image

-- Kiểm tra xem cột cross_section_image đã tồn tại chưa
SELECT COUNT(*) as column_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'aluminum_systems' 
  AND COLUMN_NAME = 'cross_section_image';

-- Kiểm tra xem cột image_url có tồn tại không
SELECT COUNT(*) as column_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'aluminum_systems' 
  AND COLUMN_NAME = 'image_url';

-- Nếu cross_section_image chưa tồn tại và image_url đã tồn tại:
-- Đổi tên image_url thành cross_section_image
ALTER TABLE `aluminum_systems` 
CHANGE COLUMN `image_url` `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt';

-- Nếu cả hai đều chưa tồn tại, thêm cột mới:
-- ALTER TABLE `aluminum_systems` 
-- ADD COLUMN `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt' 
-- AFTER `description`;

-- Bước 3: (Tùy chọn) Giữ lại cột brand và thickness_mm để tương thích ngược
-- Các cột này sẽ vẫn tồn tại trong database nhưng không bắt buộc khi tạo mới

-- Xem cấu trúc bảng sau khi migration:
DESCRIBE `aluminum_systems`;









