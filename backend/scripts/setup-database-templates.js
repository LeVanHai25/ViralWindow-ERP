const db = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Script setup database cho templates (chạy tất cả SQL files cần thiết)
 * Sử dụng: node backend/scripts/setup-database-templates.js
 */

async function runSQLStatement(statement) {
    try {
        await db.query(statement);
        return { success: true };
    } catch (err) {
        // Một số lỗi có thể bỏ qua
        if (err.message.includes('already exists') || 
            err.message.includes('Duplicate') ||
            err.message.includes('Duplicate column')) {
            return { success: true, skipped: true, message: err.message };
        }
        throw err;
    }
}

async function setupDatabase() {
    try {
        console.log('\n🔧 Bắt đầu setup database cho templates...\n');

        // 1. Tạo bảng door_templates nếu chưa có
        console.log('1️⃣  Tạo bảng door_templates...');
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS \`door_templates\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`code\` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Mã template: D1, D2, W1, SL1...',
                \`name\` VARCHAR(255) NOT NULL COMMENT 'Tên template',
                \`category\` VARCHAR(50) NOT NULL COMMENT 'door, window, sliding, folding',
                \`sub_type\` VARCHAR(50) NULL COMMENT 'swing, tilt, slide, folding, fixed',
                \`family\` ENUM('door_out', 'door_in', 'window_swing', 'window_sliding', 'door_sliding', 'window_tilt', 'fixed', 'wall_window', 'other') DEFAULT 'other',
                \`aluminum_system\` VARCHAR(50) NOT NULL COMMENT 'XINGFA_55, VW-D-001...',
                \`aluminum_system_id\` INT NULL COMMENT 'FK to aluminum_systems',
                \`preview_image\` VARCHAR(255) NULL COMMENT 'Đường dẫn ảnh preview',
                \`template_json\` LONGTEXT NULL COMMENT 'JSON chứa toàn bộ template',
                \`param_schema\` JSON NULL COMMENT 'Schema cho parameters',
                \`structure_json\` JSON NULL COMMENT 'Panel tree structure',
                \`description\` TEXT NULL,
                \`is_active\` TINYINT(1) DEFAULT 1,
                \`display_order\` INT DEFAULT 0,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX \`idx_category\` (\`category\`),
                INDEX \`idx_sub_type\` (\`sub_type\`),
                INDEX \`idx_family\` (\`family\`),
                INDEX \`idx_aluminum_system\` (\`aluminum_system\`),
                INDEX \`idx_code\` (\`code\`),
                INDEX \`idx_is_active\` (\`is_active\`, \`display_order\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng lưu 100 mẫu cửa template';
        `;

        const result1 = await runSQLStatement(createTableSQL);
        if (result1.skipped) {
            console.log('   ⏭️  Bảng đã tồn tại\n');
        } else {
            console.log('   ✅ Tạo bảng thành công\n');
        }

        // 2. Thêm cột template_json nếu chưa có
        console.log('2️⃣  Kiểm tra cột template_json...');
        try {
            const [columns] = await db.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'door_templates' 
                AND COLUMN_NAME = 'template_json'
            `);

            if (columns.length === 0) {
                await db.query(`
                    ALTER TABLE \`door_templates\` 
                    ADD COLUMN \`template_json\` LONGTEXT NULL 
                    COMMENT 'JSON chứa toàn bộ template (meta, panel_tree, bom_profiles, bom_glass, bom_hardware)' 
                    AFTER \`structure_json\`
                `);
                console.log('   ✅ Đã thêm cột template_json\n');
            } else {
                console.log('   ⏭️  Cột template_json đã tồn tại\n');
            }
        } catch (err) {
            console.log('   ⚠️  Lỗi khi kiểm tra cột:', err.message);
            // Tiếp tục dù có lỗi
        }

        console.log('✅ Setup database hoàn tất!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi khi setup database:', err);
        process.exit(1);
    }
}

// Run
setupDatabase();

