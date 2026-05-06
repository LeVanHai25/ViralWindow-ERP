const db = require('../config/db');

async function migrate() {
    try {
        console.log('🚀 Bất đầu khởi tạo cấu trúc dữ liệu mới...');

        // 1. Tạo bảng catalog_materials (Cho Bảng Vật Tư - Product Catalog)
        console.log('--- Tạo bảng catalog_materials ---');
        await db.query(`
            CREATE TABLE IF NOT EXISTS catalog_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                unit VARCHAR(50) DEFAULT 'cái',
                sale_price DECIMAL(15, 2) DEFAULT 0,
                category VARCHAR(100) NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng catalog_materials đã sẵn sàng.');

        // 2. Kiểm tra lại bảng inventory (Cho Kho hàng - Warehouse)
        // Chúng ta đã kiểm tra item_type có enum('aluminum','glass','accessory','other')
        console.log('--- Kiểm tra bảng inventory ---');
        // Không cần thay đổi gì thêm nếu enum đã đúng.

        console.log('✨ Hoàn tất khởi tạo database.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi migration:', err);
        process.exit(1);
    }
}

migrate();
