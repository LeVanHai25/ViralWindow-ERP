/**
 * Migration: Chuẩn hóa category phiếu thu đặt cọc
 * Ngày: 2026-01-31
 * Mục đích: Thống nhất tất cả phiếu thu đặt cọc về category = 'Tiền đặt cọc'
 * 
 * Chạy: node sql/migrate_deposit_category.js
 */

const db = require('../config/db');

const OLD_CATEGORIES = ['Tiền cọc báo giá', 'Tiền cọc', 'Đặt cọc', 'Cọc'];
const NEW_CATEGORY = 'Tiền đặt cọc';

async function migrate() {
    console.log('==============================================');
    console.log('MIGRATION: Chuẩn hóa category phiếu thu đặt cọc');
    console.log('==============================================\n');

    try {
        // 1. Xem các category hiện tại
        console.log('📊 Các category liên quan đến đặt cọc hiện tại:');
        const [currentCategories] = await db.query(`
            SELECT category, COUNT(*) as count 
            FROM financial_transactions 
            WHERE transaction_type = 'revenue' 
              AND (category LIKE '%cọc%' OR category LIKE '%đặt cọc%' OR category LIKE '%Cọc%')
            GROUP BY category
        `);
        currentCategories.forEach(c => {
            console.log(`   - "${c.category}": ${c.count} phiếu`);
        });

        // 2. Tìm các phiếu cần cập nhật
        const placeholders = OLD_CATEGORIES.map(() => '?').join(', ');
        const [toUpdate] = await db.query(`
            SELECT id, transaction_code, category, status
            FROM financial_transactions 
            WHERE transaction_type = 'revenue'
              AND category IN (${placeholders})
        `, OLD_CATEGORIES);

        console.log(`\n📋 Tìm thấy ${toUpdate.length} phiếu cần cập nhật:`);
        toUpdate.forEach(t => {
            console.log(`   - ${t.transaction_code}: "${t.category}" → "${NEW_CATEGORY}" (status: ${t.status})`);
        });

        if (toUpdate.length === 0) {
            console.log('\n✓ Không có phiếu nào cần cập nhật. Đã chuẩn hóa rồi!');
            process.exit(0);
        }

        // 3. Thực hiện cập nhật
        console.log('\n🔄 Đang cập nhật...');
        const [result] = await db.query(`
            UPDATE financial_transactions 
            SET category = ?
            WHERE transaction_type = 'revenue'
              AND category IN (${placeholders})
        `, [NEW_CATEGORY, ...OLD_CATEGORIES]);

        console.log(`✅ Đã cập nhật ${result.affectedRows} phiếu thành công!`);

        // 4. Kiểm tra lại
        console.log('\n📊 Kết quả sau khi cập nhật:');
        const [afterCategories] = await db.query(`
            SELECT category, COUNT(*) as count 
            FROM financial_transactions 
            WHERE transaction_type = 'revenue' 
              AND (category LIKE '%cọc%' OR category LIKE '%đặt cọc%' OR category LIKE '%Cọc%')
            GROUP BY category
        `);
        afterCategories.forEach(c => {
            console.log(`   - "${c.category}": ${c.count} phiếu`);
        });

        console.log('\n🎉 Migration hoàn thành!');

    } catch (error) {
        console.error('❌ Lỗi migration:', error.message);
    }

    process.exit(0);
}

migrate();
