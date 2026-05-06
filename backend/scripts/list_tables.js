const db = require('../config/db');

async function listTables() {
    try {
        const [rows] = await db.query('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);
        console.log('Tables in database:');
        tables.forEach(t => console.log(`- ${t}`));
        
        console.log('\nChecking for specific aluminum tables:');
        const aluminumTables = tables.filter(t => t.toLowerCase().includes('aluminum'));
        aluminumTables.forEach(t => console.log(`- ${t}`));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

listTables();
