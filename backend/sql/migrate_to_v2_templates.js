/**
 * =====================================================
 * MIGRATION: Chuyển Đổi Sản Phẩm Legacy Sang V2 Templates
 * =====================================================
 * 
 * Script này sẽ:
 * 1. Đọc tất cả products từ door-template-families.json
 * 2. Tạo V2 templates tương ứng trong item_structure_templates
 * 3. Update item_config để có template_code (nếu có data)
 */

const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// =========================================
// MAPPING: Legacy → V2 Templates
// =========================================
const LEGACY_TO_V2_MAPPING = {
    // Cửa đi mở quay
    'DOOR_OUT_1L_01': 'VWDOOR_1L',
    'DOOR_OUT_1R_01': 'VWDOOR_1R',
    'DOOR_OUT_2LR_01': 'VWDOOR_2LR',
    'DOOR_OUT_2LR_ASYM_01': 'VWDOOR_2LR',    // Map về 2 cánh
    'DOOR_IN_1L_01': 'VWDOOR_1L',
    'DOOR_IN_1R_01': 'VWDOOR_1R',
    'DOOR_IN_2LR_01': 'VWDOOR_2LR',

    // Cửa lùa
    'DOOR_SLIDE_2_01': 'VWSLID_2',
    'DOOR_SLIDE_4_01': 'VWSLID_4',

    // Cửa sổ
    'WIN_TURN_1L_01': 'VWWIN_1L',
    'WIN_TURN_1R_01': 'VWWIN_1R',
    'WIN_TURN_2LR_01': 'VWWIN_2LR',
    'WIN_SLIDE_2_01': 'VWSLID_2',

    // Family-based mapping
    'door_out_1l': 'VWDOOR_1L',
    'door_out_1r': 'VWDOOR_1R',
    'door_out_2lr': 'VWDOOR_2LR',
    'door_in_1l': 'VWDOOR_1L',
    'door_in_1r': 'VWDOOR_1R',
    'door_in_2lr': 'VWDOOR_2LR',
    'door_slide_2': 'VWSLID_2',
    'door_slide_4': 'VWSLID_4',
    'window_turn_1l': 'VWWIN_1L',
    'window_turn_1r': 'VWWIN_1R',
    'window_turn_2lr': 'VWWIN_2LR'
};

// Hệ nhôm mapping
const SYSTEM_MAPPING = {
    'XINGFA_55': 'VW-AL55',
    'XINGFA_93': 'VW-AL55',  // Fallback
    'PMI_55': 'VW-AL55',
    'VW55': 'VW-AL55',
    'default': 'VW-AL55'
};

