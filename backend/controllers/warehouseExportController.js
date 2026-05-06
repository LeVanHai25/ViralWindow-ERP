const db = require("../config/db");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

/**
 * Controller quản lý xuất kho
 */

// GET /api/warehouse-export - Lấy danh sách phiếu xuất kho
exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT we.*,
                   (SELECT COUNT(*) FROM warehouse_export_items WHERE export_id = we.id) as item_count
            FROM warehouse_exports we
            ORDER BY we.created_at DESC
        `);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Error getting warehouse exports:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách phiếu xuất kho: " + err.message
        });
    }
};

// GET /api/warehouse-export/:id - Lấy chi tiết phiếu xuất kho
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const [exports] = await db.query(`
            SELECT * FROM warehouse_exports WHERE id = ?
        `, [id]);

        if (exports.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phiếu xuất kho"
            });
        }

        const [items] = await db.query(`
            SELECT * FROM warehouse_export_items WHERE export_id = ? ORDER BY id
        `, [id]);

        res.json({
            success: true,
            data: {
                ...exports[0],
                items
            }
        });
    } catch (err) {
        console.error('Error getting warehouse export:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy chi tiết phiếu xuất kho: " + err.message
        });
    }
};

// GET /api/warehouse-export/next-number - Lấy số phiếu tiếp theo
exports.getNextNumber = async (req, res) => {
    try {
        const year = new Date().getFullYear().toString().slice(-2);
        const prefix = `VRT${year}`;

        const [rows] = await db.query(`
            SELECT export_number FROM warehouse_exports 
            WHERE export_number LIKE ? 
            ORDER BY id DESC LIMIT 1
        `, [`%-${prefix}%`]);

        let nextNum = 1;
        if (rows.length > 0) {
            const match = rows[0].export_number.match(/^(\d+)-/);
            if (match) {
                nextNum = parseInt(match[1]) + 1;
            }
        }

        const nextNumber = `${String(nextNum).padStart(2, '0')}-${prefix}`;

        res.json({
            success: true,
            data: { number: nextNumber }
        });
    } catch (err) {
        console.error('Error getting next export number:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo số phiếu"
        });
    }
};

// POST /api/warehouse-export - Tạo phiếu xuất mới
exports.create = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            export_number,
            export_date,
            customer_name,
            customer_code,
            customer_address,
            phone,
            reason,
            warehouse_location,
            shipping_time,
            dealer,
            notes,
            items = []
        } = req.body;

        const userId = req.user?.id || 1;

        // Tạo phiếu xuất
        const [result] = await connection.query(`
            INSERT INTO warehouse_exports 
            (export_number, export_date, customer_name, customer_code, customer_address, 
             phone, reason, warehouse_location, shipping_time, dealer, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [export_number, export_date, customer_name, customer_code, customer_address,
            phone, reason, warehouse_location, shipping_time, dealer, notes, userId]);

        const exportId = result.insertId;

        // Thêm các items
        let totalQuantity = 0;
        let totalArea = 0;

        for (const item of items) {
            await connection.query(`
                INSERT INTO warehouse_export_items 
                (export_id, material_type, material_id, material_code, material_name, 
                 width_mm, height_mm, unit, quantity, area, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [exportId, item.material_type, item.material_id, item.material_code,
                item.material_name, item.width_mm || 0, item.height_mm || 0,
                item.unit || 'Cái', item.quantity || 0, item.area || 0, item.notes]);

            totalQuantity += parseFloat(item.quantity) || 0;
            totalArea += parseFloat(item.area) || 0;
        }

        // Cập nhật tổng
        await connection.query(`
            UPDATE warehouse_exports SET total_quantity = ?, total_area = ? WHERE id = ?
        `, [totalQuantity, totalArea, exportId]);

        await connection.commit();

        res.json({
            success: true,
            message: "Tạo phiếu xuất kho thành công",
            data: { id: exportId, export_number }
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error creating warehouse export:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo phiếu xuất kho: " + err.message
        });
    } finally {
        connection.release();
    }
};

// PUT /api/warehouse-export/:id - Cập nhật phiếu xuất
exports.update = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            export_date,
            customer_name,
            customer_code,
            customer_address,
            phone,
            reason,
            warehouse_location,
            shipping_time,
            dealer,
            notes,
            items = []
        } = req.body;

        // Cập nhật phiếu
        await connection.query(`
            UPDATE warehouse_exports SET
                export_date = ?,
                customer_name = ?,
                customer_code = ?,
                customer_address = ?,
                phone = ?,
                reason = ?,
                warehouse_location = ?,
                shipping_time = ?,
                dealer = ?,
                notes = ?
            WHERE id = ?
        `, [export_date, customer_name, customer_code, customer_address, phone,
            reason, warehouse_location, shipping_time, dealer, notes, id]);

        // Xóa items cũ và thêm mới
        await connection.query(`DELETE FROM warehouse_export_items WHERE export_id = ?`, [id]);

        let totalQuantity = 0;
        let totalArea = 0;

        for (const item of items) {
            await connection.query(`
                INSERT INTO warehouse_export_items 
                (export_id, material_type, material_id, material_code, material_name, 
                 width_mm, height_mm, unit, quantity, area, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, item.material_type, item.material_id, item.material_code,
                item.material_name, item.width_mm || 0, item.height_mm || 0,
                item.unit || 'Cái', item.quantity || 0, item.area || 0, item.notes]);

            totalQuantity += parseFloat(item.quantity) || 0;
            totalArea += parseFloat(item.area) || 0;
        }

        // Cập nhật tổng
        await connection.query(`
            UPDATE warehouse_exports SET total_quantity = ?, total_area = ? WHERE id = ?
        `, [totalQuantity, totalArea, id]);

        await connection.commit();

        res.json({
            success: true,
            message: "Cập nhật phiếu xuất kho thành công"
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error updating warehouse export:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật phiếu xuất kho"
        });
    } finally {
        connection.release();
    }
};

