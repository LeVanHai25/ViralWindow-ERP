/**
 * Insert Sample Rules Script
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

async function run() {
    let connection;
    try {
        console.log('🔄 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        const sqlPath = path.join(__dirname, 'act_style_sample_rules.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🔄 Inserting sample rules...');
        await connection.query(sql);

        // Count rules
        const [typeRules] = await connection.query('SELECT COUNT(*) as cnt FROM item_type_rules');
        const [sysRules] = await connection.query('SELECT COUNT(*) as cnt FROM item_type_system_rules');

        console.log(`✅ Item Type Rules: ${typeRules[0].cnt}`);
        console.log(`✅ System Override Rules: ${sysRules[0].cnt}`);

        // Show by type
        const [byType] = await connection.query(`
            SELECT item_type, COUNT(*) as rules 
            FROM item_type_rules 
            GROUP BY item_type
        `);
        console.log('\n📊 Rules by product type:');
        byType.forEach(r => console.log(`   ${r.item_type}: ${r.rules} rules`));

        console.log('\n✅ Sample rules inserted successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

run();
