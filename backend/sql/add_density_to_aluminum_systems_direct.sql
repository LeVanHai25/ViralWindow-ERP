-- Migration đơn giản - Chạy trực tiếp trong phpMyAdmin
-- Chạy từng câu lệnh một, nếu báo lỗi "Duplicate column" thì bỏ qua câu đó

-- Câu 1: Thêm cột density (tỉ trọng thô)
-- Nếu báo lỗi "Duplicate column name 'density'" thì cột đã tồn tại, bỏ qua
ALTER TABLE `aluminum_systems` 
ADD COLUMN `density` DECIMAL(10,3) NULL COMMENT 'Tỉ trọng thô (kg/m³)' 
AFTER `weight_per_meter`;

-- Câu 2: Kiểm tra xem có cột image_url không
-- Nếu có cột image_url, đổi tên thành cross_section_image
-- Nếu báo lỗi "Unknown column 'image_url'" thì cột không tồn tại, chạy Câu 3
ALTER TABLE `aluminum_systems` 
CHANGE COLUMN `image_url` `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt';

-- Câu 3: Nếu không có image_url, thêm cột cross_section_image mới
-- Chỉ chạy câu này nếu Câu 2 báo lỗi "Unknown column 'image_url'"
-- Nếu báo lỗi "Duplicate column name 'cross_section_image'" thì cột đã tồn tại, bỏ qua
ALTER TABLE `aluminum_systems` 
ADD COLUMN `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt' 
AFTER `description`;









