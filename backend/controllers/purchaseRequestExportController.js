const ExcelJS = require('exceljs');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// Format date to Vietnamese format
function formatDateVN(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Xuất Excel Phiếu Yêu Cầu Vật Tư - Professional Format với Logo
 */
exports.exportPurchaseRequest = async (req, res) => {
    try {
        const { type, data } = req.body; // type: 'nhom', 'vattu', 'phukien', 'kinh'

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu để xuất'
            });
        }

        // Get project info from request body
        const projectInfo = req.body.projectInfo || {};

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ViralWindow';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('PHIẾU YÊU CẦU VẬT TƯ', {
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            },
            headerFooter: {
                oddFooter: '&L&"Times New Roman"Trang &P / &N'
            }
        });

        // Set column widths based on type
        if (type === 'nhom') {
            worksheet.columns = [
                { width: 6 },   // A - TT
                { width: 35 },  // B - Tên vật tư
                { width: 15 },  // C - Mã vật tư
                { width: 12 },  // D - Tỷ trọng
                { width: 12 },  // E - Mét (M)
                { width: 10 },  // F - Đơn vị
                { width: 12 },  // G - Số lượng
                { width: 15 },  // H - Khối lượng
                { width: 30 }   // I - Ghi chú
            ];
        } else if (type === 'vattu' || type === 'phukien') {
            worksheet.columns = [
                { width: 6 },   // A - TT
                { width: 15 },  // B - Mã VT
                { width: 40 },  // C - Tên vật tư
                { width: 10 },  // D - Đơn vị
                { width: 12 },  // E - Số lượng
                { width: 30 }   // F - Ghi chú
            ];
        } else if (type === 'kinh') {
            worksheet.columns = [
                { width: 6 },   // A - TT
                { width: 15 },  // B - Mã Kính
                { width: 30 },  // C - Loại kính
                { width: 12 },  // D - Chiều rộng
                { width: 12 },  // E - Chiều cao
                { width: 10 },  // F - ĐVT
                { width: 12 },  // G - Số tấm
                { width: 15 },  // H - Diện tích
                { width: 25 }   // I - Ghi chú
            ];
        }

        let currentRow = 1;

        // ========================
        // LOGO VÀ THÔNG TIN CÔNG TY
        // ========================

        // Try to add logo
        const logoPath = path.join(__dirname, '../assets/logo.png');
        let hasLogo = false;

        try {
            if (fs.existsSync(logoPath)) {
                const logoImage = workbook.addImage({
                    filename: logoPath,
                    extension: 'png'
                });

                worksheet.addImage(logoImage, {
                    tl: { col: 0, row: 0 },
                    ext: { width: 120, height: 50 }
                });
                hasLogo = true;
            }
        } catch (logoErr) {
            console.warn('Could not load logo:', logoErr.message);
        }

        // Company info header (next to logo)
        worksheet.mergeCells('B1:E1');
        const companyNameCell = worksheet.getCell('B1');
        companyNameCell.value = 'CÔNG TY TNHH CỬA NHÔM VIRALWINDOW';
        companyNameCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E3A5F' } };
        companyNameCell.alignment = { vertical: 'middle', horizontal: 'left' };

        worksheet.mergeCells('B2:E2');
        const addressCell = worksheet.getCell('B2');
        addressCell.value = 'Địa chỉ: Số 123, Đường ABC, Quận XYZ, Hà Nội';
        addressCell.font = { name: 'Times New Roman', size: 10, italic: true };
        addressCell.alignment = { vertical: 'middle', horizontal: 'left' };

        worksheet.mergeCells('B3:E3');
        const phoneCell = worksheet.getCell('B3');
        phoneCell.value = 'Hotline: 0909.xxx.xxx | Email: viralwindow@email.com';
        phoneCell.font = { name: 'Times New Roman', size: 10, italic: true };
        phoneCell.alignment = { vertical: 'middle', horizontal: 'left' };

        // Set row heights for header
        worksheet.getRow(1).height = 25;
        worksheet.getRow(2).height = 18;
        worksheet.getRow(3).height = 18;

        currentRow = 5; // Leave space after header

        // Title
        const titles = {
            'nhom': 'PHIẾU YÊU CẦU VẬT TƯ - NHÔM',
            'vattu': 'PHIẾU YÊU CẦU VẬT TƯ',
            'phukien': 'PHIẾU YÊU CẦU VẬT TƯ - PHỤ KIỆN',
            'kinh': 'PHIẾU YÊU CẦU VẬT TƯ - KÍNH'
        };

        const colCount = type === 'nhom' ? 9 : (type === 'kinh' ? 9 : 6);
        worksheet.mergeCells(currentRow, 1, currentRow, colCount);
        const titleCell = worksheet.getCell(currentRow, 1);
        titleCell.value = titles[type] || 'PHIẾU YÊU CẦU VẬT TƯ';
        titleCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF1E3A5F' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(currentRow).height = 30;
        currentRow++;

        // Date line
        const date = new Date();
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        worksheet.mergeCells(currentRow, 1, currentRow, colCount);
        const dateCell = worksheet.getCell(currentRow, 1);
        dateCell.value = `Ngày ${day} tháng ${month} năm ${year}`;
        dateCell.font = { name: 'Times New Roman', size: 11, italic: true };
        dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
        currentRow += 2;

        // ========================
        // THÔNG TIN DỰ ÁN
        // ========================
        const infoStyle = { name: 'Times New Roman', size: 11 };
        const labelStyle = { name: 'Times New Roman', size: 11, bold: true };

        const projectInfoData = [
            { label: 'Công trình:', value: projectInfo.projectName || '' },
            { label: 'Mã đơn hàng:', value: projectInfo.orderCode || '' },
            { label: 'Loại sản phẩm:', value: projectInfo.productType || '' },
            { label: 'Màu sắc:', value: projectInfo.color || '' },
            { label: 'Địa chỉ giao hàng:', value: projectInfo.deliveryAddress || '' }
        ];

        projectInfoData.forEach(info => {
            worksheet.getCell(currentRow, 1).value = info.label;
            worksheet.getCell(currentRow, 1).font = labelStyle;
            worksheet.mergeCells(currentRow, 2, currentRow, 4);
            worksheet.getCell(currentRow, 2).value = info.value;
            worksheet.getCell(currentRow, 2).font = infoStyle;
            currentRow++;
        });

        currentRow++; // Empty row before table

        // Table header
        const headerRow = currentRow;
        const borderStyle = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
        };

        if (type === 'nhom') {
            const headers = ['TT', 'Tên vật tư', 'Mã vật tư', 'Tỷ trọng', 'Mét (M)', 'Đơn vị', 'Số lượng', 'Khối lượng', 'Ghi chú'];
            headers.forEach((header, idx) => {
                const cell = worksheet.getCell(headerRow, idx + 1);
                cell.value = header;
                cell.font = { name: 'Times New Roman', size: 10, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = borderStyle;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            });
        } else if (type === 'vattu' || type === 'phukien') {
            const headers = ['TT', 'Mã VT', 'Tên vật tư', 'Đơn vị', 'Số lượng'];
            headers.forEach((header, idx) => {
                const cell = worksheet.getCell(headerRow, idx + 1);
                cell.value = header;
                cell.font = { name: 'Times New Roman', size: 10, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = borderStyle;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            });
        } else if (type === 'kinh') {
            const headers = ['TT', 'Mã Kính', 'Loại kính', 'Chiều rộng', 'Chiều cao', 'ĐVT', 'Số tấm', 'Diện tích'];
            headers.forEach((header, idx) => {
                const cell = worksheet.getCell(headerRow, idx + 1);
                cell.value = header;
                cell.font = { name: 'Times New Roman', size: 10, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = borderStyle;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            });
        }

        worksheet.getRow(headerRow).height = 25;
        currentRow++;

        // Data rows
        let totalQty = 0;
        let totalWeight = 0;
        let totalPanels = 0;
        let totalArea = 0;

        data.forEach((item, index) => {
            const row = worksheet.getRow(currentRow);

            if (type === 'nhom') {
                row.getCell(1).value = index + 1; // TT
                row.getCell(2).value = item.name || ''; // Tên vật tư
                row.getCell(3).value = item.code || ''; // Mã vật tư
                row.getCell(4).value = item.density || 0; // Tỷ trọng
                row.getCell(5).value = item.length || 6; // Mét (M)
                row.getCell(6).value = item.unit || 'cây'; // Đơn vị
                row.getCell(7).value = item.quantity || 0; // Số lượng
                row.getCell(8).value = item.weight || 0; // Khối lượng
                row.getCell(9).value = item.note || ''; // Ghi chú

                totalQty += parseFloat(item.quantity) || 0;
                totalWeight += parseFloat(item.weight) || 0;
            } else if (type === 'vattu' || type === 'phukien') {
                row.getCell(1).value = index + 1; // TT
                row.getCell(2).value = item.code || ''; // Mã VT
                row.getCell(3).value = item.name || ''; // Tên vật tư
                row.getCell(4).value = item.unit || 'cái'; // Đơn vị
                row.getCell(5).value = item.quantity || 0; // Số lượng

                totalQty += parseFloat(item.quantity) || 0;
            } else if (type === 'kinh') {
                row.getCell(1).value = index + 1; // TT
                row.getCell(2).value = item.code || ''; // Mã Kính
                row.getCell(3).value = item.type || ''; // Loại kính
                row.getCell(4).value = item.width || 0; // Chiều rộng
                row.getCell(5).value = item.height || 0; // Chiều cao
                row.getCell(6).value = item.unit || 'tấm'; // ĐVT
                row.getCell(7).value = item.panels || 0; // Số tấm
                row.getCell(8).value = parseFloat(item.area || 0).toFixed(6); // Diện tích

                totalPanels += parseInt(item.panels) || 0;
                totalArea += parseFloat(item.area) || 0;
            }

            // Apply border to all cells in row
            const colCount = type === 'nhom' ? 9 : (type === 'kinh' ? 8 : 5);
            for (let col = 1; col <= colCount; col++) {
                const cell = row.getCell(col);
                cell.font = { name: 'Times New Roman', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [1, 3, 4, 5, 6, 7, 8].includes(col) ? 'center' : 'left',
                    wrapText: true
                };
                cell.border = borderStyle;
            }

            row.height = 22;
            currentRow++;
        });

        // Total row
        const totalRow = currentRow;
        if (type === 'nhom') {
            worksheet.getCell(`B${totalRow}`).value = 'TỔNG CỘNG';
            worksheet.getCell(`B${totalRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
            worksheet.getCell(`G${totalRow}`).value = totalQty;
            worksheet.getCell(`G${totalRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
            worksheet.getCell(`H${totalRow}`).value = parseFloat(totalWeight.toFixed(2));
            worksheet.getCell(`H${totalRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
            worksheet.getCell(`H${totalRow}`).numFmt = '0.00';

            for (let col = 1; col <= 9; col++) {
                const cell = worksheet.getCell(totalRow, col);
                cell.border = borderStyle;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            }
        } else if (type === 'kinh') {
            worksheet.getCell(`B${totalRow}`).value = 'TỔNG';
            worksheet.getCell(`B${totalRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
            worksheet.getCell(`G${totalRow}`).value = totalPanels;
            worksheet.getCell(`G${totalRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
            worksheet.getCell(`H${totalRow}`).value = parseFloat(totalArea.toFixed(6));
            worksheet.getCell(`H${totalRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
            worksheet.getCell(`H${totalRow}`).numFmt = '0.000000';

            for (let col = 1; col <= 8; col++) {
                const cell = worksheet.getCell(totalRow, col);
                cell.border = borderStyle;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            }
        }

        currentRow += 2;

        // Date and location
        worksheet.mergeCells(`C${currentRow}:E${currentRow}`);
        worksheet.getCell(`C${currentRow}`).value = `          Hà Nội, Ngày ${day} tháng ${month} năm ${year}`;
        worksheet.getCell(`C${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center' };
        currentRow += 2;

        // Signature section
        const signatureRow1 = currentRow;
        const signatureRow2 = currentRow + 1;

        const signatures = [' Người lập', 'Kiểm tra', 'Kế toán', 'Vật tư', 'Người nhận', 'Duyệt'];
        const signatureLabels = ['  (Ký, họ tên)', '  (Ký, họ tên)', '  (Ký, họ tên)', '  (Ký, họ tên)', '  (Ký, họ tên)', '  (Ký, họ tên)'];

        signatures.forEach((sig, idx) => {
            const cell1 = worksheet.getCell(signatureRow1, idx + 1);
            cell1.value = sig;
            cell1.font = { name: 'Times New Roman', size: 11, bold: true };
            cell1.alignment = { horizontal: 'center', vertical: 'middle' };

            const cell2 = worksheet.getCell(signatureRow2, idx + 1);
            cell2.value = signatureLabels[idx];
            cell2.font = { name: 'Times New Roman', size: 10 };
            cell2.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Send file
        const buffer = await workbook.xlsx.writeBuffer();
        const typeNames = {
            'nhom': 'NHOM',
            'vattu': 'VTP',
            'phukien': 'PK',
            'kinh': 'KINH'
        };
        const filename = `Phieu_Yeu_Cau_${typeNames[type]}_${projectInfo.projectName || 'Công trình'}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Error exporting purchase request:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất Excel: ' + error.message
        });
    }
};





