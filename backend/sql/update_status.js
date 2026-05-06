const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Check current column definition
    console.log('Current column definition:');
    const [columns] = await conn.query("SHOW FULL COLUMNS FROM quotations WHERE Field = 'status'");
    console.table(columns);

    // Get column type
    if (columns.length > 0) {
        console.log('\nColumn Type:', columns[0].Type);
    }

    // Alter column to VARCHAR(50)
    console.log('\nAltering column to VARCHAR(50)...');
    await conn.query("ALTER TABLE quotations MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'");

    console.log('✅ Column altered!');

    // Verify new definition
    console.log('\nNew column definition:');
    const [newColumns] = await conn.query("SHOW FULL COLUMNS FROM quotations WHERE Field = 'status'");
    console.table(newColumns);

    // Now update the status
    console.log('\nUpdating status...');
    await conn.query("UPDATE quotations SET status = 'contract_signed' WHERE id IN (19, 20, 21)");

    // Verify
    console.log('\nVerify:');
    const [rows] = await conn.query("SELECT id, quotation_code, status FROM quotations WHERE id IN (19, 20, 21)");
    console.table(rows);

    await conn.end();
    console.log('\n✅ Done!');
})();
