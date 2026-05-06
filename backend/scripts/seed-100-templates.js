const db = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Script seed 100 mẫu cửa vào database
 * Sử dụng: node backend/scripts/seed-100-templates.js
 */

const TEMPLATES_DIR = path.join(__dirname, '../data/templates');

/**
 * Tạo template từ JSON file
 */
async function seedTemplateFromFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const templateData = JSON.parse(fileContent);

        const meta = templateData.meta || {};
        const code = meta.template_code;
        const name = meta.template_name || meta.name;
        const category = meta.category || 'door';
        const subType = meta.sub_type || null;
        const family = mapCategoryToFamily(category, subType);
        const aluminumSystem = meta.aluminum_system || 'XINGFA_55';

        // Tìm aluminum_system_id
        let aluminumSystemId = null;
        if (aluminumSystem) {
            const [systemRows] = await db.query(
                'SELECT id FROM aluminum_systems WHERE code = ? OR name LIKE ? LIMIT 1',
                [aluminumSystem, `%${aluminumSystem}%`]
            );
            if (systemRows.length > 0) {
                aluminumSystemId = systemRows[0].id;
            }
        }

        // Kiểm tra template đã tồn tại chưa
        const [existing] = await db.query(
            'SELECT id FROM door_templates WHERE code = ?',
            [code]
        );

        if (existing.length > 0) {
            console.log(`⏭️  Template ${code} đã tồn tại, bỏ qua`);
            return { skipped: true, code };
        }

        // Lưu param_schema
        const paramSchema = {
            defaultWidth: meta.width_mm || 1800,
            defaultHeight: meta.height_mm || 2600,
            defaultH1: meta.h1_mm || null,
            defaultClearance: meta.khoang_ho_mm || 7,
            defaultGlassType: meta.loai_kinh || "6"
        };

        // Lưu structure_json từ panel_tree
        const structureJson = templateData.panel_tree || {};

        // Insert vào database (không dùng cột aluminum_system vì bảng không có)
        const [result] = await db.query(
            `INSERT INTO door_templates 
            (code, name, category, sub_type, family, aluminum_system_id,
             preview_image, template_json, param_schema, structure_json, description, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 
                    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM door_templates AS dt2))`,
            [
                code,
                name,
                category,
                subType,
                family,
                aluminumSystemId,
                meta.preview_image || null,
                JSON.stringify(templateData),
                JSON.stringify(paramSchema),
                JSON.stringify(structureJson),
                meta.description || null
            ]
        );

        console.log(`✅ Imported: ${code} - ${name}`);
        return { success: true, code, id: result.insertId };
    } catch (err) {
        console.error(`❌ Error importing template from ${filePath}:`, err.message);
        return { error: true, file: path.basename(filePath), message: err.message };
    }
}

/**
 * Map category và sub_type thành family enum
 */
function mapCategoryToFamily(category, subType) {
    if (category === 'door') {
        if (subType === 'swing') return 'door_out';
        if (subType === 'sliding') return 'door_sliding';
        return 'door_out';
    }
    if (category === 'window') {
        if (subType === 'swing') return 'window_swing';
        if (subType === 'tilt') return 'window_tilt';
        if (subType === 'sliding') return 'window_sliding';
        return 'window_swing';
    }
    if (category === 'sliding') return 'door_sliding';
    if (category === 'folding') return 'door_out';
    return 'other';
}

/**
 * Tạo template mẫu từ catalog
 */
async function generateTemplateFromCatalog(templateInfo) {
    // Tạo template JSON cơ bản từ thông tin catalog
    const template = {
        meta: {
            template_code: templateInfo.code,
            template_name: templateInfo.name,
            category: templateInfo.category || 'door',
            sub_type: templateInfo.sub_type || 'swing',
            description: templateInfo.description || '',
            aluminum_system: 'XINGFA_55',
            width_mm: templateInfo.width_mm || 1800,
            height_mm: templateInfo.height_mm || 2200,
            khoang_ho_mm: 7,
            loai_kinh: "Kính trắng 6ly",
            so_bo_mac_dinh: 1
        },
        panel_tree: generatePanelTree(templateInfo),
        bom_profiles: [],
        bom_glass: [],
        bom_hardware: [],
        settings: {
            default_stock_length_mm: 6000,
            default_kerf_mm: 3,
            allow_resize: true,
            scale_on_canvas: 0.15
        }
    };

    return template;
}

/**
 * Generate panel tree từ template info
 */
function generatePanelTree(templateInfo) {
    // Đây là logic đơn giản, bạn cần customize theo từng loại cửa
    const code = templateInfo.code;
    
    if (code.startsWith('D') && code.includes('2')) {
        // Cửa đi 2 cánh
        return {
            type: "container",
            direction: "horizontal",
            children: [
                {
                    id: "leaf_left",
                    type: "panel",
                    panelType: "door-leaf",
                    widthRatio: 1,
                    openDirection: "left",
                    glassType: "6mm_clear"
                },
                {
                    id: "leaf_right",
                    type: "panel",
                    panelType: "door-leaf",
                    widthRatio: 1,
                    openDirection: "right",
                    glassType: "6mm_clear"
                }
            ]
        };
    }
    
    // Default: 1 cánh
    return {
        type: "panel",
        panelType: "door-leaf",
        widthRatio: 1,
        heightRatio: 1,
        openDirection: "left",
        glassType: "6mm_clear"
    };
}

/**
 * Main function
 */
async function seedTemplates() {
    try {
        console.log('\n🌱 Bắt đầu seed 100 mẫu cửa...\n');

        // Đọc catalog
        const catalogPath = path.join(__dirname, '../data/templates/template-catalog-100.json');
        if (!fs.existsSync(catalogPath)) {
            console.error('❌ Không tìm thấy file catalog:', catalogPath);
            process.exit(1);
        }

        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        const stats = {
            success: 0,
            skipped: 0,
            errors: 0,
            errorsList: []
        };

        // 1. Import từ files có sẵn
        if (fs.existsSync(TEMPLATES_DIR)) {
            const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json') && f !== 'template-catalog-100.json');
            
            console.log(`📁 Tìm thấy ${files.length} file template JSON\n`);
            
            for (const file of files) {
                const filePath = path.join(TEMPLATES_DIR, file);
                const result = await seedTemplateFromFile(filePath);
                
                if (result.success) {
                    stats.success++;
                } else if (result.skipped) {
                    stats.skipped++;
                } else if (result.error) {
                    stats.errors++;
                    stats.errorsList.push(result);
                }
            }
        }

        // 2. Generate các template còn lại từ catalog (nếu chưa có file)
        // Đã có script riêng: generate-remaining-templates.js
        // Chạy script đó trước khi chạy seed này

        console.log('\n📊 Kết quả:');
        console.log(`   ✅ Thành công: ${stats.success}`);
        console.log(`   ⏭️  Đã tồn tại: ${stats.skipped}`);
        console.log(`   ❌ Lỗi: ${stats.errors}`);
        
        if (stats.errorsList.length > 0) {
            console.log('\n❌ Chi tiết lỗi:');
            stats.errorsList.forEach(err => {
                console.log(`   - ${err.file}: ${err.message}`);
            });
        }

        console.log('\n✅ Hoàn thành!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi khi seed templates:', err);
        process.exit(1);
    }
}

// Chạy seed
seedTemplates();

