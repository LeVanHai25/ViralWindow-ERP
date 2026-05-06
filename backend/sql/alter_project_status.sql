-- Migration: Thêm trạng thái điều hành và tình trạng vật tư cho dự án
-- Run: mysql -u root -p aluminium_window < alter_project_status.sql

USE aluminium_window;

-- ===== 1. Thêm cột trạng thái điều hành vào bảng projects =====
-- operation_status: 1=Đang SX, 2=Đã giao, 3=Vướng mắc, 4=Thay đổi TK
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS operation_status TINYINT DEFAULT 1 COMMENT '1=Đang SX, 2=Đã giao, 3=Vướng mắc, 4=Thay đổi TK',
ADD COLUMN IF NOT EXISTS operation_notes TEXT COMMENT 'Ghi chú trạng thái điều hành',
ADD COLUMN IF NOT EXISTS operation_updated_at DATETIME COMMENT 'Thời gian cập nhật trạng thái';

-- ===== 2. Tạo bảng theo dõi vật tư dự án =====
CREATE TABLE IF NOT EXISTS project_material_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    material_type ENUM('glass', 'aluminum', 'accessory', 'auxiliary') NOT NULL COMMENT 'Loại vật tư',
    status ENUM('ok', 'waiting', 'missing', 'ordered', 'arrived') DEFAULT 'missing' COMMENT 'Trạng thái',
    order_date DATE COMMENT 'Ngày đặt hàng',
    expected_date DATE COMMENT 'Ngày dự kiến về',
    actual_date DATE COMMENT 'Ngày thực tế về',
    quantity DECIMAL(10,2) COMMENT 'Số lượng cần',
    quantity_arrived DECIMAL(10,2) COMMENT 'Số lượng đã về',
    supplier VARCHAR(255) COMMENT 'Nhà cung cấp',
    notes TEXT COMMENT 'Ghi chú',
    confirmed_by INT COMMENT 'Người xác nhận',
    confirmed_at DATETIME COMMENT 'Thời gian xác nhận',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_material (project_id, material_type)
);

-- ===== 3. Tạo bảng log lịch sử thay đổi =====
CREATE TABLE IF NOT EXISTS project_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL COMMENT 'Loại hành động',
    old_value TEXT COMMENT 'Giá trị cũ',
    new_value TEXT COMMENT 'Giá trị mới',
    description TEXT COMMENT 'Mô tả',
    user_id INT COMMENT 'Người thực hiện',
    user_name VARCHAR(255) COMMENT 'Tên người thực hiện',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ===== 4. Khởi tạo dữ liệu vật tư cho các dự án hiện có =====
INSERT IGNORE INTO project_material_status (project_id, material_type, status)
SELECT p.id, 'glass', 'missing' FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_material_status WHERE project_id = p.id AND material_type = 'glass');

INSERT IGNORE INTO project_material_status (project_id, material_type, status)
SELECT p.id, 'aluminum', 'missing' FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_material_status WHERE project_id = p.id AND material_type = 'aluminum');

INSERT IGNORE INTO project_material_status (project_id, material_type, status)
SELECT p.id, 'accessory', 'missing' FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_material_status WHERE project_id = p.id AND material_type = 'accessory');

INSERT IGNORE INTO project_material_status (project_id, material_type, status)
SELECT p.id, 'auxiliary', 'missing' FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_material_status WHERE project_id = p.id AND material_type = 'auxiliary');

-- ===== 5. Cập nhật trạng thái mặc định dựa trên status hiện tại =====
UPDATE projects 
SET operation_status = CASE 
    WHEN status IN ('completed', 'handover') THEN 2
    WHEN status IN ('designing', 'bom') THEN 4
    ELSE 1
END
WHERE operation_status IS NULL OR operation_status = 0;

SELECT 'Migration completed successfully!' AS result;
