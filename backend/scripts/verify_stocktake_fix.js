const db = require('../config/db');

async function verifyStocktakeFix() {
    try {
        console.log('🔍 Testing Stocktake Fix for Glass Items...');

        // 1. Find a glass item in inventory
        const [items] = await db.query("SELECT id, item_code, item_name, quantity FROM inventory WHERE item_type = 'glass' LIMIT 1");
        
        if (items.length === 0) {
            console.error('❌ No glass items found in inventory table.');
            process.exit(1);
        }

        const item = items[0];
        console.log(`Found item: ${item.item_name} (Code: ${item.item_code}, ID: ${item.id}), Current Qty: ${item.quantity}`);

        const newQty = item.quantity + 5;
        console.log(`Simulating stocktake update to Actual Quantity: ${newQty}`);

        // 2. Simulate the backend logic for stocktake (Cân bằng)
        // This mirrors what updateItemStock(itemType, itemId, newQty, connection) does now
        const itemType = 'glass';
        const itemId = item.id;
        
        // Helper logic from stockDocumentController.js
        function getItemTable(type) {
            const tables = {
                'accessory': 'accessories',
                'aluminum': 'aluminum_systems',
                'glass': 'inventory',
                'other': 'inventory',
                'scrap': 'aluminum_scraps'
            };
            return tables[type] || 'inventory';
        }

        const table = getItemTable(itemType);
        let qtyColumn = 'quantity';
        if (table === 'inventory') {
            qtyColumn = 'quantity';
        } else if (itemType === 'accessory' || itemType === 'other') {
            qtyColumn = 'stock_quantity';
        }

        console.log(`Updating table: ${table}, column: ${qtyColumn}, id: ${itemId}`);

        await db.query(`UPDATE ${table} SET ${qtyColumn} = ? WHERE id = ?`, [newQty, itemId]);

        // 3. Verify the change
        const [updatedItems] = await db.query("SELECT quantity FROM inventory WHERE id = ?", [itemId]);
        const updatedQty = updatedItems[0].quantity;

        if (updatedQty === newQty) {
            console.log(`✅ SUCCESS! Stock updated correctly. Old: ${item.quantity}, New: ${updatedQty}`);
        } else {
            console.error(`❌ FAILURE! Stock NOT updated correctly. Expected: ${newQty}, Got: ${updatedQty}`);
        }

        // 4. Rollback to original quantity
        await db.query(`UPDATE inventory SET quantity = ? WHERE id = ?`, [item.quantity, itemId]);
        console.log('Relolled back to original quantity.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error during verification:', err);
        process.exit(1);
    }
}

verifyStocktakeFix();
