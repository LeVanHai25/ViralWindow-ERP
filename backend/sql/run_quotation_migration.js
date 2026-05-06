const db = require('../config/db');
const fs = require('fs');

async function runMigration() {
    try {
        console.log('Starting migration...\n');

        // Run ALTER TABLE statements one by one
        const alterStatements = [
            // Quotations table
            "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS version INT DEFAULT 1",
            "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS parent_quotation_id INT DEFAULT NULL",
            "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS creator_name VARCHAR(100) DEFAULT NULL",
            "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0",
            "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vat_percent DECIMAL(5,2) DEFAULT 10",
            "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0",

            // Quotation_items table
            "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS code VARCHAR(50) DEFAULT NULL",
            "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS spec TEXT DEFAULT NULL",
            "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS glass TEXT DEFAULT NULL",
            "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS accessories TEXT DEFAULT NULL",
            "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) DEFAULT 0",
            "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS height DECIMAL(10,2) DEFAULT 0",
            "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS area DECIMAL(10,4) DEFAULT 0",
            "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS accessory_price DECIMAL(15,2) DEFAULT 0"
        ];

        for (const stmt of alterStatements) {
            try {
                console.log('Running:', stmt.substring(0, 70) + '...');
                await db.query(stmt);
                console.log('  ✓ OK\n');
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
                    console.log('  ⚠ Column already exists, skipping\n');
                } else {
                    console.error('  ✗ Error:', err.message, '\n');
                }
            }
        }

        console.log('\n=== Migration completed! ===\n');

        // Verify columns
        console.log('Verifying quotations table...');
        const [quotCols] = await db.query('SHOW COLUMNS FROM quotations');
        console.log('Columns:', quotCols.map(c => c.Field).join(', '));

        console.log('\nVerifying quotation_items table...');
        const [itemCols] = await db.query('SHOW COLUMNS FROM quotation_items');
        console.log('Columns:', itemCols.map(c => c.Field).join(', '));

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
