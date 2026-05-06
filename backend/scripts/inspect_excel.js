const XLSX = require('xlsx');
const path = require('path');

async function inspectExcel() {
    const filePath = path.join(__dirname, '../../Tài liệu/Tổng Kho Viral.xlsx');
    console.log(`Reading file: ${filePath}`);
    
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('--- EXCEL HEADERS/DATA ---');
        data.slice(0, 10).forEach((row, index) => {
            console.log(`Row ${index}:`, row);
        });
        
    } catch (error) {
        console.error('Error reading excel:', error);
    }
}

inspectExcel();
