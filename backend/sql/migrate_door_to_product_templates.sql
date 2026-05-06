-- ============================================
-- SQL Script: Migrate dữ liệu từ door_templates sang product_templates
-- Chạy SAU KHI đã tạo bảng product_templates
-- Cấu trúc phù hợp với database thực tế
-- ============================================

-- Bước 1: Migrate với các cột thực tế có trong door_templates
-- Các cột thực tế: id, code, name, category, family, aluminum_system_id, preview_image,
--                  param_schema, description, is_active, display_order, created_at, updated_at,
--                  structure_json, template_json, render_config

INSERT INTO product_templates (
    code, name, product_type, category, family,
    aluminum_system, aluminum_system_id, preview_image,
    template_json, param_schema, structure_json,
    default_width_mm, default_height_mm,
    description, is_active, display_order
)
SELECT 
    code, 
    name, 
    -- Xác định product_type dựa trên category/family
    CASE 
        WHEN category LIKE '%window%' OR family LIKE '%win%' THEN 'window'
        WHEN category LIKE '%sliding%' AND family LIKE '%door%' THEN 'door'
        WHEN family = 'fixed' OR family = 'wall_window' THEN 'glass_wall'
        ELSE 'door'
    END as product_type,
    category, 
    family,
    'XINGFA_55' as aluminum_system,  -- Default vì door_templates không có cột này
    aluminum_system_id, 
    preview_image,
    template_json, 
    param_schema, 
    structure_json,
    1200 as default_width_mm,
    2200 as default_height_mm,
    description, 
    COALESCE(is_active, 1), 
    COALESCE(display_order, 0)
FROM door_templates
WHERE NOT EXISTS (
    SELECT 1 FROM product_templates pt WHERE pt.code = door_templates.code
);

-- ============================================
-- Verification queries
-- ============================================

-- Kiểm tra số lượng records đã migrate
SELECT 'door_templates' as source, COUNT(*) as count FROM door_templates
UNION ALL
SELECT 'product_templates' as source, COUNT(*) as count FROM product_templates;

-- Kiểm tra phân bố product_type
SELECT product_type, COUNT(*) as count FROM product_templates GROUP BY product_type;
