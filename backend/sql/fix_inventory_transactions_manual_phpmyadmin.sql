-- Script SQL đơn giản hơn - chạy từng bước một
-- Nếu gặp lỗi "already exists", bỏ qua bước đó và chạy bước tiếp theo

-- ============================================
-- BƯỚC 1: Sửa cột inventory_id để cho phép NULL
-- ============================================
ALTER TABLE inventory_transactions 
MODIFY COLUMN inventory_id INT NULL COMMENT 'ID vật tư từ bảng inventory (nhôm, kính)';

-- ============================================
-- BƯỚC 2: Thêm cột accessory_id (bỏ qua nếu đã tồn tại)
-- ============================================
-- Nếu gặp lỗi "Duplicate column name", bỏ qua bước này
ALTER TABLE inventory_transactions 
ADD COLUMN accessory_id INT NULL COMMENT 'ID phụ kiện từ bảng accessories (nếu là phụ kiện)' 
AFTER inventory_id;

-- ============================================
-- BƯỚC 3: Tìm và xóa foreign key cũ cho inventory_id
-- ============================================
-- Chạy query này trước để tìm tên FK:
-- SELECT CONSTRAINT_NAME 
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE TABLE_SCHEMA = 'viral_window_db' 
--   AND TABLE_NAME = 'inventory_transactions' 
--   AND COLUMN_NAME = 'inventory_id' 
--   AND REFERENCED_TABLE_NAME = 'inventory';

-- Sau đó xóa FK (thay 'inventory_transactions_ibfk_1' bằng tên thực tế):
-- ALTER TABLE inventory_transactions DROP FOREIGN KEY inventory_transactions_ibfk_1;

-- ============================================
-- BƯỚC 4: Thêm lại foreign key cho inventory_id
-- ============================================
-- Nếu gặp lỗi "Duplicate key name", bỏ qua bước này
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_inventory 
FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;

-- ============================================
-- BƯỚC 5: Thêm foreign key cho accessory_id
-- ============================================
-- Nếu gặp lỗi "Duplicate key name", bỏ qua bước này
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_accessory 
FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL;

-- ============================================
-- BƯỚC 6: Thêm index cho accessory_id
-- ============================================
-- Nếu gặp lỗi "Duplicate key name", bỏ qua bước này
CREATE INDEX idx_accessory_id ON inventory_transactions(accessory_id);



















