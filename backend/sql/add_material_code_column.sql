-- Thêm cột material_code vào bảng project_materials (nếu chưa tồn tại)
-- Cột này lưu mã vật tư để đồng bộ chính xác với kho

-- Kiểm tra và thêm cột material_code nếu chưa có
SET @dbname = DATABASE();
SET @tablename = 'project_materials';
SET @columnname = 'material_code';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  "SELECT 'Cột material_code đã tồn tại!' AS message",
  "ALTER TABLE project_materials ADD COLUMN material_code VARCHAR(100) NULL AFTER material_id"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Thêm index nếu chưa có
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_material_code') > 0,
  "SELECT 'Index idx_material_code đã tồn tại!' AS message",
  "ALTER TABLE project_materials ADD INDEX idx_material_code (material_code)"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration hoàn thành!' AS result;
