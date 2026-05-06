-- ============================================
-- MIGRATION: Thêm cột project_id vào bảng inventory_transactions
-- Hướng dẫn: Copy toàn bộ file này và paste vào phpMyAdmin > Tab SQL > Thực hiện
-- ============================================

-- Bước 1: Thêm cột project_id (nếu chưa có)
-- Lưu ý: Nếu cột đã tồn tại, sẽ báo lỗi nhưng không sao, bỏ qua là được

ALTER TABLE inventory_transactions 
ADD COLUMN project_id INT NULL COMMENT 'ID dự án (nếu xuất kho cho dự án)' 
AFTER inventory_id;

-- Bước 2: Thêm index cho project_id (nếu chưa có)
-- Lưu ý: Nếu index đã tồn tại, sẽ báo lỗi nhưng không sao, bỏ qua là được

CREATE INDEX idx_project_id ON inventory_transactions(project_id);

-- Bước 3: Thêm foreign key (nếu chưa có)
-- Lưu ý: Nếu foreign key đã tồn tại, sẽ báo lỗi nhưng không sao, bỏ qua là được

ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- ============================================
-- KIỂM TRA KẾT QUẢ (Chạy các câu lệnh sau để kiểm tra)
-- ============================================

-- Kiểm tra cột project_id đã được thêm chưa
-- DESCRIBE inventory_transactions;

-- Kiểm tra các transaction có project_id không
-- SELECT id, inventory_id, project_id, transaction_type, transaction_date 
-- FROM inventory_transactions 
-- ORDER BY id DESC 
-- LIMIT 10;



















