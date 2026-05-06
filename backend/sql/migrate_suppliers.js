/**
 * Migration: Create suppliers table
 * Quản lý Nhà cung cấp (NCC) cho phiếu nhập kho
 */
const db = require('../config/db');

async function migrate() {
    console.log('🔄 Creating suppliers table...');

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Mã NCC',
                name VARCHAR(255) NOT NULL COMMENT 'Tên nhà cung cấp',
                contact_person VARCHAR(100) COMMENT 'Người liên hệ',
                phone VARCHAR(20) COMMENT 'Số điện thoại',
                email VARCHAR(100) COMMENT 'Email',
                address TEXT COMMENT 'Địa chỉ',
                tax_code VARCHAR(20) COMMENT 'Mã số thuế',
                bank_account VARCHAR(50) COMMENT 'Số tài khoản',
                bank_name VARCHAR(100) COMMENT 'Tên ngân hàng',
                note TEXT COMMENT 'Ghi chú',
                is_active TINYINT(1) DEFAULT 1 COMMENT 'Đang hoạt động',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_code (code),
                INDEX idx_name (name),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            COMMENT='Bảng quản lý nhà cung cấp'
        `);
        console.log('✅ Created table: suppliers');

        // Add sample data
        const [existing] = await db.query('SELECT COUNT(*) as count FROM suppliers');
        if (existing[0].count === 0) {
            await db.query(`
                INSERT INTO suppliers (code, name, contact_person, phone, address, note) VALUES
                ('NCC001', 'Nhôm Xingfa Việt Nam', 'Anh Minh', '0901234567', 'KCN Tân Bình, TP.HCM', 'Nhà cung cấp nhôm chính'),
                ('NCC002', 'Kính An Toàn Việt', 'Chị Hương', '0912345678', 'Quận 12, TP.HCM', 'Chuyên kính cường lực'),
                ('NCC003', 'Phụ Kiện Cửa Nhôm ABC', 'Anh Tuấn', '0923456789', 'Bình Dương', 'Phụ kiện đa dạng')
            `);
            console.log('✅ Added sample suppliers');
        }

        console.log('✅ Migration completed!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }

    process.exit(0);
}

migrate();
