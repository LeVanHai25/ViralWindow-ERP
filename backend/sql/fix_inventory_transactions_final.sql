-- Script SQL cuối cùng để sửa inventory_transactions
-- Chạy từng bước, bỏ qua nếu gặp lỗi "already exists"

-- ============================================
-- BƯỚC 1: Sửa cột inventory_id để cho phép NULL
-- ============================================
ALTER TABLE inventory_transactions 
MODIFY COLUMN inventory_id INT NULL COMMENT 'ID vật tư từ bảng inventory (nhôm, kính)';

-- ============================================
-- BƯỚC 2: Kiểm tra và thêm foreign key cho inventory_id
-- ============================================
-- Nếu gặp lỗi "Duplicate key name", bỏ qua (FK đã tồn tại)
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_inventory 
FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;

-- ============================================
-- BƯỚC 3: Thêm foreign key cho accessory_id
-- ============================================
-- Nếu gặp lỗi "Duplicate key name", bỏ qua (FK đã tồn tại)
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_accessory 
FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL;

-- ============================================
-- BƯỚC 4: Thêm index cho accessory_id
-- ============================================
-- Nếu gặp lỗi "Duplicate key name", bỏ qua (index đã tồn tại)
CREATE INDEX idx_accessory_id ON inventory_transactions(accessory_id);



















