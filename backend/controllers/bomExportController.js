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
 * Tạo header chung cho Excel (logo, thông tin công ty)
 */
function addCompanyHeader(worksheet, workbook) {
    // Đường dẫn logo - thử nhiều vị trí
    let logoPath = path.join(__dirname, '..', 'assets', 'LogoViralWindow.png');
    if (!fs.existsSync(logoPath)) {
        logoPath = path.join(__dirname, '../../Tài liệu/LogoViralWindow.png');
    }
    let logoId = null;

    // Thêm logo nếu file tồn tại
    if (fs.existsSync(logoPath)) {
        try {
            logoId = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
        } catch (err) {
            console.log('Không thể thêm logo:', err.message);
        }
    }

    // Row 1: CÔNG TY CỔ PHẦN VIRALWINDOW
    worksheet.mergeCells('A1:E1');
    const companyNameCell = worksheet.getCell('A1');
    companyNameCell.value = 'CÔNG TY CỔ PHẦN VIRALWINDOW';
    companyNameCell.font = { name: 'Times New Roman', size: 14, bold: true };
    companyNameCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Row 2: Nhà máy
    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = 'Nhà máy: KM 03, Đường Cienco5, KĐT Thanh Hà, Hà Đông, Hà Nội';
    worksheet.getCell('A2').font = { name: 'Times New Roman', size: 10 };

    // Row 3: Hotline
    worksheet.mergeCells('A3:E3');
    worksheet.getCell('A3').value = 'Hotline: 1800 282839';
    worksheet.getCell('A3').font = { name: 'Times New Roman', size: 10 };

    // Row 4: Email
    worksheet.mergeCells('A4:E4');
    worksheet.getCell('A4').value = 'Email: viralwindow.vn@gmail.com';
    worksheet.getCell('A4').font = { name: 'Times New Roman', size: 10 };

    // Row 5: Website
    worksheet.mergeCells('A5:E5');
    worksheet.getCell('A5').value = 'Website: viralwindow.vn';
    worksheet.getCell('A5').font = { name: 'Times New Roman', size: 10 };

    // Logo (bên phải)
    if (logoId !== null) {
        worksheet.addImage(logoId, {
            tl: { col: 7, row: 0 },
            ext: { width: 180, height: 100 },
            editAs: 'oneCell'
        });
    }

    return 7; // Return next row number
}

/**
 * Xuất Excel Bóc tách Nhôm
 */
