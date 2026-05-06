-- =====================================================
-- SAMPLE RULES & DATA
-- ACT Style Architecture v2.0
-- =====================================================

-- =====================================================
-- 1. RULES CẤP 1: Theo item_type
-- =====================================================

-- DOOR RULES (Cửa đi)
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('door', 'structure', 'FRAME_VERTICAL', 'Khung bao đứng', 'H', '{"position":"frame_left,frame_right","direction":"vertical"}', 1, 1),
('door', 'structure', 'FRAME_HORIZONTAL', 'Khung bao ngang', 'W', '{"position":"frame_top,frame_bottom","direction":"horizontal"}', 1, 2),
('door', 'structure', 'SASH_VERTICAL', 'Cánh đứng', 'H-100', '{"position":"sash_left,sash_right","direction":"vertical","per_leaf":true}', 1, 3),
('door', 'structure', 'SASH_HORIZONTAL', 'Cánh ngang', '(W/leaf_count)-50', '{"position":"sash_top,sash_bottom","direction":"horizontal","per_leaf":true}', 1, 4),
('door', 'bom', 'GLASS_MAIN', 'Kính cánh', '(W/leaf_count-80)*(H-150)', '{"position":"sash"}', 1, 1),
('door', 'bom', 'HINGE_3D', 'Bản lề 3D', '3*leaf_count', '{"unit":"pcs"}', 1, 1),
('door', 'bom', 'LOCK_MULTIPOINT', 'Khóa đa điểm', '1', '{"unit":"set"}', 1, 2),
('door', 'bom', 'HANDLE', 'Tay nắm', 'leaf_count', '{"unit":"pcs"}', 1, 3),
('door', 'bom', 'GASKET_FRAME', 'Gioăng khung', 'perimeter*2', '{"unit":"m"}', 1, 4),
('door', 'bom', 'SEALANT', 'Keo silicone', 'perimeter', '{"unit":"m"}', 1, 5)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);

-- WINDOW RULES (Cửa sổ)
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('window', 'structure', 'FRAME_VERTICAL', 'Khung bao đứng', 'H', '{"position":"frame_left,frame_right","direction":"vertical"}', 1, 1),
('window', 'structure', 'FRAME_HORIZONTAL', 'Khung bao ngang', 'W', '{"position":"frame_top,frame_bottom","direction":"horizontal"}', 1, 2),
('window', 'structure', 'SASH_VERTICAL', 'Cánh đứng', 'H-80', '{"position":"sash_left,sash_right","direction":"vertical","per_leaf":true}', 1, 3),
('window', 'structure', 'SASH_HORIZONTAL', 'Cánh ngang', '(W/leaf_count)-40', '{"position":"sash_top,sash_bottom","direction":"horizontal","per_leaf":true}', 1, 4),
('window', 'bom', 'GLASS_MAIN', 'Kính cánh', '(W/leaf_count-60)*(H-120)', '{"position":"sash"}', 1, 1),
('window', 'bom', 'HINGE_WINDOW', 'Bản lề cửa sổ', '2*leaf_count', '{"unit":"pcs"}', 1, 1),
('window', 'bom', 'STAY_ARM', 'Chốt gió', 'leaf_count', '{"unit":"pcs"}', 1, 2),
('window', 'bom', 'GASKET', 'Gioăng', 'perimeter*1.5', '{"unit":"m"}', 1, 3)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);

-- RAILING RULES (Lan can)
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('railing', 'structure', 'POST', 'Trụ đứng', 'H', '{"position":"post","direction":"vertical"}', 1, 1),
('railing', 'structure', 'HANDRAIL', 'Tay vịn', 'L', '{"position":"handrail","direction":"horizontal"}', 1, 2),
('railing', 'structure', 'RAIL_TOP', 'Thanh ray trên', 'L', '{"position":"rail","direction":"horizontal"}', 1, 3),
('railing', 'structure', 'RAIL_BOTTOM', 'Thanh ray dưới', 'L', '{"position":"rail","direction":"horizontal"}', 1, 4),
('railing', 'bom', 'GLASS_PANEL', 'Kính lan can', '(L/span_count)*(H-200)', '{"position":"railing"}', 1, 1),
('railing', 'bom', 'POST_CAP', 'Nắp trụ', 'span_count+1', '{"unit":"pcs"}', 1, 1),
('railing', 'bom', 'GLASS_CLAMP', 'Kẹp kính', '(L/200)*2', '{"unit":"pcs"}', 1, 2)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);

-- GLASS_PARTITION RULES (Vách kính)
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('glass_partition', 'structure', 'FRAME_VERTICAL', 'Khung đứng', 'H', '{"position":"frame_left,frame_right","direction":"vertical"}', 1, 1),
('glass_partition', 'structure', 'FRAME_HORIZONTAL', 'Khung ngang', 'W', '{"position":"frame_top,frame_bottom","direction":"horizontal"}', 1, 2),
('glass_partition', 'structure', 'MULLION', 'Đố giữa', 'H', '{"position":"mullion","direction":"vertical"}', 1, 3),
('glass_partition', 'bom', 'GLASS_FIXED', 'Kính fix', '(W-100)*(H-100)', '{"position":"fixed"}', 1, 1),
('glass_partition', 'bom', 'U_CHANNEL', 'Thanh U', 'perimeter', '{"unit":"m"}', 1, 1)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);

