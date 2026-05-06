/**
 * Fix Quotation Status Script
 * Cập nhật status cho các báo giá đã chốt hợp đồng nhưng status chưa được update
 * 
 * Chạy: node backend/sql/fix_quotation_status.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixQuotationStatus() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'viralwindow'
    });

    try {
        console.log('🔧 Fix Quotation Status Script\n');
        console.log('=====================================\n');

        // 1. Xem status hiện tại
        console.log('📋 Status hiện tại của các quotations:');
        const [quotations] = await connection.query(`
            SELECT q.id, q.quotation_code, q.status, p.project_code, p.contract_locked
            FROM quotations q
            LEFT JOIN projects p ON q.project_id = p.id
            ORDER BY q.id DESC
        `);

        console.table(quotations);

        // 2. Tìm các quotation cần update
        const [toUpdate] = await connection.query(`
            SELECT q.id, q.quotation_code, q.status as current_status, p.project_code, p.contract_locked
            FROM quotations q
            INNER JOIN projects p ON q.project_id = p.id
            WHERE ((p.project_code LIKE 'VR%' AND p.project_code NOT LIKE 'VRBG%')
               OR p.contract_locked = 1)
            AND (q.status IS NULL OR q.status = '' OR q.status = 'draft' OR q.status = 'approved')
        `);

        console.log('\n📝 Quotations cần update:');
        console.table(toUpdate);

        if (toUpdate.length === 0) {
            console.log('\n✅ Không có quotation nào cần update.');
            await connection.end();
            return;
        }

        // 3. Update status
        console.log('\n🔄 Đang update status...');
        const [result] = await connection.query(`
            UPDATE quotations q
            INNER JOIN projects p ON q.project_id = p.id
            SET q.status = 'contract_signed'
            WHERE ((p.project_code LIKE 'VR%' AND p.project_code NOT LIKE 'VRBG%')
               OR p.contract_locked = 1)
            AND (q.status IS NULL OR q.status = '' OR q.status = 'draft' OR q.status = 'approved')
        `);

        console.log(`✅ Đã update ${result.affectedRows} quotations thành 'contract_signed'\n`);

        // 4. Verify
        console.log('📋 Status sau khi update:');
        const [after] = await connection.query(`
            SELECT q.id, q.quotation_code, q.status, p.project_code, p.contract_locked
            FROM quotations q
            LEFT JOIN projects p ON q.project_id = p.id
            ORDER BY q.id DESC
        `);
        console.table(after);

        console.log('\n✅ Hoàn thành!');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await connection.end();
    }
}

fixQuotationStatus();
