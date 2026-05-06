-- =====================================================
-- PHASE 1: ĐÓNG BĂNG DỮ LIỆU LEGACY
-- =====================================================

-- 1.1 Thêm cột is_legacy vào các bảng cũ
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS is_legacy TINYINT(1) DEFAULT 0;
ALTER TABLE door_designs ADD COLUMN IF NOT EXISTS is_legacy TINYINT(1) DEFAULT 0;
ALTER TABLE bom_items ADD COLUMN IF NOT EXISTS is_legacy TINYINT(1) DEFAULT 0;

-- 1.2 Đánh dấu tất cả dữ liệu cũ là legacy
UPDATE product_templates SET is_legacy = 1 WHERE is_legacy = 0;
UPDATE door_designs SET is_legacy = 1 WHERE is_legacy = 0;
UPDATE bom_items SET is_legacy = 1 WHERE is_legacy = 0;

-- =====================================================
-- PHASE 2: TẠO HỆ NHÔM VW-AL55
-- =====================================================

-- 2.1 Thêm hệ nhôm mới VW-AL55
INSERT INTO aluminum_systems (code, name, density_kg_m, frame_width_mm, price_per_kg, description, is_active)
VALUES ('VW-AL55', 'Viral Window AL55', 2.7, 55, 90000, 'Hệ nhôm cửa mở quay tiêu chuẩn Viral Window', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1;

-- 2.2 Thêm các profile cơ bản cho VW-AL55
-- Khung bao
INSERT INTO aluminum_profiles (code, name, system_id, profile_type, weight_per_meter, description)
SELECT 'VW55-FRAME-V', 'Khung bao đứng VW55', id, 'frame_vertical', 0.85, 'Thanh khung bao đứng'
FROM aluminum_systems WHERE code = 'VW-AL55'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO aluminum_profiles (code, name, system_id, profile_type, weight_per_meter, description)
SELECT 'VW55-FRAME-H', 'Khung bao ngang VW55', id, 'frame_horizontal', 0.85, 'Thanh khung bao ngang'
FROM aluminum_systems WHERE code = 'VW-AL55'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Cánh cửa
INSERT INTO aluminum_profiles (code, name, system_id, profile_type, weight_per_meter, description)
SELECT 'VW55-SASH-V', 'Cánh đứng VW55', id, 'sash_vertical', 0.75, 'Thanh cánh đứng'
FROM aluminum_systems WHERE code = 'VW-AL55'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO aluminum_profiles (code, name, system_id, profile_type, weight_per_meter, description)
SELECT 'VW55-SASH-H', 'Cánh ngang VW55', id, 'sash_horizontal', 0.75, 'Thanh cánh ngang'
FROM aluminum_systems WHERE code = 'VW-AL55'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Đố
INSERT INTO aluminum_profiles (code, name, system_id, profile_type, weight_per_meter, description)
SELECT 'VW55-MULL-V', 'Đố đứng VW55', id, 'mullion_vertical', 0.65, 'Thanh đố đứng'
FROM aluminum_systems WHERE code = 'VW-AL55'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO aluminum_profiles (code, name, system_id, profile_type, weight_per_meter, description)
SELECT 'VW55-MULL-H', 'Đố ngang VW55', id, 'mullion_horizontal', 0.65, 'Thanh đố ngang'
FROM aluminum_systems WHERE code = 'VW-AL55'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Nẹp kính
INSERT INTO aluminum_profiles (code, name, system_id, profile_type, weight_per_meter, description)
SELECT 'VW55-BEAD', 'Nẹp kính VW55', id, 'glass_bead', 0.25, 'Nẹp giữ kính'
FROM aluminum_systems WHERE code = 'VW-AL55'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Thanh giữa (IMPost)
INSERT INTO aluminum_profiles (code, name, system_id, profile_type, weight_per_meter, description)
SELECT 'VW55-IMPOST', 'Thanh giữa VW55', id, 'impost', 0.80, 'Thanh giữa nối 2 cánh'
FROM aluminum_systems WHERE code = 'VW-AL55'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =====================================================
-- PHASE 3: TẠO STRUCTURE TEMPLATES CHO SẢN PHẨM LÕI
-- =====================================================

-- 3.1 Cửa đi 1 cánh mở quay trái
INSERT INTO item_structure_templates (
    template_code, 
    template_name, 
    item_type, 
    aluminum_system,
    default_width_mm,
    default_height_mm,
    structure_json,
    bom_rules_json,
    is_active
) VALUES (
    'VWDOOR_1L',
    'Cửa đi 1 cánh mở trái VW55',
    'door',
    'VW-AL55',
    900,
    2200,
    '{
        "type": "single_leaf",
        "direction": "left",
        "panels": [
            {"id": "K1", "role": "sash", "openType": "turn-left"}
        ]
    }',
    '{
        "aluminum": [
            {"profile": "VW55-FRAME-V", "qty": 2, "formula": "H"},
            {"profile": "VW55-FRAME-H", "qty": 2, "formula": "W - 110"},
            {"profile": "VW55-SASH-V", "qty": 2, "formula": "H - 55"},
            {"profile": "VW55-SASH-H", "qty": 2, "formula": "W - 165"},
            {"profile": "VW55-BEAD", "qty": 4, "formula": "PERIMETER * 0.9"}
        ],
        "glass": [
            {"type": "tempered", "thickness": 8, "formula": {"width": "W - 135", "height": "H - 155"}}
        ],
        "hardware": [
            {"code": "HINGE-3D", "name": "Bản lề 3D", "qty": 3, "unit": "bộ"},
            {"code": "HANDLE-LEVER", "name": "Tay nắm gạt", "qty": 1, "unit": "bộ"},
            {"code": "LOCK-EURO", "name": "Khóa đa điểm", "qty": 1, "unit": "bộ"}
        ],
        "consumables": [
            {"code": "GASKET-EPDM", "name": "Gioăng EPDM", "formula": "PERIMETER * 2"},
            {"code": "SEALANT-SIL", "name": "Keo silicone", "qty": 1, "unit": "tuýp"}
        ]
    }',
    1
) ON DUPLICATE KEY UPDATE 
    template_name = VALUES(template_name),
    structure_json = VALUES(structure_json),
    bom_rules_json = VALUES(bom_rules_json);

