// =====================================================
// Migration script: Add project_item_id to door_designs
// =====================================================

const db = require('../config/db');

async function runMigration() {
    try {
        console.log('🚀 Starting migration: Add project_item_id to door_designs');

        // Check if column exists
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'door_designs' 
            AND COLUMN_NAME = 'project_item_id'
        `);

        if (columns.length > 0) {
            console.log('✅ Column project_item_id already exists in door_designs');
            return { success: true, message: 'Column already exists' };
        }

        // Add column
        console.log('📝 Adding column project_item_id...');
        await db.query(`
            ALTER TABLE door_designs 
            ADD COLUMN project_item_id INT NULL
        `);

        // Add index
        try {
            await db.query(`
                ALTER TABLE door_designs 
                ADD INDEX idx_project_item_id (project_item_id)
            `);
            console.log('📝 Added index idx_project_item_id');
        } catch (e) {
            console.log('⚠️ Index may already exist:', e.message);
        }

        console.log('✅ Migration completed successfully!');
        return { success: true, message: 'Column added successfully' };

    } catch (err) {
        console.error('❌ Migration failed:', err);
        return { success: false, message: err.message };
    }
}

// Run if called directly
if (require.main === module) {
    runMigration().then(result => {
        console.log('Result:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = runMigration;
