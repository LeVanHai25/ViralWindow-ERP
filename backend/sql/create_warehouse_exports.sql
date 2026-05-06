-- Tạo bảng warehouse_exports và warehouse_export_items
-- Chạy script này trong phpMyAdmin

-- Bảng phiếu xuất kho
CREATE TABLE IF NOT EXISTS warehouse_exports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    export_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'Số phiếu: 01-VRT12',
    export_date DATE NOT NULL,
    customer_name VARCHAR(255),
    customer_code VARCHAR(100) COMMENT 'Ký hiệu khách hàng',
    customer_address VARCHAR(500),
    phone VARCHAR(50),
    reason VARCHAR(500) COMMENT 'Lý do xuất',
    warehouse_location VARCHAR(255) DEFAULT 'Công ty cổ phần Viralwindow, Số 36 Đường Miền Đông Củ Khê Thanh Oai Hà Nội',
    shipping_time VARCHAR(100) COMMENT 'Thời điểm vận chuyển',
    dealer VARCHAR(255) COMMENT 'Đại lý',
    total_quantity DECIMAL(10,2) DEFAULT 0,
    total_area DECIMAL(10,2) DEFAULT 0,
    status ENUM('draft', 'confirmed', 'exported') DEFAULT 'draft',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng chi tiết vật tư xuất kho
CREATE TABLE IF NOT EXISTS warehouse_export_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    export_id INT NOT NULL,
    material_type ENUM('accessory', 'aluminum', 'glass', 'other') NOT NULL,
    material_id INT,
    material_code VARCHAR(100),
    material_name VARCHAR(255) NOT NULL,
    width_mm DECIMAL(10,2) DEFAULT 0 COMMENT 'Rộng (mm)',
    height_mm DECIMAL(10,2) DEFAULT 0 COMMENT 'Cao (mm)',
    unit VARCHAR(50) DEFAULT 'Cái',
    quantity DECIMAL(10,2) DEFAULT 0 COMMENT 'Số lượng',
    area DECIMAL(10,2) DEFAULT 0 COMMENT 'Diện tích (m2)',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (export_id) REFERENCES warehouse_exports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index cho tìm kiếm nhanh
CREATE INDEX idx_export_date ON warehouse_exports(export_date);
CREATE INDEX idx_export_number ON warehouse_exports(export_number);
CREATE INDEX idx_export_status ON warehouse_exports(status);
CREATE INDEX idx_export_items_export ON warehouse_export_items(export_id);

-- Thêm dữ liệu mẫu để test
INSERT INTO warehouse_exports (export_number, export_date, customer_name, customer_code, customer_address, phone, reason, warehouse_location, status, created_by)
VALUES ('01-VRT12', CURDATE(), 'Khách hàng mẫu', 'KH001', 'Hà Nội', '0123456789', 'Xuất hàng cho dự án', 'Công ty cổ phần Viralwindow, Số 36 Đường Miền Đông Củ Khê Thanh Oai Hà Nội', 'draft', 1);

SELECT 'Tạo bảng warehouse_exports và warehouse_export_items thành công!' as message;