exports.exportAluminumBreakdown = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { data: aluminumItems } = req.body;

        if (!aluminumItems || !Array.isArray(aluminumItems) || aluminumItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu nhôm để xuất'
            });
        }

        // Get project info
        const [projects] = await db.query(
            `SELECT p.*, c.full_name AS customer_name, c.address AS customer_address 
             FROM projects p 
             LEFT JOIN customers c ON p.customer_id = c.id 
             WHERE p.id = ?`,
            [projectId]
        );
        const project = projects[0] || {};

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Bóc tách Nhôm');

        // Set column widths
        worksheet.columns = [
            { width: 6 },   // A - STT
            { width: 15 },  // B - Mã VT
            { width: 40 },  // C - Tên nhôm
            { width: 12 },  // D - Tỷ trọng
            { width: 12 },  // E - Dài (m)
            { width: 10 },  // F - ĐVT
            { width: 10 },  // G - SL
            { width: 15 },  // H - KL (kg)
            { width: 30 }   // I - Ghi chú
        ];

        let currentRow = addCompanyHeader(worksheet, workbook);

        // Title
        worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = 'BÓC TÁCH NHÔM';
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.font = { name: 'Times New Roman', size: 16, bold: true };
        worksheet.getRow(currentRow).height = 30;
        currentRow += 2;

        // Project info
        worksheet.getCell(`A${currentRow}`).value = 'Dự án:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.project_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Khách hàng:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.customer_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Địa điểm:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.location || project.address || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Màu sắc nhôm:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = req.body.color || 'Xám sần';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0000FF' } };
        currentRow += 2;

        // Header row
        const headerRow = currentRow;
        const headers = ['STT', 'Mã VT', 'Tên nhôm', 'Tỷ trọng', 'Dài (m)', 'ĐVT', 'SL', 'KL (kg)', 'Ghi chú'];
        headers.forEach((header, index) => {
            const cell = worksheet.getCell(headerRow, index + 1);
            cell.value = header;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.font = { name: 'Times New Roman', size: 10, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        worksheet.getRow(headerRow).height = 25;
        currentRow++;

        // Data rows
        let totalQuantity = 0;
        let totalWeight = 0;
        aluminumItems.forEach((item, index) => {
            const row = currentRow;
            const quantity = parseFloat(item.quantity || 0);
            const weight = parseFloat(item.weight_kg || item.weight || 0); // ✅ Fixed: Accept both weight_kg (frontend) and weight
            totalQuantity += quantity;
            totalWeight += weight;

            worksheet.getCell(row, 1).value = index + 1; // STT
            worksheet.getCell(row, 2).value = item.code || item.item_code || ''; // Mã VT
            worksheet.getCell(row, 3).value = item.name || item.item_name || ''; // Tên nhôm
            worksheet.getCell(row, 4).value = parseFloat(item.density || 0); // Tỷ trọng
            worksheet.getCell(row, 5).value = parseFloat(item.length || item.length_m || 0); // Dài (m)
            worksheet.getCell(row, 6).value = item.unit || 'cây'; // ĐVT
            worksheet.getCell(row, 7).value = quantity; // SL
            worksheet.getCell(row, 8).value = weight; // KL (kg)
            worksheet.getCell(row, 9).value = item.notes || ''; // Ghi chú

            // Style cells
            for (let col = 1; col <= 9; col++) {
                const cell = worksheet.getCell(row, col);
                cell.font = { name: 'Times New Roman', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [1, 4, 5, 6, 7, 8].includes(col) ? 'center' : 'left',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if ([4, 5, 7, 8].includes(col)) {
                    cell.numFmt = '0.00';
                }
            }
            worksheet.getRow(row).height = 22;
            currentRow++;
        });

        // Footer row - TỔNG CỘNG
        const footerRow = currentRow;
        worksheet.mergeCells(`A${footerRow}:F${footerRow}`);
        worksheet.getCell(`A${footerRow}`).value = 'TỔNG CỘNG:';
        worksheet.getCell(`A${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`G${footerRow}`).value = totalQuantity;
        worksheet.getCell(`G${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`G${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`G${footerRow}`).numFmt = '0';
        worksheet.getCell(`H${footerRow}`).value = totalWeight;
        worksheet.getCell(`H${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`H${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`H${footerRow}`).numFmt = '0.00';

        // Style footer
        for (let col = 1; col <= 9; col++) {
            const cell = worksheet.getCell(footerRow, col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        worksheet.getRow(footerRow).height = 25;

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        const projectName = (project.project_name || 'Project').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Boc_tach_Nhom_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

        res.send(buffer);
    } catch (error) {
        console.error('Error exporting aluminum breakdown Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất Excel: ' + error.message
        });
    }
};

/**
 * Xuất Excel Bóc tách Kính
 */
exports.exportGlassBreakdown = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { data: glassItems } = req.body;

        if (!glassItems || !Array.isArray(glassItems) || glassItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu kính để xuất'
            });
        }

        // Get project info
        const [projects] = await db.query(
            `SELECT p.*, c.full_name AS customer_name, c.address AS customer_address 
             FROM projects p 
             LEFT JOIN customers c ON p.customer_id = c.id 
             WHERE p.id = ?`,
            [projectId]
        );
        const project = projects[0] || {};

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Bóc tách Kính');

        // Set column widths
        worksheet.columns = [
            { width: 6 },   // A - STT
            { width: 15 },  // B - Mã kính
            { width: 40 },  // C - Loại kính
            { width: 12 },  // D - Rộng (mm)
            { width: 12 },  // E - Cao (mm)
            { width: 10 },  // F - ĐVT
            { width: 10 },  // G - SL (tấm)
            { width: 15 },  // H - Diện tích (m²)
            { width: 30 }   // I - Ghi chú
        ];

        let currentRow = addCompanyHeader(worksheet, workbook);

        // Title
        worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = 'BÓC TÁCH KÍNH';
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.font = { name: 'Times New Roman', size: 16, bold: true };
        worksheet.getRow(currentRow).height = 30;
        currentRow += 2;

        // Project info
        worksheet.getCell(`A${currentRow}`).value = 'Dự án:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.project_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Khách hàng:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.customer_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Địa điểm:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.location || project.address || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow += 2;

        // Header row
        const headerRow = currentRow;
        const headers = ['STT', 'Mã kính', 'Loại kính', 'Rộng (mm)', 'Cao (mm)', 'ĐVT', 'SL (tấm)', 'Diện tích (m²)', 'Ghi chú'];
        headers.forEach((header, index) => {
            const cell = worksheet.getCell(headerRow, index + 1);
            cell.value = header;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.font = { name: 'Times New Roman', size: 10, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        worksheet.getRow(headerRow).height = 25;
        currentRow++;

        // Data rows
        let totalPanels = 0;
        let totalArea = 0;
        glassItems.forEach((item, index) => {
            const row = currentRow;
            const panels = parseInt(item.quantity || item.panels || 0);
            const area = parseFloat(item.area_m2 || item.area || 0);
            totalPanels += panels;
            totalArea += area;

            worksheet.getCell(row, 1).value = index + 1; // STT
            worksheet.getCell(row, 2).value = item.code || item.glass_code || ''; // Mã kính
            worksheet.getCell(row, 3).value = item.type || item.glass_type || ''; // Loại kính
            worksheet.getCell(row, 4).value = parseFloat(item.width_mm || item.width || 0); // Rộng (mm)
            worksheet.getCell(row, 5).value = parseFloat(item.height_mm || item.height || 0); // Cao (mm)
            worksheet.getCell(row, 6).value = 'tấm'; // ĐVT
            worksheet.getCell(row, 7).value = panels; // SL (tấm)
            worksheet.getCell(row, 8).value = area; // Diện tích (m²)
            worksheet.getCell(row, 9).value = item.notes || ''; // Ghi chú

            // Style cells
            for (let col = 1; col <= 9; col++) {
                const cell = worksheet.getCell(row, col);
                cell.font = { name: 'Times New Roman', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [1, 4, 5, 6, 7, 8].includes(col) ? 'center' : 'left',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if ([4, 5, 7, 8].includes(col)) {
                    cell.numFmt = col === 7 ? '0' : '0.00';
                }
            }
            worksheet.getRow(row).height = 22;
            currentRow++;
        });

        // Footer row - TỔNG CỘNG
        const footerRow = currentRow;
        worksheet.mergeCells(`A${footerRow}:F${footerRow}`);
        worksheet.getCell(`A${footerRow}`).value = 'TỔNG CỘNG:';
        worksheet.getCell(`A${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`G${footerRow}`).value = totalPanels;
        worksheet.getCell(`G${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`G${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`G${footerRow}`).numFmt = '0';
        worksheet.getCell(`H${footerRow}`).value = totalArea;
        worksheet.getCell(`H${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`H${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`H${footerRow}`).numFmt = '0.00';

        // Style footer
        for (let col = 1; col <= 9; col++) {
            const cell = worksheet.getCell(footerRow, col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        worksheet.getRow(footerRow).height = 25;

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        const projectName = (project.project_name || 'Project').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Boc_tach_Kinh_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

        res.send(buffer);
    } catch (error) {
        console.error('Error exporting glass breakdown Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất Excel: ' + error.message
        });
    }
};

/**
 * Xuất Excel Bóc tách Phụ kiện/Vật tư Phụ
 */
exports.exportAccessoriesBreakdown = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { data: accessoriesItems } = req.body;

        if (!accessoriesItems || !Array.isArray(accessoriesItems) || accessoriesItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu vật tư phụ để xuất'
            });
        }

        // Get project info
        const [projects] = await db.query(
            `SELECT p.*, c.full_name AS customer_name, c.address AS customer_address 
             FROM projects p 
             LEFT JOIN customers c ON p.customer_id = c.id 
             WHERE p.id = ?`,
            [projectId]
        );
        const project = projects[0] || {};

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Bóc tách Vật tư Phụ');

        // Set column widths
        worksheet.columns = [
            { width: 6 },   // A - STT
            { width: 15 },  // B - Mã VT
            { width: 40 },  // C - Tên vật tư
            { width: 10 },  // D - ĐVT
            { width: 12 },  // E - SL
            { width: 30 }   // F - Ghi chú
        ];

        let currentRow = addCompanyHeader(worksheet, workbook);

        // Title
        worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = 'BÓC TÁCH VẬT TƯ PHỤ';
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.font = { name: 'Times New Roman', size: 16, bold: true };
        worksheet.getRow(currentRow).height = 30;
        currentRow += 2;

        // Project info
        worksheet.getCell(`A${currentRow}`).value = 'Dự án:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.project_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Khách hàng:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.customer_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Địa điểm:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.location || project.address || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow += 2;

        // Header row
        const headerRow = currentRow;
        const headers = ['STT', 'Mã VT', 'Tên vật tư', 'ĐVT', 'SL', 'Ghi chú'];
        headers.forEach((header, index) => {
            const cell = worksheet.getCell(headerRow, index + 1);
            cell.value = header;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.font = { name: 'Times New Roman', size: 10, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        worksheet.getRow(headerRow).height = 25;
        currentRow++;

        // Data rows
        let totalQuantity = 0;
        accessoriesItems.forEach((item, index) => {
            const row = currentRow;
            const quantity = parseFloat(item.quantity || 0);
            totalQuantity += quantity;

            worksheet.getCell(row, 1).value = index + 1; // STT
            worksheet.getCell(row, 2).value = item.code || item.item_code || ''; // Mã VT
            worksheet.getCell(row, 3).value = item.name || item.item_name || ''; // Tên vật tư
            worksheet.getCell(row, 4).value = item.unit || 'cái'; // ĐVT
            worksheet.getCell(row, 5).value = quantity; // SL
            worksheet.getCell(row, 6).value = item.notes || ''; // Ghi chú

            // Style cells
            for (let col = 1; col <= 6; col++) {
                const cell = worksheet.getCell(row, col);
                cell.font = { name: 'Times New Roman', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [1, 4, 5].includes(col) ? 'center' : 'left',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (col === 5) {
                    cell.numFmt = '0';
                }
            }
            worksheet.getRow(row).height = 22;
            currentRow++;
        });

        // Footer row - TỔNG CỘNG
        const footerRow = currentRow;
        worksheet.mergeCells(`A${footerRow}:D${footerRow}`);
        worksheet.getCell(`A${footerRow}`).value = 'TỔNG CỘNG:';
        worksheet.getCell(`A${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`E${footerRow}`).value = totalQuantity;
        worksheet.getCell(`E${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`E${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`E${footerRow}`).numFmt = '0';

        // Style footer
        for (let col = 1; col <= 6; col++) {
            const cell = worksheet.getCell(footerRow, col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        worksheet.getRow(footerRow).height = 25;

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        const projectName = (project.project_name || 'Project').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Boc_tach_Vat_Tu_Phu_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

        res.send(buffer);
    } catch (error) {
        console.error('Error exporting accessories breakdown Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất Excel: ' + error.message
        });
    }
};

/**
 * Xuất Excel Bóc tách Tổng hợp (Nhôm + Kính + Vật tư Phụ)
 */
exports.exportCombinedBreakdown = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { nhom = [], kinh = [], vattu = [] } = req.body;

        // Check if there's any data
        if ((!nhom || nhom.length === 0) && (!kinh || kinh.length === 0) && (!vattu || vattu.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu bóc tách để xuất'
            });
        }

        // Get project info
        const [projects] = await db.query(
            `SELECT p.*, c.full_name AS customer_name, c.address AS customer_address 
             FROM projects p 
             LEFT JOIN customers c ON p.customer_id = c.id 
             WHERE p.id = ?`,
            [projectId]
        );
        const project = projects[0] || {};

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();

        // Sheet 1: Tổng hợp
        const summarySheet = workbook.addWorksheet('Tổng hợp');
        let currentRow = addCompanyHeader(summarySheet, workbook);

        // Title
        summarySheet.mergeCells(`A${currentRow}:I${currentRow}`);
        const titleCell = summarySheet.getCell(`A${currentRow}`);
        titleCell.value = 'BÓC TÁCH VẬT TƯ TỔNG HỢP';
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.font = { name: 'Times New Roman', size: 16, bold: true };
        summarySheet.getRow(currentRow).height = 30;
        currentRow += 2;

        // Project info
        summarySheet.getCell(`A${currentRow}`).value = 'Dự án:';
        summarySheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        summarySheet.mergeCells(`B${currentRow}:D${currentRow}`);
        summarySheet.getCell(`B${currentRow}`).value = project.project_name || '';
        summarySheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        summarySheet.getCell(`A${currentRow}`).value = 'Khách hàng:';
        summarySheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        summarySheet.mergeCells(`B${currentRow}:D${currentRow}`);
        summarySheet.getCell(`B${currentRow}`).value = project.customer_name || '';
        summarySheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        summarySheet.getCell(`A${currentRow}`).value = 'Địa điểm:';
        summarySheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        summarySheet.mergeCells(`B${currentRow}:D${currentRow}`);
        summarySheet.getCell(`B${currentRow}`).value = project.location || project.address || '';
        summarySheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow += 2;

        // Summary statistics
        const totalNhomTypes = nhom.length || 0;
        const totalNhomQty = nhom.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
        const totalNhomWeight = nhom.reduce((sum, item) => sum + parseFloat(item.weight_kg || item.weight || 0), 0);
        const totalKinhTypes = kinh.length || 0;
        const totalKinhPanels = kinh.reduce((sum, item) => sum + parseInt(item.quantity || item.panels || 0), 0);
        const totalKinhArea = kinh.reduce((sum, item) => sum + parseFloat(item.area_m2 || item.area || 0), 0);
        const totalVatTuTypes = vattu.length || 0;
        const totalVatTuQty = vattu.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);

        summarySheet.getCell(`A${currentRow}`).value = 'TỔNG KẾT:';
        summarySheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 12, bold: true };
        currentRow++;

        summarySheet.getCell(`A${currentRow}`).value = 'Nhôm:';
        summarySheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        summarySheet.getCell(`B${currentRow}`).value = `${totalNhomTypes} loại, ${totalNhomQty} cây, ${totalNhomWeight.toFixed(2)} kg`;
        summarySheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        summarySheet.getCell(`A${currentRow}`).value = 'Kính:';
        summarySheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        summarySheet.getCell(`B${currentRow}`).value = `${totalKinhTypes} loại, ${totalKinhPanels} tấm, ${totalKinhArea.toFixed(2)} m²`;
        summarySheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        summarySheet.getCell(`A${currentRow}`).value = 'Vật tư phụ:';
        summarySheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        summarySheet.getCell(`B${currentRow}`).value = `${totalVatTuTypes} loại, ${totalVatTuQty} cái`;
        summarySheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow += 2;

        // Set column widths for summary sheet
        summarySheet.columns = [
            { width: 20 },
            { width: 60 }
        ];

        // Sheet 2: Nhôm (nếu có)
        if (nhom && nhom.length > 0) {
            const nhomSheet = workbook.addWorksheet('Nhôm');
            nhomSheet.columns = [
                { width: 6 }, { width: 15 }, { width: 40 }, { width: 12 }, { width: 12 },
                { width: 10 }, { width: 10 }, { width: 15 }, { width: 30 }
            ];
            let nhomRow = addCompanyHeader(nhomSheet, workbook);
            nhomSheet.mergeCells(`A${nhomRow}:I${nhomRow}`);
            nhomSheet.getCell(`A${nhomRow}`).value = 'BÓC TÁCH NHÔM';
            nhomSheet.getCell(`A${nhomRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
            nhomSheet.getCell(`A${nhomRow}`).font = { name: 'Times New Roman', size: 16, bold: true };
            nhomSheet.getRow(nhomRow).height = 30;
            nhomRow++;

            nhomSheet.mergeCells(`A${nhomRow}:I${nhomRow}`);
            nhomSheet.getCell(`A${nhomRow}`).value = `MÀU SẮC NHÔM: ${req.body.color || 'Xám sần'}`;
            nhomSheet.getCell(`A${nhomRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
            nhomSheet.getCell(`A${nhomRow}`).font = { name: 'Times New Roman', size: 12, bold: true, italic: true, color: { argb: 'FF0000FF' } };
            nhomSheet.getRow(nhomRow).height = 20;
            nhomRow += 2;

            // Header
            const nhomHeaders = ['STT', 'Mã VT', 'Tên nhôm', 'Tỷ trọng', 'Dài (m)', 'ĐVT', 'SL', 'KL (kg)', 'Ghi chú'];
            nhomHeaders.forEach((header, index) => {
                const cell = nhomSheet.getCell(nhomRow, index + 1);
                cell.value = header;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
                cell.font = { name: 'Times New Roman', size: 10, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
            nhomSheet.getRow(nhomRow).height = 25;
            nhomRow++;

            // Data
            nhom.forEach((item, index) => {
                nhomSheet.getCell(nhomRow, 1).value = index + 1;
                nhomSheet.getCell(nhomRow, 2).value = item.code || item.item_code || '';
                nhomSheet.getCell(nhomRow, 3).value = item.name || item.item_name || '';
                nhomSheet.getCell(nhomRow, 4).value = parseFloat(item.density || 0);
                nhomSheet.getCell(nhomRow, 5).value = parseFloat(item.length || item.length_m || 0);
                nhomSheet.getCell(nhomRow, 6).value = item.unit || 'cây';
                nhomSheet.getCell(nhomRow, 7).value = parseFloat(item.quantity || 0);
                nhomSheet.getCell(nhomRow, 8).value = parseFloat(item.weight_kg || item.weight || 0);
                nhomSheet.getCell(nhomRow, 9).value = item.notes || '';
                for (let col = 1; col <= 9; col++) {
                    const cell = nhomSheet.getCell(nhomRow, col);
                    cell.font = { name: 'Times New Roman', size: 10 };
                    cell.alignment = { vertical: 'middle', horizontal: [1, 4, 5, 6, 7, 8].includes(col) ? 'center' : 'left', wrapText: true };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    if ([4, 5, 7, 8].includes(col)) cell.numFmt = '0.00';
                }
                nhomSheet.getRow(nhomRow).height = 22;
                nhomRow++;
            });
        }

        // Sheet 3: Kính (nếu có)
        if (kinh && kinh.length > 0) {
            const kinhSheet = workbook.addWorksheet('Kính');
            kinhSheet.columns = [
                { width: 6 }, { width: 15 }, { width: 40 }, { width: 12 }, { width: 12 },
                { width: 10 }, { width: 10 }, { width: 15 }, { width: 30 }
            ];
            let kinhRow = addCompanyHeader(kinhSheet, workbook);
            kinhSheet.mergeCells(`A${kinhRow}:I${kinhRow}`);
            kinhSheet.getCell(`A${kinhRow}`).value = 'BÓC TÁCH KÍNH';
            kinhSheet.getCell(`A${kinhRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
            kinhSheet.getCell(`A${kinhRow}`).font = { name: 'Times New Roman', size: 16, bold: true };
            kinhSheet.getRow(kinhRow).height = 30;
            kinhRow += 2;

            // Header
            const kinhHeaders = ['STT', 'Mã kính', 'Loại kính', 'Rộng (mm)', 'Cao (mm)', 'ĐVT', 'SL (tấm)', 'Diện tích (m²)', 'Ghi chú'];
            kinhHeaders.forEach((header, index) => {
                const cell = kinhSheet.getCell(kinhRow, index + 1);
                cell.value = header;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
                cell.font = { name: 'Times New Roman', size: 10, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
            kinhSheet.getRow(kinhRow).height = 25;
            kinhRow++;

            // Data
            kinh.forEach((item, index) => {
                kinhSheet.getCell(kinhRow, 1).value = index + 1;
                kinhSheet.getCell(kinhRow, 2).value = item.code || item.glass_code || '';
                kinhSheet.getCell(kinhRow, 3).value = item.type || item.glass_type || '';
                kinhSheet.getCell(kinhRow, 4).value = parseFloat(item.width_mm || item.width || 0);
                kinhSheet.getCell(kinhRow, 5).value = parseFloat(item.height_mm || item.height || 0);
                kinhSheet.getCell(kinhRow, 6).value = 'tấm';
                kinhSheet.getCell(kinhRow, 7).value = parseInt(item.quantity || item.panels || 0);
                kinhSheet.getCell(kinhRow, 8).value = parseFloat(item.area_m2 || item.area || 0);
                kinhSheet.getCell(kinhRow, 9).value = item.notes || '';
                for (let col = 1; col <= 9; col++) {
                    const cell = kinhSheet.getCell(kinhRow, col);
                    cell.font = { name: 'Times New Roman', size: 10 };
                    cell.alignment = { vertical: 'middle', horizontal: [1, 4, 5, 6, 7, 8].includes(col) ? 'center' : 'left', wrapText: true };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    if ([4, 5, 7, 8].includes(col)) cell.numFmt = col === 7 ? '0' : '0.00';
                }
                kinhSheet.getRow(kinhRow).height = 22;
                kinhRow++;
            });
        }

        // Sheet 4: Vật tư Phụ (nếu có)
        if (vattu && vattu.length > 0) {
            const vattuSheet = workbook.addWorksheet('Vật tư Phụ');
            vattuSheet.columns = [
                { width: 6 }, { width: 15 }, { width: 40 }, { width: 10 }, { width: 12 }, { width: 30 }
            ];
            let vattuRow = addCompanyHeader(vattuSheet, workbook);
            vattuSheet.mergeCells(`A${vattuRow}:F${vattuRow}`);
            vattuSheet.getCell(`A${vattuRow}`).value = 'BÓC TÁCH VẬT TƯ PHỤ';
            vattuSheet.getCell(`A${vattuRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
            vattuSheet.getCell(`A${vattuRow}`).font = { name: 'Times New Roman', size: 16, bold: true };
            vattuSheet.getRow(vattuRow).height = 30;
            vattuRow += 2;

            // Header
            const vattuHeaders = ['STT', 'Mã VT', 'Tên vật tư', 'ĐVT', 'SL', 'Ghi chú'];
            vattuHeaders.forEach((header, index) => {
                const cell = vattuSheet.getCell(vattuRow, index + 1);
                cell.value = header;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
                cell.font = { name: 'Times New Roman', size: 10, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
            vattuSheet.getRow(vattuRow).height = 25;
            vattuRow++;

            // Data
            vattu.forEach((item, index) => {
                vattuSheet.getCell(vattuRow, 1).value = index + 1;
                vattuSheet.getCell(vattuRow, 2).value = item.code || item.item_code || '';
                vattuSheet.getCell(vattuRow, 3).value = item.name || item.item_name || '';
                vattuSheet.getCell(vattuRow, 4).value = item.unit || 'cái';
                vattuSheet.getCell(vattuRow, 5).value = parseFloat(item.quantity || 0);
                vattuSheet.getCell(vattuRow, 6).value = item.notes || '';
                for (let col = 1; col <= 6; col++) {
                    const cell = vattuSheet.getCell(vattuRow, col);
                    cell.font = { name: 'Times New Roman', size: 10 };
                    cell.alignment = { vertical: 'middle', horizontal: [1, 4, 5].includes(col) ? 'center' : 'left', wrapText: true };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    if (col === 5) cell.numFmt = '0';
                }
                vattuSheet.getRow(vattuRow).height = 22;
                vattuRow++;
            });
        }

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        const projectName = (project.project_name || 'Project').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Boc_tach_Tong_hop_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

        res.send(buffer);
    } catch (error) {
        console.error('Error exporting combined breakdown Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất Excel: ' + error.message
        });
    }
};

/**
 * Xuất Excel Danh sách sản phẩm
 */
exports.exportProductList = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { data: productItems } = req.body;

        if (!productItems || !Array.isArray(productItems) || productItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu sản phẩm để xuất'
            });
        }

        // Get project info with more details
        // Note: projects table doesn't have created_by or user_id column
        const [projects] = await db.query(
            `SELECT p.*, c.full_name AS customer_name, c.address AS customer_address, c.phone AS customer_phone
             FROM projects p 
             LEFT JOIN customers c ON p.customer_id = c.id 
             WHERE p.id = ?`,
            [projectId]
        );
        const project = projects[0] || {};

        // Get current user (designer) from request if available
        // Since projects table doesn't have user_id/created_by, we use the current logged-in user
        const currentUser = req.user || {};
        const designerName = currentUser.full_name || currentUser.email || 'N/A';

        // Get current date
        const currentDate = new Date();
        const dateStr = formatDateVN(currentDate);

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Danh sách sản phẩm');

        // Set column widths
        worksheet.columns = [
            { width: 6 },   // A - STT
            { width: 15 },  // B - Ký hiệu
            { width: 60 },  // C - Quy cách (mm)
            { width: 15 },  // D - Màu nhôm
            { width: 20 },  // E - Loại kính
            { width: 20 },  // F - Phụ kiện
            { width: 15 },  // G - Hệ nhôm
            { width: 8 },   // H - SL
            { width: 15 },  // I - Vị trí
            { width: 15 }   // J - Trạng thái
        ];

        let currentRow = addCompanyHeader(worksheet, workbook);

        // Title
        worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = 'DANH SÁCH SẢN PHẨM';
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.font = { name: 'Times New Roman', size: 16, bold: true };
        worksheet.getRow(currentRow).height = 30;
        currentRow += 2;

        // Project info - Left column
        worksheet.getCell(`A${currentRow}`).value = 'Dự án:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.project_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };

        // Right column - Ngày làm
        worksheet.getCell(`F${currentRow}`).value = 'Ngày làm:';
        worksheet.getCell(`F${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`G${currentRow}:H${currentRow}`);
        worksheet.getCell(`G${currentRow}`).value = dateStr;
        worksheet.getCell(`G${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Khách hàng:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.customer_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };

        // Right column - Người thiết kế
        worksheet.getCell(`F${currentRow}`).value = 'Người thiết kế:';
        worksheet.getCell(`F${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`G${currentRow}:H${currentRow}`);
        worksheet.getCell(`G${currentRow}`).value = designerName;
        worksheet.getCell(`G${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Địa điểm:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.location || project.address || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };

        // Right column - Mã dự án
        worksheet.getCell(`F${currentRow}`).value = 'Mã dự án:';
        worksheet.getCell(`F${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`G${currentRow}:H${currentRow}`);
        worksheet.getCell(`G${currentRow}`).value = project.project_code || '';
        worksheet.getCell(`G${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow += 2;

        // Header row
        const headerRow = currentRow;
        const headers = ['STT', 'Ký hiệu', 'Quy cách (mm)', 'Màu nhôm', 'Loại kính', 'Phụ kiện', 'Hệ nhôm', 'SL', 'Vị trí', 'Trạng thái'];
        headers.forEach((header, index) => {
            const cell = worksheet.getCell(headerRow, index + 1);
            cell.value = header;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.font = { name: 'Times New Roman', size: 10, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        worksheet.getRow(headerRow).height = 25;
        currentRow++;

        // Data rows
        let totalQuantity = 0;
        productItems.forEach((item, index) => {
            const row = currentRow;
            const quantity = parseInt(item.quantity || 1);
            totalQuantity += quantity;

            // Get dimensions
            const width = item.width_mm || item.width || '—';
            const height = item.height_mm || item.height || '—';
            const dimensions = `${width} × ${height}`;

            // ✅ CRITICAL FIX: Lấy Ký hiệu với logic swap giống frontend
            let displayCode = item.product_code || item.code || item.item_code || item.design_code || item.material_code || item.door_code || '';
            let displayName = item.item_name || item.name || '';

            // Logic swap: nếu item_name giống mã (ngắn, chứa dạng như D2-T1) và product_code giống tên sản phẩm (dài), thì hoán đổi
            const isNameLikeCode = displayName && displayName.length < 15 && /^[A-Z0-9_-]+$/i.test(displayName.replace(/\s/g, ''));
            const isCodeLikeName = displayCode && displayCode.length > 15;

            if (isNameLikeCode && isCodeLikeName) {
                const temp = displayCode;
                displayCode = displayName;
                displayName = temp;
            }

            // Get quy cách (spec hoặc design hoặc item_name sau khi swap)
            const spec = item.spec || item.design || displayName || item.item_name || item.code || '';

            // Get colors and types
            const color = item.color_name || item.color || 'Trắng';
            const glassType = item.glass_type_name || item.glass_type || '-';
            const accessories = item.accessories || '-';
            const aluminumSystem = item.aluminum_system_name || item.aluminum_system || '-';
            const position = item.position || '-';

            // Get status
            let statusText = 'Chưa TK';
            if (item.design_status === 'DESIGNING') {
                statusText = 'Đang TK';
            } else if (item.design_status === 'DESIGN_CONFIRMED') {
                statusText = 'Đã TK';
            } else if (item.design_status === 'BOM_EXTRACTED') {
                statusText = 'Đã bóc';
            }

            worksheet.getCell(row, 1).value = index + 1; // STT
            worksheet.getCell(row, 2).value = displayCode || '-'; // Ký hiệu (đã xử lý swap)
            worksheet.getCell(row, 3).value = spec; // Quy cách
            worksheet.getCell(row, 4).value = color; // Màu nhôm
            worksheet.getCell(row, 5).value = glassType; // Loại kính
            worksheet.getCell(row, 6).value = accessories; // Phụ kiện
            worksheet.getCell(row, 7).value = aluminumSystem; // Hệ nhôm
            worksheet.getCell(row, 8).value = quantity; // SL
            worksheet.getCell(row, 9).value = position; // Vị trí
            worksheet.getCell(row, 10).value = statusText; // Trạng thái

            // Style cells
            for (let col = 1; col <= 10; col++) {
                const cell = worksheet.getCell(row, col);
                cell.font = { name: 'Times New Roman', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [1, 8].includes(col) ? 'center' : 'left',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
            // Tính chiều cao dòng động dựa trên nội dung dài nhất
            // Column widths: A=6, B=15, C=60, D=15, E=20, F=20, G=15, H=8, I=15, J=15
            const colWidths = [6, 15, 60, 15, 20, 20, 15, 8, 15, 15];
            const LINE_HEIGHT = 15; // Chiều cao mỗi dòng text (pt)
            const MIN_ROW_HEIGHT = 30; // Chiều cao tối thiểu
            const CHARS_PER_WIDTH_UNIT = 1.2; // Số ký tự trung bình trên 1 đơn vị width (font Times New Roman size 10)

            let maxLines = 1;
            for (let col = 1; col <= 10; col++) {
                const cellValue = String(worksheet.getCell(row, col).value || '');
                if (cellValue.length > 0) {
                    const colCharWidth = Math.floor(colWidths[col - 1] * CHARS_PER_WIDTH_UNIT);
                    // Tính số dòng ước lượng = ký tự / chiều rộng cột (tính bằng ký tự)
                    const estimatedLines = Math.ceil(cellValue.length / Math.max(colCharWidth, 1));
                    // Cộng thêm các dòng từ ký tự xuống dòng thủ công
                    const manualNewlines = (cellValue.match(/\n/g) || []).length;
                    maxLines = Math.max(maxLines, estimatedLines + manualNewlines);
                }
            }
            worksheet.getRow(row).height = Math.max(MIN_ROW_HEIGHT, maxLines * LINE_HEIGHT);
            currentRow++;
        });

        // Footer row - TỔNG CỘNG
        const footerRow = currentRow;
        worksheet.mergeCells(`A${footerRow}:G${footerRow}`);
        worksheet.getCell(`A${footerRow}`).value = 'TỔNG CỘNG:';
        worksheet.getCell(`A${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`H${footerRow}`).value = totalQuantity;
        worksheet.getCell(`H${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`H${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`I${footerRow}`).value = `${productItems.length} sản phẩm`;
        worksheet.getCell(`I${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`I${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

        // Style footer
        for (let col = 1; col <= 10; col++) {
            const cell = worksheet.getCell(footerRow, col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        worksheet.getRow(footerRow).height = 25;
        currentRow += 2;

        // Ghi chú section
        worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Ghi chú:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`A${currentRow}`).alignment = { vertical: 'top', horizontal: 'left' };
        currentRow++;

        const notesText = project.notes || 'Không có ghi chú.';
        worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = notesText;
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 10 };
        worksheet.getCell(`A${currentRow}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        worksheet.getRow(currentRow).height = Math.max(30, (notesText.length / 80) * 20); // Auto height based on text length
        currentRow += 3;

        // Signature section
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Người lập';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`A${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(currentRow).height = 60;

        // Add signature line
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = '(Ký, ghi rõ họ tên)';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 10, italic: true };
        worksheet.getCell(`A${currentRow}`).alignment = { vertical: 'top', horizontal: 'center' };

        // Right side - Người kiểm tra
        worksheet.mergeCells(`F${currentRow - 1}:J${currentRow - 1}`);
        worksheet.getCell(`F${currentRow - 1}`).value = 'Người kiểm tra';
        worksheet.getCell(`F${currentRow - 1}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`F${currentRow - 1}`).alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.mergeCells(`F${currentRow}:J${currentRow}`);
        worksheet.getCell(`F${currentRow}`).value = '(Ký, ghi rõ họ tên)';
        worksheet.getCell(`F${currentRow}`).font = { name: 'Times New Roman', size: 10, italic: true };
        worksheet.getCell(`F${currentRow}`).alignment = { vertical: 'top', horizontal: 'center' };

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        const projectName = (project.project_name || 'Project').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `DanhSachSanPham_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

        res.send(buffer);
    } catch (error) {
        console.error('Error exporting product list Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất Excel: ' + error.message
        });
    }
};

/**
 * Xuất Excel Phiếu Yêu Cầu Vật Tư
 */
exports.exportMaterialRequest = async (req, res) => {
    try {
        const { projectId, category, title, orderCode, createdDate, requiredDate, items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu vật tư để xuất'
            });
        }

        // Get project info
        const [projects] = await db.query(
            `SELECT p.*, c.full_name AS customer_name, c.address AS customer_address 
             FROM projects p 
             LEFT JOIN customers c ON p.customer_id = c.id 
             WHERE p.id = ?`,
            [projectId]
        );
        const project = projects[0] || {};

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Phiếu Yêu Cầu Vật Tư');

        // Set column widths
        worksheet.columns = [
            { width: 6 },   // A - STT
            { width: 15 },  // B - Mã VT
            { width: 40 },  // C - Tên vật tư
            { width: 10 },  // D - ĐVT
            { width: 15 },  // E - Số lượng thiếu
            { width: 15 },  // F - Số lượng yêu cầu
            { width: 30 }   // G - Ghi chú
        ];

        let currentRow = addCompanyHeader(worksheet, workbook);

        // Title
        worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = title || 'PHIẾU YÊU CẦU VẬT TƯ';
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.font = { name: 'Times New Roman', size: 16, bold: true };
        worksheet.getRow(currentRow).height = 30;
        currentRow += 2;

        // Project info
        worksheet.getCell(`A${currentRow}`).value = 'Dự án:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.project_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Khách hàng:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.customer_name || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Địa điểm:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = project.location || project.address || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        // Request info
        worksheet.getCell(`A${currentRow}`).value = 'Mã đơn hàng:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = orderCode || '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Ngày tạo phiếu:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = createdDate ? formatDateVN(createdDate) : '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.getCell(`A${currentRow}`).value = 'Ngày vật tư cần về:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = requiredDate ? formatDateVN(requiredDate) : '';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow += 2;

        // Header row
        const headerRow = currentRow;
        const headers = ['STT', 'Mã VT', 'Tên vật tư', 'ĐVT', 'Số lượng thiếu', 'Số lượng yêu cầu', 'Ghi chú'];
        headers.forEach((header, index) => {
            const cell = worksheet.getCell(headerRow, index + 1);
            cell.value = header;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.font = { name: 'Times New Roman', size: 10, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        worksheet.getRow(headerRow).height = 25;
        currentRow++;

        // Data rows
        let totalShortage = 0;
        let totalRequest = 0;
        items.forEach((item, index) => {
            const row = currentRow;
            const shortage = parseFloat(item.shortage || 0);
            const requestQty = parseFloat(item.requestQty || item.shortage || 0);
            totalShortage += shortage;
            totalRequest += requestQty;

            worksheet.getCell(row, 1).value = index + 1; // STT
            worksheet.getCell(row, 2).value = item.code || ''; // Mã VT
            worksheet.getCell(row, 3).value = item.name || ''; // Tên vật tư
            worksheet.getCell(row, 4).value = item.unit || ''; // ĐVT
            worksheet.getCell(row, 5).value = shortage; // Số lượng thiếu
            worksheet.getCell(row, 6).value = requestQty; // Số lượng yêu cầu
            worksheet.getCell(row, 7).value = item.notes || ''; // Ghi chú

            // Style cells
            for (let col = 1; col <= 7; col++) {
                const cell = worksheet.getCell(row, col);
                cell.font = { name: 'Times New Roman', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [1, 4, 5, 6].includes(col) ? 'center' : 'left',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (col === 5 || col === 6) {
                    cell.numFmt = '0.00';
                }
            }
            worksheet.getRow(row).height = 22;
            currentRow++;
        });

        // Footer row - TỔNG CỘNG
        const footerRow = currentRow;
        worksheet.mergeCells(`A${footerRow}:D${footerRow}`);
        worksheet.getCell(`A${footerRow}`).value = 'TỔNG CỘNG:';
        worksheet.getCell(`A${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`E${footerRow}`).value = totalShortage;
        worksheet.getCell(`E${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`E${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`E${footerRow}`).numFmt = '0.00';
        worksheet.getCell(`F${footerRow}`).value = totalRequest;
        worksheet.getCell(`F${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`F${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`F${footerRow}`).numFmt = '0.00';
        worksheet.getCell(`G${footerRow}`).value = `${items.length} loại`;
        worksheet.getCell(`G${footerRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`G${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

        // Style footer
        for (let col = 1; col <= 7; col++) {
            const cell = worksheet.getCell(footerRow, col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        worksheet.getRow(footerRow).height = 25;

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        const projectName = (project.project_name || 'Project').replace(/[^a-zA-Z0-9]/g, '_');
        const categoryLabel = (title || 'MaterialRequest').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${categoryLabel}_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

        res.send(buffer);
    } catch (error) {
        console.error('Error exporting material request Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất Excel: ' + error.message
        });
    }
};