-- 3.2 Cửa đi 1 cánh mở quay phải
INSERT INTO item_structure_templates (
    template_code, 
    template_name, 
    item_type, 
    aluminum_system,
    default_width_mm,
    default_height_mm,
    structure_json,
    bom_rules_json,
    is_active
) VALUES (
    'VWDOOR_1R',
    'Cửa đi 1 cánh mở phải VW55',
    'door',
    'VW-AL55',
    900,
    2200,
    '{
        "type": "single_leaf",
        "direction": "right",
        "panels": [
            {"id": "K1", "role": "sash", "openType": "turn-right"}
        ]
    }',
    '{
        "aluminum": [
            {"profile": "VW55-FRAME-V", "qty": 2, "formula": "H"},
            {"profile": "VW55-FRAME-H", "qty": 2, "formula": "W - 110"},
            {"profile": "VW55-SASH-V", "qty": 2, "formula": "H - 55"},
            {"profile": "VW55-SASH-H", "qty": 2, "formula": "W - 165"},
            {"profile": "VW55-BEAD", "qty": 4, "formula": "PERIMETER * 0.9"}
        ],
        "glass": [
            {"type": "tempered", "thickness": 8, "formula": {"width": "W - 135", "height": "H - 155"}}
        ],
        "hardware": [
            {"code": "HINGE-3D", "name": "Bản lề 3D", "qty": 3, "unit": "bộ"},
            {"code": "HANDLE-LEVER", "name": "Tay nắm gạt", "qty": 1, "unit": "bộ"},
            {"code": "LOCK-EURO", "name": "Khóa đa điểm", "qty": 1, "unit": "bộ"}
        ],
        "consumables": [
            {"code": "GASKET-EPDM", "name": "Gioăng EPDM", "formula": "PERIMETER * 2"},
            {"code": "SEALANT-SIL", "name": "Keo silicone", "qty": 1, "unit": "tuýp"}
        ]
    }',
    1
) ON DUPLICATE KEY UPDATE 
    template_name = VALUES(template_name),
    structure_json = VALUES(structure_json),
    bom_rules_json = VALUES(bom_rules_json);

