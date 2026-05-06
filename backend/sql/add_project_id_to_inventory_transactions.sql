-- Migration: Thêm cột project_id vào bảng inventory_transactions
-- Để lưu thông tin dự án khi xuất kho

-- Thêm cột project_id nếu chưa có
ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS project_id INT NULL COMMENT 'ID dự án (nếu xuất kho cho dự án)' 
AFTER inventory_id;

-- Thêm foreign key nếu chưa có
-- Lưu ý: Nếu đã có foreign key thì sẽ báo lỗi, có thể bỏ qua
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Thêm index nếu chưa có
CREATE INDEX IF NOT EXISTS idx_project_id ON inventory_transactions(project_id);

-- Nếu MySQL không hỗ trợ IF NOT EXISTS, sử dụng cách này:
-- ALTER TABLE inventory_transactions ADD COLUMN project_id INT NULL AFTER inventory_id;
-- ALTER TABLE inventory_transactions ADD INDEX idx_project_id (project_id);



















