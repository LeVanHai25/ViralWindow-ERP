const db = require('../config/db');

async function migrateData() {
    try {
        console.log('🚀 Bắt đầu di chuyển và phân tách dữ liệu...');

        // 1. Di chuyển "Vật tư" từ accessories sang catalog_materials (Bảng giá Catalog)
        console.log('--- Di chuyển Vật tư (Catalog) ---');
        const [mats] = await db.query("SELECT * FROM accessories WHERE category = 'vật tư'");
        for (const mat of mats) {
            await db.query(`
                INSERT INTO catalog_materials (code, name, unit, sale_price, category)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name = VALUES(name), sale_price = VALUES(sale_price)
            `, [mat.code || ('VT-' + mat.id), mat.name, mat.unit || 'cái', mat.sale_price || 0, 'Vật tư']);
        }
        console.log(`✅ Đã di chuyển ${mats.length} mục vật tư sang catalog_materials.`);

        // 2. Di chuyển "Vật tư phụ" từ accessories sang inventory (Kho hàng)
        console.log('--- Di chuyển Vật tư phụ (Kho hàng) ---');
        const [others] = await db.query("SELECT * FROM accessories WHERE category = 'Ke'");
        for (const other of others) {
            await db.query(`
                INSERT INTO inventory (item_code, item_name, item_type, unit, quantity, unit_price, notes)
                VALUES (?, ?, 'other', ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), unit_price = VALUES(unit_price)
            `, [other.code || ('OP-' + other.id), other.name, other.unit || 'cái', other.stock_quantity || 0, other.purchase_price || 0, 'Ke']);
        }
        console.log(`✅ Đã di chuyển ${others.length} mục vật tư phụ sang inventory.`);

        // 3. Di chuyển "Kính" từ glass_items sang inventory (Kho hàng)
        console.log('--- Di chuyển Kho Kính (Kho hàng) ---');
        const [glasses] = await db.query("SELECT * FROM glass_items");
        for (const glass of glasses) {
            // Chỉ di chuyển nếu có số lượng tồn kho (warehouse stock)
            // Hoặc di chuyển hết để đồng bộ Kho Kính ban đầu
            await db.query(`
                INSERT INTO inventory (item_code, item_name, item_type, unit, quantity, unit_price, notes)
                VALUES (?, ?, 'glass', 'm2', ?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), unit_price = VALUES(unit_price)
            `, [glass.code || ('G-' + glass.id), glass.name, glass.quantity || 0, glass.price || 0, glass.structure || '']);
        }
        console.log(`✅ Đã đồng bộ ${glasses.length} loại kính sang kho inventory.`);

        console.log('✨ Hoàn tất di chuyển dữ liệu.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi di chuyển dữ liệu:', err);
        process.exit(1);
    }
}

migrateData();
