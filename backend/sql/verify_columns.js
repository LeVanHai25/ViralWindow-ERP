const db = require('../config/db');

async function verify() {
    try {
        console.log('=== Verifying quotations table ===');
        const [cols1] = await db.query('SHOW COLUMNS FROM quotations');
        console.log('All columns:', cols1.map(c => c.Field).join(', '));

        const newCols1 = ['version', 'parent_quotation_id', 'creator_name', 'discount_percent', 'vat_percent', 'shipping_fee'];
        const found1 = cols1.filter(c => newCols1.includes(c.Field));
        console.log('\nNew columns found:', found1.map(c => c.Field).join(', ') || 'NONE');

        console.log('\n=== Verifying quotation_items table ===');
        const [cols2] = await db.query('SHOW COLUMNS FROM quotation_items');
        console.log('All columns:', cols2.map(c => c.Field).join(', '));

        const newCols2 = ['code', 'spec', 'glass', 'accessories', 'width', 'height', 'area', 'accessory_price'];
        const found2 = cols2.filter(c => newCols2.includes(c.Field));
        console.log('\nNew columns found:', found2.map(c => c.Field).join(', ') || 'NONE');

        console.log('\n=== Summary ===');
        console.log('quotations: ' + (found1.length === newCols1.length ? 'OK - All columns exist' : 'MISSING: ' + newCols1.filter(n => !found1.map(f => f.Field).includes(n)).join(', ')));
        console.log('quotation_items: ' + (found2.length === newCols2.length ? 'OK - All columns exist' : 'MISSING: ' + newCols2.filter(n => !found2.map(f => f.Field).includes(n)).join(', ')));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

verify();
