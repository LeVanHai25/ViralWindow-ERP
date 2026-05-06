const db = require('../config/db');

async function restoreWarehouseData() {
    try {
        console.log('🚀 Senior Architect: Starting Warehouse Data Restoration...');

        // 1. Move all "Ke", "Gioăng", "Nhựa ốp", "Keo", "Khác" from accessories to inventory (item_type = 'other')
        console.log('--- Restoring "Vật tư phụ" to inventory ---');
        const vatTuPhuCategories = ['Ke', 'Gioăng', 'Nhựa ốp', 'Keo', 'Khác'];
        const [others] = await db.query(`
            SELECT * FROM accessories 
            WHERE category IN (${vatTuPhuCategories.map(() => '?').join(',')})
        `, vatTuPhuCategories);

        for (const other of others) {
            await db.query(`
                INSERT INTO inventory (item_code, item_name, item_type, unit, quantity, unit_price, notes, image_url, min_stock_level, max_stock_level)
                VALUES (?, ?, 'other', ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    quantity = VALUES(quantity), 
                    unit_price = VALUES(unit_price),
                    notes = VALUES(notes),
                    image_url = VALUES(image_url)
            `, [
                other.code || ('OP-' + other.id),
                other.name,
                other.unit || 'cái',
                other.stock_quantity || 0,
                other.purchase_price || 0,
                other.category, // Store category in notes override
                other.image_path || null,
                other.min_stock_level || 10,
                other.max_stock_level || 100
            ]);
        }
        console.log(`✅ Restored ${others.length} other materials to inventory.`);

        // 2. Ensure ALL glass from glass_items is in inventory (item_type = 'glass')
        // We handle synchronization to ensure no glass is left behind for the warehouse view.
        console.log('--- Synchronizing Glass Items to inventory ---');
        const [glasses] = await db.query('SELECT * FROM glass_items');
        for (const glass of glasses) {
            await db.query(`
                INSERT INTO inventory (item_code, item_name, item_type, unit, quantity, unit_price, notes, min_stock_level, max_stock_level)
                VALUES (?, ?, 'glass', 'm2', ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    quantity = VALUES(quantity), 
                    unit_price = VALUES(unit_price),
                    notes = VALUES(notes)
            `, [
                glass.code || ('G-' + glass.id),
                glass.name,
                glass.quantity || 0,
                glass.price || 0,
                glass.structure || '',
                glass.min_stock_level || 10,
                glass.max_stock_level || 100
            ]);
        }
        console.log(`✅ Synchronized ${glasses.length} glass items to inventory.`);

        // 3. Cleanup: Remove "vật tư phụ" categories from accessories to avoid confusion
        // Only keep "Phụ kiện" (Accessories) and "vật tư" (Catalog prices we just moved to catalog_materials)
        // Actually, we should keep 'vật tư' in accessories ONLY IF they are still used by something, 
        // but our plan said to move them to catalog_materials.
        console.log('--- Cleaning up accessories table ---');
        const [cleanup] = await db.query(`
            DELETE FROM accessories 
            WHERE category IN (${vatTuPhuCategories.map(() => '?').join(',')})
        `, vatTuPhuCategories);
        console.log(`✅ Cleaned up ${cleanup.affectedRows} redundant records from accessories.`);

        console.log('✨ Restoration complete. All warehouse data is now in inventory.html (inventory table).');
        process.exit(0);
    } catch (err) {
        console.error('❌ Restoration Error:', err);
        process.exit(1);
    }
}

restoreWarehouseData();
