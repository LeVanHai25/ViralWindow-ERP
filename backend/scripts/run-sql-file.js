const db = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Script chạy file SQL
 * Sử dụng: node backend/scripts/run-sql-file.js <path-to-sql-file>
 */

async function runSQLFile(filePath) {
    try {
        console.log(`\n📄 Đang chạy file SQL: ${filePath}\n`);

        // Đọc file SQL
        const sqlContent = fs.readFileSync(filePath, 'utf8');

        // Tách các câu lệnh SQL (phân tách bằng ;)
        // Loại bỏ comments và empty lines
        let cleanSQL = sqlContent
            .replace(/--.*$/gm, '') // Remove single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
            .trim();

        const statements = cleanSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.match(/^\s*$/));

        console.log(`Tìm thấy ${statements.length} câu lệnh SQL\n`);

        // Thực thi từng câu lệnh
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Bỏ qua các câu lệnh comment hoặc empty
            if (statement.match(/^\s*--/) || statement.match(/^\s*\/\*/) || statement.length < 5) {
                continue;
            }

            try {
                console.log(`[${i + 1}/${statements.length}] Đang thực thi...`);
                await db.query(statement);
                console.log(`✅ Thành công\n`);
            } catch (err) {
                // Một số lỗi có thể bỏ qua (như table/column đã tồn tại)
                const errorMsg = err.message.toLowerCase();
                if (errorMsg.includes('already exists') || 
                    errorMsg.includes('duplicate') ||
                    errorMsg.includes('duplicate column name') ||
                    errorMsg.includes('table') && errorMsg.includes('already exists')) {
                    console.log(`⚠️  Đã tồn tại, bỏ qua: ${err.message}\n`);
                } else {
                    console.error(`❌ Lỗi: ${err.message}\n`);
                    console.error(`Câu lệnh: ${statement.substring(0, 150)}...\n`);
                    // Không throw, tiếp tục với câu lệnh tiếp theo
                    console.log(`⚠️  Tiếp tục với câu lệnh tiếp theo...\n`);
                }
            }
        }

        console.log('✅ Hoàn thành!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi khi chạy SQL file:', err);
        process.exit(1);
    }
}

// Main
const sqlFile = process.argv[2];

if (!sqlFile) {
    console.error('❌ Vui lòng cung cấp đường dẫn file SQL');
    console.log('Sử dụng: node backend/scripts/run-sql-file.js <path-to-sql-file>');
    process.exit(1);
}

const filePath = path.isAbsolute(sqlFile) 
    ? sqlFile 
    : path.join(__dirname, '..', sqlFile);

if (!fs.existsSync(filePath)) {
    console.error(`❌ Không tìm thấy file: ${filePath}`);
    process.exit(1);
}

runSQLFile(filePath);