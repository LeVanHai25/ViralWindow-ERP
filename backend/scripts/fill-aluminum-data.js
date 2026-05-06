const db = require("../config/db");

async function fillAluminumData() {
    try {
        console.log("🔄 Đang kiểm tra dữ liệu hệ nhôm...\n");

        // 1. Kiểm tra dữ liệu hiện tại
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN length_m IS NULL THEN 1 ELSE 0 END) as null_length,
                SUM(CASE WHEN color IS NULL OR color = '' THEN 1 ELSE 0 END) as null_color,
                SUM(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 ELSE 0 END) as null_price
            FROM aluminum_systems 
            WHERE is_active = 1
        `);

        console.log("📊 Thống kê dữ liệu trống:");
        console.log(`   - Tổng số bản ghi: ${stats[0].total}`);
        console.log(`   - Độ dài (length_m) trống: ${stats[0].null_length}`);
        console.log(`   - Màu (color) trống: ${stats[0].null_color}`);
        console.log(`   - Giá (unit_price) trống hoặc = 0: ${stats[0].null_price}\n`);

        // 2. Lấy danh sách các bản ghi cần cập nhật
        const [records] = await db.query(`
            SELECT id, code, name, brand, thickness_mm, length_m, color, unit_price
            FROM aluminum_systems 
            WHERE is_active = 1
            AND (length_m IS NULL OR color IS NULL OR color = '' OR unit_price IS NULL OR unit_price = 0)
        `);

        console.log(`📋 Tìm thấy ${records.length} bản ghi cần cập nhật:\n`);

        // 3. Cập nhật dữ liệu
        let updated = 0;
        for (const record of records) {
            const updates = [];
            const values = [];

            // Cập nhật length_m nếu NULL (mặc định 6.0 mét)
            if (record.length_m === null) {
                updates.push('length_m = ?');
                values.push(6.0);
                console.log(`   - ${record.code}: Thêm độ dài = 6.0m`);
            }

            // Cập nhật color nếu NULL hoặc rỗng (mặc định "Trắng")
            if (!record.color || record.color.trim() === '') {
                updates.push('color = ?');
                values.push('Trắng');
                console.log(`   - ${record.code}: Thêm màu = "Trắng"`);
            }

            // Cập nhật unit_price nếu NULL hoặc = 0 (mặc định 50000 VNĐ)
            if (!record.unit_price || record.unit_price == 0) {
                updates.push('unit_price = ?');
                values.push(50000);
                console.log(`   - ${record.code}: Thêm giá = 50,000 VNĐ`);
            }

            if (updates.length > 0) {
                values.push(record.id);
                await db.query(
                    `UPDATE aluminum_systems SET ${updates.join(', ')} WHERE id = ?`,
                    values
                );
                updated++;
            }
        }

        console.log(`\n✅ Đã cập nhật ${updated} bản ghi!`);

        // 4. Kiểm tra lại sau khi cập nhật
        const [statsAfter] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN length_m IS NULL THEN 1 ELSE 0 END) as null_length,
                SUM(CASE WHEN color IS NULL OR color = '' THEN 1 ELSE 0 END) as null_color,
                SUM(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 ELSE 0 END) as null_price
            FROM aluminum_systems 
            WHERE is_active = 1
        `);

        console.log("\n📊 Thống kê sau khi cập nhật:");
        console.log(`   - Tổng số bản ghi: ${statsAfter[0].total}`);
        console.log(`   - Độ dài (length_m) trống: ${statsAfter[0].null_length}`);
        console.log(`   - Màu (color) trống: ${statsAfter[0].null_color}`);
        console.log(`   - Giá (unit_price) trống hoặc = 0: ${statsAfter[0].null_price}`);

    } catch (error) {
        console.error("❌ Lỗi:", error);
    } finally {
        process.exit();
    }
}

fillAluminumData();

