-- FILE SQL CUỐI CÙNG - CHẠY TRỰC TIẾP TRONG phpMyAdmin
-- Copy và paste từng câu lệnh vào phpMyAdmin, chạy từng câu một

-- ============================================
-- CÂU 1: Thêm cột density
-- ============================================
-- Chạy câu này:
ALTER TABLE `aluminum_systems` 
ADD COLUMN `density` DECIMAL(10,3) NULL COMMENT 'Tỉ trọng thô (kg/m³)' 
AFTER `weight_per_meter`;

-- Nếu báo lỗi "Duplicate column name 'density'" → Cột đã có, OK, chuyển sang Câu 2
-- Nếu thành công → Chuyển sang Câu 2

-- ============================================
-- CÂU 2: Kiểm tra cột image_url
-- ============================================
-- Chạy câu này để kiểm tra:
SHOW COLUMNS FROM `aluminum_systems` WHERE Field = 'image_url';

-- NẾU CÓ KẾT QUẢ (cột image_url tồn tại):
-- → Chạy Câu 2A (đổi tên image_url thành cross_section_image)

-- NẾU KHÔNG CÓ KẾT QUẢ (cột image_url không tồn tại):
-- → Chạy Câu 2B (thêm cột cross_section_image mới)

-- ============================================
-- CÂU 2A: Đổi tên image_url thành cross_section_image
-- ============================================
-- CHỈ CHẠY NẾU Câu 2 có kết quả
ALTER TABLE `aluminum_systems` 
CHANGE COLUMN `image_url` `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt';

-- ============================================
-- CÂU 2B: Thêm cột cross_section_image mới
-- ============================================
-- CHỈ CHẠY NẾU Câu 2 không có kết quả
ALTER TABLE `aluminum_systems` 
ADD COLUMN `cross_section_image` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh mặt cắt' 
AFTER `description`;

-- ============================================
-- CÂU 3: Kiểm tra kết quả (tùy chọn)
-- ============================================
-- Chạy câu này để xem cấu trúc bảng:
DESCRIBE `aluminum_systems`;

-- Bạn sẽ thấy 2 cột mới:
-- - density (DECIMAL(10,3))
-- - cross_section_image (VARCHAR(500))








