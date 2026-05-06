const db = require("../config/db");
const ExcelJS = require("exceljs");

/**
 * Controller xuất Excel cho Phiếu Yêu Cầu Vật Tư
 * Template theo mẫu CT-Mr Mậu Yên Nghĩa.xlsx
 */

// GET /api/material-requests/:id/export-excel
exports.exportExcel = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin phiếu yêu cầu
        const [rows] = await db.query(
            `SELECT pr.*, 
                    u.full_name as created_by_name,
                    p.project_code, p.project_name as project_name_full,
                    p.construction_address as project_address,
                    c.full_name as customer_name, 
                    c.phone as customer_phone,
                    c.address as customer_address
             FROM purchase_requests pr
             LEFT JOIN users u ON pr.created_by = u.id
             LEFT JOIN projects p ON pr.project_id = p.id
             LEFT JOIN customers c ON p.customer_id = c.id
             WHERE pr.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phiếu yêu cầu"
            });
        }

        const request = rows[0];

        // Parse JSON data
        let nhomItems = [];
        let kinhItems = [];
        let phukienItems = [];
        let vattuItems = [];

        try {
            if (request.nhom_data) {
                nhomItems = typeof request.nhom_data === 'string'
                    ? JSON.parse(request.nhom_data)
                    : request.nhom_data;
            }
            if (request.kinh_data) {
                kinhItems = typeof request.kinh_data === 'string'
                    ? JSON.parse(request.kinh_data)
                    : request.kinh_data;
            }
            if (request.phukien_data) {
                phukienItems = typeof request.phukien_data === 'string'
                    ? JSON.parse(request.phukien_data)
                    : request.phukien_data;
            }
            if (request.vattu_data) {
                vattuItems = typeof request.vattu_data === 'string'
                    ? JSON.parse(request.vattu_data)
                    : request.vattu_data;
            }
        } catch (parseErr) {
            console.error('Error parsing JSON data:', parseErr);
        }

        // Tạo workbook mới
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ViralWindow System';
        workbook.created = new Date();

        // Xác định loại phiếu để tạo sheet phù hợp
        const hasNhom = nhomItems && nhomItems.length > 0;
        const hasKinh = kinhItems && kinhItems.length > 0;
        const hasPhukien = phukienItems && phukienItems.length > 0;
        const hasVattu = vattuItems && vattuItems.length > 0;

        // Tạo sheet riêng cho từng loại nếu có dữ liệu
        if (hasNhom) {
            const nhomSheet = workbook.addWorksheet('NHÔM');
            await createNhomSheet(nhomSheet, request, nhomItems);
        }

        if (hasVattu) {
            const vattuSheet = workbook.addWorksheet('VẬT TƯ PHỤ');
            await createVattuPhukienSheet(vattuSheet, request, vattuItems);
        }

        if (hasPhukien) {
            const phukienSheet = workbook.addWorksheet('PHỤ KIỆN');
            await createVattuPhukienSheet(phukienSheet, request, phukienItems);
        }

        if (hasKinh) {
            const kinhSheet = workbook.addWorksheet('KÍNH');
            await createKinhSheet(kinhSheet, request, kinhItems);
        }

        // Set response headers
        const filename = `Phieu_Yeu_Cau_${request.request_code || id}_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error exporting Excel:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xuất Excel: " + err.message
        });
    }
};

// Format ngày theo mẫu: "Ngày ..DD..tháng ..MM.. năm YYYY"
// Luôn sử dụng ngày hiện tại theo múi giờ Việt Nam (GMT+7)
function formatDateTemplate() {
    // Tạo ngày hiện tại theo múi giờ Việt Nam
    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

    const day = vietnamTime.getDate();
    const month = vietnamTime.getMonth() + 1;
    const year = vietnamTime.getFullYear();

    return `Ngày ..${day}..tháng ..${month}.. năm ${year}`;
}

