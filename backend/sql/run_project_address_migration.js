// Run: node run_project_address_migration.js
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aluminium_window',
    multipleStatements: true
};

async function runMigration() {
    console.log('🚀 Starting migration: Add Agency and Construction Address...');

    const connection = await mysql.createConnection(config);

    try {
        // 1. Add agency_id and construction address columns to projects
        console.log('📋 Adding agency_id and construction address columns to projects...');

        // Check if columns exist first
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects'
        `, [process.env.DB_NAME || 'aluminium_window']);

        const existingColumns = columns.map(c => c.COLUMN_NAME);

        // Add agency_id if not exists
        if (!existingColumns.includes('agency_id')) {
            await connection.query(`
                ALTER TABLE projects 
                ADD COLUMN agency_id INT COMMENT 'ID Đại lý/Chi nhánh'
            `);
            console.log('  ✅ Added agency_id column');
        } else {
            console.log('  ⏭️ agency_id already exists');
        }

        // Add construction address columns
        if (!existingColumns.includes('construction_province')) {
            await connection.query(`
                ALTER TABLE projects 
                ADD COLUMN construction_province VARCHAR(100) COMMENT 'Tỉnh/Thành phố công trình'
            `);
            console.log('  ✅ Added construction_province column');
        } else {
            console.log('  ⏭️ construction_province already exists');
        }

        if (!existingColumns.includes('construction_district')) {
            await connection.query(`
                ALTER TABLE projects 
                ADD COLUMN construction_district VARCHAR(100) COMMENT 'Quận/Huyện công trình'
            `);
            console.log('  ✅ Added construction_district column');
        } else {
            console.log('  ⏭️ construction_district already exists');
        }

        if (!existingColumns.includes('construction_address')) {
            await connection.query(`
                ALTER TABLE projects 
                ADD COLUMN construction_address TEXT COMMENT 'Địa chỉ chi tiết công trình'
            `);
            console.log('  ✅ Added construction_address column');
        } else {
            console.log('  ⏭️ construction_address already exists');
        }

        // 2. Create agencies table if not exists
        console.log('🏢 Creating agencies table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS agencies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agency_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Mã đại lý/chi nhánh',
                agency_name VARCHAR(255) NOT NULL COMMENT 'Tên đại lý/chi nhánh',
                agency_type ENUM('branch', 'agency', 'dealer') DEFAULT 'agency' COMMENT 'Loại: chi nhánh/đại lý/đại lý cấp 2',
                parent_id INT COMMENT 'ID đại lý cha (nếu là đại lý con)',
                address TEXT COMMENT 'Địa chỉ',
                province VARCHAR(100) COMMENT 'Tỉnh/Thành phố',
                district VARCHAR(100) COMMENT 'Quận/Huyện',
                phone VARCHAR(50) COMMENT 'Số điện thoại',
                email VARCHAR(255) COMMENT 'Email',
                contact_person VARCHAR(255) COMMENT 'Người liên hệ',
                status ENUM('active', 'inactive') DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES agencies(id) ON DELETE SET NULL
            )
        `);
        console.log('  ✅ agencies table ready');

        // 3. Update customers table to have agency_id if not exists
        console.log('👥 Adding agency_id to customers table...');
        const [customerColumns] = await connection.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers'
        `, [process.env.DB_NAME || 'aluminium_window']);

        if (!customerColumns.map(c => c.COLUMN_NAME).includes('agency_id')) {
            await connection.query(`
                ALTER TABLE customers 
                ADD COLUMN agency_id INT COMMENT 'ID Đại lý/Chi nhánh quản lý'
            `);
            console.log('  ✅ Added agency_id to customers');
        } else {
            console.log('  ⏭️ customers.agency_id already exists');
        }

        // 4. Insert sample agencies if empty
        const [agencyCount] = await connection.query('SELECT COUNT(*) as count FROM agencies');
        if (agencyCount[0].count === 0) {
            console.log('📝 Inserting sample agencies...');
            await connection.query(`
                INSERT INTO agencies (agency_code, agency_name, agency_type, province, district, phone) VALUES
                ('HN-TT', 'Chi nhánh Hà Nội - Trung tâm', 'branch', 'Hà Nội', 'Cầu Giấy', '024-1234-5678'),
                ('HN-HD', 'Chi nhánh Hà Đông', 'branch', 'Hà Nội', 'Hà Đông', '024-2345-6789'),
                ('DL-BN', 'Đại lý Bắc Ninh', 'agency', 'Bắc Ninh', 'TP Bắc Ninh', '0222-123-456'),
                ('DL-HP', 'Đại lý Hải Phòng', 'agency', 'Hải Phòng', 'Ngô Quyền', '0225-234-567'),
                ('HCM-TT', 'Chi nhánh TP.HCM - Trung tâm', 'branch', 'TP.HCM', 'Quận 1', '028-9876-5432')
            `);
            console.log('  ✅ Inserted 5 sample agencies');
        }

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration error:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
