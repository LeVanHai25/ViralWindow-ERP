-- =====================================================
-- Kiểm tra snapshot_config của các sản phẩm
-- =====================================================
-- Query này sẽ hiển thị snapshot_config để xem có kích thước không

SELECT 
    pi.id as project_item_id,
    pi.project_id,
    p.project_name,
    pi.quantity,
    pi.snapshot_config,
    pi.custom_width_mm,
    pi.custom_height_mm,
    pi.aluminum_system,
    pt.code as template_code,
    pt.name as template_name,
    CASE 
        WHEN pi.snapshot_config IS NOT NULL THEN '✅ Có snapshot'
        ELSE '❌ Không có snapshot'
    END as has_snapshot,
    CASE 
        WHEN pi.custom_width_mm IS NOT NULL AND pi.custom_height_mm IS NOT NULL THEN '✅ Đã có kích thước'
        WHEN pi.snapshot_config IS NOT NULL THEN '⚠️ Có snapshot nhưng chưa extract kích thước'
        ELSE '❌ Chưa có kích thước'
    END as size_status
FROM project_items pi
LEFT JOIN projects p ON pi.project_id = p.id
LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
WHERE pi.project_id = 14
ORDER BY pi.id;

-- =====================================================
-- Query để extract kích thước từ snapshot_config (nếu có)
-- =====================================================
-- Chạy query này để xem kích thước có trong snapshot_config không

SELECT 
    pi.id as project_item_id,
    pi.project_id,
    pi.snapshot_config,
    JSON_EXTRACT(pi.snapshot_config, '$.width_mm') as snapshot_width,
    JSON_EXTRACT(pi.snapshot_config, '$.height_mm') as snapshot_height,
    JSON_EXTRACT(pi.snapshot_config, '$.size.w') as snapshot_size_w,
    JSON_EXTRACT(pi.snapshot_config, '$.size.h') as snapshot_size_h,
    pi.custom_width_mm as current_width,
    pi.custom_height_mm as current_height
FROM project_items pi
WHERE pi.project_id = 14
  AND pi.snapshot_config IS NOT NULL
ORDER BY pi.id;











