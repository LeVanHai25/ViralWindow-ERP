// =====================================================
// Migration: Thêm Templates + Price Calculation
// =====================================================

const db = require('../config/db');

async function runMigration() {
    console.log('🚀 Adding Templates + Price Calculation...\n');

    try {
        // =========================================
        // PHASE 1: UPDATE VW-AL55 WITH PRICES
        // =========================================
        console.log('💰 PHASE 1: Adding prices to VW-AL55...');

        const profilePrices = {
            frame_vertical: { code: 'VW55-FV', name: 'Khung bao đứng', weight_kg_m: 0.85, price_vnd_m: 75000 },
            frame_horizontal: { code: 'VW55-FH', name: 'Khung bao ngang', weight_kg_m: 0.85, price_vnd_m: 75000 },
            sash_vertical: { code: 'VW55-SV', name: 'Cánh đứng', weight_kg_m: 0.75, price_vnd_m: 68000 },
            sash_horizontal: { code: 'VW55-SH', name: 'Cánh ngang', weight_kg_m: 0.75, price_vnd_m: 68000 },
            mullion_vertical: { code: 'VW55-MV', name: 'Đố đứng', weight_kg_m: 0.65, price_vnd_m: 60000 },
            mullion_horizontal: { code: 'VW55-MH', name: 'Đố ngang', weight_kg_m: 0.65, price_vnd_m: 60000 },
            impost: { code: 'VW55-IM', name: 'Thanh giữa', weight_kg_m: 0.80, price_vnd_m: 72000 },
            glass_bead: { code: 'VW55-GB', name: 'Nẹp kính', weight_kg_m: 0.25, price_vnd_m: 25000 }
        };

        const hardwareConfigWithPrices = {
            door_1_leaf: [
                { code: 'HINGE-3D', name: 'Bản lề 3D', qty: 3, unit: 'bộ', price_vnd: 150000 },
                { code: 'HANDLE-LEVER', name: 'Tay nắm gạt', qty: 1, unit: 'bộ', price_vnd: 350000 },
                { code: 'LOCK-EURO', name: 'Khóa đa điểm', qty: 1, unit: 'bộ', price_vnd: 850000 }
            ],
            door_2_leaf: [
                { code: 'HINGE-3D', name: 'Bản lề 3D', qty: 6, unit: 'bộ', price_vnd: 150000 },
                { code: 'HANDLE-LEVER', name: 'Tay nắm gạt', qty: 2, unit: 'bộ', price_vnd: 350000 },
                { code: 'LOCK-EURO', name: 'Khóa đa điểm', qty: 1, unit: 'bộ', price_vnd: 850000 },
                { code: 'CREMONE', name: 'Chốt cremone', qty: 1, unit: 'bộ', price_vnd: 280000 }
            ],
            window_1_leaf: [
                { code: 'HINGE-FRICTION', name: 'Bản lề ma sát', qty: 2, unit: 'bộ', price_vnd: 120000 },
                { code: 'HANDLE-WIN', name: 'Tay nắm cửa sổ', qty: 1, unit: 'bộ', price_vnd: 180000 },
                { code: 'STAY-ARM', name: 'Thanh giữ', qty: 1, unit: 'bộ', price_vnd: 95000 }
            ],
            window_2_leaf: [
                { code: 'HINGE-FRICTION', name: 'Bản lề ma sát', qty: 4, unit: 'bộ', price_vnd: 120000 },
                { code: 'HANDLE-WIN', name: 'Tay nắm cửa sổ', qty: 2, unit: 'bộ', price_vnd: 180000 },
                { code: 'STAY-ARM', name: 'Thanh giữ', qty: 2, unit: 'bộ', price_vnd: 95000 },
                { code: 'ESPAGNOLETTE', name: 'Thanh truyền động', qty: 2, unit: 'bộ', price_vnd: 250000 }
            ],
            sliding_2_leaf: [
                { code: 'ROLLER-HD', name: 'Bánh xe chịu tải', qty: 4, unit: 'bộ', price_vnd: 85000 },
                { code: 'HANDLE-SLID', name: 'Tay nắm cửa lùa', qty: 2, unit: 'bộ', price_vnd: 120000 },
                { code: 'LOCK-SLID', name: 'Khóa cửa lùa', qty: 1, unit: 'bộ', price_vnd: 280000 },
                { code: 'TRACK-TOP', name: 'Ray trên', qty: 1, unit: 'cây', price_vnd: 180000 },
                { code: 'TRACK-BOT', name: 'Ray dưới', qty: 1, unit: 'cây', price_vnd: 220000 }
            ],
            sliding_4_leaf: [
                { code: 'ROLLER-HD', name: 'Bánh xe chịu tải', qty: 8, unit: 'bộ', price_vnd: 85000 },
                { code: 'HANDLE-SLID', name: 'Tay nắm cửa lùa', qty: 4, unit: 'bộ', price_vnd: 120000 },
                { code: 'LOCK-SLID', name: 'Khóa cửa lùa', qty: 2, unit: 'bộ', price_vnd: 280000 },
                { code: 'TRACK-TOP', name: 'Ray trên', qty: 2, unit: 'cây', price_vnd: 180000 },
                { code: 'TRACK-BOT', name: 'Ray dưới', qty: 2, unit: 'cây', price_vnd: 220000 }
            ]
        };

        // Thêm giá kính và gioăng
        const glassTypes = {
            tempered_6: { name: 'Kính cường lực 6mm', price_vnd_m2: 380000 },
            tempered_8: { name: 'Kính cường lực 8mm', price_vnd_m2: 450000 },
            tempered_10: { name: 'Kính cường lực 10mm', price_vnd_m2: 550000 },
            tempered_12: { name: 'Kính cường lực 12mm', price_vnd_m2: 680000 },
            laminated_8_8: { name: 'Kính dán an toàn 8+8mm', price_vnd_m2: 950000 }
        };

        const consumablesPrices = {
            'GASKET-EPDM': { price_vnd_m: 8000 },
            'SEALANT-SIL': { price_vnd_unit: 45000 }
        };

        // Update vw_aluminum_system_config
        await db.query(`
            UPDATE vw_aluminum_system_config SET 
                profiles_json = ?,
                hardware_config = ?
            WHERE system_code = 'VW-AL55'
        `, [JSON.stringify(profilePrices), JSON.stringify(hardwareConfigWithPrices)]);

        // Thêm cột glass_types và consumables_prices nếu chưa có
        try {
            await db.query(`ALTER TABLE vw_aluminum_system_config ADD COLUMN glass_types JSON`);
        } catch (e) { /* existed */ }
        try {
            await db.query(`ALTER TABLE vw_aluminum_system_config ADD COLUMN consumables_prices JSON`);
        } catch (e) { /* existed */ }

        await db.query(`
            UPDATE vw_aluminum_system_config SET 
                glass_types = ?,
                consumables_prices = ?
            WHERE system_code = 'VW-AL55'
        `, [JSON.stringify(glassTypes), JSON.stringify(consumablesPrices)]);

        console.log('  ✓ VW-AL55 updated with prices\n');

        // =========================================
        // PHASE 2: ADD NEW TEMPLATES
        // =========================================
        console.log('📐 PHASE 2: Adding new templates...');

        const newTemplates = [
            // Cửa sổ 1 cánh mở phải
            {
                code: 'VWWIN_1R',
                name: 'Cửa sổ 1 cánh mở phải VW55',
                type: 'window',
                system: 'VW-AL55',
                width: 800, height: 1200,
                structure: { type: 'single_leaf', direction: 'right', leaf_count: 1 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'sash_vertical', qty: 2, formula: 'H - 55' },
                        { profile: 'sash_horizontal', qty: 2, formula: 'W - 165' },
                        { profile: 'glass_bead', qty: 1, formula: '(W + H - 290) * 2', unit: 'mm' }
                    ],
                    glass: [{ type: 'tempered_6', thickness: 6, width_deduct: 135, height_deduct: 155, qty: 1 }],
                    hardware: 'window_1_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 4', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 0.5, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa lùa 2 cánh
            {
                code: 'VWSLID_2',
                name: 'Cửa lùa 2 cánh VW55',
                type: 'door',
                system: 'VW-AL55',
                width: 2000, height: 2200,
                structure: { type: 'sliding', leaf_count: 2 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'sash_vertical', qty: 4, formula: 'H - 80' },
                        { profile: 'sash_horizontal', qty: 4, formula: '(W / 2) - 50' },
                        { profile: 'mullion_vertical', qty: 1, formula: 'H - 110', note: 'Thanh chắn giữa' },
                        { profile: 'glass_bead', qty: 2, formula: '((W / 2) + H - 130) * 2', unit: 'mm' }
                    ],
                    glass: [{ type: 'tempered_8', thickness: 8, width_deduct: 80, height_deduct: 180, qty: 2 }],
                    hardware: 'sliding_2_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 5', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 1.5, unit: 'tuýp' }
                    ]
                }
            },
            // Cửa lùa 4 cánh
            {
                code: 'VWSLID_4',
                name: 'Cửa lùa 4 cánh VW55',
                type: 'door',
                system: 'VW-AL55',
                width: 4000, height: 2400,
                structure: { type: 'sliding', leaf_count: 4 },
                bom_rules: {
                    aluminum: [
                        { profile: 'frame_vertical', qty: 2, formula: 'H' },
                        { profile: 'frame_horizontal', qty: 2, formula: 'W - 110' },
                        { profile: 'sash_vertical', qty: 8, formula: 'H - 80' },
                        { profile: 'sash_horizontal', qty: 8, formula: '(W / 4) - 40' },
                        { profile: 'mullion_vertical', qty: 1, formula: 'H - 110', note: 'Thanh chắn giữa' },
                        { profile: 'glass_bead', qty: 4, formula: '((W / 4) + H - 120) * 2', unit: 'mm' }
                    ],
                    glass: [{ type: 'tempered_10', thickness: 10, width_deduct: 70, height_deduct: 180, qty: 4 }],
                    hardware: 'sliding_4_leaf',
                    consumables: [
                        { code: 'GASKET-EPDM', name: 'Gioăng EPDM', formula: '(W + H) * 8', unit: 'mm' },
                        { code: 'SEALANT-SIL', name: 'Keo silicone', qty: 3, unit: 'tuýp' }
                    ]
                }
            }
        ];

        for (const t of newTemplates) {
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

        console.log('');

        // =========================================
        // PHASE 3: ADD API FOR TEMPLATES LIST
        // =========================================
        console.log('📋 Summary:');
        const [[templateCount]] = await db.query('SELECT COUNT(*) as cnt FROM item_structure_templates WHERE is_active = 1');
        console.log(`  - Total templates: ${templateCount.cnt}`);

        const [templates] = await db.query('SELECT template_code, template_name, item_type, default_width_mm, default_height_mm FROM item_structure_templates WHERE is_active = 1');
        console.log('\n  Templates list:');
        for (const t of templates) {
            console.log(`    ${t.template_code}: ${t.template_name} (${t.item_type}, ${t.default_width_mm}x${t.default_height_mm})`);
        }

        console.log('\n✅ Migration complete!');
        return { success: true };

    } catch (err) {
        console.error('❌ Migration failed:', err);
        return { success: false, error: err.message };
    }
}

if (require.main === module) {
    runMigration().then(r => {
        console.log('\nResult:', r);
        process.exit(r.success ? 0 : 1);
    });
}

module.exports = runMigration;