-- 3.3 Cửa đi 2 cánh mở quay
INSERT INTO item_structure_templates (
    template_code, 
    template_name, 
    item_type, 
    aluminum_system,
    default_width_mm,
    default_height_mm,
    structure_json,
    bom_rules_json,
    is_active
) VALUES (
    'VWDOOR_2LR',
    'Cửa đi 2 cánh mở quay VW55',
    'door',
    'VW-AL55',
    1600,
    2200,
    '{
        "type": "double_leaf",
        "panels": [
            {"id": "K1", "role": "sash", "openType": "turn-left", "ratio": 0.5},
            {"id": "K2", "role": "sash", "openType": "turn-right", "ratio": 0.5}
        ]
    }',
    '{
        "aluminum": [
            {"profile": "VW55-FRAME-V", "qty": 2, "formula": "H"},
            {"profile": "VW55-FRAME-H", "qty": 2, "formula": "W - 110"},
            {"profile": "VW55-IMPOST", "qty": 1, "formula": "H - 110"},
            {"profile": "VW55-SASH-V", "qty": 4, "formula": "H - 55"},
            {"profile": "VW55-SASH-H", "qty": 4, "formula": "(W/2) - 82.5"},
            {"profile": "VW55-BEAD", "qty": 8, "formula": "PERIMETER * 0.45"}
        ],
        "glass": [
            {"type": "tempered", "thickness": 8, "formula": {"width": "(W/2) - 90", "height": "H - 155"}, "qty": 2}
        ],
        "hardware": [
            {"code": "HINGE-3D", "name": "Bản lề 3D", "qty": 6, "unit": "bộ"},
            {"code": "HANDLE-LEVER", "name": "Tay nắm gạt", "qty": 2, "unit": "bộ"},
            {"code": "LOCK-EURO", "name": "Khóa đa điểm", "qty": 1, "unit": "bộ"},
            {"code": "CREMONE", "name": "Chốt cremone", "qty": 1, "unit": "bộ"}
        ],
        "consumables": [
            {"code": "GASKET-EPDM", "name": "Gioăng EPDM", "formula": "PERIMETER * 3"},
            {"code": "SEALANT-SIL", "name": "Keo silicone", "qty": 2, "unit": "tuýp"}
        ]
    }',
    1
) ON DUPLICATE KEY UPDATE 
    template_name = VALUES(template_name),
    structure_json = VALUES(structure_json),
    bom_rules_json = VALUES(bom_rules_json);

-- 3.4 Cửa sổ 1 cánh mở quay
INSERT INTO item_structure_templates (
    template_code, 
    template_name, 
    item_type, 
    aluminum_system,
    default_width_mm,
    default_height_mm,
    structure_json,
    bom_rules_json,
    is_active
) VALUES (
    'VWWIN_1L',
    'Cửa sổ 1 cánh mở trái VW55',
    'window',
    'VW-AL55',
    800,
    1200,
    '{
        "type": "single_leaf",
        "direction": "left",
        "panels": [
            {"id": "K1", "role": "sash", "openType": "turn-left"}
        ]
    }',
    '{
        "aluminum": [
            {"profile": "VW55-FRAME-V", "qty": 2, "formula": "H"},
            {"profile": "VW55-FRAME-H", "qty": 2, "formula": "W - 110"},
            {"profile": "VW55-SASH-V", "qty": 2, "formula": "H - 55"},
            {"profile": "VW55-SASH-H", "qty": 2, "formula": "W - 165"},
            {"profile": "VW55-BEAD", "qty": 4, "formula": "PERIMETER * 0.8"}
        ],
        "glass": [
            {"type": "tempered", "thickness": 6, "formula": {"width": "W - 135", "height": "H - 155"}}
        ],
        "hardware": [
            {"code": "HINGE-FRICTION", "name": "Bản lề ma sát", "qty": 2, "unit": "bộ"},
            {"code": "HANDLE-WIN", "name": "Tay nắm cửa sổ", "qty": 1, "unit": "bộ"},
            {"code": "STAY-ARM", "name": "Thanh giữ", "qty": 1, "unit": "bộ"}
        ],
        "consumables": [
            {"code": "GASKET-EPDM", "name": "Gioăng EPDM", "formula": "PERIMETER * 2"},
            {"code": "SEALANT-SIL", "name": "Keo silicone", "qty": 0.5, "unit": "tuýp"}
        ]
    }',
    1
) ON DUPLICATE KEY UPDATE 
    template_name = VALUES(template_name),
    structure_json = VALUES(structure_json),
    bom_rules_json = VALUES(bom_rules_json);

