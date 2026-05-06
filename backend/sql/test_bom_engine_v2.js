// Test: Create sample item and calculate BOM
const db = require('../config/db');
const calcEngine = require('../services/calcEngineV2');

async function test() {
    console.log('🧪 Testing BOM Engine V2 Integration...\n');

    try {
        // 1. Find or create a project
        let [projects] = await db.query('SELECT id FROM projects LIMIT 1');
        let projectId = projects[0]?.id;
        if (!projectId) {
            const [r] = await db.query("INSERT INTO projects (project_name, status) VALUES ('Test V2', 'draft')");
            projectId = r.insertId;
        }
        console.log('Using project ID:', projectId);

        // 2. Create project_item
        const [itemResult] = await db.query(`
            INSERT INTO project_items_v2 (project_id, item_type, item_code, item_name, quantity, status)
            VALUES (?, 'door', 'TEST-VWDOOR-1L', 'Cửa đi test VW55', 1, 'draft')
        `, [projectId]);
        const itemId = itemResult.insertId;
        console.log('Created item ID:', itemId);

        // 3. Create version
        const [vResult] = await db.query(`
            INSERT INTO item_versions (project_item_id, version_number, status)
            VALUES (?, 1, 'current')
        `, [itemId]);
        const versionId = vResult.insertId;
        console.log('Created version ID:', versionId);

        // 4. Create config with template_code
        await db.query(`
            INSERT INTO item_config (item_version_id, width_mm, height_mm, leaf_count, aluminum_system, template_code)
            VALUES (?, 1000, 2400, 1, 'VW-AL55', 'VWDOOR_1L')
        `, [versionId]);
        console.log('Created config with template_code: VWDOOR_1L\n');

        // 5. Calculate BOM
        console.log('📊 Calculating BOM...');
        const result = await calcEngine.calculateBOM(itemId);

        if (result.success) {
            console.log('\n✅ SUCCESS!\n');
            console.log('Template:', result.config.template_code);
            console.log('Size:', result.config.width_mm, 'x', result.config.height_mm, 'mm');
            console.log('\n--- BOM Summary ---');
            console.log('Aluminum:', result.summary.aluminum_kg, 'kg');
            console.log('Glass:', result.summary.glass_m2, 'm²');
            console.log('Hardware:', result.summary.hardware_count, 'pcs');
            console.log('\n--- Aluminum Lines ---');
            for (const line of result.bom.aluminum.lines) {
                console.log(`  ${line.material_name}: ${line.length_mm}mm x ${line.quantity} = ${line.total_weight_kg}kg`);
            }
            console.log('\n--- Glass Lines ---');
            for (const line of result.bom.glass.lines) {
                console.log(`  ${line.material_name}: ${line.width_mm}x${line.height_mm}mm = ${line.area_m2}m²`);
            }
        } else {
            console.log('❌ FAILED:', result.error);
        }

        // Cleanup
        await db.query('DELETE FROM item_config WHERE item_version_id = ?', [versionId]);
        await db.query('DELETE FROM item_versions WHERE id = ?', [versionId]);
        await db.query('DELETE FROM project_items_v2 WHERE id = ?', [itemId]);
        console.log('\n🧹 Cleaned up test data');

    } catch (err) {
        console.error('Error:', err);
    }

    process.exit(0);
}

test();
