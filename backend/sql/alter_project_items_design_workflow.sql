-- =====================================================
-- ALTER project_items TABLE - Add Design Workflow Columns
-- Thêm cột hỗ trợ workflow thiết kế theo chuẩn ATC
-- =====================================================

-- 1. Thêm cột status để track trạng thái thiết kế
ALTER TABLE project_items 
ADD COLUMN IF NOT EXISTS status ENUM('DESIGNING','DESIGN_CONFIRMED','BOM_EXTRACTED','EXPORTED') 
DEFAULT 'DESIGNING' AFTER notes;

-- 2. Thêm cột source để liên kết với báo giá gốc
ALTER TABLE project_items 
ADD COLUMN IF NOT EXISTS source_quotation_id INT NULL AFTER status,
ADD COLUMN IF NOT EXISTS source_quotation_item_id INT NULL AFTER source_quotation_id;

-- 3. Thêm cột calc_cache để cache kết quả tính BOM/giá
ALTER TABLE project_items 
ADD COLUMN IF NOT EXISTS calc_cache JSON NULL AFTER bom_override;

-- 4. Thêm index cho các cột mới
CREATE INDEX IF NOT EXISTS idx_project_items_status ON project_items(status);
CREATE INDEX IF NOT EXISTS idx_project_items_source ON project_items(source_quotation_id);

-- 5. Cập nhật status cho các items hiện có
UPDATE project_items SET status = 'DESIGNING' WHERE status IS NULL;

-- =====================================================
-- Kiểm tra cấu trúc sau khi alter
-- =====================================================
-- DESCRIBE project_items;
