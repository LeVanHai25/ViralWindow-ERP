-- Thêm cột accessory_id vào bảng inventory_transactions
-- Để hỗ trợ cả inventory (nhôm, kính) và accessories (phụ kiện)

-- Bước 1: Thêm cột accessory_id (nullable)
ALTER TABLE inventory_transactions 
ADD COLUMN accessory_id INT NULL COMMENT 'ID phụ kiện từ bảng accessories (nếu là phụ kiện)' 
AFTER inventory_id;

-- Bước 2: Sửa foreign key constraint cho inventory_id để cho phép NULL
-- (Vì bây giờ có thể là inventory_id hoặc accessory_id, không phải cả hai)

-- Xóa foreign key cũ (nếu có)
ALTER TABLE inventory_transactions 
DROP FOREIGN KEY IF EXISTS inventory_transactions_ibfk_1;

-- Thêm lại foreign key với ON DELETE SET NULL (cho phép NULL)
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_inventory 
FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;

-- Bước 3: Thêm foreign key cho accessory_id
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_accessory 
FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL;

-- Bước 4: Thêm index cho accessory_id
CREATE INDEX idx_accessory_id ON inventory_transactions(accessory_id);

-- Bước 5: Sửa cột inventory_id để cho phép NULL (vì có thể là accessory)
ALTER TABLE inventory_transactions 
MODIFY COLUMN inventory_id INT NULL COMMENT 'ID vật tư từ bảng inventory (nhôm, kính)';



















