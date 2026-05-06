-- =====================================================
-- Kiểm tra aluminum_system trong snapshot_config
-- =====================================================
-- Query này sẽ kiểm tra xem aluminum_system có trong snapshot_config không

SELECT 
    pi.id as project_item_id,
    pi.project_id,
    pi.aluminum_system as current_aluminum_system,
    JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system') as snapshot_aluminum_system,
    JSON_EXTRACT(pi.snapshot_config, '$.aluminum_system_code') as snapshot_aluminum_code,
    JSON_EXTRACT(pi.snapshot_config, '$.system') as snapshot_system,
    pi.snapshot_config
FROM project_items pi
WHERE pi.project_id = 14
  AND pi.snapshot_config IS NOT NULL
  AND pi.aluminum_system IS NULL
ORDER BY pi.id
LIMIT 3;  -- Chỉ xem 3 dòng đầu để kiểm tra cấu trúc JSON











