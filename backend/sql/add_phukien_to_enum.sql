-- Migration: Thêm giá trị 'phukien' vào ENUM của cột material_type
-- Chạy file này trong phpMyAdmin hoặc command line MySQL

-- Thêm 'phukien' vào ENUM của material_type
ALTER TABLE project_materials 
MODIFY COLUMN material_type ENUM('accessory', 'aluminum', 'glass', 'other', 'phukien') NULL;

-- Xác nhận thay đổi
DESCRIBE project_materials;
