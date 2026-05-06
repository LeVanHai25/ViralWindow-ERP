/**
 * Quick migration to add scrap_code column
 * Run: node backend/sql/run_add_scrap_code.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function runMigration() {
    console.log('🚀 Adding scrap_code column to aluminum_scraps...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'viralwindow'
    });

    try {
        // Check if column exists
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM aluminum_scraps LIKE 'scrap_code'"
        );

        if (columns.length === 0) {
            console.log('📦 Adding scrap_code column...');
            await connection.query(`
                ALTER TABLE aluminum_scraps 
                ADD COLUMN scrap_code VARCHAR(50) NULL COMMENT 'Mã nhôm đề c (VD: DC-0001)'
            `);
            console.log('✅ scrap_code column added!');

            // Add index
            try {
                await connection.query(`
                    CREATE INDEX idx_scraps_code ON aluminum_scraps (scrap_code)
                `);
                console.log('✅ Index created!');
            } catch (e) {
                console.log('⚠️ Index may already exist');
            }
        } else {
            console.log('ℹ️ scrap_code column already exists');
        }

        // Verify
        const [result] = await connection.query('SHOW COLUMNS FROM aluminum_scraps');
        console.log('\n📋 Current aluminum_scraps columns:');
        result.forEach(col => console.log(`   - ${col.Field}: ${col.Type}`));

        console.log('\n🎉 Migration complete!');
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

runMigration().catch(err => {
    console.error(err);
    process.exit(1);
});
