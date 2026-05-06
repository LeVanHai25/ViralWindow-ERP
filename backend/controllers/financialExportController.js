/**
 * Financial Export Controller
 * Handles Excel export for financial documents (payments, receipts, debt)
 */

const ExcelJS = require('exceljs');
const db = require('../config/db');
const path = require('path');

// Helper: Convert number to Vietnamese words
function numberToVietnameseWords(num) {
    if (!num || num === 0) return 'Không đồng';

    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
    const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
    const units = ['', 'nghìn', 'triệu', 'tỷ'];

    function readThreeDigits(n) {
        if (n === 0) return '';
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;
        let result = '';
        if (h > 0) result += ones[h] + ' trăm ';
        if (t === 0 && u > 0 && h > 0) result += 'lẻ ' + ones[u];
        else if (t === 1) result += teens[u];
        else {
            if (t > 0) result += tens[t];
            if (u === 5 && t > 0) result += ' lăm';
            else if (u > 0) result += ' ' + ones[u];
        }
        return result.trim();
    }

    let result = '';
    let unitIndex = 0;
    let n = Math.floor(num);

    while (n > 0) {
        const threeDigits = n % 1000;
        if (threeDigits > 0) {
            const words = readThreeDigits(threeDigits);
            result = words + ' ' + units[unitIndex] + ' ' + result;
        }
        n = Math.floor(n / 1000);
        unitIndex++;
    }

    result = result.trim();
    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
    return result;
}

// Helper: Get company info
async function getCompanyInfo() {
    try {
        const [settings] = await db.query(`
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE setting_key IN ('company_name', 'company_address', 'company_phone', 'company_email', 'company_tax_code')
        `);

        const info = {};
        settings.forEach(s => {
            info[s.setting_key] = s.setting_value;
        });

        return {
            name: info.company_name || 'CÔNG TY CỔ PHẦN VIRALWINDOW',
            address: info.company_address || 'Nhà máy: KM 03, Đường Cienco5, KĐT Thanh Hà, Hà Đông, Hà Nội',
            phone: info.company_phone || 'Hotline: 1800 282839',
            email: info.company_email || 'Email: viralwindow.vn@gmail.com',
            taxCode: info.company_tax_code || ''
        };
    } catch (error) {
        return {
            name: 'CÔNG TY CỔ PHẦN VIRALWINDOW',
            address: 'Nhà máy: KM 03, Đường Cienco5, KĐT Thanh Hà, Hà Đông, Hà Nội',
            phone: 'Hotline: 1800 282839',
            email: 'Email: viralwindow.vn@gmail.com',
            taxCode: ''
        };
    }
}

// Common Excel styling helpers
function applyBorder(cell, style = 'thin') {
    cell.border = {
        top: { style },
        left: { style },
        bottom: { style },
        right: { style }
    };
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';
}

