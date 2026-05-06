-- Script kiểm tra xem cột project_id đã tồn tại trong bảng inventory_transactions chưa

-- Kiểm tra cấu trúc bảng
DESCRIBE inventory_transactions;

-- Hoặc kiểm tra bằng INFORMATION_SCHEMA
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'inventory_transactions'
  AND COLUMN_NAME = 'project_id';

-- Nếu không có kết quả, nghĩa là cột chưa tồn tại
-- Hãy chạy migration: add_project_id_to_inventory_transactions_safe.sql



















