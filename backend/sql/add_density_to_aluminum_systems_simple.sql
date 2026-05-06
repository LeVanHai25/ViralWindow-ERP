-- Migration đơn giản cho phpMyAdmin
-- Chạy từng câu lệnh một trong phpMyAdmin

-- 1. Thêm cột density (tỉ trọng thô)
ALTER TABLE `aluminum_systems` 
ADD COLUMN `density` DECIMAL(10,3) NULL COMMENT 'Tỉ trọng thô (kg/m³)' 
AFTER `weight_per_meter`;

-- 2. Thêm cột cross_section_image (nếu chưa có image_url)
-- Nếu đã có cột image_url, bạn có thể:
-- Option A: Đổi tên image_url thành cross_section_image
ALTER TABLE `aluminum_systems` 
CHANGE COLUMN `image_url` `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt';

-- Option B: Hoặc giữ cả hai cột (nếu muốn tương thích ngược)
-- ALTER TABLE `aluminum_systems` 
-- ADD COLUMN `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt' 
-- AFTER `description`;

-- 3. Kiểm tra kết quả (không dùng INFORMATION_SCHEMA)
-- Chạy câu này để xem cấu trúc bảng:
DESCRIBE `aluminum_systems`;

-- Hoặc xem các cột cụ thể:
SHOW COLUMNS FROM `aluminum_systems` 
WHERE Field IN ('density', 'cross_section_image', 'image_url');