// Senior Branding Helper: Header
async function drawBrandedHeader(worksheet, workbook, title, subtitle = '') {
    const company = await getCompanyInfo();
    
    // 1. Company Information (Left)
    worksheet.mergeCells('A1:D1');
    const nameCell = worksheet.getCell('A1');
    nameCell.value = company.name;
    nameCell.font = { bold: true, size: 13, color: { argb: 'FF1E3A8A' } };
    nameCell.alignment = { horizontal: 'left', vertical: 'middle' };

    worksheet.mergeCells('A2:D2');
    const addrCell = worksheet.getCell('A2');
    addrCell.value = company.address;
    addrCell.font = { size: 9, color: { argb: 'FF4B5563' } };

    worksheet.mergeCells('A3:D3');
    const contactCell = worksheet.getCell('A3');
    contactCell.value = `ĐT: ${company.phone} | Email: ${company.email}`;
    contactCell.font = { size: 9, color: { argb: 'FF4B5563' } };

    // 2. Logo (Right)
    try {
        const logoPath = path.join(__dirname, '../assets/LogoViralWindow.png');
        const logoImage = workbook.addImage({
            filename: logoPath,
            extension: 'png',
        });
        worksheet.addImage(logoImage, {
            tl: { col: 5.2, row: 0 },
            ext: { width: 100, height: 50 }
        });
    } catch (err) { console.error('Logo error:', err); }

    // 3. Report Title
    worksheet.mergeCells('A6:G6');
    const titleCell = worksheet.getCell('A6');
    titleCell.value = title.toUpperCase();
    titleCell.font = { bold: true, size: 20, color: { argb: 'FF1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(6).height = 30;

    if (subtitle) {
        worksheet.mergeCells('A7:G7');
        const subCell = worksheet.getCell('A7');
        subCell.value = subtitle;
        subCell.font = { italic: true, size: 11, color: { argb: 'FF6B7280' } };
        subCell.alignment = { horizontal: 'center' };
    }

    return 9; // Return next available row
}

// Senior Branding Helper: Footer
function addStandardFooter(worksheet, startRow, creatorName = '') {
    const row = startRow + 2;
    const signRow = worksheet.getRow(row);
    signRow.getCell(1).value = 'NGƯỜI LẬP BIỂU';
    signRow.getCell(4).value = 'KẾ TOÁN TRƯỞNG';
    signRow.getCell(7).value = 'GIÁM ĐỐC';
    
    signRow.eachCell(c => {
        c.font = { bold: true, size: 11 };
        c.alignment = { horizontal: 'center' };
    });

    const hintRow = worksheet.getRow(row + 1);
    hintRow.getCell(1).value = '(Ký, ghi rõ họ tên)';
    hintRow.getCell(4).value = '(Ký, ghi rõ họ tên)';
    hintRow.getCell(7).value = '(Ký, đóng dấu)';
    hintRow.eachCell(c => {
        c.font = { italic: true, size: 10, color: { argb: 'FF94A3B8' } };
        c.alignment = { horizontal: 'center' };
    });

    if (creatorName) {
        const nameRow = worksheet.getRow(row + 5);
        nameRow.getCell(1).value = creatorName;
        nameRow.getCell(1).font = { bold: true };
        nameRow.getCell(1).alignment = { horizontal: 'center' };
    }
}

/**
 * Export Payment (Phiếu chi) to Excel
 * GET /api/financial/transactions/:id/export-excel
 */
exports.exportPayment = async (req, res) => {
    try {
        const { id } = req.params;

        // Get transaction details
        const [transactions] = await db.query(`
            SELECT t.*, 
                   u.full_name AS created_by_name,
                   p.project_name
            FROM financial_transactions t
            LEFT JOIN users u ON t.created_by = u.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.id = ?
        `, [id]);

        if (!transactions || transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiếu chi'
            });
        }

        const transaction = transactions[0];

        // Get transaction items
        const [items] = await db.query(`
            SELECT * FROM financial_transaction_items 
            WHERE transaction_id = ?
            ORDER BY id
        `, [id]);

        // Get company info
        const company = await getCompanyInfo();

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ViralWindow';
        workbook.created = new Date();

        const isExpense = transaction.transaction_type === 'expense';
        const docTitle = isExpense ? 'PHIẾU CHI' : 'PHIẾU THU';
        const themeColor = isExpense ? 'FFDC2626' : 'FF16A34A'; // Red for expense, Green for income

        const worksheet = workbook.addWorksheet(transaction.transaction_code || 'PhieuChi');

        // === HEADER: Company Info + Logo ===
        // Left side: Company Info
        const leftCol = 'A';
        worksheet.mergeCells('A1:D1');
        const companyCell = worksheet.getCell('A1');
        companyCell.value = company.name;
        companyCell.font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
        companyCell.alignment = { horizontal: 'left', vertical: 'middle' };

        worksheet.mergeCells('A2:D2');
        const addressCell = worksheet.getCell('A2');
        addressCell.value = `Địa chỉ: ${company.address}`;
        addressCell.font = { size: 10, color: { argb: 'FF4B5563' } };

        worksheet.mergeCells('A3:D3');
        const contactCell = worksheet.getCell('A3');
        contactCell.value = `ĐT: ${company.phone} | Email: ${company.email}`;
        contactCell.font = { size: 10, color: { argb: 'FF4B5563' } };

        // Right side: Logo
        try {
            const logoPath = path.join(__dirname, '../assets/LogoViralWindow.png');
            const logoImage = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
            worksheet.addImage(logoImage, {
                tl: { col: 5.5, row: 0 },
                ext: { width: 120, height: 60 }
            });
        } catch (err) {
            console.error('Error adding logo to Excel:', err);
        }

        // === TITLE ===
        worksheet.mergeCells('A6:G6');
        const titleCell = worksheet.getCell('A6');
        titleCell.value = docTitle;
        titleCell.font = { bold: true, size: 22, color: { argb: themeColor } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(6).height = 35;

        // Doc number and date
        worksheet.mergeCells('A7:G7');
        const docNoCell = worksheet.getCell('A7');
        docNoCell.value = `Số: ${transaction.transaction_code || 'N/A'}`;
        docNoCell.font = { size: 12, bold: true };
        docNoCell.alignment = { horizontal: 'center' };

        worksheet.mergeCells('A8:G8');
        const dateCell = worksheet.getCell('A8');
        const txDate = transaction.transaction_date ? new Date(transaction.transaction_date) : new Date();
        dateCell.value = `Ngày ${String(txDate.getDate()).padStart(2, '0')} tháng ${String(txDate.getMonth() + 1).padStart(2, '0')} năm ${txDate.getFullYear()}`;
        dateCell.font = { size: 11, italic: true };
        dateCell.alignment = { horizontal: 'center' };

        // === DOCUMENT INFO ===
        let currentRow = 10;

        // Info rows in a cleaner layout
        const infoData = [
            ['Đối tượng:', transaction.supplier || transaction.customer_name || '-'],
            ['Dự án:', transaction.project_name || '-'],
            ['Hình thức:', transaction.payment_method === 'cash' ? 'Tiền mặt' : (transaction.payment_method === 'bank' || transaction.payment_method === 'bank_transfer') ? 'Chuyển khoản' : (transaction.payment_method || 'Tiền mặt')],
            ['Loại phiếu:', transaction.expense_type || transaction.income_type || '-'],
            ['Diễn giải:', transaction.description || '-']
        ];

        infoData.forEach(([label, value]) => {
            const row = worksheet.getRow(currentRow);
            row.getCell(1).value = label;
            row.getCell(1).font = { bold: true, size: 11 };
            worksheet.mergeCells(currentRow, 2, currentRow, 7);
            row.getCell(2).value = value;
            row.getCell(2).font = { size: 11 };
            row.height = 20;
            currentRow++;
        });

        currentRow += 1; // Gap before table

        // === ITEMS TABLE ===
        // Note: Even if items is empty, we show a table based on user feedback
        const displayItems = (items && items.length > 0) ? items : [{
            item_name: transaction.category || (isExpense ? 'Khoản chi' : 'Khoản thu'),
            item_code: '-',
            unit: 'Lần',
            quantity: 1,
            unit_price: transaction.amount || 0,
            amount: transaction.amount || 0
        }];

        // Table name
        worksheet.mergeCells(currentRow, 1, currentRow, 7);
        const tableNameCell = worksheet.getCell(currentRow, 1);
        tableNameCell.value = isExpense ? 'CHI TIẾT CÁC KHOẢN CHI' : 'CHI TIẾT CÁC KHOẢN THU';
        tableNameCell.font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
        tableNameCell.alignment = { horizontal: 'left', vertical: 'middle' };
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

        // Table header
        const headers = ['STT', 'Nội dung chi tiết', 'Mã số', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền'];
        const headerRow = worksheet.getRow(currentRow);
        headerRow.values = headers;
        headerRow.height = 28;
        headerRow.eachCell((cell, colNumber) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: themeColor }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            applyBorder(cell);
        });
        currentRow++;

        // Data rows
        let totalAmount = 0;
        displayItems.forEach((item, index) => {
            const qty = parseInt(item.quantity) || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;
            const amount = parseFloat(item.amount) || (qty * unitPrice);
            totalAmount += amount;

            const dataRow = worksheet.getRow(currentRow);
            dataRow.values = [
                index + 1,
                item.item_name || '-',
                item.item_code || '-',
                item.unit || 'Lần',
                qty,
                unitPrice,
                amount
            ];

            dataRow.eachCell((cell, colNumber) => {
                applyBorder(cell);
                cell.alignment = { vertical: 'middle' };

                if (colNumber === 1) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
                if (colNumber >= 5) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                }
                if (colNumber === 6 || colNumber === 7) {
                    cell.numFmt = '#,##0';
                }
            });

            // Alternate row color
            if (index % 2 === 1) {
                dataRow.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF5F5F5' }
                    };
                });
            }

            currentRow++;
        });

        // Total row
        const totalRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(currentRow, 1, currentRow, 6);
        totalRow.getCell(1).value = 'TỔNG CỘNG THANH TOÁN:';
        totalRow.getCell(1).font = { bold: true, size: 12 };
        totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        totalRow.getCell(7).value = totalAmount;
        totalRow.getCell(7).numFmt = '#,##0';
        totalRow.getCell(7).font = { bold: true, size: 12, color: { argb: themeColor } };
        totalRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
        totalRow.height = 28;
        applyBorder(totalRow.getCell(1), 'medium');
        applyBorder(totalRow.getCell(7), 'medium');
        currentRow++;

        // Amount in words
        currentRow++;
        const wordsRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(currentRow, 1, currentRow, 7);
        wordsRow.getCell(1).value = `Bằng chữ: ${numberToVietnameseWords(totalAmount)}`;
        wordsRow.getCell(1).font = { bold: true, italic: true, size: 11 };
        currentRow++;

        // === NOTES ===
        if (transaction.note) {
            currentRow++;
            const noteRow = worksheet.getRow(currentRow);
            worksheet.mergeCells(currentRow, 1, currentRow, 7);
            noteRow.getCell(1).value = `Ghi chú: ${transaction.note}`;
            noteRow.getCell(1).font = { size: 10, italic: true, color: { argb: 'FF666666' } };
            currentRow++;
        }

        // === SIGNATURES ===
        currentRow += 2;
        const signatureRow = worksheet.getRow(currentRow);
        signatureRow.getCell(1).value = 'NGƯỜI LẬP PHIẾU';
        signatureRow.getCell(4).value = 'KẾ TOÁN';
        signatureRow.getCell(7).value = 'GIÁM ĐỐC';
        signatureRow.eachCell(cell => {
            cell.font = { bold: true, size: 11 };
            cell.alignment = { horizontal: 'center' };
        });
        currentRow++;

        const signatureHintRow = worksheet.getRow(currentRow);
        signatureHintRow.getCell(1).value = '(Ký, ghi rõ họ tên)';
        signatureHintRow.getCell(4).value = '(Ký, ghi rõ họ tên)';
        signatureHintRow.getCell(7).value = '(Ký, đóng dấu)';
        signatureHintRow.eachCell(cell => {
            cell.font = { size: 10, italic: true, color: { argb: 'FF999999' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Space for signatures
        currentRow += 4;
        const nameRow = worksheet.getRow(currentRow);
        nameRow.getCell(1).value = transaction.created_by_name || '';
        nameRow.getCell(1).font = { bold: true };
        nameRow.getCell(1).alignment = { horizontal: 'center' };

        // === COLUMN WIDTHS ===
        worksheet.columns = [
            { width: 6 },   // STT
            { width: 30 },  // Tên hàng hóa
            { width: 12 },  // Mã
            { width: 8 },   // ĐVT
            { width: 10 },  // SL
            { width: 15 },  // Đơn giá
            { width: 18 }   // Thành tiền
        ];

        // Generate filename
        const safeCode = (transaction.transaction_code || `PC_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${isExpense ? 'PhieuChi' : 'PhieuThu'}_${safeCode}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting payment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xuất Excel: ' + error.message
        });
    }
};

/**
 * Export Receipt (Phiếu thu) to Excel
 * GET /api/financial/receipts/:id/export-excel
 */
exports.exportReceipt = async (req, res) => {
    try {
        const { id } = req.params;

        // Get receipt details
        const [receipts] = await db.query(`
            SELECT r.*, 
                   u.full_name AS created_by_name,
                   c.name AS customer_name_lookup,
                   p.project_name
            FROM financial_receipts r
            LEFT JOIN users u ON r.created_by = u.id
            LEFT JOIN customers c ON r.customer_id = c.id
            LEFT JOIN projects p ON r.project_id = p.id
            WHERE r.id = ?
        `, [id]);

        if (!receipts || receipts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiếu thu'
            });
        }

        const receipt = receipts[0];

        // Get company info
        const company = await getCompanyInfo();

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ViralWindow';
        workbook.created = new Date();

        const themeColor = 'FF16A34A'; // Green for income

        const worksheet = workbook.addWorksheet(receipt.receipt_code || 'PhieuThu');

        // === HEADER: Company Info + Logo ===
        worksheet.mergeCells('A1:D1');
        const companyCell = worksheet.getCell('A1');
        companyCell.value = company.name;
        companyCell.font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
        companyCell.alignment = { horizontal: 'left', vertical: 'middle' };

        worksheet.mergeCells('A2:D2');
        const addressCell = worksheet.getCell('A2');
        addressCell.value = `Địa chỉ: ${company.address}`;
        addressCell.font = { size: 10, color: { argb: 'FF4B5563' } };

        worksheet.mergeCells('A3:D3');
        const contactCell = worksheet.getCell('A3');
        contactCell.value = `ĐT: ${company.phone} | Email: ${company.email}`;
        contactCell.font = { size: 10, color: { argb: 'FF4B5563' } };

        // Right side: Logo
        try {
            const logoPath = path.join(__dirname, '../assets/LogoViralWindow.png');
            const logoImage = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
            worksheet.addImage(logoImage, {
                tl: { col: 4.5, row: 0 },
                ext: { width: 120, height: 60 }
            });
        } catch (err) {
            console.error('Error adding logo to Excel:', err);
        }

        // === TITLE ===
        worksheet.mergeCells('A6:F6');
        const titleCell = worksheet.getCell('A6');
        titleCell.value = 'PHIẾU THU';
        titleCell.font = { bold: true, size: 22, color: { argb: themeColor } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(6).height = 35;

        // Doc number and date
        worksheet.mergeCells('A7:F7');
        const docNoCell = worksheet.getCell('A7');
        docNoCell.value = `Số: ${receipt.receipt_code || 'N/A'}`;
        docNoCell.font = { size: 12, bold: true };
        docNoCell.alignment = { horizontal: 'center' };

        worksheet.mergeCells('A8:F8');
        const dateCell = worksheet.getCell('A8');
        const txDate = receipt.receipt_date ? new Date(receipt.receipt_date) : new Date();
        dateCell.value = `Ngày ${String(txDate.getDate()).padStart(2, '0')} tháng ${String(txDate.getMonth() + 1).padStart(2, '0')} năm ${txDate.getFullYear()}`;
        dateCell.font = { size: 11, italic: true };
        dateCell.alignment = { horizontal: 'center' };

        // === DOCUMENT INFO ===
        let currentRow = 10;

        const infoData = [
            ['Khách hàng:', receipt.customer_name_lookup || receipt.customer_name || '-'],
            ['Dự án:', receipt.project_name || '-'],
            ['Hình thức:', receipt.payment_method === 'cash' ? 'Tiền mặt' : (receipt.payment_method === 'bank' || receipt.payment_method === 'bank_transfer') ? 'Chuyển khoản' : (receipt.payment_method || 'Tiền mặt')],
            ['Loại thu:', receipt.income_type || '-'],
            ['Diễn giải:', receipt.description || '-']
        ];

        infoData.forEach(([label, value]) => {
            const row = worksheet.getRow(currentRow);
            row.getCell(1).value = label;
            row.getCell(1).font = { bold: true, size: 11 };
            worksheet.mergeCells(currentRow, 2, currentRow, 6);
            row.getCell(2).value = value;
            row.getCell(2).font = { size: 11 };
            row.height = 20;
            currentRow++;
        });

        currentRow += 1;

        // === ITEMS TABLE ===
        // Note: For receipts, we always show at least one row if items are missing
        const receiptItems = (receipt.items && receipt.items.length > 0) ? receipt.items : [{
            item_name: receipt.category || 'Khoản thu',
            item_code: '-',
            unit: 'Lần',
            quantity: 1,
            unit_price: receipt.amount || 0,
            amount: receipt.amount || 0
        }];

        // Table name
        worksheet.mergeCells(currentRow, 1, currentRow, 6);
        const tableNameCell = worksheet.getCell(currentRow, 1);
        tableNameCell.value = 'CHI TIẾT CÁC KHOẢN THU';
        tableNameCell.font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
        tableNameCell.alignment = { horizontal: 'left', vertical: 'middle' };
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

        // Table header
        const headers = ['STT', 'Nội dung chi tiết', 'Mã số', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền'];
        const headerRow = worksheet.getRow(currentRow);
        headerRow.values = headers;
        headerRow.height = 28;
        headerRow.eachCell((cell, colNumber) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: themeColor }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            applyBorder(cell);
        });
        currentRow++;

        // Data rows
        let currentTotal = 0;
        receiptItems.forEach((item, index) => {
            const qty = parseInt(item.quantity) || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;
            const amount = parseFloat(item.amount) || (qty * unitPrice);
            currentTotal += amount;

            const dataRow = worksheet.getRow(currentRow);
            dataRow.values = [
                index + 1,
                item.item_name || item.name || '-',
                item.item_code || item.code || '-',
                item.unit || 'Lần',
                qty,
                unitPrice,
                amount
            ];

            dataRow.eachCell((cell, colNumber) => {
                applyBorder(cell);
                cell.alignment = { vertical: 'middle' };

                if (colNumber === 1) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
                if (colNumber >= 5) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                }
                if (colNumber === 6 || colNumber === 7) {
                    cell.numFmt = '#,##0';
                }
            });

            if (index % 2 === 1) {
                dataRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                });
            }

            currentRow++;
        });

        // Total row
        const totalRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(currentRow, 1, currentRow, 6);
        totalRow.getCell(1).value = 'TỔNG CỘNG THANH TOÁN:';
        totalRow.getCell(1).font = { bold: true, size: 12 };
        totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        totalRow.getCell(7) ? (totalRow.getCell(7).value = currentTotal) : (totalRow.getCell(6).value = currentTotal); // Handle F or G
        
        // Re-merging column F for total display matches standard
        worksheet.mergeCells(currentRow, 1, currentRow, 5);
        totalRow.getCell(6).value = currentTotal;
        totalRow.getCell(6).numFmt = '#,##0';
        totalRow.getCell(6).font = { bold: true, size: 12, color: { argb: themeColor } };
        totalRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
        totalRow.height = 28;
        applyBorder(totalRow.getCell(1), 'medium');
        applyBorder(totalRow.getCell(6), 'medium');
        currentRow++;

        // Amount in words
        currentRow++;
        const wordsRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(currentRow, 1, currentRow, 6);
        wordsRow.getCell(1).value = `Bằng chữ: ${numberToVietnameseWords(currentTotal)}`;
        wordsRow.getCell(1).font = { bold: true, italic: true, size: 11 };
        currentRow++;

        // === NOTES ===
        if (receipt.note) {
            currentRow++;
            const noteRow = worksheet.getRow(currentRow);
            worksheet.mergeCells(currentRow, 1, currentRow, 6);
            noteRow.getCell(1).value = `Ghi chú: ${receipt.note}`;
            noteRow.getCell(1).font = { size: 10, italic: true, color: { argb: 'FF666666' } };
            currentRow++;
        }

        // === SIGNATURES ===
        currentRow += 2;
        const signatureRow = worksheet.getRow(currentRow);
        signatureRow.getCell(1).value = 'NGƯỜI NỘP TIỀN';
        signatureRow.getCell(3).value = 'NGƯỜI LẬP PHIẾU';
        signatureRow.getCell(5).value = 'THỦ QUỸ';
        signatureRow.eachCell(cell => {
            cell.font = { bold: true, size: 11 };
            cell.alignment = { horizontal: 'center' };
        });
        currentRow++;

        const signatureHintRow = worksheet.getRow(currentRow);
        signatureHintRow.getCell(1).value = '(Ký, ghi rõ họ tên)';
        signatureHintRow.getCell(3).value = '(Ký, ghi rõ họ tên)';
        signatureHintRow.getCell(5).value = '(Ký, ghi rõ họ tên)';
        signatureHintRow.eachCell(cell => {
            cell.font = { size: 10, italic: true, color: { argb: 'FF999999' } };
            cell.alignment = { horizontal: 'center' };
        });

        // === COLUMN WIDTHS ===
        worksheet.columns = [
            { width: 18 },
            { width: 20 },
            { width: 18 },
            { width: 20 },
            { width: 18 },
            { width: 20 }
        ];

        // Generate filename
        const safeCode = (receipt.receipt_code || `PT_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `PhieuThu_${safeCode}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xuất Excel: ' + error.message
        });
    }
};

/**
 * Export Debt Report to Excel
 * GET /api/financial/debt/export-excel?type=receivable|payable
 */
exports.exportDebtReport = async (req, res) => {
    try {
        const { customer_id, supplier_id, type } = req.query;

        // Build query từ bảng ĐÚNG là 'debts' (không phải customer_debt)
        let query = `
            SELECT d.*,
                   c.full_name AS customer_name_join,
                   p.project_name,
                   p.project_code
            FROM debts d
            LEFT JOIN customers c ON d.customer_id = c.id
            LEFT JOIN projects p ON d.project_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (customer_id) {
            query += ' AND d.customer_id = ?';
            params.push(customer_id);
        }
        if (type === 'receivable' || type === 'payable') {
            query += ' AND d.debt_type = ?';
            params.push(type);
        }

        query += ' ORDER BY d.due_date ASC, d.created_at DESC';

        const [debts] = await db.query(query, params);

        // Tổng hợp theo dự án/khách hàng
        const [summary] = await db.query(`
            SELECT 
                d.debt_type,
                COUNT(*) as total_count,
                COALESCE(SUM(d.total_amount), 0) as total_original,
                COALESCE(SUM(d.paid_amount), 0) as total_paid,
                COALESCE(SUM(d.remaining_amount), 0) as total_remaining,
                SUM(CASE WHEN d.status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN d.status != 'paid' AND d.due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_count
            FROM debts d
            WHERE 1=1
            ${type === 'receivable' || type === 'payable' ? 'AND d.debt_type = ?' : ''}
        `, type === 'receivable' || type === 'payable' ? [type] : []);

        // Get company info
        const company = await getCompanyInfo();

        // ===== TẠO WORKBOOK =====
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ViralWindow';
        workbook.created = new Date();

        const isReceivable = type === 'receivable';
        const themeArgb = isReceivable ? 'FF7C3AED' : 'FFDC2626'; // Purple: receivable, Red: payable
        const reportTitle = isReceivable ? 'BÁO CÁO CÔNG NỢ PHẢI THU' : (type === 'payable' ? 'BÁO CÁO CÔNG NỢ PHẢI TRẢ' : 'BÁO CÁO TỔNG HỢP CÔNG NỢ');

        // ===== SHEET 1: TỔNG HỢP =====
        const ws1 = workbook.addWorksheet('Tong hop cong no', { properties: { tabColor: { argb: themeArgb } } });
        ws1.columns = [{ width: 28 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 20 }];

        // Header công ty + Logo
        ws1.mergeCells('A1:D1');
        ws1.getCell('A1').value = company.name;
        ws1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };

        ws1.mergeCells('A2:D2');
        ws1.getCell('A2').value = `ĐT: ${company.phone} | ${company.email}`;
        ws1.getCell('A2').font = { size: 10, color: { argb: 'FF4B5563' } };

        // Right side: Logo
        try {
            const logoPath = path.join(__dirname, '../assets/LogoViralWindow.png');
            const logoImage = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
            ws1.addImage(logoImage, {
                tl: { col: 4, row: 0 },
                ext: { width: 100, height: 50 }
            });
        } catch (err) {
            console.error('Error adding logo to Excel:', err);
        }

        // Tiêu đề báo cáo
        ws1.mergeCells('A4:E4');
        ws1.getCell('A4').value = reportTitle;
        ws1.getCell('A4').font = { bold: true, size: 20, color: { argb: themeArgb } };
        ws1.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
        ws1.getRow(4).height = 40;

        ws1.mergeCells('A5:E5');
        ws1.getCell('A5').value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`;
        ws1.getCell('A5').font = { italic: true, size: 11, color: { argb: 'FF6B7280' } };
        ws1.getCell('A5').alignment = { horizontal: 'center' };

        ws1.addRow([]);

        // Bảng tổng hợp
        const sum = summary[0] || {};
        const sumHeaderRow = ws1.getRow(7);
        sumHeaderRow.values = ['CHỈ TIÊU', 'PHẢI THU', 'PHẢI TRẢ', 'TỔNG CỘNG', 'GHI CHÚ'];
        sumHeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeArgb } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            applyBorder(cell);
        });
        ws1.getRow(7).height = 24;

        const [recSum] = await db.query(`SELECT COALESCE(SUM(total_amount),0) as orig, COALESCE(SUM(paid_amount),0) as paid, COALESCE(SUM(remaining_amount),0) as remain, COUNT(*) as cnt, SUM(CASE WHEN status!='paid' AND due_date<CURDATE() THEN 1 ELSE 0 END) as overdue FROM debts WHERE debt_type='receivable'`);
        const [paySum] = await db.query(`SELECT COALESCE(SUM(total_amount),0) as orig, COALESCE(SUM(paid_amount),0) as paid, COALESCE(SUM(remaining_amount),0) as remain, COUNT(*) as cnt, SUM(CASE WHEN status!='paid' AND due_date<CURDATE() THEN 1 ELSE 0 END) as overdue FROM debts WHERE debt_type='payable'`);
        const rs = recSum[0] || {}, ps = paySum[0] || {};

        const sumData = [
            ['Tổng số bản ghi', rs.cnt || 0, ps.cnt || 0, (rs.cnt || 0) + (ps.cnt || 0), ''],
            ['Tổng nợ ban đầu', parseFloat(rs.orig) || 0, parseFloat(ps.orig) || 0, (parseFloat(rs.orig) || 0) + (parseFloat(ps.orig) || 0), ''],
            ['Đã thanh toán', parseFloat(rs.paid) || 0, parseFloat(ps.paid) || 0, (parseFloat(rs.paid) || 0) + (parseFloat(ps.paid) || 0), ''],
            ['Còn phải thu/trả', parseFloat(rs.remain) || 0, parseFloat(ps.remain) || 0, (parseFloat(rs.remain) || 0) + (parseFloat(ps.remain) || 0), '⚠ Cần xử lý'],
            ['Quá hạn', rs.overdue || 0, ps.overdue || 0, (rs.overdue || 0) + (ps.overdue || 0), '🔴 Khẩn cấp'],
        ];

        sumData.forEach((row, i) => {
            const r = ws1.addRow(row);
            r.getCell(1).font = { bold: true };
            [2, 3, 4].forEach(c => {
                if (i > 0) { r.getCell(c).numFmt = '#,##0'; }
                r.getCell(c).alignment = { horizontal: i === 0 ? 'center' : 'right' };
            });
            r.eachCell(cell => {
                applyBorder(cell);
                if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
            });
        });

        // ===== SHEET 2: CHI TIẾT =====
        const ws2 = workbook.addWorksheet('Chi tiet cong no', { properties: { tabColor: { argb: 'FF0EA5E9' } } });
        ws2.columns = [
            { width: 6 },   // STT
            { width: 25 },  // Khách hàng/Nhà CC
            { width: 12 },  // Loại
            { width: 22 },  // Dự án
            { width: 18 },  // Số tiền gốc
            { width: 18 },  // Đã thanh toán
            { width: 18 },  // Còn lại
            { width: 15 },  // Ngày hạn
            { width: 20 },  // Trạng thái
        ];

        // Header công ty + Logo
        ws2.mergeCells('A1:F1');
        ws2.getCell('A1').value = company.name;
        ws2.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E40AF' } };

        ws2.mergeCells('A2:F2');
        ws2.getCell('A2').value = `ĐT: ${company.phone} | ${company.email}`;
        ws2.getCell('A2').font = { size: 9, color: { argb: 'FF4B5563' } };

        // Right side: Logo
        try {
            const logoPath = path.join(__dirname, '../assets/LogoViralWindow.png');
            const logoImage = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
            ws2.addImage(logoImage, {
                tl: { col: 7.5, row: 0 },
                ext: { width: 90, height: 45 }
            });
        } catch (err) {
            console.error('Error adding logo to Excel:', err);
        }

        // Title
        ws2.mergeCells('A4:I4');
        ws2.getCell('A4').value = reportTitle + ' - CHI TIẾT';
        ws2.getCell('A4').font = { bold: true, size: 16, color: { argb: themeArgb } };
        ws2.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
        ws2.getRow(4).height = 30;

        ws2.mergeCells('A5:I5');
        ws2.getCell('A5').value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Tổng số: ${debts.length} mục`;
        ws2.getCell('A5').font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
        ws2.getCell('A5').alignment = { horizontal: 'center' };

        const headerRow = ws2.getRow(7);
        headerRow.values = ['STT', 'Tên Khách hàng/NCC', 'Loại nợ', 'Thông tin Dự án', 'Số nợ ban đầu', 'Đã thanh toán', 'Dư nợ còn lại', 'Ngày đáo hạn', 'Trạng thái'];
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeArgb } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            applyBorder(cell);
        });
        ws2.getRow(3).height = 28;

        let totalOrig = 0, totalPaid2 = 0, totalRemain = 0;

        debts.forEach((debt, i) => {
            const orig = parseFloat(debt.total_amount || debt.amount || 0);
            const paid = parseFloat(debt.paid_amount || 0);
            const remain = parseFloat(debt.remaining_amount || (orig - paid));
            totalOrig += orig;
            totalPaid2 += paid;
            totalRemain += remain;

            const dueDate = debt.due_date ? new Date(debt.due_date) : null;
            const isOverdue = dueDate && dueDate < new Date() && debt.status !== 'paid';
            const statusText = debt.status === 'paid' ? '✅ Đã TT' : (debt.status === 'partial' ? '🟠 TT một phần' : (isOverdue ? '🔴 Quá hạn' : '⏳ Chưa TT'));

            const r = ws2.addRow([
                i + 1,
                debt.customer_name_join || debt.customer_name || debt.supplier_name || '-',
                debt.debt_type === 'receivable' ? 'Phải thu' : 'Phải trả',
                (debt.project_code ? debt.project_code + ' - ' : '') + (debt.project_name || '-'),
                orig,
                paid,
                remain,
                dueDate ? dueDate.toLocaleDateString('vi-VN') : '-',
                statusText
            ]);

            [5, 6, 7].forEach(c => { r.getCell(c).numFmt = '#,##0'; r.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' }; });
            r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            r.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
            r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

            r.eachCell(cell => {
                applyBorder(cell);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFF5F3FF' } };
            });

            // Highlight quá hạn
            if (isOverdue) {
                r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                r.getCell(9).font = { bold: true, color: { argb: 'FFDC2626' } };
            } else if (debt.status === 'paid') {
                r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                r.getCell(9).font = { color: { argb: 'FF065F46' } };
            }
        });

        // Tổng
        const totalRowNum = ws2.rowCount + 1;
        ws2.mergeCells('A' + totalRowNum + ':D' + totalRowNum);
        const tr = ws2.getRow(totalRowNum);
        tr.getCell(1).value = 'TỔNG CỘNG (' + debts.length + ' bản ghi)';
        tr.getCell(1).font = { bold: true, size: 12 };
        tr.getCell(1).alignment = { horizontal: 'right' };
        tr.getCell(5).value = totalOrig;
        tr.getCell(6).value = totalPaid2;
        tr.getCell(7).value = totalRemain;
        [5, 6, 7].forEach(c => {
            tr.getCell(c).numFmt = '#,##0';
            tr.getCell(c).font = { bold: true, color: { argb: c === 7 ? themeArgb : 'FF111827' } };
            tr.getCell(c).alignment = { horizontal: 'right' };
            tr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
            applyBorder(tr.getCell(c), 'medium');
        });
        tr.height = 26;

        // ===== GỬI FILE =====
        const typeLabel = type === 'receivable' ? 'PhaiThu' : (type === 'payable' ? 'PhaiTra' : 'TongHop');
        const filename = `CongNo_${typeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting debt report:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xuất báo cáo công nợ: ' + error.message
        });
    }
};

/**
 * Export Single Debt Voucher to Excel
 * GET /api/financial/debt/:id/export-excel
 */
exports.exportSingleDebt = async (req, res) => {
    try {
        const { id } = req.params;

        // Get debt details with customer and project info
        const [debts] = await db.query(`
            SELECT d.*, 
                   c.full_name AS customer_name_join,
                   p.project_name,
                   p.project_code
            FROM debts d
            LEFT JOIN customers c ON d.customer_id = c.id
            LEFT JOIN projects p ON d.project_id = p.id
            WHERE d.id = ?
        `, [id]);

        if (!debts || debts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin công nợ'
            });
        }

        const debt = debts[0];
        const isReceivable = debt.debt_type === 'receivable';
        const docTitle = isReceivable ? 'PHIẾU XÁC NHẬN CÔNG NỢ PHẢI THU' : 'PHIẾU XÁC NHẬN CÔNG NỢ PHẢI TRẢ';
        const themeColor = isReceivable ? 'FF7C3AED' : 'FFDC2626'; // Purple for receivable, Red for payable

        // Get company info
        const company = await getCompanyInfo();

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ViralWindow';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet(isReceivable ? 'PhieuCongNoThu' : 'PhieuCongNoTra');

        // === HEADER: Company Info + Logo ===
        worksheet.mergeCells('A1:D1');
        const companyCell = worksheet.getCell('A1');
        companyCell.value = company.name;
        companyCell.font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
        companyCell.alignment = { horizontal: 'left', vertical: 'middle' };

        worksheet.mergeCells('A2:D2');
        const addressCell = worksheet.getCell('A2');
        addressCell.value = `Địa chỉ: ${company.address}`;
        addressCell.font = { size: 10, color: { argb: 'FF4B5563' } };

        worksheet.mergeCells('A3:D3');
        const contactCell = worksheet.getCell('A3');
        contactCell.value = `ĐT: ${company.phone} | Email: ${company.email}`;
        contactCell.font = { size: 10, color: { argb: 'FF4B5563' } };

        // Right side: Logo
        try {
            const logoPath = path.join(__dirname, '../assets/LogoViralWindow.png');
            const logoImage = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
            worksheet.addImage(logoImage, {
                tl: { col: 4.5, row: 0 },
                ext: { width: 120, height: 60 }
            });
        } catch (err) {
            console.error('Error adding logo to Excel:', err);
        }

        // === TITLE ===
        worksheet.mergeCells('A6:F6');
        const titleCell = worksheet.getCell('A6');
        titleCell.value = docTitle;
        titleCell.font = { bold: true, size: 20, color: { argb: themeColor } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(6).height = 35;

        worksheet.mergeCells('A7:F7');
        const dateCell = worksheet.getCell('A7');
        dateCell.value = `Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`;
        dateCell.font = { size: 11, italic: true };
        dateCell.alignment = { horizontal: 'center' };

        // === DOCUMENT INFO ===
        let currentRow = 9;
        const infoData = [
            [isReceivable ? 'Khách hàng:' : 'Nhà cung cấp:', debt.customer_name_join || debt.supplier || '-'],
            ['Dự án:', debt.project_name || '-'],
            ['Mã dự án:', debt.project_code || '-'],
            ['Hạn thanh toán:', debt.due_date ? new Date(debt.due_date).toLocaleDateString('vi-VN') : '-'],
            ['Trạng thái:', debt.status === 'paid' ? 'Đã thanh toán' : (debt.status === 'partial' ? 'Thanh toán một phần' : 'Chưa thanh toán')]
        ];

        infoData.forEach(([label, value]) => {
            const row = worksheet.getRow(currentRow);
            row.getCell(1).value = label;
            row.getCell(1).font = { bold: true, size: 11 };
            worksheet.mergeCells(currentRow, 2, currentRow, 6);
            row.getCell(2).value = value;
            row.getCell(2).font = { size: 11 };
            row.height = 20;
            currentRow++;
        });

        currentRow += 1;

        // === TABLE ===
        worksheet.mergeCells(currentRow, 1, currentRow, 6);
        const tableNameCell = worksheet.getCell(currentRow, 1);
        tableNameCell.value = 'CHI TIẾT CÔNG NỢ';
        tableNameCell.font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
        tableNameCell.alignment = { horizontal: 'left', vertical: 'middle' };
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

        const headers = ['STT', 'Nội dung chi tiết', 'Tổng nợ gốc', 'Đã trả/thu', 'Còn lại', 'Ghi chú'];
        const headerRow = worksheet.getRow(currentRow);
        headerRow.values = headers;
        headerRow.height = 28;
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: themeColor }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            applyBorder(cell);
        });
        currentRow++;

        // Data Row (Since it's a single debt voucher, we show one main row)
        const dataRow = worksheet.getRow(currentRow);
        const original = parseFloat(debt.total_amount) || 0;
        const paid = parseFloat(debt.paid_amount) || 0;
        const remaining = parseFloat(debt.remaining_amount) || (original - paid);

        dataRow.values = [
            1,
            `Công nợ phát sinh ngày ${debt.created_at ? new Date(debt.created_at).toLocaleDateString('vi-VN') : '-'}`,
            original,
            paid,
            remaining,
            debt.note || ''
        ];

        dataRow.eachCell((cell, colNumber) => {
            applyBorder(cell);
            cell.alignment = { vertical: 'middle' };
            if (colNumber === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (colNumber >= 3 && colNumber <= 5) {
                cell.numFmt = '#,##0';
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
            }
        });
        currentRow++;

        // Total Row
        const totalRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(currentRow, 1, currentRow, 4);
        totalRow.getCell(1).value = 'TỔNG CỘNG CÒN LẠI:';
        totalRow.getCell(1).font = { bold: true, size: 12 };
        totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        totalRow.getCell(5).value = remaining;
        totalRow.getCell(5).numFmt = '#,##0';
        totalRow.getCell(5).font = { bold: true, size: 12, color: { argb: themeColor } };
        totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
        applyBorder(totalRow.getCell(1), 'medium');
        applyBorder(totalRow.getCell(5), 'medium');
        applyBorder(totalRow.getCell(6), 'medium'); // Border for the last empty cell in total row
        totalRow.height = 28;
        currentRow++;

        // Words
        currentRow++;
        const wordsRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(currentRow, 1, currentRow, 6);
        wordsRow.getCell(1).value = `Bằng chữ: ${numberToVietnameseWords(remaining)}`;
        wordsRow.getCell(1).font = { bold: true, italic: true, size: 11 };
        currentRow++;

        // === SIGNATURES ===
        currentRow += 2;
        const signatureRow = worksheet.getRow(currentRow);
        signatureRow.getCell(1).value = isReceivable ? 'KHÁCH HÀNG' : 'NHÀ CUNG CẤP';
        signatureRow.getCell(3).value = 'KẾ TOÁN';
        signatureRow.getCell(5).value = 'GIÁM ĐỐC';
        signatureRow.eachCell(cell => {
            cell.font = { bold: true, size: 11 };
            cell.alignment = { horizontal: 'center' };
        });
        currentRow++;

        const signatureHintRow = worksheet.getRow(currentRow);
        signatureHintRow.getCell(1).value = '(Ký, ghi rõ họ tên)';
        signatureHintRow.getCell(3).value = '(Ký, ghi rõ họ tên)';
        signatureHintRow.getCell(5).value = '(Ký, đóng dấu)';
        signatureHintRow.eachCell(cell => {
            cell.font = { size: 10, italic: true, color: { argb: 'FF999999' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Set column widths
        worksheet.columns = [
            { width: 6 },   // STT
            { width: 35 },  // Nội dung
            { width: 18 },  // Tổng nợ
            { width: 18 },  // Đã trả
            { width: 18 },  // Còn lại
            { width: 25 }   // Ghi chú
        ];

        // Generate filename
        const filename = `${isReceivable ? 'PhieuCongNoThu' : 'PhieuCongNoTra'}_${id}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting single debt:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xuất Excel: ' + error.message
        });
    }
};

