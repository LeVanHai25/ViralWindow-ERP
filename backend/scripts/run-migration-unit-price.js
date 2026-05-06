const db = require("../config/db");
const fs = require("fs");
const path = require("path");

async function runMigration() {
    console.log("🔄 Đang chạy migration: Thêm cột unit_price vào bảng aluminum_systems...");
    const migrationSqlPath = path.join(__dirname, "../sql/add_unit_price_to_aluminum_systems.sql");
    const sql = fs.readFileSync(migrationSqlPath, "utf8");

    try {
        // Kiểm tra xem cột đã tồn tại chưa
        const [columns] = await db.query("SHOW COLUMNS FROM aluminum_systems LIKE 'unit_price'");
        
        if (columns.length > 0) {
            console.log("✅ Cột unit_price đã tồn tại trong bảng aluminum_systems");
            console.log("📋 Thông tin cột unit_price:");
            console.log(JSON.stringify(columns[0], null, 2));
        } else {
            // Chạy migration nếu cột chưa tồn tại
            // Loại bỏ IF NOT EXISTS vì MySQL có thể không hỗ trợ
            const sqlWithoutIfNotExists = sql.replace(/IF NOT EXISTS/g, '');
            await db.query(sqlWithoutIfNotExists);
            console.log("✅ Migration thành công! Đã thêm cột unit_price vào bảng aluminum_systems");

            // Verify the column was added
            const [newColumns] = await db.query("SHOW COLUMNS FROM aluminum_systems LIKE 'unit_price'");
            if (newColumns.length > 0) {
                console.log("📋 Thông tin cột unit_price:");
                console.log(JSON.stringify(newColumns[0], null, 2));
            } else {
                console.log("❌ Không tìm thấy cột unit_price sau migration.");
            }
        }
    } catch (error) {
        // Nếu lỗi là do cột đã tồn tại, bỏ qua
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("✅ Cột unit_price đã tồn tại trong bảng aluminum_systems");
        } else {
            console.error("❌ Lỗi khi chạy migration:", error.message);
            console.error("Error details:", error);
        }
    } finally {
        process.exit();
    }
}

runMigration();

















