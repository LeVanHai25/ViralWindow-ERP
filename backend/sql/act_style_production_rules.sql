-- =====================================================
-- ACT STYLE V2 - PRODUCTION RULES
-- Rules đầy đủ cho tất cả loại sản phẩm và hệ nhôm
-- =====================================================

-- =====================================================
-- 1. DOOR RULES - Cửa đi
-- =====================================================

-- Structure rules
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('door', 'structure', 'FRAME_TOP', 'Khung bao ngang trên', 'W', '{"position":"frame_top","direction":"horizontal","profile_code":"XF55_KB100"}', 0, 1, 1),
('door', 'structure', 'FRAME_BOTTOM', 'Khung bao ngang dưới', 'W', '{"position":"frame_bottom","direction":"horizontal","profile_code":"XF55_KB100"}', 0, 1, 2),
('door', 'structure', 'FRAME_SIDES', 'Khung bao đứng', 'H-50', '{"position":"frame_left,frame_right","direction":"vertical","profile_code":"XF55_KB100"}', 0, 1, 3),
('door', 'structure', 'SASH_TOP', 'Cánh ngang trên', 'W/leaf_count-50', '{"position":"sash_top","direction":"horizontal","per_leaf":true,"profile_code":"XF55_CANH"}', 0, 1, 4),
('door', 'structure', 'SASH_BOTTOM', 'Cánh ngang dưới', 'W/leaf_count-50', '{"position":"sash_bottom","direction":"horizontal","per_leaf":true,"profile_code":"XF55_CANH"}', 0, 1, 5),
('door', 'structure', 'SASH_SIDES', 'Cánh đứng', 'H-100', '{"position":"sash_left,sash_right","direction":"vertical","per_leaf":true,"profile_code":"XF55_CANH"}', 0, 1, 6)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- BOM rules
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('door', 'bom', 'GLASS_PANEL', 'Kính cánh', '(W/leaf_count-80)*(H-150)/1000000', '{"unit":"m2","position":"sash","width_deduct":80,"height_deduct":150}', 0, 1, 1),
('door', 'bom', 'HINGE', 'Bản lề', 'leaf_count*3', '{"unit":"pcs"}', 0, 1, 2),
('door', 'bom', 'LOCK', 'Khóa cửa', 'leaf_count', '{"unit":"pcs"}', 0, 1, 3),
('door', 'bom', 'HANDLE', 'Tay nắm', 'leaf_count', '{"unit":"set"}', 0, 1, 4),
('door', 'bom', 'GASKET_FRAME', 'Gioăng khung', 'perimeter', '{"unit":"m"}', 0, 1, 5),
('door', 'bom', 'GASKET_SASH', 'Gioăng cánh', 'perimeter*leaf_count', '{"unit":"m"}', 0, 1, 6),
('door', 'bom', 'SILICONE', 'Keo silicone', 'perimeter*0.5', '{"unit":"m"}', 0, 1, 7)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- =====================================================
-- 2. WINDOW RULES - Cửa sổ
-- =====================================================

INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('window', 'structure', 'FRAME_TOP', 'Khung bao ngang trên', 'W', '{"position":"frame_top","direction":"horizontal","profile_code":"XF55_KB65"}', 0, 1, 1),
('window', 'structure', 'FRAME_BOTTOM', 'Khung bao ngang dưới', 'W', '{"position":"frame_bottom","direction":"horizontal","profile_code":"XF55_KB65"}', 0, 1, 2),
('window', 'structure', 'FRAME_SIDES', 'Khung bao đứng', 'H-40', '{"position":"frame_left,frame_right","direction":"vertical","profile_code":"XF55_KB65"}', 0, 1, 3),
('window', 'structure', 'SASH_HORIZONTAL', 'Cánh ngang', 'W/leaf_count-40', '{"position":"sash_top,sash_bottom","direction":"horizontal","per_leaf":true}', 0, 1, 4),
('window', 'structure', 'SASH_VERTICAL', 'Cánh đứng', 'H-80', '{"position":"sash_left,sash_right","direction":"vertical","per_leaf":true}', 0, 1, 5),
('window', 'bom', 'GLASS_PANEL', 'Kính cánh', '(W/leaf_count-60)*(H-100)/1000000', '{"unit":"m2","position":"sash","width_deduct":60,"height_deduct":100}', 0, 1, 1),
('window', 'bom', 'STAY_ARM', 'Tay chống', 'leaf_count*2', '{"unit":"pcs"}', 0, 1, 2),
('window', 'bom', 'LOCK_WINDOW', 'Khóa cửa sổ', 'leaf_count', '{"unit":"pcs"}', 0, 1, 3),
('window', 'bom', 'GASKET', 'Gioăng', 'perimeter*2', '{"unit":"m"}', 0, 1, 4)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- =====================================================
-- 3. RAILING RULES - Lan can
-- =====================================================

INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('railing', 'structure', 'HANDRAIL', 'Tay vịn', 'L', '{"position":"handrail","direction":"horizontal","profile_code":"LC_TAY_VIN"}', 0, 1, 1),
('railing', 'structure', 'TOP_RAIL', 'Thanh ngang trên', 'L', '{"position":"rail","direction":"horizontal","profile_code":"LC_NGANG"}', 0, 1, 2),
('railing', 'structure', 'BOTTOM_RAIL', 'Thanh ngang dưới', 'L', '{"position":"rail","direction":"horizontal","profile_code":"LC_NGANG"}', 0, 1, 3),
('railing', 'structure', 'POSTS', 'Trụ đứng', 'handrail_height', '{"position":"post","direction":"vertical","qty_formula":"span_count+1","profile_code":"LC_TRU"}', 0, 1, 4),
('railing', 'bom', 'GLASS_PANEL', 'Kính lan can', 'L*handrail_height/1000000', '{"unit":"m2","position":"railing"}', 0, 1, 1),
('railing', 'bom', 'POST_CAP', 'Nắp trụ', 'span_count+1', '{"unit":"pcs"}', 0, 1, 2),
('railing', 'bom', 'GLASS_CLAMP', 'Kẹp kính', '(span_count+1)*4', '{"unit":"pcs"}', 0, 1, 3),
('railing', 'bom', 'STANDOFF', 'Chân đế', '(span_count+1)*2', '{"unit":"pcs"}', 0, 1, 4),
('railing', 'bom', 'GASKET_RAIL', 'Gioăng lan can', 'L*2', '{"unit":"m"}', 0, 1, 5)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- =====================================================
-- 4. GLASS PARTITION RULES - Vách kính
-- =====================================================

INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('glass_partition', 'structure', 'FRAME_TOP', 'Thanh ngang trên', 'W', '{"position":"frame_top","direction":"horizontal","profile_code":"VK_NGANG"}', 0, 1, 1),
('glass_partition', 'structure', 'FRAME_BOTTOM', 'Thanh ngang dưới', 'W', '{"position":"frame_bottom","direction":"horizontal","profile_code":"VK_NGANG"}', 0, 1, 2),
('glass_partition', 'structure', 'MULLION', 'Đố đứng', 'H', '{"position":"mullion","direction":"vertical","qty_formula":"span_count-1","profile_code":"VK_DUNG"}', 0, 1, 3),
('glass_partition', 'bom', 'GLASS_PANEL', 'Kính vách', 'W*H/1000000', '{"unit":"m2","position":"panel"}', 0, 1, 1),
('glass_partition', 'bom', 'SILICONE_STRUCT', 'Keo kết cấu', 'perimeter*2', '{"unit":"m"}', 0, 1, 2),
('glass_partition', 'bom', 'GASKET_VK', 'Gioăng vách', 'perimeter*2', '{"unit":"m"}', 0, 1, 3)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- =====================================================
-- 5. GLASS ROOF RULES - Mái kính
-- =====================================================

INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('glass_roof', 'structure', 'PURLIN', 'Xà gồ', 'W', '{"position":"purlin","direction":"horizontal","profile_code":"MK_XA_GO"}', 0, 1, 1),
('glass_roof', 'structure', 'RAFTER', 'Xà ngang', 'L/cos(slope*3.14159/180)', '{"position":"rafter","direction":"inclined","qty_formula":"rafter_count","profile_code":"MK_XA_NGANG"}', 0, 1, 2),
('glass_roof', 'bom', 'GLASS_ROOF', 'Kính mái', 'W*L/1000000', '{"unit":"m2","position":"roof"}', 0, 1, 1),
('glass_roof', 'bom', 'SILICONE_WEATHER', 'Keo chống thấm', 'perimeter*3', '{"unit":"m"}', 0, 1, 2),
('glass_roof', 'bom', 'GASKET_ROOF', 'Gioăng mái', '(W+L)*2', '{"unit":"m"}', 0, 1, 3)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- =====================================================
-- 6. STAIR RULES - Cầu thang
-- =====================================================

INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('stair', 'structure', 'HANDRAIL', 'Tay vịn', 'L', '{"position":"handrail","direction":"inclined","profile_code":"CT_TAY_VIN"}', 0, 1, 1),
('stair', 'structure', 'STRINGER', 'Thanh đỡ', 'L/cos(slope*3.14159/180)', '{"position":"rail","direction":"inclined","profile_code":"CT_DO"}', 0, 1, 2),
('stair', 'bom', 'GLASS_STAIR', 'Kính cầu thang', 'L*handrail_height/1000000', '{"unit":"m2","position":"railing"}', 0, 1, 1),
('stair', 'bom', 'BRACKET', 'Giá đỡ', 'L/500', '{"unit":"pcs"}', 0, 1, 2)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- =====================================================
-- 7. SYSTEM OVERRIDE RULES - XINGFA 55
-- =====================================================

INSERT INTO item_type_system_rules (item_type, aluminum_system, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('door', 'XINGFA_55', 'structure', 'FRAME_SIDES', 'Khung bao XF55', 'H-55', '{"position":"frame_left,frame_right","direction":"vertical","profile_code":"XF55_KB100","weight_per_m":0.98}', 10, 1, 1),
('door', 'XINGFA_55', 'bom', 'GLASS_DEDUCTION', 'Trừ kính XF55', '1', '{"width_deduct":85,"height_deduct":160}', 10, 1, 1),
('window', 'XINGFA_55', 'structure', 'FRAME_SIDES', 'Khung bao XF55', 'H-45', '{"position":"frame_left,frame_right","direction":"vertical","profile_code":"XF55_KB65","weight_per_m":0.65}', 10, 1, 1)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- =====================================================
-- 8. SYSTEM OVERRIDE RULES - XINGFA 93
-- =====================================================

INSERT INTO item_type_system_rules (item_type, aluminum_system, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('door', 'XINGFA_93', 'structure', 'FRAME_SIDES', 'Khung bao XF93', 'H-93', '{"position":"frame_left,frame_right","direction":"vertical","profile_code":"XF93_KB140","weight_per_m":1.45}', 10, 1, 1),
('door', 'XINGFA_93', 'bom', 'GLASS_DEDUCTION', 'Trừ kính XF93', '1', '{"width_deduct":120,"height_deduct":200}', 10, 1, 1)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

-- =====================================================
-- 9. SYSTEM OVERRIDE RULES - PMA
-- =====================================================

INSERT INTO item_type_system_rules (item_type, aluminum_system, rule_category, rule_code, rule_name, formula, parameters, priority, is_active, sort_order) VALUES
('door', 'PMA', 'structure', 'FRAME_SIDES', 'Khung bao PMA', 'H-50', '{"position":"frame_left,frame_right","direction":"vertical","profile_code":"PMA_KB65","weight_per_m":0.72}', 10, 1, 1),
('door', 'PMA', 'bom', 'GLASS_DEDUCTION', 'Trừ kính PMA', '1', '{"width_deduct":70,"height_deduct":140}', 10, 1, 1)
ON DUPLICATE KEY UPDATE formula = VALUES(formula), parameters = VALUES(parameters);

SELECT 'Production rules inserted successfully!' as result;
SELECT item_type, COUNT(*) as rules_count FROM item_type_rules GROUP BY item_type;
