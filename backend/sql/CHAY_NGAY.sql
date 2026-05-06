-- ============================================
-- FILE NÀY CHẠY TRỰC TIẾP TRONG phpMyAdmin
-- Copy từng câu lệnh và chạy một
-- ============================================

-- CÂU 1: Thêm cột density (chạy câu này trước)
-- LƯU Ý: Nếu báo lỗi "Duplicate column name 'density'" → Cột đã có, OK! Bỏ qua và chuyển sang CÂU 2
ALTER TABLE `aluminum_systems` 
ADD COLUMN `density` DECIMAL(10,3) NULL COMMENT 'Tỉ trọng thô' 
AFTER `weight_per_meter`;

-- CÂU 2: Kiểm tra có cột image_url không (chạy để xem)
SHOW COLUMNS FROM `aluminum_systems` WHERE Field = 'image_url';

-- CÂU 3A: Nếu CÂU 2 có kết quả → Chạy câu này (đổi tên)
ALTER TABLE `aluminum_systems` 
CHANGE COLUMN `image_url` `cross_section_image` VARCHAR(500) NULL COMMENT 'Hình ảnh mặt cắt';

-- CÂU 3B: Nếu CÂU 2 không có kết quả → Chạy câu này (thêm mới)
ALTER TABLE `aluminum_systems` 
ADD COLUMN `cross_section_image` VARCHAR(500) NULL COMMENT 'Hình ảnh mặt cắt' 
AFTER `description`;

-- CÂU 4: Kiểm tra kết quả
DESCRIBE `aluminum_systems`;

