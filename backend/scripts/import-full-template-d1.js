const db = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Script import template D1 hoàn chỉnh từ file JSON
 * Sử dụng: node backend/scripts/import-full-template-d1.js
 */

async function importFullTemplateD1() {
    try {
        console.log('\n📦 Đang import template D1 hoàn chỉnh...\n');

        // Đọc file template JSON
        const templatePath = path.join(__dirname, '../data/door-template-full-schema.json');
        const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

        // Kiểm tra template đã tồn tại chưa
        const [existing] = await db.query(
            'SELECT id FROM door_templates WHERE code = ?',
            [templateData.meta.template_code]
        );

        if (existing.length > 0) {
            console.log(`⚠️  Template ${templateData.meta.template_code} đã tồn tại. Bạn có muốn cập nhật? (y/n)`);
            // Trong script tự động, chúng ta sẽ skip
            console.log('   → Bỏ qua import.\n');
            process.exit(0);
        }

        // Tìm aluminum_system_id
        let aluminumSystemId = null;
        if (templateData.meta.aluminum_system_code) {
            const [systemRows] = await db.query(
                'SELECT id FROM aluminum_systems WHERE code = ? OR name LIKE ? LIMIT 1',
                [templateData.meta.aluminum_system_code, `%${templateData.meta.aluminum_system_code}%`]
            );
            if (systemRows.length > 0) {
                aluminumSystemId = systemRows[0].id;
                console.log(`✅ Tìm thấy hệ nhôm: ${templateData.meta.aluminum_system_code} (ID: ${aluminumSystemId})`);
            } else {
                console.log(`⚠️  Không tìm thấy hệ nhôm: ${templateData.meta.aluminum_system_code} (sẽ để NULL)`);
            }
        }

        // Tạo template JSON hoàn chỉnh
        const templateJson = {
            ...templateData,
            created_at: new Date().toISOString(),
            version: "1.0"
        };

        // Lưu structure_json từ panel_tree
        const structureJson = templateData.panel_tree || {};

        // Lưu param_schema với default dimensions
        const paramSchema = {
            defaultWidth: templateData.meta.default_width || 1800,
            defaultHeight: templateData.meta.default_height || 2600,
            defaultH1: templateData.meta.default_h1 || null,
            defaultClearance: templateData.meta.default_clearance || 7,
            defaultGlassType: templateData.meta.default_glass_type || "6"
        };

        // Insert vào database
        const [result] = await db.query(
            `INSERT INTO door_templates 
            (code, name, family, preview_image, param_schema, structure_json, template_json,
             aluminum_system_id, description, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 
                    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM door_templates AS dt2))`,
            [
                templateData.meta.template_code,
                templateData.meta.template_name,
                templateData.meta.family || 'other',
                templateData.preview_image || null,
                JSON.stringify(paramSchema),
                JSON.stringify(structureJson),
                JSON.stringify(templateJson),
                aluminumSystemId,
                templateData.meta.description || null
            ]
        );

        console.log(`✅ Import thành công!`);
        console.log(`   - Template ID: ${result.insertId}`);
        console.log(`   - Code: ${templateData.meta.template_code}`);
        console.log(`   - Name: ${templateData.meta.template_name}`);
        console.log(`   - BOM Profiles: ${templateData.bom_profiles.length} items`);
        console.log(`   - BOM Glass: ${templateData.bom_glass.length} items`);
        console.log(`   - BOM Hardware: ${templateData.bom_hardware.length} items\n`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi khi import template:', err);
        process.exit(1);
    }
}

// Chạy import
importFullTemplateD1();














































































