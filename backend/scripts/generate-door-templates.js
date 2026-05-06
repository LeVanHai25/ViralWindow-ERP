const fs = require('fs');
const path = require('path');
const db = require('../config/db');

/**
 * Script để generate 100+ mẫu cửa từ base templates
 * Tạo các biến thể theo: hệ nhôm, kích thước, hướng mở
 */

// Đọc base templates
const baseTemplatesPath = path.join(__dirname, '../data/door-templates-base.json');
const baseTemplates = JSON.parse(fs.readFileSync(baseTemplatesPath, 'utf8'));

// Các hệ nhôm phổ biến ở VN
const systems = [
    { code: 'XINGFA_55', name: 'Xingfa 55 Series' },
    { code: 'XINGFA_63', name: 'Xingfa 63 Series' },
    { code: 'VIVA_55', name: 'Viva 55 Series' },
    { code: 'VIRAL_55', name: 'Viral 55 Series' },
    { code: 'XINGFA_93', name: 'Xingfa 93 Series (Lùa)' }
];

// Hệ số nhân kích thước (để tạo biến thể)
const widthFactors = [0.9, 1.0, 1.1];
const heightFactors = [0.95, 1.0, 1.05];

// Loại kính
const glassTypes = ['CLEAR_8', 'CLEAR_10', 'LOWE_8', 'LOWE_10'];

/**
 * Generate expanded templates từ base templates
 */
function generateExpandedTemplates() {
    const expanded = [];
    const usedCodes = new Set();

    for (const baseTemplate of baseTemplates) {
        // Xác định hệ nhôm ViralWindow phù hợp với category
        let applicableSystems = [
            { code: 'VW-D-001', name: 'ViralWindow Cửa đi' },
            { code: 'VW-W-001', name: 'ViralWindow Cửa sổ' },
            { code: 'VW-S-001', name: 'ViralWindow Lùa' }
        ];
        
        // Cửa lùa dùng VW-S-001
        if (baseTemplate.category.includes('sliding') || baseTemplate.category === 'door_sliding' || baseTemplate.category === 'window_sliding') {
            applicableSystems = [{ code: 'VW-S-001', name: 'ViralWindow Lùa' }];
        } else if (baseTemplate.category.includes('door')) {
            // Cửa đi dùng VW-D-001
            applicableSystems = [{ code: 'VW-D-001', name: 'ViralWindow Cửa đi' }];
        } else if (baseTemplate.category.includes('window')) {
            // Cửa sổ dùng VW-W-001
            applicableSystems = [{ code: 'VW-W-001', name: 'ViralWindow Cửa sổ' }];
        }

        // Tạo biến thể cho mỗi hệ nhôm
        for (const system of applicableSystems) {
            // Tạo biến thể kích thước (chỉ cho một số family nhất định)
            const shouldVarySize = !baseTemplate.family.includes('fixed') && 
                                   !baseTemplate.family.includes('partition');
            
            if (shouldVarySize) {
                // Tạo 2-3 biến thể kích thước
                for (let i = 0; i < 2; i++) {
                    const wFactor = widthFactors[i];
                    const hFactor = heightFactors[i];
                    
                    const clone = JSON.parse(JSON.stringify(baseTemplate));
                    clone.system = system.code;
                    clone.defaultWidth = Math.round(baseTemplate.defaultWidth * wFactor);
                    clone.defaultHeight = Math.round(baseTemplate.defaultHeight * hFactor);
                    clone.code = `${baseTemplate.code}_${system.code}_${i + 1}`;
                    
                    // Cập nhật glass type (có thể random hoặc giữ nguyên)
                    if (clone.panelTree.type === 'leaf') {
                        clone.panelTree.glass = baseTemplate.panelTree.glass || 'CLEAR_8';
                    } else {
                        updateGlassInTree(clone.panelTree, baseTemplate.panelTree.glass || 'CLEAR_8');
                    }
                    
                    if (!usedCodes.has(clone.code)) {
                        expanded.push(clone);
                        usedCodes.add(clone.code);
                    }
                }
            } else {
                // Giữ nguyên kích thước, chỉ đổi hệ nhôm
                const clone = JSON.parse(JSON.stringify(baseTemplate));
                clone.system = system.code;
                clone.code = `${baseTemplate.code}_${system.code}`;
                
                if (!usedCodes.has(clone.code)) {
                    expanded.push(clone);
                    usedCodes.add(clone.code);
                }
            }
        }
    }

    return expanded;
}

