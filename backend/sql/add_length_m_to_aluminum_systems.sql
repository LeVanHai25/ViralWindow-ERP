-- Migration: Thêm cột length_m vào bảng aluminum_systems
-- Thêm trường độ dài (mét) cho hệ nhôm

-- Kiểm tra và thêm cột length_m nếu chưa tồn tại
ALTER TABLE aluminum_systems 
ADD COLUMN IF NOT EXISTS length_m DECIMAL(10, 2) NULL COMMENT 'Độ dài (mét)' AFTER weight_per_meter;

-- Nếu MySQL không hỗ trợ IF NOT EXISTS, sử dụng câu lệnh sau:
-- ALTER TABLE aluminum_systems 
-- ADD COLUMN length_m DECIMAL(10, 2) NULL COMMENT 'Độ dài (mét)' AFTER weight_per_meter;

















