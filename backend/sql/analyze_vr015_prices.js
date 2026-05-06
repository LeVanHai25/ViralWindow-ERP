// Script to analyze VR015 BOM items prices from database
const mysql = require('mysql2/promise');

async function analyzeVR015Prices() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'viral_window_db'
    });

    console.log('\\n=== VR015 BOM Price Analysis ===\\n');

    // BOM items from VR015
    const bomItems = [
        // Nhom (Aluminum)
        { type: 'aluminum', code: 'AL5506', name: 'Đố T', qty: 2 },
        { type: 'aluminum', code: 'ALUK-EU-C6518', name: 'Chắn nước', qty: 2 },
        { type: 'aluminum', code: 'C22900', name: 'Ốp chân cánh cửa đi (mới)', qty: 3 },
        // Kinh (Glass)
        { type: 'glass', code: 'K22', name: 'Kính dán 12.38mm Solar control', qty: 1 },
        { type: 'glass', code: 'K-002', name: 'Kính dán an toàn 2 lớp 8.38mm', qty: 1 },
        // Vattu
        { type: 'accessory', code: 'GL-5x4-D', name: 'Gioăng Lông 5*4 màu đen', qty: 10 },
        { type: 'accessory', code: 'KE-CL12006', name: 'Ke cánh hệ lùa 12006', qty: 10 },
        // Phukien
        { type: 'accessory', code: 'CM-BL4D-B', name: 'Bản lề 4D Cmech màu bạc', qty: 2 },
        { type: 'accessory', code: 'CM-BL4D-D', name: 'Bản lề 4D Cmech màu đồng', qty: 10 },
        { type: 'accessory', code: 'CM-BXD', name: 'Bánh xe đôi cmech', qty: 2 },
        { type: 'accessory', code: 'KE-CL12006', name: 'Ke cánh hệ lùa 12006', qty: 10 },
        { type: 'accessory', code: 'KEO-A500TT', name: 'Keo trắng trong A500', qty: 2 },
    ];

    let totalCost = 0;
    const results = [];

    for (const item of bomItems) {
        let price = 0;
        let tableUsed = '';
        let priceField = '';

        if (item.type === 'aluminum') {
            const [rows] = await connection.query(
                `SELECT code, name, unit_price FROM aluminum_systems WHERE code = ?`,
                [item.code]
            );
            if (rows.length > 0) {
                price = parseFloat(rows[0].unit_price) || 0;
                tableUsed = 'aluminum_systems';
                priceField = 'unit_price';
            }
        } else if (item.type === 'glass') {
            const [rows] = await connection.query(
                `SELECT code, name, price FROM glass_items WHERE code = ?`,
                [item.code]
            );
            if (rows.length > 0) {
                price = parseFloat(rows[0].price) || 0;
                tableUsed = 'glass_items';
                priceField = 'price';
            }
        } else if (item.type === 'accessory') {
            const [rows] = await connection.query(
                `SELECT code, name, purchase_price, sale_price FROM accessories WHERE code = ?`,
                [item.code]
            );
            if (rows.length > 0) {
                price = parseFloat(rows[0].sale_price) || parseFloat(rows[0].purchase_price) || 0;
                tableUsed = 'accessories';
                priceField = rows[0].sale_price ? 'sale_price' : 'purchase_price';
            }
        }

        const itemCost = item.qty * price;
        totalCost += itemCost;

        results.push({
            code: item.code,
            name: item.name,
            qty: item.qty,
            price: price,
            cost: itemCost,
            table: tableUsed || 'NOT FOUND',
            priceField: priceField || 'N/A'
        });
    }

    console.log('Item Details:');
    console.log('-'.repeat(120));
    for (const r of results) {
        console.log(`${r.code.padEnd(15)} qty=${r.qty.toString().padStart(2)} price=${r.price.toString().padStart(12)} cost=${r.cost.toString().padStart(12)} [${r.table}::${r.priceField}] ${r.name}`);
    }
    console.log('-'.repeat(120));
    console.log(`TOTAL COST: ${totalCost.toLocaleString('vi-VN')} VND`);
    console.log(`Target: 38,967,000 VND`);
    console.log(`Difference: ${(38967000 - totalCost).toLocaleString('vi-VN')} VND`);

    // Find items with 0 price
    const missingPrices = results.filter(r => r.price === 0);
    if (missingPrices.length > 0) {
        console.log('\\n⚠️ Items with MISSING PRICES:');
        for (const m of missingPrices) {
            console.log(`  - ${m.code}: ${m.name} (qty=${m.qty})`);
        }
    }

    await connection.end();
}

analyzeVR015Prices().catch(console.error);
