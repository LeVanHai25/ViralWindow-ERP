-- =====================================================
-- Script để extract kích thước từ snapshot_config
-- =====================================================
-- Script này sẽ cập nhật custom_width_mm và custom_height_mm
-- từ snapshot_config nếu chưa có

-- BƯỚC 1: Kiểm tra trước khi update
SELECT 
    pi.id,
    pi.custom_width_mm as current_width,
    pi.custom_height_mm as current_height,
    JSON_EXTRACT(pi.snapshot_config, '$.width_mm') as snapshot_width,
    JSON_EXTRACT(pi.snapshot_config, '$.height_mm') as snapshot_height,
    JSON_EXTRACT(pi.snapshot_config, '$.size.w') as snapshot_size_w,
    JSON_EXTRACT(pi.snapshot_config, '$.size.h') as snapshot_size_h
FROM project_items pi
WHERE pi.project_id = 14
  AND pi.snapshot_config IS NOT NULL
  AND (pi.custom_width_mm IS NULL OR pi.custom_height_mm IS NULL)
ORDER BY pi.id;

-- BƯỚC 2: Update kích thước từ snapshot_config
-- ⚠️ CHẠY CẨN THẬN - Script này sẽ UPDATE dữ liệu
-- Lưu ý: Kích thước có thể nằm trong $.size.w và $.size.h hoặc $.width_mm và $.height_mm
UPDATE project_items pi
SET 
    custom_width_mm = COALESCE(
        pi.custom_width_mm,
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.size.w') AS UNSIGNED),
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.width_mm') AS UNSIGNED),
        NULL
    ),
    custom_height_mm = COALESCE(
        pi.custom_height_mm,
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.size.h') AS UNSIGNED),
        CAST(JSON_EXTRACT(pi.snapshot_config, '$.height_mm') AS UNSIGNED),
        NULL
    )
WHERE pi.project_id = 14
  AND pi.snapshot_config IS NOT NULL
  AND (pi.custom_width_mm IS NULL OR pi.custom_height_mm IS NULL);

-- BƯỚC 3: Kiểm tra kết quả sau khi update
SELECT 
    pi.id,
    pi.custom_width_mm,
    pi.custom_height_mm,
    CASE 
        WHEN pi.custom_width_mm IS NOT NULL AND pi.custom_height_mm IS NOT NULL THEN '✅ Đã có kích thước'
        ELSE '❌ Vẫn thiếu kích thước'
    END as status
FROM project_items pi
WHERE pi.project_id = 14
ORDER BY pi.id;

