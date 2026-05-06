// Migration script to add image_url column to inventory table
const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding image_url column to inventory table...');
        await db.query(`
            ALTER TABLE inventory 
            ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL
        `);
        console.log('✅ Successfully added image_url column to inventory table');

        // Verify
        const [cols] = await db.query('DESCRIBE inventory');
        const imageCol = cols.find(c => c.Field === 'image_url');
        if (imageCol) {
            console.log('✅ Verified: image_url column exists -', imageCol.Type);
        } else {
            console.warn('⚠️ Column not found, may need manual migration');
        }
    } catch (err) {
        if (err.message.includes('Duplicate column')) {
            console.log('✅ Column already exists');
        } else {
            console.error('Error:', err.message);
        }
    } finally {
        process.exit();
    }
}

migrate();
