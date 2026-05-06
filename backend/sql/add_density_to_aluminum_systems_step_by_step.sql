-- HƯỚNG DẪN CHẠY TỪNG BƯỚC TRONG phpMyAdmin
-- Copy và chạy từng câu lệnh một, kiểm tra kết quả trước khi chạy câu tiếp theo

-- ============================================
-- BƯỚC 1: Thêm cột density
-- ============================================
-- Copy câu lệnh này và chạy:
ALTER TABLE `aluminum_systems` 
ADD COLUMN `density` DECIMAL(10,3) NULL COMMENT 'Tỉ trọng thô (kg/m³)' 
AFTER `weight_per_meter`;

-- Nếu thành công: Bạn sẽ thấy "1 row affected" hoặc tương tự
-- Nếu báo lỗi "Duplicate column name 'density'": Cột đã tồn tại, OK, tiếp tục bước 2
-- Nếu báo lỗi khác: Kiểm tra lại cú pháp hoặc quyền truy cập

-- ============================================
-- BƯỚC 2: Kiểm tra cột image_url
-- ============================================
-- Chạy câu này để xem có cột image_url không:
SHOW COLUMNS FROM `aluminum_systems` LIKE 'image_url';

-- Nếu có kết quả (cột tồn tại): Chạy BƯỚC 2A
-- Nếu không có kết quả (cột không tồn tại): Chạy BƯỚC 2B

-- ============================================
-- BƯỚC 2A: Đổi tên image_url thành cross_section_image
-- ============================================
-- Chỉ chạy nếu BƯỚC 2 có kết quả (cột image_url tồn tại)
ALTER TABLE `aluminum_systems` 
CHANGE COLUMN `image_url` `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt';

-- ============================================
-- BƯỚC 2B: Thêm cột cross_section_image mới
-- ============================================
-- Chỉ chạy nếu BƯỚC 2 không có kết quả (cột image_url không tồn tại)
ALTER TABLE `aluminum_systems` 
ADD COLUMN `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt' 
AFTER `description`;

-- ============================================
-- BƯỚC 3: Kiểm tra kết quả
-- ============================================
-- Chạy câu này để xem cấu trúc bảng:
DESCRIBE `aluminum_systems`;

-- Hoặc xem các cột liên quan:
SHOW COLUMNS FROM `aluminum_systems` 
WHERE Field IN ('density', 'cross_section_image', 'image_url');

-- Bạn sẽ thấy:
-- - Cột `density` với kiểu DECIMAL(10,3)
-- - Cột `cross_section_image` với kiểu VARCHAR(500)
-- - Cột `image_url` sẽ không còn (nếu đã đổi tên) hoặc vẫn còn (nếu thêm mới)









