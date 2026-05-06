// Script to check VR015 project_materials vs priceMap
const mysql = require('mysql2/promise');

async function checkVR015Materials() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'viral_window_db'
    });

    console.log('\\n=== VR015 Project Materials Check ===\\n');

    // Get VR015 project_materials
    const [materials] = await connection.query(
        `SELECT pm.id, pm.material_type, pm.material_code, pm.material_name, pm.quantity
         FROM project_materials pm
         JOIN projects p ON pm.project_id = p.id
         WHERE p.project_code = 'VR015'
         AND pm.material_type IN ('aluminum', 'glass', 'accessory', 'phukien')
         ORDER BY pm.material_type`
    );

    console.log(`Found ${materials.length} materials in project_materials for VR015:\\n`);

    // Build priceMap same as backend
    const priceMap = {};

    // Accessories
    const [acc] = await connection.query(`SELECT code, name, sale_price, purchase_price FROM accessories`);
    acc.forEach(a => {
        const price = parseFloat(a.sale_price) || parseFloat(a.purchase_price) || 0;
        if (a.code) { priceMap[a.code.toLowerCase()] = price; priceMap[a.code.toUpperCase()] = price; }
        if (a.name) { priceMap[a.name.toLowerCase()] = price; }
    });

    // Aluminum
    const [alu] = await connection.query(`SELECT code, name, unit_price FROM aluminum_systems`);
    alu.forEach(a => {
        const price = parseFloat(a.unit_price) || 0;
        if (a.code) { priceMap[a.code.toLowerCase()] = price; priceMap[a.code.toUpperCase()] = price; }
        if (a.name) { priceMap[a.name.toLowerCase()] = price; }
    });

    // Glass
    const [glass] = await connection.query(`SELECT code, name, price FROM glass_items`);
    glass.forEach(g => {
        const price = parseFloat(g.price) || 0;
        if (g.code) { priceMap[g.code.toLowerCase()] = price; priceMap[g.code.toUpperCase()] = price; }
        if (g.name) { priceMap[g.name.toLowerCase()] = price; }
    });

    console.log(`PriceMap size: ${Object.keys(priceMap).length}\\n`);

    let totalCost = 0;
    for (const m of materials) {
        const code = (m.material_code || '').toLowerCase();
        const codeUpper = (m.material_code || '').toUpperCase();
        const name = (m.material_name || '').toLowerCase();
        const qty = parseFloat(m.quantity) || 0;

        const priceByCodeLower = priceMap[code] || 0;
        const priceByCodeUpper = priceMap[codeUpper] || 0;
        const priceByName = priceMap[name] || 0;
        const price = priceByCodeLower || priceByCodeUpper || priceByName || 0;
        const cost = qty * price;
        totalCost += cost;

        const matchStatus = price > 0 ? '✅' : '❌';
        console.log(`${matchStatus} [${m.material_type.padEnd(10)}] code="${m.material_code}" name="${m.material_name}" qty=${qty} => price=${price} cost=${cost}`);

        if (price === 0) {
            console.log(`   Searched: [${code}] = ${priceByCodeLower}, [${codeUpper}] = ${priceByCodeUpper}, [${name}] = ${priceByName}`);
        }
    }

    console.log(`\\n=== TOTAL: ${totalCost.toLocaleString('vi-VN')} VND ===`);
    console.log(`Target: 38,967,000 VND`);
    console.log(`Difference: ${(38967000 - totalCost).toLocaleString('vi-VN')} VND`);

    await connection.end();
}

checkVR015Materials().catch(console.error);
