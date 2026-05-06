-- ============================================
-- SQL Script: Mở rộng door_templates cho Door Catalog
-- ============================================

-- 1. Thêm các cột quản lý vòng đời và kích thước mặc định
ALTER TABLE door_templates 
ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active' COMMENT 'Trạng thái cửa: active = đang dùng, inactive = ngừng sử dụng';

ALTER TABLE door_templates 
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 COMMENT 'Version để theo dõi thay đổi cấu tạo';

ALTER TABLE door_templates 
ADD COLUMN IF NOT EXISTS default_width_mm INT DEFAULT 1000 COMMENT 'Chiều rộng mặc định (mm)';

ALTER TABLE door_templates 
ADD COLUMN IF NOT EXISTS default_height_mm INT DEFAULT 2100 COMMENT 'Chiều cao mặc định (mm)';

ALTER TABLE door_templates 
ADD COLUMN IF NOT EXISTS glass_type VARCHAR(100) NULL COMMENT 'Loại kính mặc định: 8mm, 10mm, hộp 2 lớp...';

ALTER TABLE door_templates 
ADD COLUMN IF NOT EXISTS accessories_json JSON NULL COMMENT 'Phụ kiện mặc định theo JSON';

-- 2. Thêm index cho status để filter nhanh
CREATE INDEX IF NOT EXISTS idx_status ON door_templates(status);

-- 3. Cập nhật cấu trúc template_json để hỗ trợ multi-system
-- Không cần ALTER, chỉ cần format JSON đúng khi insert/update:
-- {
--   "geometry": { "type": "sliding_2_wings", "leaf_count": 2, "panel_tree": {...} },
--   "systems": {
--     "XINGFA_55": { "profiles": [...], "accessories": [...] },
--     "PMI": { "profiles": [...], "accessories": [...] }
--   }
-- }

-- 4. Đảm bảo các cửa hiện có đều có status = active
UPDATE door_templates SET status = 'active' WHERE status IS NULL;
UPDATE door_templates SET version = 1 WHERE version IS NULL;
