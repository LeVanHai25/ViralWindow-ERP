const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🔄 Đang chạy migration: Thêm cột length_m vào bảng aluminum_systems...');
        
        // Kiểm tra xem cột đã tồn tại chưa
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'aluminum_systems' 
            AND COLUMN_NAME = 'length_m'
        `);
        
        if (columns.length > 0) {
            console.log('✅ Cột length_m đã tồn tại trong bảng aluminum_systems');
            return;
        }
        
        // Thêm cột length_m
        await db.query(`
            ALTER TABLE aluminum_systems 
            ADD COLUMN length_m DECIMAL(10, 2) NULL COMMENT 'Độ dài (mét)' AFTER weight_per_meter
        `);
        
        console.log('✅ Migration thành công! Đã thêm cột length_m vào bảng aluminum_systems');
        
        // Kiểm tra lại
        const [newColumns] = await db.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'aluminum_systems' 
            AND COLUMN_NAME = 'length_m'
        `);
        
        if (newColumns.length > 0) {
            console.log('📋 Thông tin cột length_m:');
            console.log(JSON.stringify(newColumns[0], null, 2));
        }
        
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ Cột length_m đã tồn tại trong bảng aluminum_systems');
        } else {
            console.error('❌ Lỗi khi chạy migration:', error.message);
            throw error;
        }
    } finally {
        await db.end();
        process.exit(0);
    }
}

runMigration();

















