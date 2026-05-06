const db = require("../config/db");

async function deleteOldInventoryData() {
    try {
        console.log("=".repeat(60));
        console.log("XÓA DỮ LIỆU CŨ TRONG BẢNG INVENTORY");
        console.log("=".repeat(60));

        // 1. Hiển thị dữ liệu sẽ bị xóa
        console.log("\n📋 Dữ liệu sẽ bị xóa:");
        const [oldData] = await db.query(`
            SELECT id, item_code, item_name, item_type, quantity, unit_price,
                   quantity * unit_price as total_value
            FROM inventory
        `);

        oldData.forEach(item => {
            console.log(`   ID ${item.id}: ${item.item_code} (${item.item_type}) - ${Number(item.total_value || 0).toLocaleString('vi-VN')}đ`);
        });

        // 2. Backup trước khi xóa (hiển thị SQL để restore nếu cần)
        console.log("\n💾 Backup SQL (copy nếu cần khôi phục):");
        oldData.forEach(item => {
            console.log(`INSERT INTO inventory (id, item_code, item_name, item_type, quantity, unit_price) VALUES (${item.id}, '${item.item_code}', '${item.item_name || ''}', '${item.item_type || ''}', ${item.quantity}, ${item.unit_price});`);
        });

        // 3. Xóa dữ liệu
        console.log("\n🗑️ Đang xóa dữ liệu...");
        const [deleteResult] = await db.query(`DELETE FROM inventory`);
        console.log(`   ✅ Đã xóa ${deleteResult.affectedRows} bản ghi`);

        // 4. Kiểm tra lại
        console.log("\n🔍 Kiểm tra sau khi xóa:");
        const [remaining] = await db.query(`SELECT COUNT(*) as count FROM inventory`);
        console.log(`   - Số bản ghi còn lại: ${remaining[0].count}`);

        // 5. Tính lại tổng giá trị tồn kho
        console.log("\n📊 Giá trị tồn kho mới:");

        const [accStats] = await db.query(`
            SELECT SUM(stock_quantity * COALESCE(sale_price, purchase_price, 0)) as total
            FROM accessories WHERE is_active = 1
        `);
        console.log(`   - Phụ kiện: ${Number(accStats[0].total || 0).toLocaleString('vi-VN')}đ`);

        const [aluStats] = await db.query(`
            SELECT SUM(COALESCE(quantity, 0) * COALESCE(unit_price, 0)) as total
            FROM aluminum_systems WHERE is_active = 1
        `);
        console.log(`   - Hệ nhôm: ${Number(aluStats[0].total || 0).toLocaleString('vi-VN')}đ`);

        const totalNew = (parseFloat(accStats[0].total) || 0) + (parseFloat(aluStats[0].total) || 0);
        console.log(`   - TỔNG MỚI: ${totalNew.toLocaleString('vi-VN')}đ`);

        console.log("\n" + "=".repeat(60));
        console.log("✅ HOÀN THÀNH - Refresh trang inventory để xem kết quả mới");
        console.log("=".repeat(60));

        process.exit(0);
    } catch (err) {
        console.error("❌ Lỗi:", err);
        process.exit(1);
    }
}

deleteOldInventoryData();
