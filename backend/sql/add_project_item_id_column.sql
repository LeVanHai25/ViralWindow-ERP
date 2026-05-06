-- =====================================================
-- Fix BOM System - Add project_item_id to door_designs
-- =====================================================

-- Thêm column project_item_id nếu chưa có
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'door_designs' 
    AND COLUMN_NAME = 'project_item_id'
);

-- Thêm column nếu chưa có
ALTER TABLE door_designs 
ADD COLUMN IF NOT EXISTS project_item_id INT NULL,
ADD INDEX IF NOT EXISTS idx_project_item_id (project_item_id);

-- Kiểm tra kết quả
SHOW COLUMNS FROM door_designs LIKE 'project_item_id';

SELECT '✅ Column project_item_id đã được thêm vào door_designs' as result;
