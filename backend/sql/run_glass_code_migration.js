/**
 * Migration Script: Populate glass_items.code column with K-xxx format codes
 * Run: node backend/sql/run_glass_code_migration.js
 */

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
    console.log('🚀 Starting glass code migration...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'viralwindow'
    });

    try {
        // Step 1: Check current state
        console.log('📊 Current glass_items data:');
        const [beforeRows] = await connection.query(
            'SELECT id, code, name, structure FROM glass_items ORDER BY id LIMIT 10'
        );
        console.table(beforeRows);

        // Step 2: Count items with NULL/empty code
        const [countResult] = await connection.query(
            "SELECT COUNT(*) as count FROM glass_items WHERE code IS NULL OR code = ''"
        );
        const nullCount = countResult[0].count;
        console.log(`\n⚠️ Found ${nullCount} items with NULL/empty code\n`);

        if (nullCount === 0) {
            console.log('✅ All glass items already have codes. No migration needed.');
            await connection.end();
            return;
        }

        // Step 3: Update codes
        console.log('🔄 Updating glass_items.code with K-xxx format...');
        const [updateResult] = await connection.query(`
            UPDATE glass_items 
            SET code = CONCAT('K-', LPAD(id, 3, '0'))
            WHERE code IS NULL OR code = ''
        `);
        console.log(`✅ Updated ${updateResult.affectedRows} rows\n`);

        // Step 4: Verify update
        console.log('📊 After migration:');
        const [afterRows] = await connection.query(
            'SELECT id, code, name, structure FROM glass_items ORDER BY id LIMIT 10'
        );
        console.table(afterRows);

        console.log('\n✅ Migration completed successfully!');
        console.log('🔄 Please refresh the design page to see updated glass codes.');

    } catch (error) {
        console.error('❌ Migration error:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
