const db = require('../config/db');

async function migrate() {
    try {
        console.log('🔄 Creating product_groups table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS product_groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(20) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ product_groups table created');

        console.log('🔄 Creating product_catalog table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS product_catalog (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL,
                group_code VARCHAR(20) DEFAULT '',
                group_name VARCHAR(255) DEFAULT '',
                name TEXT NOT NULL,
                accessory VARCHAR(100) DEFAULT NULL,
                accessory_price DECIMAL(15,2) DEFAULT 0,
                prices_json LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ product_catalog table created');

        // Check if data already exists
        const [[{ gc }]] = await db.query('SELECT COUNT(*) as gc FROM product_groups');
        if (gc > 0) {
            console.log(`ℹ️ product_groups already has ${gc} rows, skipping seed`);
        } else {
            console.log('🔄 Seeding product_groups...');
            const groups = [
                ['VRA', 'Vách kính cố định'], ['VRA', 'Cửa sổ mở trượt 84'], ['VRA', 'Cửa sổ mở trượt 64'],
                ['VRA', 'Cửa sổ mở hất 50'], ['VRA', 'Cửa sổ mở quay 50'], ['VRA', 'Cửa sổ mở lật 50'],
                ['VRA', 'Cửa đi mở quay 50'], ['VRA', 'Cửa sổ mở hất 55'], ['VRA', 'Cửa sổ mở quay 55'],
                ['VRA', 'Cửa sổ mở lật 55'], ['VRA', 'Cửa đi mở quay 55'], ['VRA', 'Cửa đi mở trượt 94'],
                ['VRE', 'Cửa sổ mở trượt 64'], ['VRE', 'Cửa sổ mở hất 50'], ['VRE', 'Cửa sổ mở quay 50'],
                ['VRE', 'Cửa đi mở quay 50'], ['VRE', 'Cửa sổ mở hất 55'], ['VRE', 'Cửa sổ mở quay 55'],
                ['VRE', 'Cửa đi mở quay 55'], ['VRE', 'Cửa đi mở trượt 94'], ['VRE', 'Vách kính cố định'],
                ['VRE', 'Cửa sổ mở quay 65'], ['VRE', 'Cửa sổ mở hất 65'], ['VRE', 'Cửa sổ mở quay/ lật 65'],
                ['VRE', 'Cửa đi mở quay 65'], ['VRE', 'Cửa sổ mở trượt 94'], ['VRE', 'Cửa đi mở trượt 120'],
                ['CHOP', 'Chốp nhôm cố định']
            ];
            for (const [code, name] of groups) {
                await db.query('INSERT INTO product_groups (code, name) VALUES (?, ?)', [code, name]);
            }
            console.log(`✅ Seeded ${groups.length} product_groups`);
        }

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