// =====================================================
// SHEET NHÔM - Theo mẫu hình 2
// =====================================================
async function createNhomSheet(nhomSheet, request, items) {
    // Set column widths
    nhomSheet.columns = [
        { width: 6 },   // A - TT
        { width: 30 },  // B - Tên vật tư
        { width: 15 },  // C - Mã vật tư
        { width: 12 },  // D - Tỷ trọng
        { width: 10 },  // E - Đơn vị
        { width: 12 },  // F - Số lượng
        { width: 12 },  // G - Khối lượng
        { width: 25 },  // H - Ghi chú
    ];

    // 1. Thêm Header Công ty (Rows 1-4)
    await addCompanyHeader(nhomSheet.workbook, nhomSheet, 8);

    // Row 6: Title
    nhomSheet.mergeCells('A6:H6');
    const titleCell = nhomSheet.getCell('A6');
    titleCell.value = 'PHIẾU YÊU CẦU VẬT TƯ NHÔM';
    titleCell.font = { bold: true, size: 16, name: 'Times New Roman' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    nhomSheet.getRow(6).height = 25;

    // Row 7: Date - Luôn lấy ngày hiện tại khi xuất phiếu
    nhomSheet.mergeCells('A7:H7');
    const dateCell = nhomSheet.getCell('A7');
    dateCell.value = formatDateTemplate();
    dateCell.font = { size: 12, italic: true, name: 'Times New Roman' };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 8: Công trình
    nhomSheet.getCell('A8').value = 'Công trình :';
    nhomSheet.getCell('A8').font = { bold: true, size: 11, name: 'Times New Roman' };
    nhomSheet.mergeCells('B8:H8');
    nhomSheet.getCell('B8').value = request.project_name_full || request.project_name || '';
    nhomSheet.getCell('B8').font = { size: 11, name: 'Times New Roman' };

    // Row 9: Mã Đơn Hàng
    nhomSheet.getCell('A9').value = 'Mã Đơn Hàng :';
    nhomSheet.getCell('A9').font = { bold: true, size: 11, name: 'Times New Roman' };
    nhomSheet.mergeCells('B9:H9');
    nhomSheet.getCell('B9').value = request.order_code || '';
    nhomSheet.getCell('B9').font = { size: 11, name: 'Times New Roman' };

    // Row 10: Chủng loại phụ kiện
    nhomSheet.getCell('A10').value = 'Chủng loại phụ kiện :';
    nhomSheet.getCell('A10').font = { bold: true, size: 11, name: 'Times New Roman' };
    nhomSheet.mergeCells('B10:H10');
    nhomSheet.getCell('B10').value = request.product_type || 'Viralwindow';
    nhomSheet.getCell('B10').font = { size: 11, name: 'Times New Roman' };

    // Row 11: Màu sắc (highlight vàng)
    nhomSheet.getCell('A11').value = 'Màu sắc :';
    nhomSheet.getCell('A11').font = { bold: true, size: 11, name: 'Times New Roman' };
    nhomSheet.getCell('A11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
    nhomSheet.mergeCells('B11:H11');
    nhomSheet.getCell('B11').value = request.color || '';
    nhomSheet.getCell('B11').font = { size: 11, name: 'Times New Roman' };
    nhomSheet.getCell('B11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };

    // Row 12: Địa chỉ giao hàng
    nhomSheet.getCell('A12').value = 'Địa chỉ giao hàng :';
    nhomSheet.getCell('A12').font = { bold: true, size: 11, name: 'Times New Roman' };
    nhomSheet.mergeCells('B12:H12');
    nhomSheet.getCell('B12').value = request.delivery_address || '';
    nhomSheet.getCell('B12').font = { size: 11, name: 'Times New Roman' };

    // Row 13: Empty row
    let currentRow = 14;

    // Header bảng - Theo mẫu NHÔM: TT | Tên vật tư | Mã vật tư | Tỷ trọng | Đơn vị | Số lượng | Khối lượng | Ghi chú
    const headers = ['TT', 'Tên vật tư', 'Mã vật tư', 'Tỷ trọng', 'Đơn vị', 'Số lượng', 'Khối lượng', 'Ghi chú'];
    headers.forEach((header, i) => {
        const cell = nhomSheet.getCell(currentRow, i + 1);
        cell.value = header;
        cell.font = { bold: true, size: 11, name: 'Times New Roman' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    nhomSheet.getRow(currentRow).height = 30;
    currentRow++;

    // Dữ liệu
    items.forEach((item, index) => {
        const rowData = [
            index + 1,
            item.name || '',
            item.code || '',
            item.density || '',
            item.unit || 'cây',
            item.quantity || 0,
            item.weight || '',
            item.note || item.notes || ''
        ];

        rowData.forEach((val, i) => {
            const cell = nhomSheet.getCell(currentRow, i + 1);
            cell.value = val;
            cell.font = { size: 11, name: 'Times New Roman' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = {
                horizontal: i === 0 || i >= 3 ? 'center' : 'left',
                vertical: 'middle'
            };
        });
        nhomSheet.getRow(currentRow).height = 30;
        currentRow++;
    });

    // Thêm chữ ký
    addSignatures(nhomSheet, currentRow, 8);
}

// =====================================================
// SHEET VẬT TƯ PHỤ / PHỤ KIỆN - Theo mẫu hình 3
// =====================================================
async function createVattuPhukienSheet(vattuSheet, request, items) {
    const workbook = vattuSheet.workbook;
    // Set column widths
    vattuSheet.columns = [
        { width: 6 },   // A - TT
        { width: 18 },  // B - Mã VT
        { width: 35 },  // C - Tên vật tư
        { width: 12 },  // D - Đơn vị
        { width: 12 },  // E - Số lượng
        { width: 25 },  // F - Xuất xưởng
    ];

    // 1. Thêm Header Công ty (Rows 1-4)
    await addCompanyHeader(workbook, vattuSheet, 6);

    // Row 6: Title
    vattuSheet.mergeCells('A6:F6');
    const titleCell = vattuSheet.getCell('A6');
    titleCell.value = 'PHIẾU YÊU CẦU VẬT TƯ- PHỤ KIỆN';
    titleCell.font = { bold: true, size: 16, name: 'Times New Roman' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    vattuSheet.getRow(6).height = 25;

    // Row 7: Date - Luôn lấy ngày hiện tại khi xuất phiếu
    vattuSheet.mergeCells('A7:F7');
    const dateCell = vattuSheet.getCell('A7');
    dateCell.value = formatDateTemplate();
    dateCell.font = { size: 12, italic: true, name: 'Times New Roman' };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 8: Công trình
    vattuSheet.getCell('A8').value = 'Công trình :';
    vattuSheet.getCell('A8').font = { bold: true, size: 11, name: 'Times New Roman' };
    vattuSheet.mergeCells('B8:F8');
    vattuSheet.getCell('B8').value = request.project_name_full || request.project_name || '';
    vattuSheet.getCell('B8').font = { size: 11, name: 'Times New Roman' };

    // Row 9: Mã Đơn Hàng
    vattuSheet.getCell('A9').value = 'Mã Đơn Hàng :';
    vattuSheet.getCell('A9').font = { bold: true, size: 11, name: 'Times New Roman' };
    vattuSheet.mergeCells('B9:F9');
    vattuSheet.getCell('B9').value = request.order_code || '';
    vattuSheet.getCell('B9').font = { size: 11, name: 'Times New Roman' };

    // Row 10: Chủng loại phụ kiện
    vattuSheet.getCell('A10').value = 'Chủng loại phụ kiện :';
    vattuSheet.getCell('A10').font = { bold: true, size: 11, name: 'Times New Roman' };
    vattuSheet.mergeCells('B10:F10');
    vattuSheet.getCell('B10').value = request.product_type || '';
    vattuSheet.getCell('B10').font = { size: 11, name: 'Times New Roman' };

    // Row 11: Màu sắc
    vattuSheet.getCell('A11').value = 'Màu sắc :';
    vattuSheet.getCell('A11').font = { bold: true, size: 11, name: 'Times New Roman' };
    vattuSheet.mergeCells('B11:F11');
    vattuSheet.getCell('B11').value = request.color || '';
    vattuSheet.getCell('B11').font = { size: 11, name: 'Times New Roman' };

    // Row 12: Địa chỉ giao hàng
    vattuSheet.getCell('A12').value = 'Địa chỉ giao hàng :';
    vattuSheet.getCell('A12').font = { bold: true, size: 11, name: 'Times New Roman' };
    vattuSheet.mergeCells('B12:F12');
    vattuSheet.getCell('B12').value = request.delivery_address || '';
    vattuSheet.getCell('B12').font = { size: 11, name: 'Times New Roman' };

    // Row 13: Empty row
    let currentRow = 14;

    // Header bảng - Row 14
    const headers = ['TT', 'Mã VT', 'Tên vật tư', 'Đơn vị', 'Số lượng', 'Xuất xưởng'];
    headers.forEach((header, i) => {
        const cell = vattuSheet.getCell(currentRow, i + 1);
        cell.value = header;
        cell.font = { bold: true, size: 11, name: 'Times New Roman' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    vattuSheet.getRow(currentRow).height = 25;
    currentRow++;

    // Dữ liệu
    items.forEach((item, index) => {
        const rowData = [
            index + 1,
            item.code || '',
            item.name || '',
            item.unit || 'cái',
            item.quantity || 0,
            item.note || item.notes || ''  // Xuất xưởng = ghi chú
        ];

        rowData.forEach((val, i) => {
            const cell = vattuSheet.getCell(currentRow, i + 1);
            cell.value = val;
            cell.font = { size: 11, name: 'Times New Roman' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = {
                horizontal: i === 0 || i === 4 ? 'center' : 'left',
                vertical: 'middle'
            };
        });
        vattuSheet.getRow(currentRow).height = 30;
        currentRow++;
    });

    // Thêm chữ ký
    addSignatures(vattuSheet, currentRow, 6);
}

// =====================================================
// SHEET KÍNH - Theo mẫu hình 1
// =====================================================
async function createKinhSheet(kinhSheet, request, items) {
    const workbook = kinhSheet.workbook;
    // Set column widths
    kinhSheet.columns = [
        { width: 6 },   // A - TT
        { width: 12 },  // B - Mã Kính
        { width: 25 },  // C - Loại kính
        { width: 14 },  // D - Chiều rộng
        { width: 14 },  // E - Chiều cao
        { width: 10 },  // F - ĐVT
        { width: 10 },  // G - Số tấm
        { width: 12 },  // H - Diện tích
    ];

    // 1. Thêm Header Công ty (Rows 1-4)
    await addCompanyHeader(workbook, kinhSheet, 8);

    // Row 6: Title
    kinhSheet.mergeCells('A6:H6');
    const titleCell = kinhSheet.getCell('A6');
    titleCell.value = 'PHIẾU YÊU CẦU VẬT TƯ KÍNH';
    titleCell.font = { bold: true, size: 16, name: 'Times New Roman' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    kinhSheet.getRow(6).height = 25;

    // Row 7: Date - Luôn lấy ngày hiện tại khi xuất phiếu
    kinhSheet.mergeCells('A7:H7');
    const dateCell = kinhSheet.getCell('A7');
    dateCell.value = formatDateTemplate();
    dateCell.font = { size: 12, italic: true, name: 'Times New Roman' };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 8: Công trình
    kinhSheet.getCell('A8').value = 'Công trình :';
    kinhSheet.getCell('A8').font = { bold: true, size: 11, name: 'Times New Roman' };
    kinhSheet.mergeCells('B8:H8');
    kinhSheet.getCell('B8').value = request.project_name_full || request.project_name || '';
    kinhSheet.getCell('B8').font = { size: 11, name: 'Times New Roman' };

    // Row 9: Mã Đơn Hàng
    kinhSheet.getCell('A9').value = 'Mã Đơn Hàng :';
    kinhSheet.getCell('A9').font = { bold: true, size: 11, name: 'Times New Roman' };
    kinhSheet.mergeCells('B9:H9');
    kinhSheet.getCell('B9').value = request.order_code || '';
    kinhSheet.getCell('B9').font = { size: 11, name: 'Times New Roman' };

    // Row 10: Chủng loại phụ kiện
    kinhSheet.getCell('A10').value = 'Chủng loại phụ kiện :';
    kinhSheet.getCell('A10').font = { bold: true, size: 11, name: 'Times New Roman' };
    kinhSheet.mergeCells('B10:H10');
    kinhSheet.getCell('B10').value = request.product_type || '';
    kinhSheet.getCell('B10').font = { size: 11, name: 'Times New Roman' };

    // Row 11: Màu sắc (highlight vàng)
    kinhSheet.getCell('A11').value = 'Màu sắc :';
    kinhSheet.getCell('A11').font = { bold: true, size: 11, name: 'Times New Roman' };
    kinhSheet.getCell('A11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
    kinhSheet.mergeCells('B11:H11');
    kinhSheet.getCell('B11').value = request.color || '';
    kinhSheet.getCell('B11').font = { size: 11, name: 'Times New Roman' };
    kinhSheet.getCell('B11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };

    // Row 12: Địa chỉ giao hàng
    kinhSheet.getCell('A12').value = 'Địa chỉ giao hàng :';
    kinhSheet.getCell('A12').font = { bold: true, size: 11, name: 'Times New Roman' };
    kinhSheet.mergeCells('B12:H12');
    kinhSheet.getCell('B12').value = request.delivery_address || '';
    kinhSheet.getCell('B12').font = { size: 11, name: 'Times New Roman' };

    // Row 13: Empty row
    let currentRow = 14;

    // Header bảng - Row 14
    const headers = ['TT', 'Mã Kính', 'Loại kính', 'Chiều rộng', 'Chiều cao', 'ĐVT', 'Số tấm', 'Diện tích'];
    headers.forEach((header, i) => {
        const cell = kinhSheet.getCell(currentRow, i + 1);
        cell.value = header;
        cell.font = { bold: true, size: 11, name: 'Times New Roman' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    kinhSheet.getRow(currentRow).height = 25;
    currentRow++;

    // Dữ liệu
    items.forEach((item, index) => {
        const panels = parseFloat(item.panels || item.quantity) || 0;
        const area = parseFloat(item.area) || 0;

        const rowData = [
            index + 1,
            item.code || '',
            item.type || item.name || '',
            item.width || '',
            item.height || '',
            item.unit || 'tấm',
            panels.toFixed(2),
            area.toFixed(2)
        ];

        rowData.forEach((val, i) => {
            const cell = kinhSheet.getCell(currentRow, i + 1);
            cell.value = val;
            cell.font = { size: 11, name: 'Times New Roman' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle'
            };
        });
        kinhSheet.getRow(currentRow).height = 30;
        currentRow++;
    });

    // Thêm chữ ký
    addSignatures(kinhSheet, currentRow, 8);
}
// =====================================================
// HELPER FUNCTIONS FOR HEADER & FOOTER
// =====================================================

/**
 * Thêm thông tin công ty vào đầu sheet (Rows 1-4)
 */
async function addCompanyHeader(workbook, sheet, maxColumn) {
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

            // Vị trí logo bên phải (cột cuối - 1 hoặc tùy maxColumn)
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

/**
 * Thêm các ô chữ ký vào cuối bảng
 */
function addSignatures(sheet, startRow, maxColumn) {
    const sigRow = startRow + 2;

    // Cấu hình các vị trí cột cho chữ ký tùy theo độ rộng của bảng
    let positions;
    if (maxColumn >= 8) {
        positions = [
            { label: 'Người thực hiện', col: 1 },
            { label: 'Kế toán', col: 3 },
            { label: 'Thủ kho', col: 5 },
            { label: 'CÔNG TY CỔ PHẦN VIRALWINDOW', col: 7 }
        ];
    } else {
        positions = [
            { label: 'Người thực hiện', col: 1 },
            { label: 'Kế toán', col: 2 },
            { label: 'Thủ kho', col: 4 },
            { label: 'CÔNG TY CỔ PHẦN VIRALWINDOW', col: 5 }
        ];
    }

    positions.forEach(sig => {
        const cell = sheet.getCell(sigRow, sig.col);
        cell.value = sig.label;
        cell.font = { bold: true, size: 11, name: 'Times New Roman' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Nếu là cột cuối cùng, căn giữa theo vùng còn lại
        if (sig.col === positions[positions.length - 1].col && sig.col < maxColumn) {
            try {
                sheet.mergeCells(sigRow, sig.col, sigRow, maxColumn);
            } catch (e) { }
        }
    });
}
