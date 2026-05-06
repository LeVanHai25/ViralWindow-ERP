const db = require('../config/db');
const stockDocumentExportService = require('../services/stockDocumentExportService');
// Use the constructor/class directly for static methods if needed
const StockDocumentExportService = stockDocumentExportService.constructor;

/**
 * Export a single stock document to Excel
 * GET /api/stock-documents/:id/export-excel
 */
exports.exportSingleDocument = async (req, res) => {
    try {
        const docId = req.params.id;

        // Get document details - use created_by (not user_id)
        const [docs] = await db.query(`
            SELECT d.*, 
                   u.full_name AS created_by_name,
                   s.name AS supplier_name,
                   s.address AS supplier_address,
                   s.phone AS supplier_phone,
                   p.project_name,
                   p.construction_address AS project_address,
                   p.receiver_phone AS project_phone
            FROM stock_documents d
            LEFT JOIN users u ON d.created_by = u.id
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN projects p ON d.project_id = p.id
            WHERE d.id = ?
        `, [docId]);

        if (!docs || docs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiếu'
            });
        }

        const doc = docs[0];

        // Get document lines
        const [lines] = await db.query(`
            SELECT * FROM stock_document_lines WHERE document_id = ?
        `, [docId]);

        // Generate Excel using professional template
        const buffer = await stockDocumentExportService.exportSingleDocument(doc, lines);

        // Generate filename
        const safeDocNo = (doc.doc_no || 'Phieu_' + docId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Phieu_${safeDocNo}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        res.send(buffer);

    } catch (error) {
        console.error('Error exporting document:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xuất Excel: ' + error.message
        });
    }
};

/**
 * Export monthly summary to Excel
 * GET /api/stock-documents/ledger/monthly-summary/export-excel?month=YYYY-MM
 */
