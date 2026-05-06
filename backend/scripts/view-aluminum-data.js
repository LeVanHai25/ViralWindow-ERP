const db = require("../config/db");

async function viewAluminumData() {
    try {
        console.log("📋 Danh sách hệ nhôm đầy đủ:\n");

        const [rows] = await db.query(`
            SELECT 
                code as 'MÃ',
                name as 'TÊN THANH NHÔM',
                brand as 'HÃNG',
                thickness_mm as 'ĐỘ DÀY (MM)',
                length_m as 'ĐỘ DÀI (M)',
                color as 'MÀU',
                unit_price as 'GIÁ (VNĐ)'
            FROM aluminum_systems 
            WHERE is_active = 1
            ORDER BY code ASC
        `);

        console.log("┌─────────────┬──────────────────────────┬──────────────┬──────────────┬──────────────┬──────────┬──────────────┐");
        console.log("│ MÃ          │ TÊN THANH NHÔM           │ HÃNG         │ ĐỘ DÀY (MM)  │ ĐỘ DÀI (M)   │ MÀU      │ GIÁ (VNĐ)    │");
        console.log("├─────────────┼──────────────────────────┼──────────────┼──────────────┼──────────────┼──────────┼──────────────┤");

        rows.forEach(row => {
            const code = (row['MÃ'] || '').padEnd(11);
            const name = (row['TÊN THANH NHÔM'] || '').substring(0, 24).padEnd(24);
            const brand = (row['HÃNG'] || '').substring(0, 12).padEnd(12);
            const thickness = (row['ĐỘ DÀY (MM)'] || '-').toString().padEnd(12);
            const length = (row['ĐỘ DÀI (M)'] || '-').toString().padEnd(12);
            const color = (row['MÀU'] || '-').substring(0, 8).padEnd(8);
            const price = (row['GIÁ (VNĐ)'] || 0).toLocaleString('vi-VN').padEnd(12);
            
            console.log(`│ ${code} │ ${name} │ ${brand} │ ${thickness} │ ${length} │ ${color} │ ${price} │`);
        });

        console.log("└─────────────┴──────────────────────────┴──────────────┴──────────────┴──────────────┴──────────┴──────────────┘");
        console.log(`\n✅ Tổng cộng: ${rows.length} bản ghi`);

        // Thống kê
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN length_m IS NULL THEN 1 ELSE 0 END) as null_length,
                SUM(CASE WHEN color IS NULL OR color = '' THEN 1 ELSE 0 END) as null_color,
                SUM(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 ELSE 0 END) as null_price
            FROM aluminum_systems 
            WHERE is_active = 1
        `);

        console.log("\n📊 Thống kê:");
        console.log(`   - Tổng số bản ghi: ${stats[0].total}`);
        console.log(`   - Độ dài (length_m) trống: ${stats[0].null_length}`);
        console.log(`   - Màu (color) trống: ${stats[0].null_color}`);
        console.log(`   - Giá (unit_price) trống hoặc = 0: ${stats[0].null_price}`);

    } catch (error) {
        console.error("❌ Lỗi:", error);
    } finally {
        process.exit();
    }
}

viewAluminumData();

















