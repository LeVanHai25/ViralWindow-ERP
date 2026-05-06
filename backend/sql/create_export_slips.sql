-- =====================================================
-- SCRIPT CẬP NHẬT DATABASE CHO HỆ THỐNG PHIẾU XUẤT KHO
-- Chạy script này trong phpMyAdmin
-- =====================================================

-- =====================================================
-- BƯỚC 1: Cập nhật bảng project_materials
-- =====================================================

-- Thêm cột required_qty (số lượng yêu cầu)
ALTER TABLE project_materials 
ADD COLUMN IF NOT EXISTS required_qty DECIMAL(12,3) NOT NULL DEFAULT 0
COMMENT 'Số lượng yêu cầu ban đầu';

-- Thêm cột exported_qty (số lượng đã xuất)
ALTER TABLE project_materials 
ADD COLUMN IF NOT EXISTS exported_qty DECIMAL(12,3) NOT NULL DEFAULT 0
COMMENT 'Số lượng đã xuất thực tế';

-- Cập nhật dữ liệu cũ: required_qty = quantity, exported_qty dựa trên stock_deducted
UPDATE project_materials 
SET 
    required_qty = COALESCE(quantity, 0),
    exported_qty = CASE 
        WHEN stock_deducted = 1 THEN COALESCE(quantity, 0)
        ELSE 0
    END
WHERE required_qty = 0 OR required_qty IS NULL;

-- =====================================================
-- BƯỚC 2: Tạo bảng export_slips (Phiếu xuất kho)
-- =====================================================

CREATE TABLE IF NOT EXISTS export_slips (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã phiếu: PXK-2026-0001',
    project_id INT NOT NULL COMMENT 'Dự án liên quan',
    exported_by INT COMMENT 'Người xuất (user_id)',
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian xuất',
    total_items INT DEFAULT 0 COMMENT 'Tổng số dòng vật tư',
    total_qty DECIMAL(12,3) DEFAULT 0 COMMENT 'Tổng số lượng xuất',
    total_value DECIMAL(15,2) DEFAULT 0 COMMENT 'Tổng giá trị xuất',
    note TEXT COMMENT 'Ghi chú',
    status ENUM('DRAFT', 'POSTED', 'CANCELLED') DEFAULT 'POSTED' COMMENT 'Trạng thái phiếu',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_id (project_id),
    INDEX idx_exported_at (exported_at),
    INDEX idx_status (status),
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Phiếu xuất kho cho dự án';

-- =====================================================
-- BƯỚC 3: Tạo bảng export_slip_items (Chi tiết phiếu xuất)
-- =====================================================

CREATE TABLE IF NOT EXISTS export_slip_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    slip_id INT NOT NULL COMMENT 'ID phiếu xuất',
    project_material_id INT NOT NULL COMMENT 'ID dòng vật tư trong project_materials',
    material_type VARCHAR(50) COMMENT 'Loại vật tư: accessory, aluminum, glass, other',
    material_id INT COMMENT 'ID vật tư trong bảng kho tương ứng',
    material_code VARCHAR(100) COMMENT 'Mã vật tư',
    material_name VARCHAR(255) NOT NULL COMMENT 'Tên vật tư',
    qty DECIMAL(12,3) NOT NULL COMMENT 'Số lượng xuất',
    unit VARCHAR(50) DEFAULT 'cái' COMMENT 'Đơn vị',
    unit_price DECIMAL(15,2) DEFAULT 0 COMMENT 'Đơn giá',
    total_price DECIMAL(15,2) DEFAULT 0 COMMENT 'Thành tiền',
    stock_before DECIMAL(12,3) COMMENT 'Tồn kho trước xuất',
    stock_after DECIMAL(12,3) COMMENT 'Tồn kho sau xuất',
    note TEXT COMMENT 'Ghi chú',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_slip_id (slip_id),
    INDEX idx_project_material_id (project_material_id),
    INDEX idx_material_type (material_type),
    
    FOREIGN KEY (slip_id) REFERENCES export_slips(id) ON DELETE CASCADE,
    FOREIGN KEY (project_material_id) REFERENCES project_materials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Chi tiết các dòng vật tư trong phiếu xuất';

-- =====================================================
-- BƯỚC 4: Tạo sequence cho mã phiếu xuất
-- =====================================================

CREATE TABLE IF NOT EXISTS export_slip_sequence (
    year INT NOT NULL,
    last_number INT NOT NULL DEFAULT 0,
    PRIMARY KEY (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Khởi tạo sequence cho năm hiện tại
INSERT INTO export_slip_sequence (year, last_number) 
VALUES (YEAR(CURRENT_DATE), 0)
ON DUPLICATE KEY UPDATE year = year;

-- =====================================================
-- BƯỚC 5: Kiểm tra kết quả
-- =====================================================

-- Kiểm tra cột mới trong project_materials
DESCRIBE project_materials;

-- Kiểm tra bảng export_slips
DESCRIBE export_slips;

-- Kiểm tra bảng export_slip_items
DESCRIBE export_slip_items;

SELECT 'Script hoàn thành! Đã tạo hệ thống phiếu xuất kho.' AS Result;