/**
 * Export Advanced Cash Flow Report to Excel
 */
exports.exportCashFlowReport = async (req, res) => {
    try {
        const { startDate, endDate, projectId } = req.query;
        let dateFilter = "WHERE status = 'posted'";
        let params = [];
        if (startDate && endDate) {
            dateFilter += " AND transaction_date >= ? AND transaction_date <= ?";
            params = [startDate, endDate + ' 23:59:59'];
        }
        if (projectId) {
            dateFilter += " AND project_id = ?";
            params.push(projectId);
        }

        const [rows] = await db.query(`
            SELECT t.*, u.full_name as creator_name
            FROM financial_transactions t
            LEFT JOIN users u ON t.created_by = u.id
            ${dateFilter}
            ORDER BY transaction_date ASC
        `, params);

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Bao cao Thu Chi');
        
        const subtitle = (startDate && endDate) ? `Từ ngày ${startDate} đến ngày ${endDate}` : 'Tất cả thời gian';
        let rowIdx = await drawBrandedHeader(ws, workbook, 'BÁO CÁO THU CHI CHI TIẾT', subtitle);

        // Header Table
        rowIdx++;
        const headers = ['STT', 'Ngày', 'Mã chứng từ', 'Diễn giải', 'Loại', 'Thu', 'Chi'];
        const headerRow = ws.getRow(rowIdx);
        headerRow.values = headers;
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
            applyBorder(cell);
        });

        // Data
        let totalRev = 0, totalExp = 0;
        rows.forEach((r, idx) => {
            rowIdx++;
            const isRev = r.transaction_type === 'revenue';
            const amount = parseFloat(r.amount) || 0;
            if (isRev) totalRev += amount; else totalExp += amount;

            const dataRow = ws.getRow(rowIdx);
            dataRow.values = [
                idx + 1,
                new Date(r.transaction_date).toLocaleDateString('vi-VN'),
                r.transaction_code,
                r.description,
                isRev ? 'Thu' : 'Chi',
                isRev ? amount : 0,
                !isRev ? amount : 0
            ];
            dataRow.eachCell((c, i) => {
                applyBorder(c);
                if (i >= 6) { c.numFmt = '#,##0'; c.alignment = { horizontal: 'right' }; }
            });
        });

        // Summary row
        rowIdx++;
        const sumRow = ws.getRow(rowIdx);
        ws.mergeCells(rowIdx, 1, rowIdx, 5);
        sumRow.getCell(1).value = 'TỔNG CỘNG';
        sumRow.getCell(1).font = { bold: true };
        sumRow.getCell(1).alignment = { horizontal: 'right' };
        sumRow.getCell(6).value = totalRev;
        sumRow.getCell(7).value = totalExp;
        [6, 7].forEach(i => {
            sumRow.getCell(i).font = { bold: true };
            sumRow.getCell(i).numFmt = '#,##0';
            applyBorder(sumRow.getCell(i));
        });
        applyBorder(sumRow.getCell(1));

        addStandardFooter(ws, rowIdx);

        ws.columns = [
            { width: 6 }, { width: 12 }, { width: 15 }, { width: 40 }, { width: 10 }, { width: 15 }, { width: 15 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Bao_cao_Thu_Chi.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi xuất Excel');
    }
};

