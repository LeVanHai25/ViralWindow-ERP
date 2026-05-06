-- =====================================================
-- THÊM BOM RULES CHO CÁC CỬA ĐÃ CÓ
-- (Product templates đã tồn tại, chỉ thêm BOM rules)
-- =====================================================

-- =====================================================
-- 1. XÓA DỮ LIỆU CŨ VÀ THÊM MỚI
-- =====================================================
DELETE FROM atc_product_bom_profiles;
DELETE FROM atc_product_accessory_rules;

-- =====================================================
-- 2. BOM RULES CHO CỬA ĐI 1 CÁNH (code bắt đầu DOOR_OUT_1L hoặc DOOR_IN_1L hoặc D1)
-- =====================================================
INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 2, 2, 1
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'DOOR_OUT_1%' OR pt.code LIKE 'DOOR_IN_1%' OR pt.code = 'D1')
  AND ap.code = 'XF55_KB_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W', 2, 2, 2
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'DOOR_OUT_1%' OR pt.code LIKE 'DOOR_IN_1%' OR pt.code = 'D1')
  AND ap.code = 'XF55_KB_NGANG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 2, 2, 3
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'DOOR_OUT_1%' OR pt.code LIKE 'DOOR_IN_1%' OR pt.code = 'D1')
  AND ap.code = 'XF55_CD_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W', 2, 2, 4
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'DOOR_OUT_1%' OR pt.code LIKE 'DOOR_IN_1%' OR pt.code = 'D1')
  AND ap.code = 'XF55_CD_NGANG';

-- =====================================================
-- 3. BOM RULES CHO CỬA ĐI 2 CÁNH (code bắt đầu DOOR_OUT_2 hoặc DOOR_IN_2 hoặc D2)
-- =====================================================
INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 2, 2, 1
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'DOOR_OUT_2%' OR pt.code LIKE 'DOOR_IN_2%' OR pt.code = 'D2')
  AND ap.code = 'XF55_KB_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W', 2, 2, 2
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'DOOR_OUT_2%' OR pt.code LIKE 'DOOR_IN_2%' OR pt.code = 'D2')
  AND ap.code = 'XF55_KB_NGANG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 4, 2, 3
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'DOOR_OUT_2%' OR pt.code LIKE 'DOOR_IN_2%' OR pt.code = 'D2')
  AND ap.code = 'XF55_CD_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W/2', 4, 2, 4
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'DOOR_OUT_2%' OR pt.code LIKE 'DOOR_IN_2%' OR pt.code = 'D2')
  AND ap.code = 'XF55_CD_NGANG';

-- =====================================================
-- 4. BOM RULES CHO CỬA LÙA (code chứa SLID hoặc DL)
-- =====================================================
INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 2, 2, 1
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'SLID%' OR pt.code LIKE 'DL%')
  AND ap.code = 'XF93_KB_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W', 2, 2, 2
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'SLID%' OR pt.code LIKE 'DL%')
  AND ap.code = 'XF93_KB_NGANG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 4, 2, 3
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'SLID%' OR pt.code LIKE 'DL%')
  AND ap.code = 'XF93_CD_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W/2', 4, 2, 4
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'SLID%' OR pt.code LIKE 'DL%')
  AND ap.code = 'XF93_CD_NGANG';

-- =====================================================
-- 5. BOM RULES CHO CỬA SỔ (code chứa WIN hoặc CS)
-- =====================================================
INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 2, 2, 1
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'WIN%' OR pt.code LIKE 'CS%') AND pt.product_type = 'window'
  AND ap.code = 'XF55_KB_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W', 2, 2, 2
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'WIN%' OR pt.code LIKE 'CS%') AND pt.product_type = 'window'
  AND ap.code = 'XF55_KB_NGANG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 2, 2, 3
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'WIN%' OR pt.code LIKE 'CS%') AND pt.product_type = 'window'
  AND ap.code = 'XF55_CD_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W', 2, 2, 4
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'WIN%' OR pt.code LIKE 'CS%') AND pt.product_type = 'window'
  AND ap.code = 'XF55_CD_NGANG';