/**
 * Cập nhật glass type trong panel tree
 */
function updateGlassInTree(node, glassType) {
    if (node.type === 'leaf') {
        node.glass = glassType;
    } else if (node.children) {
        node.children.forEach(child => {
            updateGlassInTree(child, glassType);
        });
    }
}

/**
 * Import templates vào database
 */
async function importTemplatesToDatabase(templates) {
    console.log(`\n📦 Bắt đầu import ${templates.length} mẫu cửa vào database...\n`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const template of templates) {
        try {
            // Kiểm tra xem template đã tồn tại chưa
            const [existing] = await db.query(
                'SELECT id FROM door_templates WHERE code = ?',
                [template.code]
            );

            if (existing.length > 0) {
                // Update existing
                await db.query(`
                    UPDATE door_templates 
                    SET name = ?, 
                        category = ?,
                        family = ?,
                        default_width = ?,
                        default_height = ?,
                        structure_json = ?,
                        param_schema = ?,
                        description = ?,
                        is_active = 1
                    WHERE code = ?
                `, [
                    template.name,
                    template.category,
                    template.family || template.category,
                    template.defaultWidth,
                    template.defaultHeight,
                    JSON.stringify(template.panelTree),
                    JSON.stringify({}),
                    template.description || '',
                    template.code
                ]);
                console.log(`✅ Updated: ${template.code}`);
            } else {
                // Insert new
                // Tìm aluminum_system_id từ system code
                const [systemRows] = await db.query(
                    'SELECT id FROM aluminum_systems WHERE code = ? LIMIT 1',
                    [template.system]
                );
                
                const aluminumSystemId = systemRows.length > 0 ? systemRows[0].id : null;

                await db.query(`
                    INSERT INTO door_templates 
                    (code, name, category, family, aluminum_system_id, default_width, default_height, 
                     structure_json, param_schema, description, is_active, display_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                `, [
                    template.code,
                    template.name,
                    template.category,
                    template.family || template.category,
                    aluminumSystemId,
                    template.defaultWidth,
                    template.defaultHeight,
                    JSON.stringify(template.panelTree),
                    JSON.stringify({}),
                    template.description || '',
                    successCount + 1
                ]);
                console.log(`✅ Inserted: ${template.code}`);
            }
            
            successCount++;
        } catch (err) {
            console.error(`❌ Error importing ${template.code}:`, err.message);
            errorCount++;
        }
    }

    console.log(`\n📊 Kết quả:`);
    console.log(`   ✅ Thành công: ${successCount}`);
    console.log(`   ❌ Lỗi: ${errorCount}`);
    console.log(`   📦 Tổng: ${templates.length}\n`);
}

/**
 * Export templates ra file JSON
 */
function exportTemplatesToFile(templates, outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(templates, null, 2), 'utf8');
    console.log(`\n💾 Đã export ${templates.length} mẫu ra file: ${outputPath}\n`);
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🚀 Bắt đầu generate mẫu cửa...\n');
        console.log(`📋 Base templates: ${baseTemplates.length} mẫu\n`);

        // Generate expanded templates
        const expandedTemplates = generateExpandedTemplates();
        
        console.log(`✨ Đã generate: ${expandedTemplates.length} mẫu\n`);

        // Export ra file JSON
        const outputPath = path.join(__dirname, '../data/door-templates-expanded.json');
        exportTemplatesToFile(expandedTemplates, outputPath);

        // Import vào database
        await importTemplatesToDatabase(expandedTemplates);

        console.log('✅ Hoàn thành!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
}

// Chạy script
if (require.main === module) {
    main();
}

module.exports = {
    generateExpandedTemplates,
    importTemplatesToDatabase,
    exportTemplatesToFile
};