exports.exportMonthlySummary = async (req, res) => {
    try {
        const { month, warehouse_id = 1 } = req.query;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn tháng (format: YYYY-MM)'
            });
        }

        const [year, monthNum] = month.split('-');
        const startOfMonth = `${year}-${monthNum}-01 00:00:00`;
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);
        const endOfMonthStr = endOfMonth.toISOString().slice(0, 19).replace('T', ' ');

        const itemTypes = ['aluminum', 'accessory', 'glass', 'other'];
        const itemTypeLabels = {
            'aluminum': 'Nhôm',
            'accessory': 'Phụ kiện',
            'glass': 'Kính',
            'other': 'Vật tư phụ'
        };
        const sheetNames = {
            'aluminum': 'Nhom',
            'accessory': 'PhuKien',
            'glass': 'Kinh',
            'other': 'VatTuPhu'
        };

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ViralWindow';
        workbook.created = new Date();

        // Summary data for overview sheet
        const summaryData = [];

        // Process each item type
        for (const itemType of itemTypes) {
            // Get all items that had transactions in the month
            // JOIN with stock_document_lines to get item_code and item_name
            const [itemsWithTransactions] = await db.query(`
                SELECT DISTINCT 
                    l.item_id, 
                    l.item_type,
                    dl.item_code,
                    dl.item_name
                FROM stock_ledger l
                LEFT JOIN stock_document_lines dl ON dl.document_id = l.document_id 
                    AND dl.item_type = l.item_type 
                    AND dl.item_id = l.item_id
                WHERE l.warehouse_id = ?
                  AND l.item_type = ?
                  AND l.transaction_at >= ?
                  AND l.transaction_at <= ?
                ORDER BY dl.item_code
            `, [warehouse_id, itemType, startOfMonth, endOfMonthStr]);

            // Calculate stats for each item
            const itemStats = [];
            let totalOpeningQty = 0;
            let totalInQty = 0;
            let totalOutQty = 0;
            let totalClosingQty = 0;

            for (const item of itemsWithTransactions) {
                // Get opening balance (last transaction before start of month)
                const [openingRows] = await db.query(`
                    SELECT balance_after
                    FROM stock_ledger
                    WHERE warehouse_id = ? AND item_type = ? AND item_id = ?
                      AND transaction_at < ?
                    ORDER BY transaction_at DESC, id DESC
                    LIMIT 1
                `, [warehouse_id, itemType, item.item_id, startOfMonth]);

                const openingBalance = openingRows.length > 0 ? parseFloat(openingRows[0].balance_after) || 0 : 0;

                // Get transactions in month
                const [monthTxns] = await db.query(`
                    SELECT SUM(qty_in) AS total_in, SUM(qty_out) AS total_out
                    FROM stock_ledger
                    WHERE warehouse_id = ? AND item_type = ? AND item_id = ?
                      AND transaction_at >= ? AND transaction_at <= ?
                `, [warehouse_id, itemType, item.item_id, startOfMonth, endOfMonthStr]);

                const qtyIn = parseFloat(monthTxns[0]?.total_in) || 0;
                const qtyOut = parseFloat(monthTxns[0]?.total_out) || 0;
                const closingBalance = openingBalance + qtyIn - qtyOut;

                itemStats.push({
                    code: item.item_code || `ID:${item.item_id}`,
                    name: item.item_name || '-',
                    opening: openingBalance,
                    in: qtyIn,
                    out: qtyOut,
                    closing: closingBalance
                });

                totalOpeningQty += openingBalance;
                totalInQty += qtyIn;
                totalOutQty += qtyOut;
                totalClosingQty += closingBalance;
            }

            // Add to summary
            summaryData.push({
                type: itemTypeLabels[itemType],
                openingQty: totalOpeningQty,
                inQty: totalInQty,
                outQty: totalOutQty,
                closingQty: totalClosingQty,
                transactionCount: itemsWithTransactions.length
            });

            // Create detail sheet
            if (itemStats.length > 0) {
                const ws = workbook.addWorksheet(sheetNames[itemType]);

                // Add Professional Header
                await StockDocumentExportService.addCompanyHeader(workbook, ws, 6);

                // Title
                ws.getCell('A6').value = `BÁO CÁO NHẬP XUẤT - ${itemTypeLabels[itemType].toUpperCase()} - THÁNG ${monthNum}/${year}`;
                ws.getCell('A6').font = { bold: true, size: 16, color: { argb: 'FF000000' }, name: 'Times New Roman' };
                ws.getCell('A6').alignment = { horizontal: 'center' };
                try { ws.mergeCells('A6:F6'); } catch (e) { }
                ws.getRow(6).height = 35;

                // Headers (Row 14 for consistency)
                const headers = ['Mã vật tư', 'Tên vật tư', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ'];
                const headerRow = ws.getRow(14);
                headerRow.values = headers;
                headerRow.height = 25;
                headerRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007B5E' } };
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                });

                ws.views = [{ state: 'frozen', ySplit: 14 }];

                // Data (Starting Row 15)
                let rowIndex = 15;
                itemStats.forEach((stat, idx) => {
                    const row = ws.getRow(rowIndex);
                    row.values = [stat.code, stat.name, stat.opening, stat.in, stat.out, stat.closing];
                    row.eachCell((cell, col) => {
                        cell.border = { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }, left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
                        if (col >= 3) {
                            cell.numFmt = '#,##0.##';
                            cell.alignment = { horizontal: 'right' };
                        }
                    });
                    if (idx % 2 === 1) {
                        row.eachCell(cell => {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                        });
                    }
                    rowIndex++;
                });

                // Total row
                const totalRow = ws.getRow(rowIndex);
                totalRow.values = ['', 'TỔNG CỘNG', totalOpeningQty, totalInQty, totalOutQty, totalClosingQty];
                totalRow.height = 28;
                totalRow.eachCell((cell, col) => {
                    cell.font = { bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                    if (col >= 3) {
                        cell.numFmt = '#,##0.##';
                        cell.alignment = { horizontal: 'right' };
                    }
                });

                ws.columns = [
                    { width: 15 }, { width: 40 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
                ];

                // Signatures
                rowIndex += 3;
                const footers = [
                    { col: 1, text: 'NGƯỜI LẬP' },
                    { col: 2, text: 'KẾ TOÁN' },
                    { col: 4, text: 'THỦ KHO' },
                    { col: 6, text: 'NGƯỜI NHẬN' }
                ];
                footers.forEach(f => {
                    const cell = ws.getRow(rowIndex).getCell(f.col);
                    cell.value = f.text;
                    cell.font = { bold: true, size: 11, name: 'Times New Roman' };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            }
        }

        // Create summary sheet (first)
        const summarySheet = workbook.addWorksheet('TongHop', { index: 0 });

        // Add Professional Header
        await StockDocumentExportService.addCompanyHeader(workbook, summarySheet, 6);

        summarySheet.getCell('A6').value = `BÁO CÁO TỔNG HỢP NHẬP XUẤT KHO - THÁNG ${monthNum}/${year}`;
        summarySheet.getCell('A6').font = { bold: true, size: 16, color: { argb: 'FF000000' }, name: 'Times New Roman' };
        summarySheet.getCell('A6').alignment = { horizontal: 'center' };
        try { summarySheet.mergeCells('A6:F6'); } catch (e) { }
        summarySheet.getRow(6).height = 35;

        const summaryHeaders = ['Kho', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ', 'Số mặt hàng'];
        const summaryHeaderRow = summarySheet.getRow(14);
        summaryHeaderRow.values = summaryHeaders;
        summaryHeaderRow.height = 25;
        summaryHeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007B5E' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        let summaryRowIndex = 15;
        summaryData.forEach((data, idx) => {
            const row = summarySheet.getRow(summaryRowIndex);
            row.values = [data.type, data.openingQty, data.inQty, data.outQty, data.closingQty, data.transactionCount];
            row.eachCell((cell, col) => {
                cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                if (col >= 2 && col <= 5) {
                    cell.numFmt = '#,##0.##';
                    cell.alignment = { horizontal: 'right' };
                }
            });
            if (idx % 2 === 1) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                });
            }
            summaryRowIndex++;
        });

        summarySheet.columns = [
            { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
        ];

        // Signatures for summary
        summaryRowIndex += 3;
        const summaryFooters = [
            { col: 1, text: 'NGƯỜI LẬP' },
            { col: 2, text: 'KẾ TOÁN' },
            { col: 4, text: 'THỦ KHO' },
            { col: 6, text: 'BAN GIÁM ĐỐC' }
        ];
        summaryFooters.forEach(f => {
            const cell = summarySheet.getRow(summaryRowIndex).getCell(f.col);
            cell.value = f.text;
            cell.font = { bold: true, size: 11, name: 'Times New Roman' };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Generate filename
        const filename = `BaoCaoKho_${month}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting monthly summary:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xuất báo cáo tháng: ' + error.message
        });
    }
};
