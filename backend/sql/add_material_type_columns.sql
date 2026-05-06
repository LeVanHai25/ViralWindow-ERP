-- Migration: Thêm các cột material_type và material_id vào bảng project_materials
-- Để hỗ trợ cấu trúc mới trong projectMaterialController.js

-- Thêm cột material_type
ALTER TABLE project_materials 
ADD COLUMN material_type ENUM('accessory', 'aluminum', 'glass', 'other') NULL 
AFTER project_id;

-- Thêm cột material_id
ALTER TABLE project_materials 
ADD COLUMN material_id INT NULL 
AFTER material_type;

-- Thêm cột material_name (thay cho item_name để thống nhất)
ALTER TABLE project_materials 
ADD COLUMN material_name VARCHAR(255) NULL 
AFTER material_id;

-- Thêm cột quantity (thay cho quantity_used để thống nhất)
ALTER TABLE project_materials 
ADD COLUMN quantity DECIMAL(10,2) NULL 
AFTER material_name;

-- Thêm cột unit (thay cho item_unit để thống nhất)
ALTER TABLE project_materials 
ADD COLUMN unit VARCHAR(50) NULL 
AFTER quantity;

-- Thêm index cho material_type
ALTER TABLE project_materials 
ADD INDEX idx_material_type (material_type);

-- Thêm index cho material_id
ALTER TABLE project_materials 
ADD INDEX idx_material_id (material_id);