/**
 * Export Profit and Loss Report to Excel
 */
exports.exportProfitLossReport = async (req, res) => {
    try {
        const { startDate, endDate, projectId } = req.query;
        let dateFilter = "WHERE t.status = 'posted'";
        let params = [];
        if (startDate && endDate) {
            dateFilter += " AND t.transaction_date >= ? AND t.transaction_date <= ?";
            params = [startDate, endDate + ' 23:59:59'];
        }
        if (projectId) {
            dateFilter += " AND t.project_id = ?";
            params.push(projectId);
        }

        const [rows] = await db.query(`
            SELECT 
                p.id as project_id,
                p.project_code,
                p.project_name,
                c.full_name as customer_name,
                p.total_value as contract_value,
                SUM(CASE WHEN t.transaction_type = 'revenue' THEN t.amount ELSE 0 END) as total_revenue,
                SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END) as total_expense
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN financial_transactions t ON p.id = t.project_id
            ${dateFilter}
            GROUP BY p.id, p.project_code, p.project_name, c.full_name, p.total_value
            HAVING total_revenue > 0 OR total_expense > 0
            ORDER BY p.created_at DESC
        `, params);

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Bao cao Lai Lo');
        
        const subtitle = (startDate && endDate) ? `Từ ngày ${startDate} đến ngày ${endDate}` : 'Tất cả thời gian';
        let rowIdx = await drawBrandedHeader(ws, workbook, 'BÁO CÁO LÃI LỖ THEO DỰ ÁN', subtitle);

        // Header Table
        rowIdx++;
        const headers = ['STT', 'Mã dự án', 'Tên dự án', 'Khách hàng', 'Giá trị HĐ', 'Đã thu', 'Đã chi', 'Lãi/Lỗ', '% Lãi'];
        const headerRow = ws.getRow(rowIdx);
        headerRow.values = headers;
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
            applyBorder(cell);
        });

        // Data
        rows.forEach((r, idx) => {
            rowIdx++;
            const profit = r.total_revenue - r.total_expense;
            const margin = r.total_revenue > 0 ? (profit / r.total_revenue * 100).toFixed(1) : 0;

            const dataRow = ws.getRow(rowIdx);
            dataRow.values = [
                idx + 1,
                r.project_code,
                r.project_name,
                r.customer_name,
                parseFloat(r.contract_value) || 0,
                parseFloat(r.total_revenue) || 0,
                parseFloat(r.total_expense) || 0,
                profit,
                margin + '%'
            ];
            dataRow.eachCell((c, i) => {
                applyBorder(c);
                if (i >= 5 && i <= 8) { c.numFmt = '#,##0'; c.alignment = { horizontal: 'right' }; }
                if (i === 8) { c.font = { bold: true, color: { argb: profit >= 0 ? 'FF16A34A' : 'FFDC2626' } }; }
                if (i === 9) { c.alignment = { horizontal: 'center' }; }
            });
        });

        addStandardFooter(ws, rowIdx);

        ws.columns = [
            { width: 6 }, { width: 15 }, { width: 30 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Bao_cao_Lai_Lo.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi xuất Excel');
    }
};