async function runMigration() {
    console.log('🔄 MIGRATION: Chuyển đổi sản phẩm sang V2\n');
    console.log('='.repeat(50));

    try {
        // =========================================
        // PHASE 1: Thêm V2 templates còn thiếu từ JSON
        // =========================================
        console.log('\n📁 PHASE 1: Đọc templates từ JSON...');

        const jsonPath = path.join(__dirname, '../data/door-template-families.json');
        let legacyTemplates = [];

        if (fs.existsSync(jsonPath)) {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            legacyTemplates = data.families || [];
            console.log(`  Tìm thấy ${legacyTemplates.length} legacy templates`);
        } else {
            console.log('  ⚠️ File door-template-families.json không tồn tại');
        }

        // Tạo thêm V2 templates cho các loại đặc biệt
        const additionalTemplates = [
            // Cửa đi 2 cánh lệch
            {
                code: 'VWDOOR_2LR_ASYM',
                name: 'Cửa đi 2 cánh lệch VW55',
                type: 'door',
                system: 'VW-AL55',
                width: 1500, height: 2200,
                structure: { type: 'double_leaf_asymmetric', leaf_count: 2, ratio: [2, 1] },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'mullion_vertical', qty: 1, formula: 'H - 110' },
                        { profile: 'sash_vertical', qty: 4, formula: 'H - 55' },
                        { profile: 'sash_horizontal', qty: 4, formula: '(W / 2) - 60' },
                        { profile: 'glass_bead', qty: 2, formula: '(W + H - 180) * 2', unit: 'mm' }
                    ],
                    glass: [
                        { type: 'tempered_8', thickness: 8, width_deduct: 100, height_deduct: 155, qty: 2 }
                    ],
                    hardware: 'door_2_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 4', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 1, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa đi 4 cánh
            {
                code: 'VWDOOR_4LR',
                name: 'Cửa đi 4 cánh mở quay VW55',
                type: 'door',
                system: 'VW-AL55',
                width: 3200, height: 2400,
                structure: { type: 'quad_leaf', leaf_count: 4 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'mullion_vertical', qty: 3, formula: 'H - 110' },
                        { profile: 'sash_vertical', qty: 8, formula: 'H - 55' },
                        { profile: 'sash_horizontal', qty: 8, formula: '(W / 4) - 50' },
                        { profile: 'glass_bead', qty: 4, formula: '((W / 4) + H - 100) * 2', unit: 'mm' }
                    ],
                    glass: [
                        { type: 'tempered_8', thickness: 8, width_deduct: 80, height_deduct: 155, qty: 4 }
                    ],
                    hardware: 'door_2_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 8', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 2, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa đi + fix trên
            {
                code: 'VWDOOR_2LR_TOPFIX',
                name: 'Cửa đi 2 cánh + fix trên VW55',
                type: 'door',
                system: 'VW-AL55',
                width: 1600, height: 2600,
                structure: { type: 'double_with_transom', leaf_count: 2, has_transom: true },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 3, formula: 'W - 110' },
                        { profile: 'mullion_horizontal', qty: 1, formula: 'W - 120' },
                        { profile: 'sash_vertical', qty: 4, formula: '(H * 0.8) - 55' },
                        { profile: 'sash_horizontal', qty: 4, formula: '(W / 2) - 60' },
                        { profile: 'glass_bead', qty: 3, formula: '(W + H - 200) * 2', unit: 'mm' }
                    ],
                    glass: [
                        { type: 'tempered_8', thickness: 8, width_deduct: 100, height_deduct: 155, qty: 2 },
                        { type: 'tempered_8', thickness: 8, width_deduct: 120, height_deduct: 50, qty: 1, note: 'fix' }
                    ],
                    hardware: 'door_2_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 5', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 1.5, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa sổ lùa 2 cánh
            {
                code: 'VWWIN_SLID_2',
                name: 'Cửa sổ lùa 2 cánh VW55',
                type: 'window',
                system: 'VW-AL55',
                width: 1200, height: 1200,
                structure: { type: 'sliding', leaf_count: 2 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 100' },
                        { profile: 'sash_vertical', qty: 4, formula: 'H - 60' },
                        { profile: 'sash_horizontal', qty: 4, formula: '(W / 2) - 40' },
                        { profile: 'glass_bead', qty: 2, formula: '((W / 2) + H - 100) * 2', unit: 'mm' }
                    ],
                    glass: [
                        { type: 'tempered_6', thickness: 6, width_deduct: 70, height_deduct: 120, qty: 2 }
                    ],
                    hardware: 'window_2_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 4', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 0.5, unit: 'tuýp' }
                    ]
                }
            },
            // Vách fix cố định
            {
                code: 'VWFIX_1',
                name: 'Vách kính cố định VW55',
                type: 'fixed',
                system: 'VW-AL55',
                width: 1000, height: 2400,
                structure: { type: 'fixed', leaf_count: 0 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'glass_bead', qty: 1, formula: '(W + H - 110) * 2', unit: 'mm' }
                    ],
                    glass: [
                        { type: 'tempered_10', thickness: 10, width_deduct: 120, height_deduct: 120, qty: 1 }
                    ],
                    hardware: null,
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 2', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 1, unit: 'tuýp' }
                    ]
                }
            }
        ];

        console.log('\n📐 PHASE 2: Thêm templates mở rộng...');
        for (const t of additionalTemplates) {
            await db.query(`
                INSERT INTO item_structure_templates 
                (template_code, template_name, item_type, system_code, default_width_mm, default_height_mm, structure_json, bom_rules_json, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE 
                    template_name = VALUES(template_name),
                    structure_json = VALUES(structure_json),
                    bom_rules_json = VALUES(bom_rules_json)
            `, [t.code, t.name, t.type, t.system, t.width, t.height, JSON.stringify(t.structure), JSON.stringify(t.bom_rules)]);
            console.log(`  ✓ ${t.code}: ${t.name}`);
        }

        // =========================================
        // PHASE 3: Cập nhật mapping table
        // =========================================
        console.log('\n📋 PHASE 3: Tạo bảng mapping...');

        // Tạo bảng mapping nếu chưa có
        await db.query(`
            CREATE TABLE IF NOT EXISTS template_migration_map (
                id INT AUTO_INCREMENT PRIMARY KEY,
                legacy_code VARCHAR(50) NOT NULL,
                legacy_family VARCHAR(50),
                v2_code VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_legacy (legacy_code)
            )
        `);

        // Map từ JSON families
        let mappingCount = 0;
        for (const family of legacyTemplates) {
            const v2Code = LEGACY_TO_V2_MAPPING[family.code]
                || LEGACY_TO_V2_MAPPING[family.family]
                || 'VWDOOR_1L';  // Default fallback

            await db.query(`
                INSERT INTO template_migration_map (legacy_code, legacy_family, v2_code)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE v2_code = VALUES(v2_code)
            `, [family.code, family.family, v2Code]);
            mappingCount++;
        }
        console.log(`  ✓ Tạo ${mappingCount} mappings`);

        // =========================================
        // PHASE 4: Cập nhật existing item_config
        // =========================================
        console.log('\n🔄 PHASE 4: Cập nhật item_config...');

        // Lấy tất cả item_config chưa có template_code
        const [configs] = await db.query(`
            SELECT ic.id, ic.item_version_id, ic.aluminum_system, 
                   iv.project_item_id, pi.item_type
            FROM item_config ic
            JOIN item_versions iv ON ic.item_version_id = iv.id
            JOIN project_items_v2 pi ON iv.project_item_id = pi.id
            WHERE ic.template_code IS NULL OR ic.template_code = ''
        `);

        let updatedCount = 0;
        for (const config of configs) {
            // Determine V2 template based on item_type
            let v2Code = 'VWDOOR_1L';
            if (config.item_type) {
                if (config.item_type.includes('window')) v2Code = 'VWWIN_1L';
                else if (config.item_type.includes('sliding') || config.item_type.includes('slide')) v2Code = 'VWSLID_2';
                else if (config.item_type.includes('2')) v2Code = 'VWDOOR_2LR';
            }

            await db.query(`
                UPDATE item_config SET template_code = ?, aluminum_system = 'VW-AL55'
                WHERE id = ?
            `, [v2Code, config.id]);
            updatedCount++;
        }
        console.log(`  ✓ Cập nhật ${updatedCount} item_config`);

        // =========================================
        // SUMMARY
        // =========================================
        console.log('\n' + '='.repeat(50));
        console.log('📊 KẾT QUẢ MIGRATION:');

        const [[templateCount]] = await db.query(
            'SELECT COUNT(*) as cnt FROM item_structure_templates WHERE is_active = 1'
        );
        const [[mappingTotal]] = await db.query(
            'SELECT COUNT(*) as cnt FROM template_migration_map'
        );

        console.log(`  - V2 Templates: ${templateCount.cnt}`);
        console.log(`  - Mapping entries: ${mappingTotal.cnt}`);
        console.log(`  - Items updated: ${updatedCount}`);
        console.log('\n✅ MIGRATION HOÀN TẤT!');

        return { success: true, templatesAdded: additionalTemplates.length, itemsUpdated: updatedCount };

    } catch (err) {
        console.error('\n❌ MIGRATION FAILED:', err);
        return { success: false, error: err.message };
    }
}

// Export utility function to get V2 code from legacy
async function getV2Template(legacyCode, legacyFamily) {
    // Check mapping first
    if (LEGACY_TO_V2_MAPPING[legacyCode]) {
        return LEGACY_TO_V2_MAPPING[legacyCode];
    }
    if (LEGACY_TO_V2_MAPPING[legacyFamily]) {
        return LEGACY_TO_V2_MAPPING[legacyFamily];
    }

    // Check database
    const [rows] = await db.query(
        'SELECT v2_code FROM template_migration_map WHERE legacy_code = ? OR legacy_family = ?',
        [legacyCode, legacyFamily]
    );
    if (rows.length > 0) {
        return rows[0].v2_code;
    }

    // Default
    return 'VWDOOR_1L';
}

if (require.main === module) {
    runMigration().then(r => {
        console.log('\nResult:', r);
        process.exit(r.success ? 0 : 1);
    });
}

module.exports = { runMigration, getV2Template, LEGACY_TO_V2_MAPPING };
