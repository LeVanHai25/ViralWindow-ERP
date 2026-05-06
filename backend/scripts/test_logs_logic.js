
const db = require('../config/db');

async function testGetProjectLogsFull(projectId) {
    try {
        console.log(`Testing getProjectLogsFull for Project ID: ${projectId}`);
        const allLogs = [];

        // 1. Project Info
        const [projectRows] = await db.query('SELECT created_at, start_date, deadline, status FROM projects WHERE id = ?', [projectId]);
        if (projectRows.length > 0) {
            console.log('Project found:', projectRows[0]);
        } else {
            console.log('Project NOT found');
            return;
        }

        // 2. Quotations
        try {
            const [quotations] = await db.query('SELECT id, quotation_code, created_at, updated_at, status FROM quotations WHERE project_id = ?', [projectId]);
            console.log(`Quotations found: ${quotations.length}`);
            quotations.forEach(q => {
                if (q.created_at) {
                    allLogs.push({ event_type: 'quotation_created', timestamp: q.created_at });
                }
            });
        } catch (e) { console.error('Error fetching quotations:', e); }

        // 3. Designs
        try {
            const [designs] = await db.query('SELECT id, design_code, created_at FROM door_designs WHERE project_id = ?', [projectId]);
            console.log(`Designs found: ${designs.length}`);
            designs.forEach(d => {
                if (d.created_at) {
                    allLogs.push({ event_type: 'design_created', timestamp: d.created_at });
                }
            });
        } catch (e) { console.error('Error fetching designs:', e); }

        // 4. BOM
        try {
            const [bomItems] = await db.query(`SELECT MIN(created_at) as bom_date FROM bom_items WHERE design_id IN (SELECT id FROM door_designs WHERE project_id = ?)`, [projectId]);
            console.log('BOM date:', bomItems[0]?.bom_date);
            if (bomItems[0]?.bom_date) {
                allLogs.push({ event_type: 'bom_extracted', timestamp: bomItems[0].bom_date });
            }
        } catch (e) { console.error('Error fetching BOM:', e); }

        // 5. Production
        try {
            const [orders] = await db.query('SELECT id, created_at, actual_start_date FROM production_orders WHERE project_id = ?', [projectId]);
            console.log(`Production orders found: ${orders.length}`);
            orders.forEach(o => {
                if (o.created_at) allLogs.push({ event_type: 'production_ordered', timestamp: o.created_at });
                if (o.actual_start_date) allLogs.push({ event_type: 'production_started', timestamp: o.actual_start_date });
            });
        } catch (e) { console.error('Error fetching production:', e); }

        console.log('\n--- Generated Logs ---');
        console.log(allLogs.map(l => `${l.event_type}: ${l.timestamp}`));

        // Check Timeline Logic
        const timeline = {};
        const quotationLog = allLogs.find(l => l.event_type === 'quotation_created');
        timeline.quotation_date = quotationLog ? quotationLog.timestamp : null;

        const designLog = allLogs.find(l => l.event_type === 'design_created');
        timeline.design_date = designLog ? designLog.timestamp : null;

        // BUG: 'bom_created' vs 'bom_extracted'
        const bomLog = allLogs.find(l => l.event_type === 'bom_created'); 
        timeline.bom_date = bomLog ? bomLog.timestamp : null;

        console.log('\n--- Timeline ---');
        console.log(timeline);
        
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

testGetProjectLogsFull(6); // Use Project 6
