const db = require('../config/db');

async function checkProjectMaterials() {
    try {
        // Tìm dự án CT2025-068
        const projectCode = 'CT2025-068';
        const [projects] = await db.query('SELECT id, project_code, project_name FROM projects WHERE project_code = ?', [projectCode]);
        
        if (projects.length === 0) {
            console.log('Khong tim thay du an:', projectCode);
            process.exit(1);
        }
        
        const projectId = projects[0].id;
        console.log('Project ID:', projectId);
        console.log('Project Code:', projects[0].project_code);
        console.log('Project Name:', projects[0].project_name);
        
        // Lấy dữ liệu thô
        const [materials] = await db.query('SELECT * FROM project_materials WHERE project_id = ?', [projectId]);
        console.log('\nSo luong vat tu (raw):', materials.length);
        
        if (materials.length > 0) {
            console.log('\nChi tiet vat tu (raw):');
            materials.forEach((m, i) => {
                console.log(`\n${i+1}. ID: ${m.id}`);
                console.log('   material_type:', m.material_type);
                console.log('   material_id:', m.material_id);
                console.log('   material_name:', m.material_name);
                console.log('   quantity:', m.quantity);
                console.log('   unit:', m.unit);
                console.log('   item_name:', m.item_name);
                console.log('   quantity_used:', m.quantity_used);
                console.log('   item_unit:', m.item_unit);
                console.log('   unit_price:', m.unit_price);
                console.log('   total_cost:', m.total_cost);
                console.log('   inventory_id:', m.inventory_id);
                console.log('   accessory_id:', m.accessory_id);
            });
        }
        
        // Test query giống như trong controller
        const [rows] = await db.query(
            `SELECT 
                pm.id,
                pm.project_id,
                p.project_code,
                p.project_name,
                COALESCE(pm.material_name, pm.item_name) as material_name,
                COALESCE(pm.quantity, pm.quantity_used) as quantity,
                COALESCE(pm.unit, pm.item_unit) as unit,
                pm.unit_price,
                pm.total_cost,
                pm.notes,
                pm.created_at,
                pm.updated_at,
                COALESCE(pm.material_type, 
                    CASE 
                        WHEN pm.accessory_id IS NOT NULL THEN 'accessory'
                        WHEN pm.inventory_id IS NOT NULL THEN 
                            COALESCE(
                                (SELECT item_type FROM inventory WHERE id = pm.inventory_id LIMIT 1),
                                'other'
                            )
                        ELSE 'other'
                    END
                ) as material_type,
                COALESCE(pm.material_id, pm.inventory_id, pm.accessory_id) as material_id
             FROM project_materials pm
             LEFT JOIN projects p ON pm.project_id = p.id
             WHERE pm.project_id = ?
             ORDER BY pm.created_at DESC`,
            [projectId]
        );
        
        console.log('\n\nSo luong vat tu (processed query):', rows.length);
        console.log('\nChi tiet vat tu (processed):');
        rows.forEach((m, i) => {
            console.log(`\n${i+1}. ID: ${m.id}`);
            console.log('   material_type:', m.material_type);
            console.log('   material_id:', m.material_id);
            console.log('   material_name:', m.material_name);
            console.log('   quantity:', m.quantity);
            console.log('   unit:', m.unit);
            console.log('   unit_price:', m.unit_price);
            console.log('   total_cost:', m.total_cost);
        });
        
        // Tính tổng chi phí
        const totalCost = rows.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
        console.log('\n\nTong chi phi:', totalCost);
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        console.error(e.stack);
        process.exit(1);
    }
}

checkProjectMaterials();













