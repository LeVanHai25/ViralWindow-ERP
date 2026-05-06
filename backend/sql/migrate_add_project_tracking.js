/**
 * Migration: Add project_id to stock_document_lines
 * For project tracking in export slips (KiotViet style)
 */
const db = require('../config/db');

async function migrate() {
    console.log('🔄 Adding project tracking columns to stock_document_lines...');

    try {
        // Check if columns exist
        const [cols] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'stock_document_lines'
            AND COLUMN_NAME IN ('project_id', 'request_line_id')
        `);

        const existingCols = cols.map(c => c.COLUMN_NAME);

        if (!existingCols.includes('project_id')) {
            await db.query(`
                ALTER TABLE stock_document_lines 
                ADD COLUMN project_id INT NULL COMMENT 'Dự án (cho phiếu xuất)'
            `);
            console.log('✅ Added column: project_id');
        } else {
            console.log('⚠️ Column project_id already exists');
        }

        if (!existingCols.includes('request_line_id')) {
            await db.query(`
                ALTER TABLE stock_document_lines 
                ADD COLUMN request_line_id INT NULL COMMENT 'FK yêu cầu xuất (nếu có)'
            `);
            console.log('✅ Added column: request_line_id');
        } else {
            console.log('⚠️ Column request_line_id already exists');
        }

        // Add index for project lookup
        try {
            await db.query(`
                CREATE INDEX idx_line_project ON stock_document_lines(project_id)
            `);
            console.log('✅ Added index: idx_line_project');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️ Index already exists');
            } else {
                throw e;
            }
        }

        console.log('✅ Migration completed!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }

    process.exit(0);
}

migrate();
