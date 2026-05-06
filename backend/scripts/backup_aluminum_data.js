const db = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Backup Aluminum Data script
 * Exports aluminum_systems, aluminum_warehouse_stocks, and related transactions to SQL.
 */
async function backupData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(__dirname, `../backups/aluminum_backup_${timestamp}.sql`);
    
    // Ensure backups directory exists
    if (!fs.existsSync(path.dirname(backupFile))) {
        fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    }

    const connection = await db.getConnection();
    try {
        console.log('--- STARTING BACKUP ---');
        let sqlContent = `-- Aluminum Data Backup Generated at ${new Date().toLocaleString()}\n`;
        sqlContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

        const tablesConfigs = [
            { name: 'aluminum_systems', query: 'SELECT * FROM aluminum_systems' },
            { name: 'aluminum_warehouse_stock', query: 'SELECT * FROM aluminum_warehouse_stock' },
            { name: 'stock_ledger', query: "SELECT * FROM stock_ledger WHERE item_type = 'aluminum'" },
            { name: 'stock_document_lines', query: "SELECT * FROM stock_document_lines WHERE item_type = 'aluminum'" }
        ];

        for (const config of tablesConfigs) {
            console.log(`Backing up table: ${config.name}...`);
            const [rows] = await connection.query(config.query);
            
            if (rows.length === 0) {
                sqlContent += `-- Table ${config.name} has no aluminum data.\n\n`;
                continue;
            }

            sqlContent += `-- Data for ${config.name}\n`;
            sqlContent += `DELETE FROM ${config.name} ${config.name === 'stock_ledger' || config.name === 'stock_document_lines' ? "WHERE item_type = 'aluminum'" : ""};\n`; // Add conditional delete if needed for restore logic
            
            const columns = Object.keys(rows[0]);
            const columnNames = `(\`${columns.join('`, `')}\`)`;
            
            for (const row of rows) {
                const values = columns.map(col => {
                    const val = row[col];
                    if (val === null) return 'NULL';
                    if (typeof val === 'number') return val;
                    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    return `'${String(val).replace(/'/g, "''")}'`;
                });
                sqlContent += `INSERT INTO ${config.name} ${columnNames} VALUES (${values.join(', ')});\n`;
            }
            sqlContent += `\n`;
            console.log(`  Saved ${rows.length} rows.`);
        }

        sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;
        fs.writeFileSync(backupFile, sqlContent);
        
        console.log(`--- BACKUP COMPLETED SUCCESSFULLY ---`);
        console.log(`Backup file: ${backupFile}`);
        
    } catch (error) {
        console.error('--- BACKUP FAILED ---');
        console.error(error);
    } finally {
        connection.release();
        process.exit();
    }
}

backupData();