-- 3.5 Cửa sổ 2 cánh mở quay
INSERT INTO item_structure_templates (
    template_code, 
    template_name, 
    item_type, 
    aluminum_system,
    default_width_mm,
    default_height_mm,
    structure_json,
    bom_rules_json,
    is_active
) VALUES (
    'VWWIN_2LR',
    'Cửa sổ 2 cánh mở quay VW55',
    'window',
    'VW-AL55',
    1200,
    1200,
    '{
        "type": "double_leaf",
        "panels": [
            {"id": "K1", "role": "sash", "openType": "turn-left", "ratio": 0.5},
            {"id": "K2", "role": "sash", "openType": "turn-right", "ratio": 0.5}
        ]
    }',
    '{
        "aluminum": [
            {"profile": "VW55-FRAME-V", "qty": 2, "formula": "H"},
            {"profile": "VW55-FRAME-H", "qty": 2, "formula": "W - 110"},
            {"profile": "VW55-IMPOST", "qty": 1, "formula": "H - 110"},
            {"profile": "VW55-SASH-V", "qty": 4, "formula": "H - 55"},
            {"profile": "VW55-SASH-H", "qty": 4, "formula": "(W/2) - 82.5"},
            {"profile": "VW55-BEAD", "qty": 8, "formula": "PERIMETER * 0.4"}
        ],
        "glass": [
            {"type": "tempered", "thickness": 6, "formula": {"width": "(W/2) - 90", "height": "H - 155"}, "qty": 2}
        ],
        "hardware": [
            {"code": "HINGE-FRICTION", "name": "Bản lề ma sát", "qty": 4, "unit": "bộ"},
            {"code": "HANDLE-WIN", "name": "Tay nắm cửa sổ", "qty": 2, "unit": "bộ"},
            {"code": "STAY-ARM", "name": "Thanh giữ", "qty": 2, "unit": "bộ"},
            {"code": "ESPAGNOLETTE", "name": "Thanh truyền động", "qty": 2, "unit": "bộ"}
        ],
        "consumables": [
            {"code": "GASKET-EPDM", "name": "Gioăng EPDM", "formula": "PERIMETER * 2.5"},
            {"code": "SEALANT-SIL", "name": "Keo silicone", "qty": 1, "unit": "tuýp"}
        ]
    }',
    1
) ON DUPLICATE KEY UPDATE 
    template_name = VALUES(template_name),
    structure_json = VALUES(structure_json),
    bom_rules_json = VALUES(bom_rules_json);

-- =====================================================
-- VERIFY
-- =====================================================
SELECT '=== LEGACY STATUS ===' as info;
SELECT 'product_templates' as tbl, COUNT(*) as total, SUM(is_legacy) as legacy FROM product_templates
UNION ALL
SELECT 'door_designs', COUNT(*), SUM(is_legacy) FROM door_designs;

SELECT '=== VW-AL55 PROFILES ===' as info;
SELECT p.code, p.name, p.profile_type, p.weight_per_meter 
FROM aluminum_profiles p
JOIN aluminum_systems s ON p.system_id = s.id
WHERE s.code = 'VW-AL55';

SELECT '=== STRUCTURE TEMPLATES ===' as info;
SELECT template_code, template_name, item_type, aluminum_system 
FROM item_structure_templates 
WHERE is_active = 1;
