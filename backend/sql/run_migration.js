/**
 * Migration Script: ACT Style Schema v2.0
 * Chạy: node run_migration.js
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'viral_window_db',
    multipleStatements: true
};

async function runMigration() {
    let connection;
    try {
        console.log('🔄 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected!');

        // Read SQL file
        const sqlPath = path.join(__dirname, 'act_style_schema_v2.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🔄 Running migration...');
        console.log('📋 Creating tables:');
        console.log('   - project_items_v2');
        console.log('   - item_versions');
        console.log('   - item_config');
        console.log('   - item_structure_aluminum');
        console.log('   - item_structure_glass');
        console.log('   - item_structure_hardware');
        console.log('   - item_structure_consumables');
        console.log('   - item_bom_versions');
        console.log('   - item_bom_lines');
        console.log('   - item_type_rules');
        console.log('   - item_type_system_rules');

        await connection.query(sql);
        console.log('✅ Migration completed successfully!');

        // Verify tables
        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'viral_window_db' 
              AND TABLE_NAME LIKE 'item_%' OR TABLE_NAME = 'project_items_v2'
            ORDER BY TABLE_NAME
        `);

        console.log('\n📊 New tables created:');
        tables.forEach(t => console.log(`   ✅ ${t.TABLE_NAME}`));

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.sql) {
            console.error('SQL Error at:', error.sql.substring(0, 200));
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runMigration();
