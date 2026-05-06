-- Migration: Thêm cột project_id vào bảng inventory_transactions
-- Để lưu thông tin dự án khi xuất kho
-- Script này an toàn hơn, kiểm tra cột trước khi thêm

-- Kiểm tra và thêm cột project_id nếu chưa có
SET @dbname = DATABASE();
SET @tablename = 'inventory_transactions';
SET @columnname = 'project_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL COMMENT ''ID dự án (nếu xuất kho cho dự án)'' AFTER inventory_id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Thêm index nếu chưa có (MySQL không hỗ trợ IF NOT EXISTS cho CREATE INDEX, nên dùng cách này)
SET @indexname = 'idx_project_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @indexname)
  ) > 0,
  'SELECT 1', -- Index exists, do nothing
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, '(', @columnname, ')')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Thêm foreign key nếu chưa có
-- Lưu ý: Nếu đã có foreign key thì sẽ báo lỗi, có thể bỏ qua hoặc xóa constraint cũ trước
SET @fkname = 'fk_inventory_transactions_project';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (CONSTRAINT_NAME = @fkname)
  ) > 0,
  'SELECT 1', -- Foreign key exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD CONSTRAINT ', @fkname, ' FOREIGN KEY (', @columnname, ') REFERENCES projects(id) ON DELETE SET NULL')
));
PREPARE addFKIfNotExists FROM @preparedStatement;
EXECUTE addFKIfNotExists;
DEALLOCATE PREPARE addFKIfNotExists;



















