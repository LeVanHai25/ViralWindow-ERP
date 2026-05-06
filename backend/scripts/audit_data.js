const db = require('../config/db');

async function audit() {
    try {
        console.log('--- Glass Data Comparison ---');

        const [glassRows] = await db.query('SELECT COUNT(*) as count FROM glass_items');
        const [invGlassRows] = await db.query("SELECT COUNT(*) as count FROM inventory WHERE item_type = 'glass'");

        console.log('Glass Items Table Count:', glassRows[0].count);
        console.log('Inventory Table (Glass) Count:', invGlassRows[0].count);

        const [invOtherRows] = await db.query("SELECT COUNT(*) as count FROM inventory WHERE item_type = 'other'");
        console.log('Inventory Table (Other) Count:', invOtherRows[0].count);

        const [accRows] = await db.query('SELECT category, COUNT(*) as count FROM accessories GROUP BY category');
        console.log('Accessories Stats:', JSON.stringify(accRows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Audit Error:', err);
        process.exit(1);
    }
}

audit();
