-- Migration: Thêm cột density (tỉ trọng thô) vào bảng aluminum_systems
-- Thay thế brand và thickness_mm bằng density và cross_section_image
-- Date: 2025

SET @dbname = DATABASE();
SET @tablename = 'aluminum_systems';

-- Kiểm tra và thêm cột density nếu chưa tồn tại
SET @columnname = 'density';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(10,3) NULL COMMENT "Tỉ trọng thô (kg/m³)" AFTER weight_per_meter')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Kiểm tra và đổi tên image_url thành cross_section_image nếu chưa có cross_section_image
SET @columnname = 'cross_section_image';
SET @checkColumn = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE (TABLE_SCHEMA = @dbname) AND (TABLE_NAME = @tablename) AND (COLUMN_NAME = @columnname));

SET @checkImageUrl = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE (TABLE_SCHEMA = @dbname) AND (TABLE_NAME = @tablename) AND (COLUMN_NAME = 'image_url'));

-- Nếu chưa có cross_section_image và có image_url, đổi tên
SET @preparedStatement = (SELECT IF(
  @checkColumn = 0 AND @checkImageUrl > 0,
  CONCAT('ALTER TABLE ', @tablename, ' CHANGE COLUMN image_url cross_section_image VARCHAR(500) NULL COMMENT "Đường dẫn hình ảnh mặt cắt"'),
  IF(@checkColumn > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(500) NULL COMMENT "Đường dẫn hình ảnh mặt cắt" AFTER description')
  )
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Giữ lại cột brand và thickness_mm để tương thích ngược (có thể xóa sau)
-- Hoặc có thể migrate dữ liệu từ brand/thickness_mm sang density nếu cần









