const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('d:/ViralWindow_Phan_Mem_Nhom_Kinh/Tài liệu', '02. BG GĐL A Vương Hà Nội 28.08.2025.xlsx');

console.log('Reading file:', filePath);

try {
    const wb = XLSX.readFile(filePath);
    console.log('=== Sheet Names ===');
    console.log(wb.SheetNames);

    // Read first sheet
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // Get range
    const range = XLSX.utils.decode_range(sheet['!ref']);
    console.log('\n=== Range ===');
    console.log('Rows:', range.e.r + 1, 'Columns:', range.e.c + 1);

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log('\n=== First 35 rows (A-K columns) ===');
    for (let i = 0; i < Math.min(35, data.length); i++) {
        const row = data[i];
        const rowData = row.slice(0, 11).map(cell => {
            if (cell === null || cell === undefined) return '';
            const str = String(cell).substring(0, 25);
            return str.length > 25 ? str + '...' : str;
        });
        console.log(`Row ${i + 1}:`, rowData.join(' | '));
    }

    // Look for merged cells
    console.log('\n=== Merged cells (first 20) ===');
    if (sheet['!merges']) {
        sheet['!merges'].slice(0, 20).forEach((merge, i) => {
            console.log(`${i + 1}. ${XLSX.utils.encode_range(merge)}`);
        });
    }

    console.log('\nDone!');
} catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
}