/**
 * Export Material Cost Report to Excel
 */
exports.exportMaterialCostReport = async (req, res) => {
    try {
        const { startDate, endDate, projectId } = req.query;
        let dateFilter = "";
        let params = [];
        if (startDate && endDate) {
            dateFilter += " AND pm.created_at >= ? AND pm.created_at <= ?";
            params = [startDate, endDate];
        }
        if (projectId) {
            dateFilter += " AND pm.project_id = ?";
            params.push(projectId);
        }

        const [rows] = await db.query(`
            SELECT 
                pm.*,
                p.project_name,
                p.project_code,
                c.full_name as customer_name
            FROM project_materials pm
            JOIN projects p ON pm.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE 1=1 ${dateFilter}
            ORDER BY p.id, pm.created_at DESC
        `, params);

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Chi phi Vat tu');
        
        const subtitle = (startDate && endDate) ? `Từ ngày ${startDate} đến ngày ${endDate}` : 'Tất cả thời gian';
        let rowIdx = await drawBrandedHeader(ws, workbook, 'BÁO CÁO CHI PHÍ VẬT TƯ DỰ ÁN', subtitle);

        // Group by project
        const projectMap = new Map();
        rows.forEach(r => {
            if (!projectMap.has(r.project_id)) {
                projectMap.set(r.project_id, {
                    name: r.project_name,
                    code: r.project_code,
                    customer: r.customer_name,
                    items: [],
                    total: 0
                });
            }
            const cost = (r.quantity || 0) * (r.unit_price || 0);
            projectMap.get(r.project_id).items.push({...r, cost});
            projectMap.get(r.project_id).total += cost;
        });

        // Table Header
        rowIdx++;
        const headers = ['STT', 'Ngày xuất', 'Loại vật tư', 'Tên vật tư', 'Số lượng', 'ĐVT', 'Đơn giá', 'Thành tiền'];
        const headerRow = ws.getRow(rowIdx);
        headerRow.values = headers;
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
            applyBorder(cell);
        });

        // Iterate groups
        let overallTotal = 0;
        projectMap.forEach((p, pid) => {
            rowIdx++;
            const groupRow = ws.getRow(rowIdx);
            ws.mergeCells(rowIdx, 1, rowIdx, 8);
            groupRow.getCell(1).value = `DỰ ÁN: ${p.code} - ${p.name} (${p.customer || 'Khách lẻ'})`;
            groupRow.getCell(1).font = { bold: true, color: { argb: 'FF1E40AF' } };
            groupRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
            applyBorder(groupRow.getCell(1));

            p.items.forEach((item, idx) => {
                rowIdx++;
                const dataRow = ws.getRow(rowIdx);
                dataRow.values = [
                    idx + 1,
                    new Date(item.created_at).toLocaleDateString('vi-VN'),
                    item.material_type,
                    item.material_name,
                    item.quantity,
                    item.unit,
                    item.unit_price,
                    item.cost
                ];
                dataRow.eachCell((c, i) => {
                    applyBorder(c);
                    if (i >= 5 && i <= 8) { c.numFmt = '#,##0'; c.alignment = { horizontal: 'right' }; }
                });
            });

            rowIdx++;
            const totalRow = ws.getRow(rowIdx);
            ws.mergeCells(rowIdx, 1, rowIdx, 7);
            totalRow.getCell(1).value = 'TỔNG CỘNG DỰ ÁN:';
            totalRow.getCell(1).font = { bold: true };
            totalRow.getCell(1).alignment = { horizontal: 'right' };
            totalRow.getCell(8).value = p.total;
            totalRow.getCell(8).font = { bold: true };
            totalRow.getCell(8).numFmt = '#,##0';
            applyBorder(totalRow.getCell(1));
            applyBorder(totalRow.getCell(8));
            overallTotal += p.total;
        });

        // Grand Total
        rowIdx += 2;
        const grandRow = ws.getRow(rowIdx);
        ws.mergeCells(rowIdx, 1, rowIdx, 7);
        grandRow.getCell(1).value = 'TỔNG CỘNG TẤT CẢ DỰ ÁN:';
        grandRow.getCell(1).font = { bold: true, size: 12 };
        grandRow.getCell(1).alignment = { horizontal: 'right' };
        grandRow.getCell(8).value = overallTotal;
        grandRow.getCell(8).font = { bold: true, size: 12, color: { argb: 'FFDC2626' } };
        grandRow.getCell(8).numFmt = '#,##0';
        applyBorder(grandRow.getCell(1), 'medium');
        applyBorder(grandRow.getCell(8), 'medium');

        addStandardFooter(ws, rowIdx);

        ws.columns = [
            { width: 6 }, { width: 12 }, { width: 15 }, { width: 30 }, { width: 10 }, { width: 10 }, { width: 15 }, { width: 18 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Chi_phi_Vat_tu.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi xuất Excel');
    }
};

