const ExcelJS = require('exceljs');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// Hàm chuyển số thành chữ tiếng Việt
function numberToWords(num) {
    if (!num || num === 0) return 'Không đồng';

    num = Math.floor(num);

    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
    const hundreds = ['', 'một trăm', 'hai trăm', 'ba trăm', 'bốn trăm', 'năm trăm', 'sáu trăm', 'bảy trăm', 'tám trăm', 'chín trăm'];

    function readThreeDigits(n) {
        if (n === 0) return '';
        let result = '';
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        const ten = Math.floor(remainder / 10);
        const one = remainder % 10;

        if (hundred > 0) result += hundreds[hundred] + ' ';
        if (remainder === 0) return result.trim();

        if (ten === 0) {
            if (hundred > 0) result += 'lẻ ';
            if (one === 5) result += 'năm';
            else if (one > 0) result += ones[one];
        } else if (ten === 1) {
            if (one === 0) result += 'mười';
            else if (one === 5) result += 'mười lăm';
            else result += 'mười ' + ones[one];
        } else {
            result += tens[ten];
            if (one === 1) result += ' mốt';
            else if (one === 5) result += ' lăm';
            else if (one > 0) result += ' ' + ones[one];
        }

        return result.trim();
    }

    if (num < 1000) {
        return readThreeDigits(num).charAt(0).toUpperCase() + readThreeDigits(num).slice(1) + ' đồng';
    }

    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const units = num % 1000;

    let result = '';
    if (billions > 0) result += readThreeDigits(billions) + ' tỷ ';
    if (millions > 0) result += readThreeDigits(millions) + ' triệu ';
    if (thousands > 0) result += readThreeDigits(thousands) + ' nghìn ';
    if (units > 0) result += readThreeDigits(units);

    if (result === '') return 'Không đồng';
    result = result.trim();
    result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
    return result;
}

