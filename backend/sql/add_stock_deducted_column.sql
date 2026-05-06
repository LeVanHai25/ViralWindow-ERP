-- =====================================================
-- CHẠY SCRIPT NÀY TRONG PHPMYADMIN
-- Thêm cột stock_deducted để theo dõi việc trừ kho
-- =====================================================

-- Bước 1: Thêm cột stock_deducted
ALTER TABLE project_materials 
ADD COLUMN stock_deducted TINYINT(1) DEFAULT 0 
COMMENT '1 = đã trừ kho, 0 = chưa trừ';

-- Bước 2: Đánh dấu tất cả vật tư cũ là đã trừ 
-- (để tránh trừ lại những vật tư đã xuất trước đó)
UPDATE project_materials SET stock_deducted = 1 WHERE stock_deducted IS NULL OR stock_deducted = 0;

-- Kiểm tra kết quả
SELECT 'Migration completed! Column stock_deducted added.' AS Result;