/**
 * Export Branch Project Report to Excel
 */
exports.exportBranchReport = async (req, res) => {
    try {
        const { agencyId } = req.query;
        let query = `
            SELECT 
                p.*,
                c.full_name as customer_name,
                a.name as agency_name,
                (SELECT SUM(amount) FROM financial_transactions WHERE project_id = p.id AND transaction_type = 'revenue' AND status = 'posted') as total_collected,
                (SELECT SUM(amount) FROM financial_transactions WHERE project_id = p.id AND transaction_type = 'expense' AND status = 'posted') as total_spent
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN agencies a ON c.agency_id = a.id
            WHERE 1=1
        `;
        let params = [];
        if (agencyId) {
            query += " AND c.agency_id = ?";
            params.push(agencyId);
        }
        query += " ORDER BY p.created_at DESC";

        const [rows] = await db.query(query, params);

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Bao cao Chi nhanh');
        
        const subtitle = agencyId ? `Chi nhánh: ${rows[0]?.agency_name || 'N/A'}` : 'Tất cả chi nhánh';
        let rowIdx = await drawBrandedHeader(ws, workbook, 'BÁO CÁO TỔNG HỢP CÔNG TRÌNH THEO CHI NHÁNH', subtitle);

        // Header Table
        rowIdx++;
        const headers = ['STT', 'Mã DA', 'Tên dự án', 'Khách hàng', 'Giá trị HĐ', 'Đã thu', 'Đã chi', 'Dòng tiền'];
        const headerRow = ws.getRow(rowIdx);
        headerRow.values = headers;
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
            applyBorder(cell);
        });

        // Data
        rows.forEach((r, idx) => {
            rowIdx++;
            const rev = parseFloat(r.total_collected) || 0;
            const exp = parseFloat(r.total_spent) || 0;
            const flow = rev - exp;

            const dataRow = ws.getRow(rowIdx);
            dataRow.values = [
                idx + 1,
                r.project_code,
                r.project_name,
                r.customer_name,
                parseFloat(r.contract_value) || 0,
                rev,
                exp,
                flow
            ];
            dataRow.eachCell((c, i) => {
                applyBorder(c);
                if (i >= 5) { c.numFmt = '#,##0'; c.alignment = { horizontal: 'right' }; }
                if (i === 8) { c.font = { bold: true, color: { argb: flow >= 0 ? 'FF16A34A' : 'FFDC2626' } }; }
            });
        });

        addStandardFooter(ws, rowIdx);

        ws.columns = [
            { width: 6 }, { width: 12 }, { width: 30 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Bao_cao_Chi_nhanh.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi xuất Excel');
    }
};