-- =====================================================
-- 6. BOM RULES CHO VÁCH KÍNH (code chứa FIXED hoặc PARTITION hoặc VCS)
-- =====================================================
INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'H', 2, 2, 1
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'FIXED%' OR pt.code LIKE 'PARTITION%' OR pt.code LIKE 'VCS%')
  AND ap.code = 'XF55_KB_DUNG';

INSERT INTO atc_product_bom_profiles (product_template_id, profile_id, formula, quantity, waste_percent, sort_order)
SELECT pt.id, ap.id, 'W', 2, 2, 2
FROM product_templates pt, atc_aluminum_profiles ap
WHERE (pt.code LIKE 'FIXED%' OR pt.code LIKE 'PARTITION%' OR pt.code LIKE 'VCS%')
  AND ap.code = 'XF55_KB_NGANG';

-- =====================================================
-- 7. ACCESSORY RULES
-- =====================================================
INSERT INTO atc_product_accessory_rules (product_type, accessory_id, quantity_rule, default_qty, notes)
SELECT 'door', id, '3_per_leaf', 3, 'Bản lề 3D cho mỗi cánh'
FROM accessories WHERE code = 'PK-002' LIMIT 1;

INSERT INTO atc_product_accessory_rules (product_type, accessory_id, quantity_rule, default_qty, notes)
SELECT 'door', id, '1_per_door', 1, 'Khóa tay gạt'
FROM accessories WHERE code = 'PK-001' LIMIT 1;

INSERT INTO atc_product_accessory_rules (product_type, accessory_id, quantity_rule, default_qty, notes)
SELECT 'door', id, '1_per_leaf', 1, 'Tay nắm'
FROM accessories WHERE code = 'PK-003' LIMIT 1;

INSERT INTO atc_product_accessory_rules (product_type, accessory_id, quantity_rule, default_qty, notes)
SELECT 'door', id, 'per_meter:1', 0, 'Gioăng cao su (tính theo chu vi)'
FROM accessories WHERE code = 'PK-004' LIMIT 1;

INSERT INTO atc_product_accessory_rules (product_type, accessory_id, quantity_rule, default_qty, notes)
SELECT 'door', id, 'fixed:2', 2, 'Keo silicone'
FROM accessories WHERE code = 'PK-005' LIMIT 1;

INSERT INTO atc_product_accessory_rules (product_type, accessory_id, quantity_rule, default_qty, notes)
SELECT 'window', id, '2_per_leaf', 2, 'Bản lề cửa sổ'
FROM accessories WHERE code = 'VW-H-002' LIMIT 1;

INSERT INTO atc_product_accessory_rules (product_type, accessory_id, quantity_rule, default_qty, notes)
SELECT 'window', id, '1_per_leaf', 1, 'Chốt gió'
FROM accessories WHERE code = 'VW-A-003' LIMIT 1;

-- =====================================================
-- KIỂM TRA KẾT QUẢ
-- =====================================================
SELECT 'BOM Profiles Rules:' as info, COUNT(*) as total FROM atc_product_bom_profiles;
SELECT 'Accessory Rules:' as info, COUNT(*) as total FROM atc_product_accessory_rules;

-- Chi tiết BOM rules theo template
SELECT 
  pt.code as template_code,
  pt.name as template_name,
  ap.code as profile_code,
  ap.name as profile_name,
  pbp.formula,
  pbp.quantity,
  ap.price_per_m
FROM atc_product_bom_profiles pbp
JOIN product_templates pt ON pt.id = pbp.product_template_id
JOIN atc_aluminum_profiles ap ON ap.id = pbp.profile_id
ORDER BY pt.code, pbp.sort_order
LIMIT 20;

SELECT 'Done! BOM rules added successfully!' as result;
