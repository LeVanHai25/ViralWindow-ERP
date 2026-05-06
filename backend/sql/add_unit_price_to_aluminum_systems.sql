-- Migration: Thêm cột unit_price vào bảng aluminum_systems
-- Thêm trường giá (VNĐ) cho hệ nhôm

-- Kiểm tra và thêm cột unit_price nếu chưa tồn tại
ALTER TABLE aluminum_systems 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15, 2) NULL DEFAULT 0 COMMENT 'Giá (VNĐ)' AFTER length_m;

-- Nếu MySQL không hỗ trợ IF NOT EXISTS, sử dụng câu lệnh sau:
-- ALTER TABLE aluminum_systems 
-- ADD COLUMN unit_price DECIMAL(15, 2) NULL DEFAULT 0 COMMENT 'Giá (VNĐ)' AFTER length_m;

















