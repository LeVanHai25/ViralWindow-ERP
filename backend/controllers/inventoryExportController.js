const db = require('../config/db');
const inventoryExportService = require('../services/inventoryExportService');

/**
 * Export inventory to Excel by item type (warehouse)
 * GET /api/inventory/export-excel?item_type=...&search=...&category=...&system=...&warehouse_id=...
 */
exports.exportInventory = async (req, res) => {
    try {
        const { item_type, search, category, system, warehouse_id } = req.query;

        if (!item_type || !['aluminum', 'accessory', 'glass', 'other', 'scraps'].includes(item_type)) {
            return res.status(400).json({
                success: false,
                message: 'item_type phải là: aluminum, accessory, glass, other hoặc scraps'
            });
        }

        // Build query based on item_type
        let sql = '';
        let params = [];

        switch (item_type) {
            case 'aluminum':
                sql = `
                    SELECT 
                        code,
                        name,
                        TRIM(aluminum_system) AS aluminum_system,
                        color,
                        COALESCE(density, weight_per_meter) AS density,
                        length_m,
                        quantity AS stock,
                        min_stock_level,
                        max_stock_level,
                        unit_price
                    FROM aluminum_systems
                    WHERE is_active = 1
                `;
                if (search) {
                    sql += ` AND (code LIKE ? OR name LIKE ? OR aluminum_system LIKE ?)`;
                    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
                }
                if (system) {
                    sql += ` AND TRIM(aluminum_system) = ?`;
                    params.push(system);
                }
                if (warehouse_id) {
                    sql += ` AND warehouse_id = ?`;
                    params.push(warehouse_id);
                }
                sql += ` ORDER BY aluminum_system, code`;
                break;

            case 'accessory':
                sql = `
                    SELECT 
                        code,
                        name,
                        category,
                        unit,
                        stock_quantity AS stock,
                        min_stock_level,
                        max_stock_level,
                        purchase_price AS unit_price
                    FROM accessories
                    WHERE 1=1
                `;
                if (search) {
                    sql += ` AND (code LIKE ? OR name LIKE ?)`;
                    params.push(`%${search}%`, `%${search}%`);
                }
                if (category && category !== 'all') {
                    sql += ` AND category = ?`;
                    params.push(category);
                }
                // [SENIOR ARCHITECT NOTE]: Exclude "ghost" import items with no stock/min level
                sql += ` AND (code NOT LIKE 'VT-IMPORT%' OR stock_quantity > 0 OR min_stock_level > 0)`;
                sql += ` ORDER BY category, code`;
                break;

            case 'glass':
                sql = `
                    SELECT 
                        i.item_code AS code,
                        i.item_name AS name,
                        s.name AS supplier_name,
                        i.notes,
                        i.quantity AS stock,
                        i.min_stock_level,
                        i.max_stock_level,
                        i.unit_price
                    FROM inventory i
                    LEFT JOIN suppliers s ON i.supplier_id = s.id
                    WHERE i.item_type = 'glass'
                `;
                if (search) {
                    sql += ` AND (i.item_code LIKE ? OR i.item_name LIKE ?)`;
                    params.push(`%${search}%`, `%${search}%`);
                }
                sql += ` ORDER BY i.created_at DESC`;
                break;

            case 'other':
                sql = `
                    SELECT 
                        item_code AS code,
                        item_name AS name,
                        notes AS category,
                        unit,
                        quantity AS stock,
                        min_stock_level,
                        max_stock_level,
                        unit_price
                    FROM inventory
                    WHERE item_type = 'other'
                `;
                if (search) {
                    sql += ` AND (item_code LIKE ? OR item_name LIKE ?)`;
                    params.push(`%${search}%`, `%${search}%`);
                }
                if (category && category !== 'all') {
                    sql += ` AND notes = ?`;
                    params.push(category);
                }
                // [SENIOR ARCHITECT NOTE]: Exclude "ghost" import items with no stock/min level
                sql += ` AND (item_code NOT LIKE 'VT-IMPORT%' OR quantity > 0 OR min_stock_level > 0)`;
                sql += ` ORDER BY notes, item_code`;
                break;

            case 'scraps':
                sql = `
                    SELECT 
                        scrap_code AS code,
                        profile_name AS name,
                        'Phế liệu nhôm' AS category,
                        'đoạn' AS unit,
                        length_mm / 1000 AS stock,
                        0 as min_stock_level,
                        0 as max_stock_level,
                        0 as unit_price
                    FROM aluminum_scraps
                    WHERE is_used = 0
                `;
                if (search) {
                    sql += ` AND (scrap_code LIKE ? OR profile_name LIKE ?)`;
                    params.push(`%${search}%`, `%${search}%`);
                }
                sql += ` ORDER BY created_at DESC`;
                break;
        }

        const [rows] = await db.query(sql, params);

        // Map data to service format (Advanced fields for professional reports)
        const exportData = rows.map(row => {
            const stock = parseFloat(row.stock) || 0;
            const min = parseFloat(row.min_stock_level) || 0;
            const max = parseFloat(row.max_stock_level) || 0;
            const price = parseFloat(row.unit_price) || 0;
            const density = parseFloat(row.density) || 0;
            const length_m = parseFloat(row.length_m) || 0;

            return {
                code: row.code,
                name: row.name,
                aluminum_system: row.aluminum_system || '',
                unit: row.unit,
                color: row.color,
                supplier_name: row.supplier_name,
                notes: row.notes,
                density: density,
                length_m: length_m,
                stock: stock,
                min: min,
                max: max,
                restock: max > stock ? (max - stock) : 0,
                price: price,
                totalValue: stock * price
            };
        });

        const warehouseNames = {
            aluminum: 'Nhôm',
            accessory: 'Phụ kiện',
            glass: 'Kính',
            other: 'Vật tư phụ',
            scraps: 'Phế liệu'
        };

        // Xây tiêu đề chi tiết dựa trên filter
        let reportTitle = `BÁO CÁO TỒN KHO ${warehouseNames[item_type]}`;
        if (system) reportTitle += ` - ${system}`;

        const buffer = await inventoryExportService.exportToExcel(item_type, exportData, {
            title: reportTitle,
            generatedBy: req.user?.full_name || req.user?.username || 'Admin',
            filterSystem: system || null,
            filterWarehouseId: warehouse_id || null
        });

        // Filenames
        const warehouseFileNames = { aluminum: 'Nhom', accessory: 'PhuKien', glass: 'Kinh', other: 'VatTuPhu', scraps: 'PheLieu' };
        const filename = `TonKho_${warehouseFileNames[item_type]}_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Error exporting inventory:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xuất Excel: ' + error.message
        });
    }
};
