// Read ALL Excel rows and output as JSON
const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../Tài liệu/Danh sách bảng kính.xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

// Header row is row 1 (index 1) 
// Data starts from row 2 (index 2)
console.log('Header:', JSON.stringify(data[1]));
console.log('Total data rows:', data.length - 2);

// Print sample rows and ALL unique Tên kính values
const tenKinh = new Set();
let rowCount = 0;
for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || !row.length || !row[0]) continue;
    rowCount++;
    if (row[1]) tenKinh.add(row[1]);
    if (rowCount <= 5 || rowCount > 260) {
        console.log('Data row ' + rowCount + ':', JSON.stringify(row));
    }
}
console.log('Valid rows:', rowCount);
console.log('Unique Tên kính:', Array.from(tenKinh));
