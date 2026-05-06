
const db = require('../config/db');

async function checkTables() {
    try {
        console.log('Checking tables for project logs...');
        
        const tables = [
            'quotations',
            'door_designs', 
            'door_drawings',
            'bom_items',
            'project_items',
            'production_orders',
            'installation_progress',
            'projects'
        ];

        for (const table of tables) {
            try {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`Table '${table}' exists. Row count: ${rows[0].count}`);
                
                // Show columns
                const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);
                const columnNames = columns.map(c => c.Field).join(', ');
                console.log(`  Columns: ${columnNames}`);
                
            } catch (err) {
                console.error(`Error checking table '${table}':`, err.message);
            }
        }

        // Check data for a specific project if provided (optional)
        // We can pick a project ID that exists
        const [projects] = await db.query('SELECT id, project_code FROM projects LIMIT 1');
        if (projects.length > 0) {
            const projectId = projects[0].id;
            console.log(`\nChecking data for Project ID: ${projectId} (${projects[0].project_code})`);
            
            // Check quotations
            try {
                const [q] = await db.query('SELECT * FROM quotations WHERE project_id = ?', [projectId]);
                console.log(`  Quotations: ${q.length}`);
            } catch (e) { console.log('  Quotations query failed'); }

            // Check door_designs
            try {
                const [d] = await db.query('SELECT * FROM door_designs WHERE project_id = ?', [projectId]);
                console.log(`  Door Designs: ${d.length}`);
            } catch (e) { console.log('  Door Designs query failed'); }
            
            // Check production_orders
            try {
                const [p] = await db.query('SELECT * FROM production_orders WHERE project_id = ?', [projectId]);
                console.log(`  Production Orders: ${p.length}`);
            } catch (e) { console.log('  Production Orders query failed'); }
        }

        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

checkTables();
