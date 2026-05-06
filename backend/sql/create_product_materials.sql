-- Tạo bảng product_materials để lưu vật tư cho từng sản phẩm riêng biệt
-- Bảng này lưu vật tư được gán cho từng sản phẩm riêng trong quy trình sản xuất
CREATE TABLE IF NOT EXISTS product_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    product_id INT NOT NULL,           -- quotation_item.id hoặc door_design.id
    material_type ENUM('aluminum', 'glass', 'accessory', 'other') DEFAULT 'other',
    material_name VARCHAR(255),
    material_code VARCHAR(100),
    required_qty DECIMAL(10,2) DEFAULT 0,   -- Số lượng cần cho sản phẩm này
    exported_qty DECIMAL(10,2) DEFAULT 0,   -- Số lượng đã xuất (cập nhật khi xuất kho)
    unit VARCHAR(50) DEFAULT 'cái',
    is_completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_product (project_id, product_id),
    INDEX idx_material_type (material_type)
);
