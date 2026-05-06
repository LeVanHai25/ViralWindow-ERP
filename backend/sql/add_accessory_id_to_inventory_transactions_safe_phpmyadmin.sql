-- Script SQL an toàn để thêm cột accessory_id vào inventory_transactions
-- Kiểm tra và xử lý tất cả các trường hợp (cột đã tồn tại, FK đã tồn tại, etc.)

-- ============================================
-- BƯỚC 1: Kiểm tra và sửa cột inventory_id để cho phép NULL
-- ============================================
-- Kiểm tra xem cột inventory_id có cho phép NULL chưa
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'viral_window_db' 
      AND TABLE_NAME = 'inventory_transactions' 
      AND COLUMN_NAME = 'inventory_id' 
      AND IS_NULLABLE = 'YES'
);

-- Nếu cột chưa cho phép NULL, sửa lại
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE inventory_transactions MODIFY COLUMN inventory_id INT NULL COMMENT ''ID vật tư từ bảng inventory (nhôm, kính)'';',
    'SELECT ''Column inventory_id already allows NULL'' AS message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- BƯỚC 2: Thêm cột accessory_id (nếu chưa tồn tại)
-- ============================================
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'viral_window_db' 
      AND TABLE_NAME = 'inventory_transactions' 
      AND COLUMN_NAME = 'accessory_id'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE inventory_transactions ADD COLUMN accessory_id INT NULL COMMENT ''ID phụ kiện từ bảng accessories (nếu là phụ kiện)'' AFTER inventory_id;',
    'SELECT ''Column accessory_id already exists'' AS message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- BƯỚC 3: Xóa foreign key cũ cho inventory_id (nếu có)
-- ============================================
-- Tìm tên foreign key cũ
SET @fk_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'viral_window_db' 
      AND TABLE_NAME = 'inventory_transactions' 
      AND COLUMN_NAME = 'inventory_id' 
      AND REFERENCED_TABLE_NAME = 'inventory'
    LIMIT 1
);

-- Nếu tìm thấy FK cũ, xóa nó
SET @sql = IF(@fk_name IS NOT NULL,
    CONCAT('ALTER TABLE inventory_transactions DROP FOREIGN KEY ', @fk_name, ';'),
    'SELECT ''No old foreign key found for inventory_id'' AS message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- BƯỚC 4: Thêm lại foreign key cho inventory_id
-- ============================================
-- Kiểm tra xem FK đã tồn tại chưa
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'viral_window_db' 
      AND TABLE_NAME = 'inventory_transactions' 
      AND CONSTRAINT_NAME = 'fk_inventory_transactions_inventory'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_transactions_inventory FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;',
    'SELECT ''Foreign key fk_inventory_transactions_inventory already exists'' AS message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- BƯỚC 5: Thêm foreign key cho accessory_id
-- ============================================
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'viral_window_db' 
      AND TABLE_NAME = 'inventory_transactions' 
      AND CONSTRAINT_NAME = 'fk_inventory_transactions_accessory'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_transactions_accessory FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL;',
    'SELECT ''Foreign key fk_inventory_transactions_accessory already exists'' AS message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- BƯỚC 6: Thêm index cho accessory_id (nếu chưa có)
-- ============================================
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'viral_window_db' 
      AND TABLE_NAME = 'inventory_transactions' 
      AND INDEX_NAME = 'idx_accessory_id'
);

SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_accessory_id ON inventory_transactions(accessory_id);',
    'SELECT ''Index idx_accessory_id already exists'' AS message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- HOÀN TẤT: Kiểm tra kết quả
-- ============================================
SELECT 
    'Migration completed successfully!' AS status,
    'Check table structure with: DESCRIBE inventory_transactions;' AS next_step;



















