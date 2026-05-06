const db = require('../config/db');
const inventoryExportService = require('../services/inventoryExportService');

/**
 * Export warehouse report by date range
 * GET /api/reports/warehouse/export-excel?item_type=...&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 */
exports.exportWarehouseReport = async (req, res) => {
    try {
        const { item_type, date_from, date_to } = req.query;

        // Validate inputs
        if (!item_type || !['aluminum', 'accessory', 'glass', 'other'].includes(item_type)) {
            return res.status(400).json({
                success: false,
                message: 'item_type phải là: aluminum, accessory, glass, hoặc other'
            });
        }

        if (!date_from || !date_to) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp date_from và date_to (format: YYYY-MM-DD)'
            });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date_from) || !dateRegex.test(date_to)) {
            return res.status(400).json({
                success: false,
                message: 'Định dạng ngày không hợp lệ (YYYY-MM-DD)'
            });
        }

        if (date_from > date_to) {
            return res.status(400).json({
                success: false,
                message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
            });
        }

        const startDate = `${date_from} 00:00:00`;
        const endDate = `${date_to} 23:59:59`;

        // Item type translation
        const itemTypeMap = {
            'aluminum': ['aluminum', 'nhom', 'Nhom', 'ALUMINUM'],
            'accessory': ['accessory', 'phukien', 'PhuKien', 'ACCESSORY'],
            'glass': ['glass', 'kinh', 'Kinh', 'GLASS'],
            'other': ['other', 'vattu', 'VatTu', 'OTHER', 'vattuph']
        };
        const itemTypeVariants = itemTypeMap[item_type] || [item_type];

        // Get all items that had transactions in the date range
        const [itemsWithTransactions] = await db.query(`
            SELECT DISTINCT 
                l.item_id, 
                l.item_type,
                dl.item_code,
                dl.item_name,
                dl.unit
            FROM stock_ledger l
            LEFT JOIN stock_document_lines dl ON dl.document_id = l.document_id 
                AND dl.item_type = l.item_type 
                AND dl.item_id = l.item_id
            WHERE l.item_type IN (?)
              AND l.transaction_at >= ?
              AND l.transaction_at <= ?
            ORDER BY dl.item_code
        `, [itemTypeVariants, startDate, endDate]);

        const itemStats = [];

        for (const item of itemsWithTransactions) {
            // [SENIOR ARCHITECT FIX]: Fetch current unit price from master table
            let price = 0;
            try {
                if (item.item_type === 'aluminum') {
                    const [pRows] = await db.query('SELECT unit_price FROM aluminum_systems WHERE id = ?', [item.item_id]);
                    price = parseFloat(pRows[0]?.unit_price) || 0;
                } else if (item.item_type === 'accessory') {
                    const [pRows] = await db.query('SELECT purchase_price FROM accessories WHERE id = ?', [item.item_id]);
                    price = parseFloat(pRows[0]?.purchase_price) || 0;
                } else {
                    const [pRows] = await db.query('SELECT unit_price FROM inventory WHERE id = ?', [item.item_id]);
                    price = parseFloat(pRows[0]?.unit_price) || 0;
                }
            } catch (err) {
                console.error(`Error fetching price for ${item.item_type} ${item.item_id}:`, err.message);
            }

            // Get opening balance (last transaction before start date)
            const [openingRows] = await db.query(`
                SELECT balance_after
                FROM stock_ledger
                WHERE item_type = ? AND item_id = ?
                  AND transaction_at < ?
                ORDER BY transaction_at DESC, id DESC
                LIMIT 1
            `, [item.item_type, item.item_id, startDate]);

            const openingBalance = openingRows.length > 0 ? parseFloat(openingRows[0].balance_after) || 0 : 0;

            // Get transactions in range
            const [rangeTxns] = await db.query(`
                SELECT 
                    SUM(qty_in) AS total_in, 
                    SUM(qty_out) AS total_out
                FROM stock_ledger
                WHERE item_type = ? AND item_id = ?
                  AND transaction_at >= ? AND transaction_at <= ?
            `, [item.item_type, item.item_id, startDate, endDate]);

            const qtyIn = parseFloat(rangeTxns[0]?.total_in) || 0;
            const qtyOut = parseFloat(rangeTxns[0]?.total_out) || 0;
            const closingBalance = openingBalance + qtyIn - qtyOut;

            if (qtyIn > 0 || qtyOut > 0 || openingBalance !== 0) {
                itemStats.push({
                    code: item.item_code || `ID:${item.item_id}`,
                    name: item.item_name || '-',
                    unit: item.unit || '-',
                    opening: openingBalance,
                    in: qtyIn,
                    out: qtyOut,
                    closing: closingBalance,
                    price: price,
                    totalValue: closingBalance * price
                });
            }
        }

        // Warehouse labels
        const warehouseLabels = {
            'aluminum': 'NHÔM',
            'accessory': 'PHỤ KIỆN',
            'glass': 'KÍNH',
            'other': 'VẬT TƯ PHỤ'
        };
        const warehouseLabel = warehouseLabels[item_type] || item_type.toUpperCase();

        const fromDateStr = new Date(date_from).toLocaleDateString('vi-VN');
        const toDateStr = new Date(date_to).toLocaleDateString('vi-VN');

        const buffer = await inventoryExportService.exportToExcel(item_type, itemStats, {
            title: `BÁO CÁO NHẬP XUẤT KHO ${warehouseLabel}`,
            fromDateStr: fromDateStr,
            toDateStr: toDateStr,
            generatedBy: req.user?.full_name || req.user?.username || 'Admin'
        });

        // Generate filename
        const warehouseFileNames = {
            'aluminum': 'Nhom',
            'accessory': 'PhuKien',
            'glass': 'Kinh',
            'other': 'VatTuPhu'
        };
        const fromStr = date_from.replace(/-/g, '');
        const toStr = date_to.replace(/-/g, '');
        const filename = `BaoCao_${warehouseFileNames[item_type]}_${fromStr}-${toStr}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Error exporting warehouse report:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xuất báo cáo: ' + error.message
        });
    }
};