/**
 * Refined Debt Report (Receivable/Payable)
 */
exports.exportDebtReport = async (req, res) => {
    try {
        const { customer_id, type } = req.query;
        let query = `
            SELECT d.*, c.full_name as customer_name, p.project_name, p.project_code
            FROM debts d
            LEFT JOIN customers c ON d.customer_id = c.id
            LEFT JOIN projects p ON d.project_id = p.id
            WHERE 1=1
        `;
        const params = [];
        if (customer_id) { query += ' AND d.customer_id = ?'; params.push(customer_id); }
        if (type === 'receivable' || type === 'payable') { query += ' AND d.debt_type = ?'; params.push(type); }

        const [debts] = await db.query(query, params);

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Bao cao Cong no');
        const isReceivable = type === 'receivable';
        const title = isReceivable ? 'BÁO CÁO CÔNG NỢ PHẢI THU' : 'BÁO CÁO CÔNG NỢ PHẢI TRẢ';
        
        let rowIdx = await drawBrandedHeader(ws, workbook, title, `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`);

        // Header
        rowIdx++;
        const headers = ['STT', 'Đối tượng', 'Dự án', 'Mã DA', 'Tổng nợ', 'Đã trả', 'Còn lại', 'Hạn thanh toán'];
        const headerRow = ws.getRow(rowIdx);
        headerRow.values = headers;
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isReceivable ? 'FF7C3AED' : 'FFDC2626' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
            applyBorder(cell);
        });

        // Data
        debts.forEach((d, idx) => {
            rowIdx++;
            const dataRow = ws.getRow(rowIdx);
            dataRow.values = [
                idx + 1,
                d.customer_name || '-',
                d.project_name || '-',
                d.project_code || '-',
                parseFloat(d.total_amount) || 0,
                parseFloat(d.paid_amount) || 0,
                parseFloat(d.remaining_amount) || 0,
                d.due_date ? new Date(d.due_date).toLocaleDateString('vi-VN') : '-'
            ];
            dataRow.eachCell((c, i) => {
                applyBorder(c);
                if (i >= 5 && i <= 7) { c.numFmt = '#,##0'; c.alignment = { horizontal: 'right' }; }
                if (i === 7) c.font = { bold: true };
            });
        });

        addStandardFooter(ws, rowIdx);

        ws.columns = [
            { width: 6 }, { width: 25 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Bao_cao_Cong_no_${type}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi xuất Excel');
    }
};