// Format date to Vietnamese format
function formatDateVN(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// Export quotation to Excel using template format
exports.exportQuotationToExcel = async (req, res) => {
    try {
        const quotationId = req.params.id;

        // Load quotation data
        const [quotations] = await db.query(`
            SELECT 
                q.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                c.address AS customer_address,
                c.customer_code,
                p.project_name,
                p.project_code,
                u.full_name AS creator_full_name
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN projects p ON q.project_id = p.id
            LEFT JOIN users u ON q.created_by = u.id
            WHERE q.id = ?
        `, [quotationId]);

        if (quotations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo giá'
            });
        }

        const quotation = quotations[0];

        // Load quotation items
        const [items] = await db.query(`
            SELECT * FROM quotation_items
            WHERE quotation_id = ?
            ORDER BY id ASC
        `, [quotationId]);

        // Tính tổng - ĐỒNG BỘ với frontend calculateTotals()
        let totalArea = 0;
        let totalMaterial = 0;
        let totalAccessories = 0;

        items.forEach(item => {
            const width = parseFloat(item.width) || 0;
            const height = parseFloat(item.height) || 0;
            const quantity = parseInt(item.quantity) || 1;
            const unitPrice = parseFloat(item.unit_price) || 0;
            const accessoryPrice = parseFloat(item.accessory_price) || 0;
            const isMaterial = !!item.is_material;
            const storedTotalPrice = parseFloat(item.total_price) || 0;

            let itemMaterialCost = 0;
            let itemAccessoryCost = 0;

            if (isMaterial) {
                // Vật tư: Tổng = (Rộng / 1000) × Số bộ × Đơn giá
                const widthM = width / 1000;
                itemMaterialCost = widthM * quantity * unitPrice;
                itemAccessoryCost = 0; // Vật tư không có phụ kiện
            } else {
                // Cửa nhôm: Diện tích 1 bộ (m²)
                const areaPerUnit = (width * height) / 1000000;
                // Tổng tiền vật tư = Diện tích 1 bộ × Đơn giá × Số bộ
                itemMaterialCost = areaPerUnit * unitPrice * quantity;
                // Tổng tiền phụ kiện = Phụ kiện 1 bộ × Số bộ
                itemAccessoryCost = accessoryPrice * quantity;

                // Cập nhật tổng diện tích (chỉ tính cho sản phẩm, vật tư diện tích = 0)
                totalArea += (areaPerUnit * quantity);
            }

            // Ưu tiên sử dụng total_price đã lưu nếu kết quả tính lại lệch quá 1 đồng
            const calculatedTotal = itemMaterialCost + itemAccessoryCost;
            if (storedTotalPrice > 0 && Math.abs(calculatedTotal - storedTotalPrice) > 1) {
                // Nếu lệch, sử dụng giá trị đã lưu cho đồng bộ
                if (isMaterial) {
                    totalMaterial += storedTotalPrice;
                } else {
                    // Tách biệt vật tư/phụ kiện cho sản phẩm nếu dùng storedTotalPrice
                    // Giả sử tỷ lệ vẫn đúng
                    totalMaterial += itemMaterialCost;
                    totalAccessories += itemAccessoryCost;
                }
            } else {
                totalMaterial += itemMaterialCost;
                totalAccessories += itemAccessoryCost;
            }
        });

        // Tổng giá trị báo giá = Vật tư + Phụ kiện (KHÔNG cộng VAT, chiết khấu, phí vận chuyển)
        // Đồng bộ với công thức frontend: finalTotal = totalMaterial + totalAccessories
        const finalTotal = totalMaterial + totalAccessories;

        // Lưu các giá trị VAT/discount để hiển thị riêng
        const discountPercent = parseFloat(quotation.discount_percent) || 0;
        const discountAmount = (finalTotal * discountPercent) / 100;

        const accessoryDiscountPercent = parseFloat(quotation.accessory_discount_percent) || 0;
        const accessoryDiscountAmount = parseFloat(quotation.accessory_discount_amount) || ((totalAccessories * accessoryDiscountPercent) / 100);

        // VAT đã bị loại bỏ khỏi hệ thống (mặc định 0%)
        const vatPercent = 0;
        const vatAmount = 0;
        const shippingFee = parseFloat(quotation.shipping_fee) || 0;

        const afterDiscounts = finalTotal - discountAmount - accessoryDiscountAmount;
        // Tổng cuối cùng
        const grandTotal = afterDiscounts + vatAmount + shippingFee;

        // Tạo workbook mới
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('BG Viralwindow');

        // Đường dẫn logo
        const logoPath = path.join(__dirname, '../../Tài liệu/LogoViralWindow.png');
        let logoId = null;

        // Thêm logo nếu file tồn tại
        if (fs.existsSync(logoPath)) {
            logoId = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
        }

        // Thiết lập page setup
        worksheet.pageSetup = {
            paperSize: 9, // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: {
                left: 0.4,
                right: 0.4,
                top: 0.5,
                bottom: 0.5,
                header: 0.3,
                footer: 0.3
            }
        };

        // Set column widths (12 columns: A-L)
        worksheet.columns = [
            { width: 5 },   // A - STT
            { width: 12 },  // B - Ký hiệu
            { width: 50 },  // C - Quy cách (increased from 40 for longer text)
            { width: 20 },  // D - Kính (increased from 15 for longer text)
            { width: 18 },  // E - Phụ kiện (increased from 12 for longer text)
            { width: 10 },  // F - Rộng
            { width: 10 },  // G - Cao
            { width: 12 },  // H - Tổng diện tích
            { width: 8 },   // I - Số bộ
            { width: 14 },  // J - Đơn Giá
            { width: 14 },  // K - Phụ kiện
            { width: 16 }   // L - Thành tiền
        ];

        let currentRow = 1;

        // ========== ROW 1-3: HEADER - Thông tin công ty ==========
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

        // Logo (bên phải - col K-L)
        if (logoId !== null) {
            worksheet.addImage(logoId, {
                tl: { col: 10, row: 0 },
                ext: { width: 180, height: 100 },
                editAs: 'oneCell'
            });
        }

        currentRow = 7;

        // ========== ROW 7: TIÊU ĐỀ ==========
        worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = 'BẢNG BÁO GIÁ CỬA NHÔM VIRALWINDOW';
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.font = { name: 'Times New Roman', size: 18, bold: true };
        worksheet.getRow(currentRow).height = 30;
        currentRow += 2;

        // ========== ROW 9-10: Thông tin khách hàng và ngày báo giá ==========
        // Row 9: Kính gửi + Mobile + Ngày
        worksheet.getCell(`A${currentRow}`).value = 'Kính gửi:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = quotation.customer_name || 'N/A';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };

        worksheet.getCell(`E${currentRow}`).value = 'Mobile:';
        worksheet.getCell(`E${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
        worksheet.getCell(`F${currentRow}`).value = quotation.customer_phone || '';
        worksheet.getCell(`F${currentRow}`).font = { name: 'Times New Roman', size: 11 };

        // Ngày: box
        worksheet.getCell(`J${currentRow}`).value = 'Ngày:';
        worksheet.getCell(`J${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        worksheet.getCell(`J${currentRow}`).alignment = { horizontal: 'right' };
        worksheet.mergeCells(`K${currentRow}:L${currentRow}`);
        const quoteDateCell = worksheet.getCell(`K${currentRow}`);
        quoteDateCell.value = formatDateVN(quotation.quotation_date);
        quoteDateCell.font = { name: 'Times New Roman', size: 11, bold: true };
        quoteDateCell.alignment = { horizontal: 'center' };
        quoteDateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        quoteDateCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        currentRow++;

        // Row 10: Địa chỉ công trình + Đơn vị báo giá + Số BG
        worksheet.getCell(`A${currentRow}`).value = 'Địa chỉ công trình:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = quotation.customer_address || quotation.project_name || 'N/A';
        worksheet.getCell(`B${currentRow}`).font = { name: 'Times New Roman', size: 11 };

        worksheet.getCell(`E${currentRow}`).value = 'Đơn vị báo giá:';
        worksheet.getCell(`E${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
        worksheet.getCell(`F${currentRow}`).value = 'Phòng Báo Giá';
        worksheet.getCell(`F${currentRow}`).font = { name: 'Times New Roman', size: 11 };

        // Số BG: box
        worksheet.getCell(`J${currentRow}`).value = 'Số BG:';
        worksheet.getCell(`J${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        worksheet.getCell(`J${currentRow}`).alignment = { horizontal: 'right' };
        worksheet.mergeCells(`K${currentRow}:L${currentRow}`);
        const bgNumberCell = worksheet.getCell(`K${currentRow}`);
        const bgNumber = quotation.quotation_code ? quotation.quotation_code.replace('VRBG', '') : '001';
        bgNumberCell.value = bgNumber;
        bgNumberCell.font = { name: 'Times New Roman', size: 11, bold: true };
        bgNumberCell.alignment = { horizontal: 'center' };
        bgNumberCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        bgNumberCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        currentRow += 2;

        // ========== ROW 12-13: Giới thiệu ==========
        worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Công ty cổ phần Viralwindow xin cảm ơn Quý khách đã quan tâm tới sản phẩm cửa nhôm cao cấp Viralwindow.';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow++;

        worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Chúng tôi trân trọng gửi bản báo giá tốt nhất tới công trình của Quý khách như sau:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11 };
        currentRow += 2;

        // ========== BẢNG SẢN PHẨM - HEADER (2 hàng) ==========
        const headerRow1 = currentRow;
        const headerRow2 = currentRow + 1;

        // Merge cells cho header
        worksheet.mergeCells(`A${headerRow1}:A${headerRow2}`); // STT
        worksheet.mergeCells(`B${headerRow1}:B${headerRow2}`); // Ký hiệu
        worksheet.mergeCells(`C${headerRow1}:E${headerRow1}`); // Phương án thiết kế
        worksheet.mergeCells(`F${headerRow1}:G${headerRow1}`); // Kích thước
        worksheet.mergeCells(`H${headerRow1}:H${headerRow2}`); // Tổng diện tích
        worksheet.mergeCells(`I${headerRow1}:I${headerRow2}`); // Số bộ
        worksheet.mergeCells(`J${headerRow1}:J${headerRow2}`); // Đơn Giá
        worksheet.mergeCells(`K${headerRow1}:K${headerRow2}`); // Phụ kiện
        worksheet.mergeCells(`L${headerRow1}:L${headerRow2}`); // Thành tiền

        // Header row 1
        worksheet.getCell(`A${headerRow1}`).value = 'STT';
        worksheet.getCell(`B${headerRow1}`).value = 'Ký hiệu';
        worksheet.getCell(`C${headerRow1}`).value = 'Phương án thiết kế cửa nhôm Viralwindow';
        worksheet.getCell(`F${headerRow1}`).value = 'Kích thước (mm)';
        worksheet.getCell(`H${headerRow1}`).value = 'Tổng diện tích (m2)';
        worksheet.getCell(`I${headerRow1}`).value = 'Số bộ';
        worksheet.getCell(`J${headerRow1}`).value = 'Đơn Giá';
        worksheet.getCell(`K${headerRow1}`).value = 'Phụ kiện';
        worksheet.getCell(`L${headerRow1}`).value = 'Thành tiền';

        // Header row 2
        worksheet.getCell(`C${headerRow2}`).value = 'Quy cách';
        worksheet.getCell(`D${headerRow2}`).value = 'Kính';
        worksheet.getCell(`E${headerRow2}`).value = 'Phụ kiện';
        worksheet.getCell(`F${headerRow2}`).value = 'Rộng';
        worksheet.getCell(`G${headerRow2}`).value = 'Cao';
        worksheet.getCell(`J${headerRow2}`).value = 'vnđ/m2';
        worksheet.getCell(`K${headerRow2}`).value = 'vnđ/bộ';
        worksheet.getCell(`L${headerRow2}`).value = 'vnđ';

        // Style header - CÓ MÀU NỀN XANH NHẠ̣T
        const headerStyle = {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } },
            font: { name: 'Times New Roman', size: 10, bold: true },
            alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        };

        for (let col = 1; col <= 12; col++) {
            const cell1 = worksheet.getCell(headerRow1, col);
            const cell2 = worksheet.getCell(headerRow2, col);
            Object.assign(cell1, headerStyle);
            Object.assign(cell2, headerStyle);
        }

        worksheet.getRow(headerRow1).height = 25;
        worksheet.getRow(headerRow2).height = 20;

        currentRow = headerRow2 + 1;

        // ========== BẢNG SẢN PHẨM - DATA ==========
        items.forEach((item, index) => {
            const row = worksheet.getRow(currentRow);

            // Ưu tiên spec (Quy cách do user nhập) > item_name > code
            let displayCode = item.code || '';
            let displayName = item.spec || item.item_name || displayCode;

            row.getCell(1).value = index + 1; // STT
            row.getCell(2).value = displayCode; // Ký hiệu
            row.getCell(3).value = displayName; // Quy cách
            row.getCell(4).value = item.glass || ''; // Kính
            row.getCell(5).value = item.accessories || ''; // Phụ kiện
            row.getCell(6).value = parseFloat(item.width) || 0; // Rộng
            row.getCell(7).value = parseFloat(item.height) || 0; // Cao

            // Tính diện tích = width * height / 1000000 * quantity
            const itemArea = ((parseFloat(item.width) || 0) * (parseFloat(item.height) || 0)) / 1000000 * (parseInt(item.quantity) || 1);
            row.getCell(8).value = parseFloat(item.area) || itemArea; // Tổng diện tích
            row.getCell(9).value = parseInt(item.quantity) || 1; // Số bộ
            row.getCell(10).value = parseFloat(item.unit_price) || 0; // Đơn giá
            row.getCell(11).value = parseFloat(item.accessory_price) || 0; // Phụ kiện
            row.getCell(12).value = parseFloat(item.total_price) || 0; // Thành tiền

            // Style data rows
            for (let col = 1; col <= 12; col++) {
                const cell = row.getCell(col);
                cell.font = { name: 'Times New Roman', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [1, 6, 7, 8, 9].includes(col) ? 'center' : (col >= 10 ? 'right' : 'left'),
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // Number format
                if (col === 8) cell.numFmt = '0.00'; // Diện tích
                else if ([10, 11, 12].includes(col)) cell.numFmt = '#,##0'; // Giá tiền
            }

            // Allow auto-height based on wrapped text content
            // row.height = 22; // Removed to enable auto-sizing
            currentRow++;
        });

        // ========== TỔNG GIÁ TRỊ CÔNG TRÌNH (ngay sau bảng - có viền + nền xanh) ==========
        const summaryBorder = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        const summaryFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C7E7' } };

        // Cột A-G: Label "TỔNG GIÁ TRỊ CÔNG TRÌNH"
        worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
        const totalLabelCell = worksheet.getCell(`A${currentRow}`);
        totalLabelCell.value = 'TỔNG GIÁ TRỊ CÔNG TRÌNH';
        totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalLabelCell.font = { name: 'Times New Roman', size: 12, bold: true };
        totalLabelCell.fill = summaryFill;
        totalLabelCell.border = summaryBorder;

        // Cột H: Tổng diện tích (đúng cột header "Tổng diện tích (m2)")
        worksheet.getCell(`H${currentRow}`).value = parseFloat(totalArea.toFixed(2));
        worksheet.getCell(`H${currentRow}`).numFmt = '0.00';
        worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`H${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        worksheet.getCell(`H${currentRow}`).fill = summaryFill;
        worksheet.getCell(`H${currentRow}`).border = summaryBorder;

        // Cột I: trống (Số bộ)
        worksheet.getCell(`I${currentRow}`).fill = summaryFill;
        worksheet.getCell(`I${currentRow}`).border = summaryBorder;

        // Cột J-K: trống
        worksheet.getCell(`J${currentRow}`).fill = summaryFill;
        worksheet.getCell(`J${currentRow}`).border = summaryBorder;
        worksheet.getCell(`K${currentRow}`).fill = summaryFill;
        worksheet.getCell(`K${currentRow}`).border = summaryBorder;

        // Cột L: Tổng cộng (Subtotal)
        worksheet.getCell(`L${currentRow}`).value = Math.round(finalTotal);
        worksheet.getCell(`L${currentRow}`).numFmt = '#,##0';
        worksheet.getCell(`L${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`L${currentRow}`).font = { name: 'Times New Roman', size: 12, bold: true };
        worksheet.getCell(`L${currentRow}`).fill = summaryFill;
        worksheet.getCell(`L${currentRow}`).border = summaryBorder;
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

        // --- Hàng Chiết khấu phụ kiện (Nếu có) ---
        if (accessoryDiscountPercent > 0) {
            worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
            const accDiscLabel = worksheet.getCell(`A${currentRow}`);
            accDiscLabel.value = `Chiết khấu phụ kiện (${accessoryDiscountPercent}%)`;
            accDiscLabel.alignment = { horizontal: 'right', vertical: 'middle' };
            accDiscLabel.font = { name: 'Times New Roman', size: 11, italic: true };
            accDiscLabel.border = summaryBorder;

            const accDiscVal = worksheet.getCell(`L${currentRow}`);
            accDiscVal.value = Math.round(accessoryDiscountAmount) * -1;
            accDiscVal.numFmt = '#,##0';
            accDiscVal.alignment = { horizontal: 'right', vertical: 'middle' };
            accDiscVal.font = { name: 'Times New Roman', size: 11, color: { argb: 'FFFF0000' } };
            accDiscVal.border = summaryBorder;
            currentRow++;
        }

        // --- Hàng Chiết khấu thương mại (Nếu có) ---
        if (discountPercent > 0) {
            worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
            const generalDiscLabel = worksheet.getCell(`A${currentRow}`);
            generalDiscLabel.value = `Chiết khấu thương mại (${discountPercent}%)`;
            generalDiscLabel.alignment = { horizontal: 'right', vertical: 'middle' };
            generalDiscLabel.font = { name: 'Times New Roman', size: 11, italic: true };
            generalDiscLabel.border = summaryBorder;

            const generalDiscVal = worksheet.getCell(`L${currentRow}`);
            generalDiscVal.value = Math.round(discountAmount) * -1;
            generalDiscVal.numFmt = '#,##0';
            generalDiscVal.alignment = { horizontal: 'right', vertical: 'middle' };
            generalDiscVal.font = { name: 'Times New Roman', size: 11, color: { argb: 'FFFF0000' } };
            generalDiscVal.border = summaryBorder;
            currentRow++;
        }

        // --- Hàng Thuế VAT ---
        if (vatPercent > 0) {
            worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
            const vatLabel = worksheet.getCell(`A${currentRow}`);
            vatLabel.value = `Thuế giá trị gia tăng VAT (${vatPercent}%)`;
            vatLabel.alignment = { horizontal: 'right', vertical: 'middle' };
            vatLabel.font = { name: 'Times New Roman', size: 11 };
            vatLabel.border = summaryBorder;

            const vatVal = worksheet.getCell(`L${currentRow}`);
            vatVal.value = Math.round(vatAmount);
            vatVal.numFmt = '#,##0';
            vatVal.alignment = { horizontal: 'right', vertical: 'middle' };
            vatVal.font = { name: 'Times New Roman', size: 11 };
            vatVal.border = summaryBorder;
            currentRow++;
        }

        // --- Hàng Phí vận chuyển (Nếu có) ---
        if (shippingFee > 0) {
            worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
            const shipLabel = worksheet.getCell(`A${currentRow}`);
            shipLabel.value = `Phí vận chuyển/lắp đặt`;
            shipLabel.alignment = { horizontal: 'right', vertical: 'middle' };
            shipLabel.font = { name: 'Times New Roman', size: 11 };
            shipLabel.border = summaryBorder;

            const shipVal = worksheet.getCell(`L${currentRow}`);
            shipVal.value = Math.round(shippingFee);
            shipVal.numFmt = '#,##0';
            shipVal.alignment = { horizontal: 'right', vertical: 'middle' };
            shipVal.font = { name: 'Times New Roman', size: 11 };
            shipVal.border = summaryBorder;
            currentRow++;
        }

        // --- TỔNG CỘNG THANH TOÁN ---
        worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
        const grandTotalLabel = worksheet.getCell(`A${currentRow}`);
        grandTotalLabel.value = 'TỔNG CỘNG THANH TOÁN (Làm tròn)';
        grandTotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
        grandTotalLabel.font = { name: 'Times New Roman', size: 12, bold: true };
        grandTotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } }; // Gold color
        grandTotalLabel.border = summaryBorder;

        const grandTotalVal = worksheet.getCell(`L${currentRow}`);
        grandTotalVal.value = Math.round(grandTotal);
        grandTotalVal.numFmt = '#,##0';
        grandTotalVal.alignment = { horizontal: 'right', vertical: 'middle' };
        grandTotalVal.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFC00000' } }; // Dark red
        grandTotalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
        grandTotalVal.border = summaryBorder;
        worksheet.getRow(currentRow).height = 30;
        currentRow++;

        // ========== SỐ TIỀN BẰNG CHỮ ==========
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Số tiền bằng chữ:';
        worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, italic: true };
        worksheet.getCell(`A${currentRow}`).border = summaryBorder;

        worksheet.mergeCells(`D${currentRow}:L${currentRow}`);
        worksheet.getCell(`D${currentRow}`).value = numberToWords(grandTotal);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`D${currentRow}`).font = { name: 'Times New Roman', size: 11, italic: true };
        worksheet.getCell(`D${currentRow}`).border = summaryBorder;
        worksheet.getRow(currentRow).height = 22;
        currentRow += 2;

        // ========== PHỤ LỤC ==========
        worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'PHỤ LỤC:';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true, underline: true };
        currentRow++;

        const notes = [
            `- Đơn giá trên là đơn giá hoàn thiện. Đã bao gồm chi phí vận chuyển và chi phí lắp đặt, thiết bị và biện pháp thi công cho các hệ cửa.`,
            '- Trường hợp khách hàng ở tỉnh đơn giá vẫn giữ nguyên, tính thêm chi phí vận chuyển',
            '- Giá trị 1 bộ cửa(vnđ) = {Đơn giá*m2 cửa} + phụ kiện(vnđ/bộ)',
            '- Báo giá có hiệu lực trong 7-10 ngày kể từ khi báo giá hoặc đến khi có báo giá mới.',
            '- Vật tư khi sản xuất, lắp đặt dùng 100% vít INOX',
            '- Sử dụng keo ép gốc PU88, keo đi tường, Dowsil Neutral Plus silicone sealant hoặc Apollo A500',
            '- Sử dụng gioăng kẹp cao su EPDM cao cấp tiêu chuẩn IOS 9001:2008 chịu lực 5Mpa',
            '- Thời gian thi công lắp đặt sau khi có mặt bằng và đủ điều kiện từ 20-25 ngày'
        ];

        notes.forEach(note => {
            worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = note;
            worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 10, color: { argb: 'FF0066CC' } };
            worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', wrapText: true };
            // Allow auto-height for notes to accommodate wrapped text
            // worksheet.getRow(currentRow).height = 18; // Removed to enable auto-sizing
            currentRow++;
        });

        // ========== CHỮ KÝ ==========
        currentRow += 3;
        worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'XÁC NHẬN KHÁCH HÀNG';
        worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 12, bold: true };

        worksheet.mergeCells(`G${currentRow}:L${currentRow}`);
        worksheet.getCell(`G${currentRow}`).value = 'CÔNG TY CỔ PHẦN VIRALWINDOW';
        worksheet.getCell(`G${currentRow}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`G${currentRow}`).font = { name: 'Times New Roman', size: 12, bold: true };

        // Set buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Send file
        const filename = `Bao_gia_${quotation.quotation_code || 'VRBG'}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất Excel: ' + error.message
        });
    }
};
