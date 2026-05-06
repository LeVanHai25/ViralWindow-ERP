-- ============================================
-- MIGRATION: Tạo bảng project_materials
-- Hướng dẫn: Copy toàn bộ file này và paste vào phpMyAdmin > Tab SQL > Thực hiện
-- ============================================

-- Bước 1: Tạo bảng project_materials
CREATE TABLE IF NOT EXISTS project_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL COMMENT 'ID dự án',
    inventory_id INT NULL COMMENT 'ID vật tư từ bảng inventory (nhôm, kính)',
    accessory_id INT NULL COMMENT 'ID phụ kiện từ bảng accessories',
    transaction_id INT NULL COMMENT 'ID giao dịch xuất kho (để trace lại)',
    quantity_used DECIMAL(10, 2) NOT NULL COMMENT 'Số lượng đã xuất',
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0 COMMENT 'Giá đơn vị tại thời điểm xuất',
    total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0 COMMENT 'Tổng chi phí = quantity_used × unit_price',
    item_name VARCHAR(255) NULL COMMENT 'Tên vật tư (lưu để tránh mất dữ liệu khi vật tư bị xóa)',
    item_unit VARCHAR(50) NULL COMMENT 'Đơn vị tính',
    notes TEXT NULL COMMENT 'Ghi chú',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL,
    FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL,
    FOREIGN KEY (transaction_id) REFERENCES inventory_transactions(id) ON DELETE SET NULL,
    
    INDEX idx_project_id (project_id),
    INDEX idx_inventory_id (inventory_id),
    INDEX idx_accessory_id (accessory_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vật tư đã sử dụng cho dự án';

-- Bước 2: Thêm cột material_cost vào bảng projects
-- Lưu ý: Nếu MySQL không hỗ trợ IF NOT EXISTS, bỏ phần "IF NOT EXISTS" đi
-- Nếu cột đã tồn tại, sẽ báo lỗi nhưng không sao, bỏ qua là được

ALTER TABLE projects 
ADD COLUMN material_cost DECIMAL(15, 2) DEFAULT 0 COMMENT 'Tổng chi phí vật tư' 
AFTER total_value;

-- ============================================
-- KIỂM TRA KẾT QUẢ (Chạy các câu lệnh sau để kiểm tra)
-- ============================================

-- Kiểm tra bảng project_materials đã được tạo chưa
-- DESCRIBE project_materials;

-- Kiểm tra cột material_cost đã được thêm chưa
-- DESCRIBE projects;



