// DELETE /api/warehouse-export/:id - Xóa phiếu xuất
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(`DELETE FROM warehouse_exports WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "Xóa phiếu xuất kho thành công"
        });
    } catch (err) {
        console.error('Error deleting warehouse export:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa phiếu xuất kho"
        });
    }
};

// PUT /api/warehouse-export/:id/status - Cập nhật trạng thái phiếu xuất
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['draft', 'confirmed', 'exported'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Trạng thái không hợp lệ. Phải là: draft, confirmed hoặc exported"
            });
        }

        // Get current status
        const [currentRows] = await db.query(
            `SELECT status FROM warehouse_exports WHERE id = ?`,
            [id]
        );

        if (currentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phiếu xuất kho"
            });
        }

        const currentStatus = currentRows[0].status;

        // Validate status transition
        const transitions = {
            'draft': ['confirmed'],
            'confirmed': ['exported', 'draft'],
            'exported': [] // Cannot change from exported
        };

        if (currentStatus === status) {
            return res.json({
                success: true,
                message: "Trạng thái không thay đổi"
            });
        }

        if (!transitions[currentStatus]?.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Không thể chuyển từ "${currentStatus}" sang "${status}"`
            });
        }

        // Update status
        await db.query(
            `UPDATE warehouse_exports SET status = ?, updated_at = NOW() WHERE id = ?`,
            [status, id]
        );

        const statusNames = {
            'draft': 'Nháp',
            'confirmed': 'Đã xác nhận',
            'exported': 'Đã xuất'
        };

        res.json({
            success: true,
            message: `Đã chuyển trạng thái sang "${statusNames[status]}"`
        });
    } catch (err) {
        console.error('Error updating warehouse export status:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật trạng thái: " + err.message
        });
    }
};

