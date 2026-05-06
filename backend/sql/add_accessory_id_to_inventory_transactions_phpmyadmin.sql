-- Thêm cột accessory_id vào bảng inventory_transactions (phpMyAdmin compatible)
-- Để hỗ trợ cả inventory (nhôm, kính) và accessories (phụ kiện)

-- Bước 1: Sửa cột inventory_id để cho phép NULL (vì có thể là accessory)
ALTER TABLE inventory_transactions 
MODIFY COLUMN inventory_id INT NULL COMMENT 'ID vật tư từ bảng inventory (nhôm, kính)';

-- Bước 2: Thêm cột accessory_id (nullable)
ALTER TABLE inventory_transactions 
ADD COLUMN accessory_id INT NULL COMMENT 'ID phụ kiện từ bảng accessories (nếu là phụ kiện)' 
AFTER inventory_id;

-- Bước 3: Xóa foreign key cũ (nếu có) - Lưu ý: Nếu foreign key không tồn tại, sẽ báo lỗi nhưng không sao
-- Tìm tên foreign key trước:
-- SELECT CONSTRAINT_NAME 
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE TABLE_SCHEMA = 'viral_window_db' 
--   AND TABLE_NAME = 'inventory_transactions' 
--   AND COLUMN_NAME = 'inventory_id' 
--   AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Sau đó xóa (thay 'inventory_transactions_ibfk_1' bằng tên thực tế):
-- ALTER TABLE inventory_transactions DROP FOREIGN KEY inventory_transactions_ibfk_1;

-- Bước 4: Thêm lại foreign key cho inventory_id với ON DELETE SET NULL
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_inventory 
FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;

-- Bước 5: Thêm foreign key cho accessory_id
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_accessory 
FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL;

-- Bước 6: Thêm index cho accessory_id
CREATE INDEX idx_accessory_id ON inventory_transactions(accessory_id);



















