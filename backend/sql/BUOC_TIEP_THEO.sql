-- ============================================
-- BƯỚC TIẾP THEO - Sau khi cột density đã có
-- ============================================

-- BƯỚC 1: Kiểm tra có cột image_url không
-- Chạy câu này để xem:
SHOW COLUMNS FROM `aluminum_systems` WHERE Field = 'image_url';

-- NẾU CÓ KẾT QUẢ (cột image_url tồn tại):
-- → Chạy BƯỚC 2A (đổi tên image_url thành cross_section_image)

-- NẾU KHÔNG CÓ KẾT QUẢ (cột image_url không tồn tại):
-- → Chạy BƯỚC 2B (thêm cột cross_section_image mới)

-- ============================================
-- BƯỚC 2A: Đổi tên image_url thành cross_section_image
-- ============================================
-- CHỈ CHẠY NẾU BƯỚC 1 có kết quả
ALTER TABLE `aluminum_systems` 
CHANGE COLUMN `image_url` `cross_section_image` VARCHAR(500) NULL COMMENT 'Hình ảnh mặt cắt';

-- ============================================
-- BƯỚC 2B: Thêm cột cross_section_image mới
-- ============================================
-- CHỈ CHẠY NẾU BƯỚC 1 không có kết quả
ALTER TABLE `aluminum_systems` 
ADD COLUMN `cross_section_image` VARCHAR(500) NULL COMMENT 'Hình ảnh mặt cắt' 
AFTER `description`;

-- ============================================
-- BƯỚC 3: Kiểm tra kết quả cuối cùng
-- ============================================
-- Chạy câu này để xem tất cả các cột:
DESCRIBE `aluminum_systems`;

-- Bạn sẽ thấy 2 cột:
-- - density (DECIMAL(10,3)) ✓
-- - cross_section_image (VARCHAR(500)) ✓