-- GLASS_ROOF RULES (Mái kính)
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('glass_roof', 'structure', 'RAFTER', 'Xà dọc', 'L/cos(slope)', '{"position":"rafter","direction":"inclined"}', 1, 1),
('glass_roof', 'structure', 'PURLIN', 'Xà ngang', 'W', '{"position":"purlin","direction":"horizontal"}', 1, 2),
('glass_roof', 'bom', 'GLASS_ROOF', 'Kính mái', '(W-100)*(L/cos(slope)-100)', '{"position":"roof"}', 1, 1),
('glass_roof', 'bom', 'WEATHER_SEAL', 'Gioăng chống nước', '2*(W+L)', '{"unit":"m"}', 1, 1),
('glass_roof', 'bom', 'GLASS_CLIP', 'Kẹp kính mái', '(W*L)/500', '{"unit":"pcs"}', 1, 2)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);

-- STAIR RULES (Cầu thang)
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('stair', 'structure', 'STRINGER', 'Thanh dầm', 'sqrt(H^2+L^2)', '{"position":"frame_left,frame_right","direction":"inclined"}', 1, 1),
('stair', 'structure', 'HANDRAIL', 'Tay vịn', 'sqrt(H^2+L^2)', '{"position":"handrail","direction":"inclined"}', 1, 2),
('stair', 'bom', 'GLASS_BALUSTRADE', 'Kính lan can cầu thang', 'sqrt(H^2+L^2)*handrail_height', '{"position":"railing"}', 1, 1),
('stair', 'bom', 'STANDOFF', 'Chân đế inox', 'sqrt(H^2+L^2)/200', '{"unit":"pcs"}', 1, 1)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);


-- =====================================================
-- 2. RULES CẤP 2: Override theo hệ nhôm
-- =====================================================

-- XINGFA_55 overrides cho DOOR
INSERT INTO item_type_system_rules (item_type, aluminum_system, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('door', 'XINGFA_55', 'structure', 'FRAME_VERTICAL', 'Khung bao đứng XF55', 'H', '{"profile_code":"XF55_KB_DUNG","position":"frame_left,frame_right"}', 10, 1),
('door', 'XINGFA_55', 'structure', 'FRAME_HORIZONTAL', 'Khung bao ngang XF55', 'W', '{"profile_code":"XF55_KB_NGANG","position":"frame_top,frame_bottom"}', 10, 2),
('door', 'XINGFA_55', 'structure', 'SASH_VERTICAL', 'Cánh đứng XF55', 'H-97', '{"profile_code":"XF55_CD_DUNG","position":"sash_left,sash_right"}', 10, 3),
('door', 'XINGFA_55', 'structure', 'SASH_HORIZONTAL', 'Cánh ngang XF55', '(W/leaf_count)-47', '{"profile_code":"XF55_CD_NGANG","position":"sash_top,sash_bottom"}', 10, 4),
('door', 'XINGFA_55', 'bom', 'GLASS_DEDUCTION', 'Giảm trừ kính XF55', '80', '{"width_deduct":40,"height_deduct":40}', 10, 1)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);

-- XINGFA_93 overrides cho DOOR (cửa lùa)
INSERT INTO item_type_system_rules (item_type, aluminum_system, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('door', 'XINGFA_93', 'structure', 'FRAME_VERTICAL', 'Khung bao đứng XF93', 'H', '{"profile_code":"XF93_KB_DUNG","position":"frame_left,frame_right"}', 10, 1),
('door', 'XINGFA_93', 'structure', 'FRAME_HORIZONTAL', 'Khung bao ngang XF93', 'W', '{"profile_code":"XF93_KB_NGANG","position":"frame_top,frame_bottom"}', 10, 2),
('door', 'XINGFA_93', 'structure', 'SASH_VERTICAL', 'Cánh đứng XF93', 'H-105', '{"profile_code":"XF93_CD_DUNG","position":"sash_left,sash_right"}', 10, 3),
('door', 'XINGFA_93', 'structure', 'SASH_HORIZONTAL', 'Cánh ngang XF93', '(W/leaf_count)-55', '{"profile_code":"XF93_CD_NGANG","position":"sash_top,sash_bottom"}', 10, 4),
('door', 'XINGFA_93', 'bom', 'GLASS_DEDUCTION', 'Giảm trừ kính XF93', '100', '{"width_deduct":50,"height_deduct":50}', 10, 1),
('door', 'XINGFA_93', 'bom', 'ROLLER', 'Bánh xe cửa lùa', '2*leaf_count', '{"unit":"pcs"}', 10, 2)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);

-- PMA overrides cho DOOR
INSERT INTO item_type_system_rules (item_type, aluminum_system, rule_category, rule_code, rule_name, formula, parameters, priority, sort_order) VALUES
('door', 'PMA', 'structure', 'FRAME_VERTICAL', 'Khung bao đứng PMA', 'H', '{"profile_code":"PMA_KB_DUNG","position":"frame_left,frame_right"}', 10, 1),
('door', 'PMA', 'structure', 'SASH_VERTICAL', 'Cánh đứng PMA', 'H-95', '{"profile_code":"PMA_CD_DUNG","position":"sash_left,sash_right"}', 10, 3),
('door', 'PMA', 'bom', 'GLASS_DEDUCTION', 'Giảm trừ kính PMA', '85', '{"width_deduct":42,"height_deduct":43}', 10, 1)
ON DUPLICATE KEY UPDATE formula = VALUES(formula);


-- =====================================================
-- 3. VERIFICATION
-- =====================================================
SELECT 'Item Type Rules:' as info, COUNT(*) as count FROM item_type_rules;
SELECT 'System Override Rules:' as info, COUNT(*) as count FROM item_type_system_rules;

SELECT item_type, rule_category, COUNT(*) as rules 
FROM item_type_rules 
GROUP BY item_type, rule_category
ORDER BY item_type, rule_category;

SELECT '✅ Sample rules inserted successfully!' as result;
