// Migration: Add columns to glass_items + Import data from Excel
const db = require('../config/db');
const xlsx = require('xlsx');
const path = require('path');

async function migrate() {
    console.log('=== GLASS ITEMS MIGRATION ===');

    // Step 1: Add new columns if not exist
    const columnsToAdd = [
        { name: 'glass_type', sql: "ALTER TABLE glass_items ADD COLUMN glass_type VARCHAR(500) NULL AFTER name" },
        { name: 'notes', sql: "ALTER TABLE glass_items ADD COLUMN notes VARCHAR(500) NULL AFTER price" }
    ];

    for (const col of columnsToAdd) {
        try {
            await db.query(col.sql);
            console.log('Added column: ' + col.name);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column ' + col.name + ' already exists, skipping');
            } else {
                console.error('Error adding column ' + col.name + ':', e.message);
            }
        }
    }

    // Step 2: Read Excel
    const filePath = path.join(__dirname, '../../Tài liệu/Danh sách bảng kính.xlsx');
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });

    // Header: [STT, Tên kính, Mã kính, Chủng loại kính, Cấu tạo, Chênh kính áp dụng, Ghi chú]
    // Data starts from row index 2
    const rows = [];
    let lastTenKinh = ''; // Tên kính is merged in Excel, carry forward
    for (let i = 2; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row.length || row[0] == null) continue;

        const stt = row[0];
        if (typeof stt !== 'number') continue; // Skip non-data rows

        const tenKinh = row[1] || lastTenKinh;
        if (row[1]) lastTenKinh = row[1];

        const maKinh = row[2] || '';
        const chungLoai = row[3] || '';
        const cauTao = row[4] || '';
        const chenhKinh = row[5] || 0;
        const ghiChu = row[6] || '';

        rows.push({
            code: String(maKinh).trim(),
            name: String(tenKinh).trim(),
            glass_type: String(chungLoai).trim(),
            structure: String(cauTao).trim(),
            price: Number(chenhKinh) || 0,
            notes: String(ghiChu).trim().replace(/\r\n/g, ' ').replace(/\n/g, ' ')
        });
    }

    console.log('Parsed ' + rows.length + ' glass items from Excel');

    // Step 3: Clear old data and insert new
    await db.query('DELETE FROM glass_items');
    console.log('Cleared old glass_items data');

    let count = 0;
    for (const r of rows) {
        try {
            await db.query(
                'INSERT INTO glass_items (code, name, glass_type, structure, price, notes) VALUES (?, ?, ?, ?, ?, ?)',
                [r.code, r.name, r.glass_type, r.structure, r.price, r.notes]
            );
            count++;
        } catch (e) {
            console.error('Error inserting ' + r.code + ':', e.message);
        }
    }

    console.log('Imported ' + count + '/' + rows.length + ' glass items');
    process.exit(0);
}

migrate().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
