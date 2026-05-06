-- =====================================================
-- MIGRATION: Add missing columns to glass_items table
-- Chạy script này để thêm các cột cần thiết cho glass_items
-- =====================================================

-- 1. Thêm cột code (mã kính) - BẮT BUỘC
ALTER TABLE glass_items
ADD COLUMN IF NOT EXISTS code VARCHAR(50) NULL AFTER id;

-- 2. Thêm cột quantity (tồn kho) 
ALTER TABLE glass_items
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) DEFAULT 0;

-- 3. Thêm cột supplier_id (nhà cung cấp)
ALTER TABLE glass_items
ADD COLUMN IF NOT EXISTS supplier_id INT NULL;

-- 4. Thêm cột image_url
ALTER TABLE glass_items
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL;

-- 5. Thêm index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_glass_items_code ON glass_items(code);
CREATE INDEX IF NOT EXISTS idx_glass_items_name ON glass_items(name);

-- Kiểm tra cấu trúc bảng sau khi chạy
DESCRIBE glass_items;
