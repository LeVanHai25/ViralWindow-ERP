-- Migration: Thêm cột color và image_url vào bảng aluminum_systems
-- Thay thế cutting_formula bằng color
-- Date: 2024

-- Kiểm tra và thêm cột color nếu chưa tồn tại
SET @dbname = DATABASE();
SET @tablename = 'aluminum_systems';
SET @columnname = 'color';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(50) NULL COMMENT "Màu sắc hệ nhôm" AFTER weight_per_meter')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Kiểm tra và thêm cột image_url nếu chưa tồn tại
SET @columnname = 'image_url';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NULL COMMENT "Đường dẫn hình ảnh mặt cắt" AFTER description')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tùy chọn: Nếu muốn xóa cột cutting_formula (bỏ comment dòng dưới)
-- ALTER TABLE aluminum_systems DROP COLUMN IF EXISTS cutting_formula;

-- Hoặc nếu muốn giữ lại cutting_formula nhưng đánh dấu là deprecated
-- ALTER TABLE aluminum_systems MODIFY COLUMN cutting_formula VARCHAR(255) NULL COMMENT "DEPRECATED: Sử dụng color thay thế";



