// POST /api/warehouse-export/:id/add-item - Thêm vật tư vào phiếu
exports.addItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { material_type, material_id, material_code, material_name,
            width_mm, height_mm, unit, quantity, area, notes } = req.body;

        const [result] = await db.query(`
            INSERT INTO warehouse_export_items 
            (export_id, material_type, material_id, material_code, material_name, 
             width_mm, height_mm, unit, quantity, area, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, material_type, material_id, material_code, material_name,
            width_mm || 0, height_mm || 0, unit || 'Cái', quantity || 0, area || 0, notes]);

        // Cập nhật tổng
        await db.query(`
            UPDATE warehouse_exports we SET 
                total_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_export_items WHERE export_id = ?),
                total_area = (SELECT COALESCE(SUM(area), 0) FROM warehouse_export_items WHERE export_id = ?)
            WHERE id = ?
        `, [id, id, id]);

        res.json({
            success: true,
            message: "Thêm vật tư thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error adding item:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi thêm vật tư"
        });
    }
};

// DELETE /api/warehouse-export/:id/item/:itemId - Xóa vật tư khỏi phiếu
exports.removeItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;

        await db.query(`DELETE FROM warehouse_export_items WHERE id = ? AND export_id = ?`, [itemId, id]);

        // Cập nhật tổng
        await db.query(`
            UPDATE warehouse_exports we SET 
                total_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_export_items WHERE export_id = ?),
                total_area = (SELECT COALESCE(SUM(area), 0) FROM warehouse_export_items WHERE export_id = ?)
            WHERE id = ?
        `, [id, id, id]);

        res.json({
            success: true,
            message: "Xóa vật tư thành công"
        });
    } catch (err) {
        console.error('Error removing item:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa vật tư"
        });
    }
};

// GET /api/warehouse-export/:id/excel - Xuất file Excel (tạo từ đầu)
exports.exportExcel = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin phiếu
        const [exports] = await db.query(`SELECT * FROM warehouse_exports WHERE id = ?`, [id]);
        if (exports.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy phiếu" });
        }

        const exportData = exports[0];
        const [items] = await db.query(`SELECT * FROM warehouse_export_items WHERE export_id = ? ORDER BY id`, [id]);

        // Tạo workbook mới
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('PHIẾU XUẤT KHO');

        // Thiết lập width cột
        worksheet.columns = [
            { width: 6 },   // A - STT
            { width: 14 },  // B - Mã hiệu
            { width: 25 },  // C - Nội dung
            { width: 10 },  // D - Rộng (mm)
            { width: 10 },  // E - Cao (mm)
            { width: 8 },   // F - ĐVT
            { width: 12 },  // G - Số lượng
            { width: 12 },  // H - Diện tích
            { width: 20 },  // I - Ghi chú
        ];

        // ========== THÔNG TIN CÔNG TY (Row 1-5) ==========
        worksheet.mergeCells('A1:C1');
        worksheet.getCell('A1').value = 'CÔNG TY CỔ PHẦN VIRALWINDOW';
        worksheet.getCell('A1').font = { bold: true, size: 12 };

        worksheet.mergeCells('A2:C2');
        worksheet.getCell('A2').value = 'Nhà máy: KM 03, Đường Cienco5, KĐT Thanh Hà, Hà Đông, HN';
        worksheet.getCell('A2').font = { size: 10 };

        worksheet.mergeCells('A3:C3');
        worksheet.getCell('A3').value = 'Hotline: 1800 282839';
        worksheet.getCell('A3').font = { size: 10 };

        worksheet.mergeCells('A4:C4');
        worksheet.getCell('A4').value = 'Email: viralwindow.vn@gmail.com';
        worksheet.getCell('A4').font = { size: 10 };

        worksheet.mergeCells('A5:C5');
        worksheet.getCell('A5').value = 'Website: viralwindow.vn';
        worksheet.getCell('A5').font = { size: 10 };

        // ========== LOGO (Row 1-5, cột G-I) ==========
        const logoPath = path.join(__dirname, '..', 'assets', 'LogoViralWindow.png');
        if (fs.existsSync(logoPath)) {
            try {
                const logoImage = workbook.addImage({
                    filename: logoPath,
                    extension: 'png',
                });
                worksheet.addImage(logoImage, {
                    tl: { col: 6, row: 0 },
                    br: { col: 9, row: 4 }
                });
            } catch (logoErr) {
                console.log('Không thể thêm logo:', logoErr.message);
            }
        }

        // ========== TIÊU ĐỀ (Row 6-7) ==========
        worksheet.mergeCells('D6:F6');
        worksheet.getCell('D6').value = 'PHIẾU XUẤT KHO';
        worksheet.getCell('D6').font = { bold: true, size: 16 };
        worksheet.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('D7:F7');
        worksheet.getCell('D7').value = `Số: ${exportData.export_number || ''}`;
        worksheet.getCell('D7').font = { bold: true, size: 11 };
        worksheet.getCell('D7').alignment = { horizontal: 'center', vertical: 'middle' };

        // ========== THÔNG TIN KHÁCH HÀNG (Row 8-14) ==========
        worksheet.getCell('A8').value = 'Khách hàng:';
        worksheet.getCell('A8').font = { bold: true };
        worksheet.mergeCells('B8:D8');
        worksheet.getCell('B8').value = exportData.customer_name || '';

        worksheet.getCell('E8').value = 'Đại lý:';
        worksheet.getCell('E8').font = { bold: true };
        worksheet.mergeCells('F8:H8');
        worksheet.getCell('F8').value = exportData.dealer || '';

        worksheet.getCell('A9').value = 'Ký hiệu:';
        worksheet.getCell('A9').font = { bold: true };
        worksheet.mergeCells('B9:D9');
        worksheet.getCell('B9').value = exportData.customer_code || '';

        worksheet.getCell('A10').value = 'Địa chỉ:';
        worksheet.getCell('A10').font = { bold: true };
        worksheet.mergeCells('B10:H10');
        worksheet.getCell('B10').value = exportData.customer_address || '';

        worksheet.getCell('A11').value = 'Số điện thoại:';
        worksheet.getCell('A11').font = { bold: true };
        worksheet.mergeCells('B11:D11');
        worksheet.getCell('B11').value = exportData.phone || '';

        worksheet.getCell('A12').value = 'Lý do xuất:';
        worksheet.getCell('A12').font = { bold: true };
        worksheet.mergeCells('B12:H12');
        worksheet.getCell('B12').value = exportData.reason || '';

        worksheet.getCell('A13').value = 'Xuất tại kho:';
        worksheet.getCell('A13').font = { bold: true };
        worksheet.mergeCells('B13:H13');
        worksheet.getCell('B13').value = exportData.warehouse_location || 'Công ty cổ phần Viralwindow';

        worksheet.getCell('A14').value = 'Thời điểm vận chuyển:';
        worksheet.getCell('A14').font = { bold: true };
        worksheet.mergeCells('B14:D14');
        worksheet.getCell('B14').value = exportData.shipping_time || '';

        // ========== HEADER BẢNG VẬT TƯ (Row 16) ==========
        const headerRow = 16;
        const headerCells = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
        const headerLabels = ['STT', 'Mã hiệu', 'Nội dung', 'Rộng (mm)', 'Cao (mm)', 'ĐVT', 'Số lượng', 'Diện tích (m²)', 'Ghi chú'];
        const headerColor = { argb: 'FFD9E1F2' };
        const border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };

        headerCells.forEach((col, idx) => {
            const cell = worksheet.getCell(`${col}${headerRow}`);
            cell.value = headerLabels[idx];
            cell.font = { bold: true, size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: headerColor };
            cell.border = border;
        });
        worksheet.getRow(headerRow).height = 30;

        // ========== DATA ROWS ==========
        let dataRow = headerRow + 1;
        let totalQty = 0;
        let totalArea = 0;

        if (items && items.length > 0) {
            items.forEach((item, index) => {
                worksheet.getCell(`A${dataRow}`).value = index + 1;
                worksheet.getCell(`A${dataRow}`).alignment = { horizontal: 'center' };

                worksheet.getCell(`B${dataRow}`).value = item.material_code || '';
                worksheet.getCell(`C${dataRow}`).value = item.material_name || '';

                worksheet.getCell(`D${dataRow}`).value = item.width_mm || '';
                worksheet.getCell(`D${dataRow}`).alignment = { horizontal: 'center' };

                worksheet.getCell(`E${dataRow}`).value = item.height_mm || '';
                worksheet.getCell(`E${dataRow}`).alignment = { horizontal: 'center' };

                worksheet.getCell(`F${dataRow}`).value = item.unit || 'Cái';
                worksheet.getCell(`F${dataRow}`).alignment = { horizontal: 'center' };

                worksheet.getCell(`G${dataRow}`).value = item.quantity || 0;
                worksheet.getCell(`G${dataRow}`).alignment = { horizontal: 'center' };

                worksheet.getCell(`H${dataRow}`).value = item.area || '';
                worksheet.getCell(`H${dataRow}`).alignment = { horizontal: 'center' };

                worksheet.getCell(`I${dataRow}`).value = item.notes || '';

                // Border cho tất cả các cột
                headerCells.forEach(col => {
                    worksheet.getCell(`${col}${dataRow}`).border = border;
                });

                totalQty += parseFloat(item.quantity) || 0;
                totalArea += parseFloat(item.area) || 0;
                dataRow++;
            });
        }

        // ========== CỘNG ROW ==========
        worksheet.mergeCells(`A${dataRow}:C${dataRow}`);
        worksheet.getCell(`A${dataRow}`).value = 'CỘNG';
        worksheet.getCell(`A${dataRow}`).font = { bold: true };
        worksheet.getCell(`A${dataRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.getCell(`G${dataRow}`).value = totalQty;
        worksheet.getCell(`G${dataRow}`).font = { bold: true };
        worksheet.getCell(`G${dataRow}`).alignment = { horizontal: 'center' };

        worksheet.getCell(`H${dataRow}`).value = totalArea > 0 ? totalArea.toFixed(2) : '-';
        worksheet.getCell(`H${dataRow}`).alignment = { horizontal: 'center' };

        headerCells.forEach(col => {
            const cell = worksheet.getCell(`${col}${dataRow}`);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: headerColor };
            cell.border = border;
        });

        // ========== NGÀY THÁNG ==========
        const footerRow = dataRow + 2;
        let exportDate;
        try {
            exportDate = exportData.export_date ? new Date(exportData.export_date) : new Date();
        } catch (e) {
            exportDate = new Date();
        }
        const day = exportDate.getDate();
        const month = exportDate.getMonth() + 1;
        const year = exportDate.getFullYear();

        worksheet.mergeCells(`F${footerRow}:I${footerRow}`);
        worksheet.getCell(`F${footerRow}`).value = `Hà Nội, Ngày ${day} tháng ${month} năm ${year}`;
        worksheet.getCell(`F${footerRow}`).alignment = { horizontal: 'right' };
        worksheet.getCell(`F${footerRow}`).font = { italic: true };

        // ========== CHỮ KÝ ==========
        const signRow = footerRow + 2;
        const signLabels = ['Vận chuyển', 'Người kiểm hàng', 'Khách hàng', 'Kế toán', 'Người lập phiếu'];
        const signCols = ['A', 'C', 'E', 'G', 'I'];

        signCols.forEach((col, idx) => {
            worksheet.getCell(`${col}${signRow}`).value = signLabels[idx];
            worksheet.getCell(`${col}${signRow}`).font = { bold: true };
            worksheet.getCell(`${col}${signRow}`).alignment = { horizontal: 'center' };
        });

        // ========== GỬI FILE ==========
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=PhieuXuatKho_${exportData.export_number || 'export'}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error exporting Excel:', err);
        console.error('Stack trace:', err.stack);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Lỗi khi xuất Excel: " + err.message
            });
        }
    }
};
