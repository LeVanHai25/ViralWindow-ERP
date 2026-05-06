const db = require('../config/database');
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        console.log('Running product_manufacturing migration...');

        const sqlPath = path.join(__dirname, 'create_product_manufacturing.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await db.query(sql);
        console.log('✅ Table product_manufacturing created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
})();
