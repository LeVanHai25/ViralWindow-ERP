-- =====================================================
-- FIX HOÀN CHỈNH: Xóa và tạo lại bảng export_slip_items
-- với đầy đủ các cột cần thiết
-- Chạy script này trong phpMyAdmin
-- =====================================================

-- Bước 1: Xóa bảng cũ (nếu có)
DROP TABLE IF EXISTS export_slip_items;

-- Bước 2: Tạo lại bảng với đầy đủ cột
CREATE TABLE export_slip_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    slip_id INT NOT NULL,
    project_material_id INT NOT NULL,
    material_type VARCHAR(50),
    material_id INT,
    material_code VARCHAR(100),
    material_name VARCHAR(255),
    qty DECIMAL(12,3) NOT NULL,
    unit VARCHAR(50),
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_price DECIMAL(15,2) DEFAULT 0,
    stock_before DECIMAL(12,3) DEFAULT 0,
    stock_after DECIMAL(12,3) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slip_id (slip_id),
    INDEX idx_project_material_id (project_material_id)
);

-- Xác nhận thành công
SELECT 'Table export_slip_items recreated successfully!' AS status;

-- Kiểm tra cấu trúc bảng
DESCRIBE export_slip_items;
