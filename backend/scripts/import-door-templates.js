const fs = require('fs');
const path = require('path');
const db = require('../config/db');

/**
 * Script import templates từ file JSON vào database
 * Sử dụng: node backend/scripts/import-door-templates.js [file-path]
 */

async function importTemplates(filePath) {
    try {
        console.log(`\n📖 Đọc file: ${filePath}\n`);
        
        const templates = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📋 Tìm thấy ${templates.length} mẫu cửa\n`);

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const template of templates) {
            try {
                // Kiểm tra xem template đã tồn tại chưa
                const [existing] = await db.query(
                    'SELECT id FROM door_templates WHERE code = ?',
                    [template.code]
                );

                if (existing.length > 0) {
                    console.log(`⏭️  Đã tồn tại, bỏ qua: ${template.code}`);
                    skippedCount++;
                    continue;
                }

                // Map category to family enum
                const categoryToFamily = {
                    'door_out_swing': 'door_out',
                    'door_in_swing': 'door_in',
                    'window_swing': 'window_swing',
                    'window_tilt': 'window_swing',
                    'window_tilt_turn': 'window_swing',
                    'window_sliding': 'window_sliding',
                    'door_sliding': 'door_sliding',
                    'window_fixed': 'fixed',
                    'partition_door': 'wall_window'
                };

                const family = categoryToFamily[template.category] || template.family || 'other';
                
                // Tìm aluminum_system_id từ system code - ưu tiên ViralWindow
                let aluminumSystemId = null;
                if (template.system) {
                    // Tìm hệ nhôm ViralWindow phù hợp với category
                    let searchCode = template.system;
                    if (searchCode.includes('XINGFA') || searchCode.includes('VIVA') || searchCode.includes('VIRAL')) {
                        // Map sang ViralWindow
                        if (template.category.includes('door') && !template.category.includes('sliding')) {
                            searchCode = 'VW-D-001'; // Cửa đi
                        } else if (template.category.includes('window') && !template.category.includes('sliding')) {
                            searchCode = 'VW-W-001'; // Cửa sổ
                        } else if (template.category.includes('sliding')) {
                            searchCode = 'VW-S-001'; // Lùa
                        } else {
                            searchCode = 'VW-001'; // Mặc định
                        }
                    }
                    
                    const [systemRows] = await db.query(
                        'SELECT id FROM aluminum_systems WHERE (code = ? OR code LIKE ?) AND brand = "ViralWindow" AND is_active = 1 LIMIT 1',
                        [searchCode, `%${searchCode}%`]
                    );
                    
                    if (systemRows.length > 0) {
                        aluminumSystemId = systemRows[0].id;
                    } else {
                        // Fallback: tìm bất kỳ hệ nhôm ViralWindow nào
                        const [fallbackRows] = await db.query(
                            'SELECT id FROM aluminum_systems WHERE brand = "ViralWindow" AND is_active = 1 LIMIT 1'
                        );
                        if (fallbackRows.length > 0) {
                            aluminumSystemId = fallbackRows[0].id;
                        } else {
                            console.log(`⚠️  Không tìm thấy hệ nhôm ViralWindow (sẽ để NULL)`);
                        }
                    }
                }

                // Lưu kích thước mặc định vào param_schema
                const defaultWidth = template.defaultWidth || template.default_width || 1200;
                const defaultHeight = template.defaultHeight || template.default_height || 2200;
                
                const paramSchema = template.paramSchema || template.param_schema || {};
                paramSchema.defaultWidth = defaultWidth;
                paramSchema.defaultHeight = defaultHeight;

                // Insert template - KHÔNG dùng cột category, default_width, default_height
                await db.query(`
                    INSERT INTO door_templates 
                    (code, name, family, aluminum_system_id, 
                     structure_json, param_schema, description, is_active, display_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                `, [
                    template.code,
                    template.name,
                    family,
                    aluminumSystemId,
                    JSON.stringify(template.panelTree || template.structure_json || {}),
                    JSON.stringify(paramSchema),
                    template.description || '',
                    successCount + 1
                ]);
                
                console.log(`✅ Imported: ${template.code} - ${template.name}`);
                successCount++;
            } catch (err) {
                console.error(`❌ Lỗi khi import ${template.code}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n📊 Kết quả:`);
        console.log(`   ✅ Thành công: ${successCount}`);
        console.log(`   ⏭️  Đã tồn tại: ${skippedCount}`);
        console.log(`   ❌ Lỗi: ${errorCount}`);
        console.log(`   📦 Tổng: ${templates.length}\n`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
}

// Main
const filePath = process.argv[2] || path.join(__dirname, '../data/door-templates-base.json');
importTemplates(filePath);
