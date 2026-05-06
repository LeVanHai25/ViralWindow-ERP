-- Migration: Thêm cột color và image_url vào bảng aluminum_systems
-- Thay thế cutting_formula bằng color
-- 
-- HƯỚNG DẪN:
-- 1. Kiểm tra xem các cột đã tồn tại chưa bằng cách chạy:
--    DESCRIBE aluminum_systems;
-- 2. Nếu chưa có cột color và image_url, chạy các lệnh ALTER TABLE bên dưới
-- 3. Nếu đã có cột, bỏ qua lệnh tương ứng

-- Thêm cột color (Màu sắc) - đặt sau weight_per_meter
ALTER TABLE aluminum_systems 
ADD COLUMN color VARCHAR(50) NULL COMMENT "Màu sắc hệ nhôm" 
AFTER weight_per_meter;

-- Thêm cột image_url (Đường dẫn hình ảnh) - đặt sau description
ALTER TABLE aluminum_systems 
ADD COLUMN image_url VARCHAR(255) NULL COMMENT "Đường dẫn hình ảnh mặt cắt" 
AFTER description;

-- LƯU Ý: 
-- - Nếu cột đã tồn tại, MySQL sẽ báo lỗi. Bạn có thể bỏ qua lỗi đó hoặc sử dụng file update_aluminum_systems_add_color_image.sql
-- - Cột cutting_formula vẫn được giữ lại để tương thích ngược, nhưng không còn được sử dụng trong code mới

