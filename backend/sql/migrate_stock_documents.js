/**
 * Migration: Create Stock Documents tables
 * Run: node sql/migrate_stock_documents.js
 */

const db = require('../config/db');

async function migrate() {
    console.log('Starting migration for Stock Documents...\n');

    try {
        // 1. Create stock_documents table
        console.log('1. Creating stock_documents table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS stock_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                doc_no VARCHAR(50) UNIQUE NOT NULL,
                doc_type ENUM('import', 'export', 'stocktake', 'adjust') NOT NULL,
                warehouse_id INT DEFAULT 1,
                project_id INT NULL,
                supplier_id INT NULL,
                status ENUM('draft', 'posted', 'cancelled') DEFAULT 'draft',
                total_qty DECIMAL(15,3) DEFAULT 0,
                total_value DECIMAL(15,2) DEFAULT 0,
                note TEXT,
                created_by INT NOT NULL,
                posted_by INT NULL,
                cancelled_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                posted_at TIMESTAMP NULL,
                cancelled_at TIMESTAMP NULL,
                balanced_at TIMESTAMP NULL,
                cancel_reason TEXT NULL,
                row_version INT DEFAULT 1,
                INDEX idx_doc_type_status (doc_type, status),
                INDEX idx_created_at (created_at),
                INDEX idx_project_id (project_id),
                INDEX idx_doc_no (doc_no)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ stock_documents created\n');

        // 2. Create stock_document_lines table
        console.log('2. Creating stock_document_lines table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS stock_document_lines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id INT NOT NULL,
                item_type ENUM('accessory', 'aluminum', 'glass', 'other') NOT NULL,
                item_id INT NOT NULL,
                item_code VARCHAR(50),
                item_name VARCHAR(255),
                qty DECIMAL(15,3) NOT NULL,
                unit VARCHAR(20) DEFAULT 'cái',
                unit_price DECIMAL(15,2) DEFAULT 0,
                line_total DECIMAL(15,2) DEFAULT 0,
                qty_system DECIMAL(15,3) NULL,
                qty_actual DECIMAL(15,3) NULL,
                qty_diff DECIMAL(15,3) NULL,
                note TEXT,
                FOREIGN KEY (document_id) REFERENCES stock_documents(id) ON DELETE CASCADE,
                INDEX idx_document_id (document_id),
                INDEX idx_item (item_type, item_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ stock_document_lines created\n');

        // 3. Create stock_ledger table
        console.log('3. Creating stock_ledger table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS stock_ledger (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id INT NOT NULL,
                document_line_id INT NULL,
                warehouse_id INT DEFAULT 1,
                item_type ENUM('accessory', 'aluminum', 'glass', 'other') NOT NULL,
                item_id INT NOT NULL,
                qty_in DECIMAL(15,3) DEFAULT 0,
                qty_out DECIMAL(15,3) DEFAULT 0,
                balance_after DECIMAL(15,3) NOT NULL,
                transaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id INT,
                note TEXT,
                FOREIGN KEY (document_id) REFERENCES stock_documents(id),
                INDEX idx_item_transaction (item_type, item_id, transaction_at),
                INDEX idx_warehouse_item (warehouse_id, item_type, item_id),
                INDEX idx_transaction_at (transaction_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ stock_ledger created\n');

        // 4. Create view v_stock_onhand
        console.log('4. Creating view v_stock_onhand...');
        await db.query('DROP VIEW IF EXISTS v_stock_onhand');
        await db.query(`
            CREATE VIEW v_stock_onhand AS
            SELECT 
                l.warehouse_id,
                l.item_type,
                l.item_id,
                (SELECT balance_after 
                 FROM stock_ledger l2 
                 WHERE l2.warehouse_id = l.warehouse_id 
                   AND l2.item_type = l.item_type 
                   AND l2.item_id = l.item_id 
                 ORDER BY l2.transaction_at DESC, l2.id DESC 
                 LIMIT 1) AS qty_on_hand,
                0 AS qty_reserved,
                (SELECT balance_after 
                 FROM stock_ledger l2 
                 WHERE l2.warehouse_id = l.warehouse_id 
                   AND l2.item_type = l.item_type 
                   AND l2.item_id = l.item_id 
                 ORDER BY l2.transaction_at DESC, l2.id DESC 
                 LIMIT 1) AS qty_available
            FROM stock_ledger l
            GROUP BY l.warehouse_id, l.item_type, l.item_id
        `);
        console.log('   ✅ v_stock_onhand view created\n');

        console.log('='.repeat(50));
        console.log('✅ Migration completed successfully!');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        process.exit(0);
    }
}

migrate();
