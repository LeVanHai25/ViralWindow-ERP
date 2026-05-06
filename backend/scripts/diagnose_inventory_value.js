const db = require("../config/db");

async function diagnoseInventoryValue() {
    try {
        console.log("=".repeat(60));
        console.log("CHẨN ĐOÁN GIÁ TRỊ TỒN KHO");
        console.log("=".repeat(60));

        // 1. Kiểm tra phụ kiện (accessories)
        console.log("\n📦 1. PHỤ KIỆN (accessories):");
        const [accessoryStats] = await db.query(`
            SELECT 
                COUNT(*) as total_count,
                SUM(stock_quantity * COALESCE(sale_price, purchase_price, 0)) as total_value
            FROM accessories
            WHERE is_active = 1
        `);
        console.log(`   - Tổng số: ${accessoryStats[0].total_count}`);
        console.log(`   - Tổng giá trị: ${Number(accessoryStats[0].total_value || 0).toLocaleString('vi-VN')}đ`);

        // Chi tiết top 5 phụ kiện có giá trị cao nhất
        const [topAccessories] = await db.query(`
            SELECT 
                code, name, stock_quantity, 
                COALESCE(sale_price, purchase_price, 0) as price,
                stock_quantity * COALESCE(sale_price, purchase_price, 0) as value
            FROM accessories
            WHERE is_active = 1 AND stock_quantity * COALESCE(sale_price, purchase_price, 0) > 0
            ORDER BY value DESC
            LIMIT 5
        `);
        if (topAccessories.length > 0) {
            console.log("   - Top 5 có giá trị:");
            topAccessories.forEach(a => console.log(`     ${a.code}: ${a.stock_quantity} x ${a.price} = ${Number(a.value).toLocaleString('vi-VN')}đ`));
        }

        // 2. Kiểm tra hệ nhôm (aluminum_systems)
        console.log("\n🔧 2. HỆ NHÔM (aluminum_systems):");
        let aluminumStats;
        try {
            [aluminumStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_count,
                    SUM(COALESCE(quantity, 0) * COALESCE(unit_price, 0)) as total_value
                FROM aluminum_systems
                WHERE is_active = 1
            `);
            console.log(`   - Tổng số: ${aluminumStats[0].total_count}`);
            console.log(`   - Tổng giá trị: ${Number(aluminumStats[0].total_value || 0).toLocaleString('vi-VN')}đ`);

            // Chi tiết
            const [topAluminum] = await db.query(`
                SELECT 
                    code, name, 
                    COALESCE(quantity, 0) as quantity, 
                    COALESCE(unit_price, 0) as unit_price,
                    COALESCE(quantity, 0) * COALESCE(unit_price, 0) as value
                FROM aluminum_systems
                WHERE is_active = 1 AND COALESCE(quantity, 0) * COALESCE(unit_price, 0) > 0
                ORDER BY value DESC
                LIMIT 5
            `);
            if (topAluminum.length > 0) {
                console.log("   - Top 5 có giá trị:");
                topAluminum.forEach(a => console.log(`     ${a.code}: ${a.quantity} x ${a.unit_price} = ${Number(a.value).toLocaleString('vi-VN')}đ`));
            }
        } catch (err) {
            console.log(`   - Lỗi: ${err.message}`);
        }

        // 3. Kiểm tra bảng inventory (glass)
        console.log("\n🪟 3. KÍNH (inventory - glass):");
        try {
            const [glassStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_count,
                    SUM(COALESCE(quantity, 0) * COALESCE(unit_price, 0)) as total_value
                FROM inventory
                WHERE item_type = 'glass'
            `);
            console.log(`   - Tổng số: ${glassStats[0].total_count}`);
            console.log(`   - Tổng giá trị: ${Number(glassStats[0].total_value || 0).toLocaleString('vi-VN')}đ`);
        } catch (err) {
            console.log(`   - Lỗi hoặc không có bảng: ${err.message}`);
        }

        // 4. Kiểm tra bảng inventory (other)
        console.log("\n📋 4. KHÁC (inventory - other):");
        try {
            const [otherStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_count,
                    SUM(COALESCE(quantity, 0) * COALESCE(unit_price, 0)) as total_value
                FROM inventory
                WHERE item_type NOT IN ('glass', 'aluminum') 
                AND (item_type = 'other' OR item_type IS NULL OR item_type = '')
            `);
            console.log(`   - Tổng số: ${otherStats[0].total_count}`);
            console.log(`   - Tổng giá trị: ${Number(otherStats[0].total_value || 0).toLocaleString('vi-VN')}đ`);
        } catch (err) {
            console.log(`   - Lỗi: ${err.message}`);
        }

        // 5. Kiểm tra TẤT CẢ dữ liệu trong bảng inventory (có thể có dữ liệu ẩn)
        console.log("\n⚠️ 5. TOÀN BỘ BẢNG INVENTORY (có thể có dữ liệu cũ):");
        try {
            const [allInventory] = await db.query(`
                SELECT 
                    item_type, 
                    COUNT(*) as count,
                    SUM(COALESCE(quantity, 0) * COALESCE(unit_price, 0)) as total_value
                FROM inventory
                GROUP BY item_type
            `);
            console.log("   - Theo loại:");
            allInventory.forEach(row => {
                console.log(`     ${row.item_type || 'NULL'}: ${row.count} items, ${Number(row.total_value || 0).toLocaleString('vi-VN')}đ`);
            });

            // Kiểm tra dữ liệu có giá trị cao bất thường
            const [highValueInventory] = await db.query(`
                SELECT id, item_code, item_name, item_type, quantity, unit_price,
                       quantity * unit_price as total_value
                FROM inventory
                WHERE quantity * unit_price > 1000000
                ORDER BY quantity * unit_price DESC
                LIMIT 10
            `);
            if (highValueInventory.length > 0) {
                console.log("\n   - Dữ liệu có giá trị > 1M đồng:");
                highValueInventory.forEach(item => {
                    console.log(`     ID ${item.id}: ${item.item_code || 'N/A'} (${item.item_type || 'NULL'}) - ${item.quantity} x ${item.unit_price} = ${Number(item.total_value).toLocaleString('vi-VN')}đ`);
                });
            }

        } catch (err) {
            console.log(`   - Lỗi: ${err.message}`);
        }

        // 6. KIỂM TRA DỮ LIỆU BỊ XÓA MỀM (soft delete) - có thể is_deleted = true
        console.log("\n🗑️ 6. Kiểm tra cột is_deleted/deleted trong các bảng:");

        // Kiểm tra cấu trúc bảng accessories
        try {
            const [accCols] = await db.query("SHOW COLUMNS FROM accessories LIKE '%delete%'");
            console.log(`   - accessories: ${accCols.length > 0 ? 'Có cột deleted' : 'Không có cột deleted'}`);
        } catch (err) {
            console.log(`   - accessories: Lỗi - ${err.message}`);
        }

        // Kiểm tra cấu trúc bảng inventory
        try {
            const [invCols] = await db.query("SHOW COLUMNS FROM inventory LIKE '%delete%'");
            console.log(`   - inventory: ${invCols.length > 0 ? 'Có cột deleted' : 'Không có cột deleted'}`);
        } catch (err) {
            console.log(`   - inventory: Lỗi - ${err.message}`);
        }

        // Kiểm tra cấu trúc bảng aluminum_systems
        try {
            const [aluCols] = await db.query("SHOW COLUMNS FROM aluminum_systems LIKE '%delete%'");
            console.log(`   - aluminum_systems: ${aluCols.length > 0 ? 'Có cột deleted' : 'Không có cột deleted'}`);
        } catch (err) {
            console.log(`   - aluminum_systems: Lỗi - ${err.message}`);
        }

        console.log("\n" + "=".repeat(60));
        console.log("HOÀN THÀNH CHẨN ĐOÁN");
        console.log("=".repeat(60));

        process.exit(0);
    } catch (err) {
        console.error("Lỗi:", err);
        process.exit(1);
    }
}

diagnoseInventoryValue();
