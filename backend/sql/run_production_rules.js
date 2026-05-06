/**
 * =====================================================
 * Insert Production Rules vào Database
 * =====================================================
 */

const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function insertProductionRules() {
    console.log('🔄 Inserting production rules...\n');

    try {
        // Đọc file SQL
        const sqlPath = path.join(__dirname, 'act_style_production_rules.sql');
        let sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Loại bỏ comments và split thành các statements
        const statements = sqlContent
            .replace(/--.*$/gm, '') // Remove single line comments
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('SELECT'));

        console.log(`📝 Found ${statements.length} SQL statements`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            try {
                await db.query(stmt);
                process.stdout.write('.');
            } catch (err) {
                if (!err.message.includes('Duplicate')) {
                    console.error(`\n❌ Error at statement ${i + 1}:`, err.message.substring(0, 100));
                }
            }
        }

        console.log('\n');

        // Thống kê
        const [typeRules] = await db.query('SELECT item_type, COUNT(*) as count FROM item_type_rules GROUP BY item_type');
        const [systemRules] = await db.query('SELECT item_type, aluminum_system, COUNT(*) as count FROM item_type_system_rules GROUP BY item_type, aluminum_system');

        console.log('📊 Rules Statistics:');
        console.log('└─ By Item Type:');
        typeRules.forEach(r => console.log(`   ${r.item_type}: ${r.count} rules`));

        console.log('└─ By Aluminum System:');
        systemRules.forEach(r => console.log(`   ${r.item_type}+${r.aluminum_system}: ${r.count} rules`));

        // Test một item
        console.log('\n🧪 Quick Test: Calculate BOM for item #1...');
        const calcEngine = require('../services/calcEngineV2');
        const result = await calcEngine.calculateBOM(1);

        if (result.success) {
            console.log('✅ BOM Calculation successful!');
            console.log(`   Total: ${result.summary.total_cost.toLocaleString('vi-VN')} ₫`);
        } else {
            console.log('⚠️ BOM Calculation failed:', result.error);
        }

        console.log('\n🎉 Production rules setup complete!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    process.exit(0);
}

insertProductionRules();
