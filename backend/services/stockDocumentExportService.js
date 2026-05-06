const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

/**
 * Service to handle professional Excel export for individual stock documents (Slips)
 * Refined to ensure high "WOW" factor and dynamic data injection.
 */
class StockDocumentExportService {
    constructor() {
        // Use the professional report template as base for consistency in branding
        this.templatePath = path.join(__dirname, '../templates/accessory_report_template.xlsx');
    }

    /**
     * Export a single document to professional template
     */
    async exportSingleDocument(doc, lines) {
        const workbook = new ExcelJS.Workbook();
        let worksheet;

        if (fs.existsSync(this.templatePath)) {
            try {
                await workbook.xlsx.readFile(this.templatePath);
                // Remove extra sheets, keep only the first one
                while (workbook.worksheets.length > 1) {
                    workbook.removeWorksheet(workbook.worksheets[1].id);
                }
                worksheet = workbook.getWorksheet(1);
            } catch (err) {
                console.warn(`Error reading template, using blank workbook: ${err.message}`);
                worksheet = workbook.addWorksheet('Phieu');
            }
        } else {
            console.warn(`Template not found at ${this.templatePath}. Using blank workbook.`);
            worksheet = workbook.addWorksheet('Phieu');
        }

        worksheet.name = doc.doc_no || 'Phieu';

        // Clear all rows to ensure professional layout
        for (let i = 1; i <= 300; i++) {
            const row = worksheet.getRow(i);
            row.eachCell(cell => { cell.value = null; cell.style = {}; });
            row.height = 20;
        }

        // 2. Add Professional Branding (Company Info & Logo from DB)
        const isStocktake = doc.doc_type === 'stocktake';
        const maxCol = isStocktake ? 8 : 10;
        await StockDocumentExportService.addCompanyHeader(workbook, worksheet, maxCol);


        // 3. Grid Definition - Professional Accounting Standards
        if (isStocktake) {
            worksheet.columns = [
                { key: 'stt', width: 6 },
                { key: 'item_code', width: 15 },
                { key: 'item_name', width: 35 },
                { key: 'unit', width: 10 },
                { key: 'qty_system', width: 12 },
                { key: 'qty_actual', width: 12 },
                { key: 'diff', width: 12 },
                { key: 'note', width: 20 }
            ];
        } else {
            worksheet.columns = [
                { key: 'stt', width: 6 },
                { key: 'item_code', width: 15 },
                { key: 'item_name', width: 35 },
                { key: 'unit', width: 10 },
                { key: 'bal_before', width: 12 },
                { key: 'qty', width: 12 },
                { key: 'bal_after', width: 12 },
                { key: 'price', width: 15 },
                { key: 'total', width: 18 },
                { key: 'note', width: 20 }
            ];
        }

        // 4. Dynamic Title (Row 6)
        const docTypeLabels = {
            'import': 'PHIẾU NHẬP KHO',
            'export': 'PHIẾU XUẤT KHO',
            'stocktake': 'PHIẾU KIỂM KHO',
            'adjust': 'PHIẾU ĐIỀU CHỈNH'
        };
        const titleRow = worksheet.getRow(6);
        const titleCell = titleRow.getCell(1);
        titleCell.value = docTypeLabels[doc.doc_type] || 'PHIẾU KHO';
        titleCell.font = { bold: true, size: 18, color: { argb: 'FF000000' }, name: 'Times New Roman' };
        
        const mergeRange = isStocktake ? 'A6:H6' : 'A6:J6';
        try { worksheet.mergeCells(mergeRange); } catch (e) { }
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow.height = 35;

        // Date & Doc No (Row 8-11 Block)
        const date = doc.created_at ? new Date(doc.created_at) : new Date();
        const dateStr = date.toLocaleDateString('vi-VN');

        worksheet.getCell('A8').value = `Số: ${doc.doc_no || '-'}`;
        worksheet.getCell('A9').value = `Ngày: ${dateStr}`;

        let partnerText = '';
        if (doc.doc_type === 'import') {
            partnerText = `Nhà cung cấp: ${doc.supplier_name || doc.partner_name || '-'}`;
        } else if (doc.doc_type === 'export') {
            partnerText = `Dự án: ${doc.project_name || doc.customer_name || '-'}`;
        } else {
            partnerText = `Người thực hiện: ${doc.created_by_name || '-'}`;
        }
        worksheet.getCell('A10').value = partnerText;
        worksheet.getCell('A11').value = `Ghi chú: ${doc.note || '-'}`;

        [8, 9, 10, 11].forEach(r => {
            const row = worksheet.getRow(r);
            row.height = 18;
            row.getCell(1).font = { italic: true, size: 10, name: 'Times New Roman' };
        });

        // 5. Table Headers (Row 11) - WE USE ROW 12 FOR DATA, ROW 11 FOR HEADERS
        const headers = isStocktake
            ? ['STT', 'Mã vật tư', 'Tên vật tư', 'ĐVT', 'Tồn sổ sách', 'Thực tế', 'Chênh lệch', 'Ghi chú']
            : ['STT', 'Mã vật tư', 'Tên vật tư', 'ĐVT', 'Tồn trước', 'Số lượng', 'Tồn sau', 'Đơn giá', 'Thành tiền', 'Ghi chú'];

        const headerRow = worksheet.getRow(12);
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007B5E' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        headerRow.height = 30;

        // 6. Data Injection (Row 13+)
        let currentRowIndex = 13;
        lines.forEach((line, index) => {
            const row = worksheet.getRow(currentRowIndex);

            row.getCell(1).value = index + 1;
            row.getCell(2).value = line.item_code || '-';
            row.getCell(3).value = line.item_name || '-';
            row.getCell(4).value = line.unit || '-';

            if (isStocktake) {
                row.getCell(5).value = parseFloat(line.qty_system) || 0;
                row.getCell(6).value = parseFloat(line.qty) || 0;
                row.getCell(7).value = (parseFloat(line.qty) || 0) - (parseFloat(line.qty_system) || 0);
                row.getCell(8).value = line.note || '';
            } else {
                row.getCell(5).value = line.balance_before !== null ? parseFloat(line.balance_before) : 0;
                row.getCell(6).value = parseFloat(line.qty) || 0;
                row.getCell(7).value = line.balance_after !== null ? parseFloat(line.balance_after) : 0;
                row.getCell(8).value = parseFloat(line.unit_price) || 0;
                row.getCell(9).value = (parseFloat(line.qty) || 0) * (parseFloat(line.unit_price) || 0);
                row.getCell(10).value = line.note || '';
            }

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= maxCol) {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    if (colNumber >= 5 && colNumber <= (isStocktake ? 7 : 9)) {
                        cell.numFmt = '#,##0.##';
                        cell.alignment = { horizontal: 'right' };
                    }
                }
            });
            currentRowIndex++;
        });

        // 7. Totals Row
        const totalRow = worksheet.getRow(currentRowIndex);
        totalRow.getCell(3).value = 'TỔNG CỘNG:';
        totalRow.getCell(3).font = { bold: true };

        if (isStocktake) {
            // No total needed for stocktake in this format
        } else {
            const totalQty = lines.reduce((sum, l) => sum + (parseFloat(l.qty) || 0), 0);
            const totalVal = lines.reduce((sum, l) => sum + ((parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0)), 0);
            totalRow.getCell(6).value = totalQty;
            totalRow.getCell(9).value = totalVal;
        }

        totalRow.eachCell((cell, col) => {
            if (col >= 3 && col <= maxCol) {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' } };
            }
        });

        // 8. Signatures
        currentRowIndex += 2;
        const footerDate = `Hà Nội, ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
        const dateFootCol = isStocktake ? 'E' : 'G';
        const dateFootCell = worksheet.getCell(`${dateFootCol}${currentRowIndex}`);
        dateFootCell.value = footerDate;
        dateFootCell.font = { italic: true };
        dateFootCell.alignment = { horizontal: 'center' };
        try { 
            const endCol = isStocktake ? 'H' : 'J';
            worksheet.mergeCells(`${dateFootCol}${currentRowIndex}:${endCol}${currentRowIndex}`); 
        } catch (e) { }

        currentRowIndex++;
        const footers = isStocktake
            ? [
                { col: 1, text: 'NGƯỜI LẬP' },
                { col: 3, text: 'KẾ TOÁN' },
                { col: 5, text: 'THỦ KHO' },
                { col: 7, text: 'BAN GIÁM ĐỐC' }
            ]
            : [
                { col: 1, text: 'NGƯỜI LẬP' },
                { col: 4, text: 'KẾ TOÁN' },
                { col: 6, text: 'THỦ KHO' },
                { col: 8, text: 'NGƯỜI NHẬN' }
            ];

        footers.forEach(f => {
            const cell = worksheet.getRow(currentRowIndex).getCell(f.col);
            cell.value = f.text;
            cell.font = { bold: true, size: 11, name: 'Times New Roman' };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            
            // Add Name under "NGƯỜI LẬP"
            if (f.text === 'NGƯỜI LẬP') {
                const nameCell = worksheet.getRow(currentRowIndex + 4).getCell(f.col);
                nameCell.value = doc.created_by_name || '';
                nameCell.font = { bold: true, name: 'Times New Roman' };
                nameCell.alignment = { horizontal: 'center' };
            }
        });

        // Add company footer text if needed at the end
        const companyRow = currentRowIndex + 6;
        const companyCell = worksheet.getCell(`A${companyRow}`);
        companyCell.value = 'CÔNG TY CỔ PHẦN VIRALWINDOW';
        companyCell.font = { bold: true, size: 11, name: 'Times New Roman' };
        const companyMergeRange = isStocktake ? `A${companyRow}:H${companyRow}` : `A${companyRow}:J${companyRow}`;
        try { worksheet.mergeCells(companyMergeRange); } catch (e) { }
        companyCell.alignment = { horizontal: 'right' };

        return await workbook.xlsx.writeBuffer();
    }

    /**
     * Thêm thông tin công ty vào đầu sheet (Rows 1-4)
     */
    static async addCompanyHeader(workbook, sheet, maxColumn) {
        // Row 1: Tên công ty
        const nameCell = sheet.getCell('A1');
        nameCell.value = 'CÔNG TY CỔ PHẦN VIRALWINDOW';
        nameCell.font = { bold: true, size: 12, color: { argb: 'FF0070C0' }, name: 'Times New Roman' };
        nameCell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Row 2: Nhà máy
        const factoryCell = sheet.getCell('A2');
        factoryCell.value = 'Nhà máy: KM 03, Đường Cienco5, KĐT Thanh Hà, Hà Đông, Hà Nội';
        factoryCell.font = { size: 10, name: 'Times New Roman' };
        factoryCell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Row 3: Hotline
        const hotlineCell = sheet.getCell('A3');
        hotlineCell.value = 'Hotline: 1800 282839';
        hotlineCell.font = { size: 10, name: 'Times New Roman' };
        hotlineCell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Row 4: Email
        const emailCell = sheet.getCell('A4');
        emailCell.value = 'Email: viralwindow.vn@gmail.com';
        emailCell.font = { size: 10, name: 'Times New Roman' };
        emailCell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Thêm Logo từ database nếu có
        try {
            const [rows] = await db.query("SELECT logo_path FROM company_config ORDER BY id DESC LIMIT 1");
            if (rows.length > 0 && rows[0].logo_path && rows[0].logo_path.startsWith('data:image')) {
                const base64Data = rows[0].logo_path.split(',')[1];
                let extension = 'png';
                const match = rows[0].logo_path.match(/data:image\/([a-zA-Z+]+);base64/);
                if (match) extension = match[1] === 'svg+xml' ? 'png' : match[1];

                const imageId = workbook.addImage({
                    base64: base64Data,
                    extension: extension,
                });

                const logoCol = maxColumn > 6 ? maxColumn - 1 : maxColumn;
                sheet.addImage(imageId, {
                    tl: { col: logoCol - 1, row: 0 },
                    ext: { width: 120, height: 60 }
                });
            }
        } catch (err) {
            console.warn('Không thể thêm logo vào Excel:', err.message);
        }
    }
}

module.exports = new StockDocumentExportService();
