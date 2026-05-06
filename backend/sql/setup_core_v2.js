// =====================================================
// Migration: Setup Core V2 (Refactored)
// - Create new tables for V2 architecture
// - Freeze legacy data
// - Create VW-AL55 system config
// - Create structure templates
// =====================================================

const db = require('../config/db');

async function runMigration() {
    console.log('🚀 Starting Core V2 Setup Migration (Refactored)...\n');

    try {
        // =========================================
        // PHASE 1: CREATE V2 TABLES
        // =========================================
        console.log('📋 PHASE 1: Creating V2 tables...');

        // 1.1 Hệ nhôm config (VW style)
        await db.query(`
            CREATE TABLE IF NOT EXISTS vw_aluminum_system_config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                system_code VARCHAR(50) NOT NULL UNIQUE,
                system_name VARCHAR(200) NOT NULL,
                frame_width_mm INT DEFAULT 55,
                sash_width_mm INT DEFAULT 45,
                glass_clearance_mm INT DEFAULT 20,
                profiles_json JSON COMMENT 'Danh sách profile codes + metadata',
                hardware_config JSON COMMENT 'Phụ kiện mặc định',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✓ vw_aluminum_system_config');

        // 1.2 Structure templates
        await db.query(`
            CREATE TABLE IF NOT EXISTS item_structure_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_code VARCHAR(50) NOT NULL UNIQUE,
                template_name VARCHAR(200) NOT NULL,
                item_type ENUM('door', 'window', 'railing', 'partition', 'glass_roof', 'stair') NOT NULL,
                system_code VARCHAR(50) NOT NULL,
                default_width_mm INT DEFAULT 1200,
                default_height_mm INT DEFAULT 2200,
                structure_json JSON COMMENT 'Cấu trúc sản phẩm (panels, layout)',
                bom_rules_json JSON COMMENT 'Rules tính BOM cho từng nhóm vật tư',
                thumbnail_url VARCHAR(500),
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_item_type (item_type),
                INDEX idx_system_code (system_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✓ item_structure_templates');

        console.log('');

        // =========================================
        // PHASE 2: FREEZE LEGACY DATA
        // =========================================
        console.log('🔒 PHASE 2: Freezing legacy data...');

        const legacyTables = ['product_templates', 'door_designs', 'bom_items'];
        for (const table of legacyTables) {
            try {
                const [cols] = await db.query(`
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ? AND COLUMN_NAME = 'is_legacy'
                `, [table]);

                if (cols.length === 0) {
                    await db.query(`ALTER TABLE ${table} ADD COLUMN is_legacy TINYINT(1) DEFAULT 0`);
                    console.log(`  + Added is_legacy to ${table}`);
                }

                const [result] = await db.query(`UPDATE ${table} SET is_legacy = 1 WHERE is_legacy = 0 OR is_legacy IS NULL`);
                console.log(`  ✓ ${table}: ${result.affectedRows} rows marked as legacy`);
            } catch (e) {
                if (!e.message.includes("doesn't exist")) {
                    console.log(`  ⚠️ ${table}: ${e.message}`);
                }
            }
        }
        console.log('');

        // =========================================
        // PHASE 3: CREATE VW-AL55 SYSTEM
        // =========================================
        console.log('🔧 PHASE 3: Creating VW-AL55 system...');

        const vwAl55Profiles = {
            frame_vertical: { code: 'VW55-FV', name: 'Khung bao đứng', weight_kg_m: 0.85 },
            frame_horizontal: { code: 'VW55-FH', name: 'Khung bao ngang', weight_kg_m: 0.85 },
            sash_vertical: { code: 'VW55-SV', name: 'Cánh đứng', weight_kg_m: 0.75 },
            sash_horizontal: { code: 'VW55-SH', name: 'Cánh ngang', weight_kg_m: 0.75 },
            mullion_vertical: { code: 'VW55-MV', name: 'Đố đứng', weight_kg_m: 0.65 },
            mullion_horizontal: { code: 'VW55-MH', name: 'Đố ngang', weight_kg_m: 0.65 },
            impost: { code: 'VW55-IM', name: 'Thanh giữa', weight_kg_m: 0.80 },
            glass_bead: { code: 'VW55-GB', name: 'Nẹp kính', weight_kg_m: 0.25 }
        };

        const hardwareConfig = {
            door_1_leaf: [
                { code: 'HINGE-3D', name: 'Bản lề 3D', qty: 3, unit: 'bộ' },
                { code: 'HANDLE-LEVER', name: 'Tay nắm gạt', qty: 1, unit: 'bộ' },
                { code: 'LOCK-EURO', name: 'Khóa đa điểm', qty: 1, unit: 'bộ' }
            ],
            door_2_leaf: [
                { code: 'HINGE-3D', name: 'Bản lề 3D', qty: 6, unit: 'bộ' },
                { code: 'HANDLE-LEVER', name: 'Tay nắm gạt', qty: 2, unit: 'bộ' },
                { code: 'LOCK-EURO', name: 'Khóa đa điểm', qty: 1, unit: 'bộ' },
                { code: 'CREMONE', name: 'Chốt cremone', qty: 1, unit: 'bộ' }
            ],
            window_1_leaf: [
                { code: 'HINGE-FRICTION', name: 'Bản lề ma sát', qty: 2, unit: 'bộ' },
                { code: 'HANDLE-WIN', name: 'Tay nắm cửa sổ', qty: 1, unit: 'bộ' },
                { code: 'STAY-ARM', name: 'Thanh giữ', qty: 1, unit: 'bộ' }
            ],
            window_2_leaf: [
                { code: 'HINGE-FRICTION', name: 'Bản lề ma sát', qty: 4, unit: 'bộ' },
                { code: 'HANDLE-WIN', name: 'Tay nắm cửa sổ', qty: 2, unit: 'bộ' },
                { code: 'STAY-ARM', name: 'Thanh giữ', qty: 2, unit: 'bộ' },
                { code: 'ESPAGNOLETTE', name: 'Thanh truyền động', qty: 2, unit: 'bộ' }
            ]
        };

        await db.query(`
            INSERT INTO vw_aluminum_system_config 
            (system_code, system_name, frame_width_mm, sash_width_mm, glass_clearance_mm, profiles_json, hardware_config, is_active)
            VALUES ('VW-AL55', 'Viral Window AL55', 55, 45, 20, ?, ?, 1)
            ON DUPLICATE KEY UPDATE 
                system_name = VALUES(system_name),
                profiles_json = VALUES(profiles_json),
                hardware_config = VALUES(hardware_config)
        `, [JSON.stringify(vwAl55Profiles), JSON.stringify(hardwareConfig)]);

        console.log('  ✓ VW-AL55 system created');
        console.log(`    - ${Object.keys(vwAl55Profiles).length} profiles`);
        console.log(`    - ${Object.keys(hardwareConfig).length} hardware configs`);
        console.log('');

        // =========================================
        // PHASE 4: CREATE STRUCTURE TEMPLATES
        // =========================================
        console.log('📐 PHASE 4: Creating structure templates...');

        const templates = [
            // Cửa đi 1 cánh mở trái
            {
                code: 'VWDOOR_1L',
                name: 'Cửa đi 1 cánh mở trái VW55',
                type: 'door',
                system: 'VW-AL55',
                width: 900, height: 2200,
                structure: { type: 'single_leaf', direction: 'left', leaf_count: 1 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'sash_vertical', qty: 2, formula: 'H - 55' },
                        { profile: 'sash_horizontal', qty: 2, formula: 'W - 165' },
                        { profile: 'glass_bead', qty: 1, formula: '(W + H - 290) * 2', unit: 'mm' }
                    ],
                    glass: [{ thickness: 8, width_deduct: 135, height_deduct: 155, qty: 1 }],
                    hardware: 'door_1_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 4', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 1, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa đi 1 cánh mở phải
            {
                code: 'VWDOOR_1R',
                name: 'Cửa đi 1 cánh mở phải VW55',
                type: 'door',
                system: 'VW-AL55',
                width: 900, height: 2200,
                structure: { type: 'single_leaf', direction: 'right', leaf_count: 1 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'sash_vertical', qty: 2, formula: 'H - 55' },
                        { profile: 'sash_horizontal', qty: 2, formula: 'W - 165' },
                        { profile: 'glass_bead', qty: 1, formula: '(W + H - 290) * 2', unit: 'mm' }
                    ],
                    glass: [{ thickness: 8, width_deduct: 135, height_deduct: 155, qty: 1 }],
                    hardware: 'door_1_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 4', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 1, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa đi 2 cánh
            {
                code: 'VWDOOR_2LR',
                name: 'Cửa đi 2 cánh mở quay VW55',
                type: 'door',
                system: 'VW-AL55',
                width: 1600, height: 2200,
                structure: { type: 'double_leaf', leaf_count: 2 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'impost', qty: 1, formula: 'H - 110' },
                        { profile: 'sash_vertical', qty: 4, formula: 'H - 55' },
                        { profile: 'sash_horizontal', qty: 4, formula: '(W / 2) - 82' },
                        { profile: 'glass_bead', qty: 2, formula: '((W / 2) + H - 192) * 2', unit: 'mm' }
                    ],
                    glass: [{ thickness: 8, width_deduct: 90, height_deduct: 155, qty: 2, note: 'per_leaf' }],
                    hardware: 'door_2_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 6', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 2, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa sổ 1 cánh
            {
                code: 'VWWIN_1L',
                name: 'Cửa sổ 1 cánh mở trái VW55',
                type: 'window',
                system: 'VW-AL55',
                width: 800, height: 1200,
                structure: { type: 'single_leaf', direction: 'left', leaf_count: 1 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'sash_vertical', qty: 2, formula: 'H - 55' },
                        { profile: 'sash_horizontal', qty: 2, formula: 'W - 165' },
                        { profile: 'glass_bead', qty: 1, formula: '(W + H - 290) * 2', unit: 'mm' }
                    ],
                    glass: [{ thickness: 6, width_deduct: 135, height_deduct: 155, qty: 1 }],
                    hardware: 'window_1_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 4', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 0.5, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa sổ 2 cánh
            {
                code: 'VWWIN_2LR',
                name: 'Cửa sổ 2 cánh mở quay VW55',
                type: 'window',
                system: 'VW-AL55',
                width: 1200, height: 1200,
                structure: { type: 'double_leaf', leaf_count: 2 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'impost', qty: 1, formula: 'H - 110' },
                        { profile: 'sash_vertical', qty: 4, formula: 'H - 55' },
                        { profile: 'sash_horizontal', qty: 4, formula: '(W / 2) - 82' },
                        { profile: 'glass_bead', qty: 2, formula: '((W / 2) + H - 192) * 2', unit: 'mm' }
                    ],
                    glass: [{ thickness: 6, width_deduct: 90, height_deduct: 155, qty: 2 }],
                    hardware: 'window_2_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 5', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 1, unit: 'tuýp' }
                    ]
                }
            }
        ];

        for (const t of templates) {
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

        console.log('\n✅ Core V2 Setup Complete!\n');

        // Summary
        const [[templateCount]] = await db.query('SELECT COUNT(*) as cnt FROM item_structure_templates WHERE is_active = 1');
        const [[systemCount]] = await db.query('SELECT COUNT(*) as cnt FROM vw_aluminum_system_config WHERE is_active = 1');

        console.log('📊 Summary:');
        console.log(`   - Aluminum systems: ${systemCount.cnt}`);
        console.log(`   - Structure templates: ${templateCount.cnt}`);

        return { success: true };

    } catch (err) {
        console.error('❌ Migration failed:', err);
        return { success: false, error: err.message };
    }
}

// Run if called directly
if (require.main === module) {
    runMigration().then(result => {
        console.log('\nResult:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = runMigration;
