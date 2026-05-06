// Seed products from products-data.js into product_catalog table
const db = require('../config/db');
const path = require('path');

// products-data.js exports PRODUCTS_DATA via module.exports
const { PRODUCTS_DATA } = require(path.join(__dirname, '../../FontEnd/js/products-data.js'));

async function seedProducts() {
    console.log('Found ' + PRODUCTS_DATA.length + ' products to seed');

    // Check if table already has data
    const [existing] = await db.query('SELECT COUNT(*) as cnt FROM product_catalog');
    if (existing[0].cnt > 0) {
        console.log('Table already has ' + existing[0].cnt + ' rows. Skipping seed.');
        process.exit(0);
        return;
    }

    let count = 0;
    for (const p of PRODUCTS_DATA) {
        try {
            await db.query(
                'INSERT INTO product_catalog (code, group_code, group_name, name, accessory, accessory_price, prices_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    p.code,
                    p.groupCode || '',
                    p.groupName || '',
                    p.name,
                    p.accessory || null,
                    p.accessoryPrice || 0,
                    JSON.stringify(p.prices || {})
                ]
            );
            count++;
        } catch (e) {
            console.error('Error inserting product ' + p.code + ': ' + e.message);
        }
    }

    console.log('Seeded ' + count + '/' + PRODUCTS_DATA.length + ' products into product_catalog');
    process.exit(0);
}

seedProducts().catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
});
