const db = require("../config/db");

/**
 * Service tổng hợp số liệu tồn kho từ 4 module:
 * - Phụ kiện (accessories)
 * - Hệ nhôm (aluminum_systems)
 * - Kính (glass - nếu có)
 * - Khác (inventory với item_type = 'other')
 */

/**
 * Tính tổng hợp 3 chỉ số từ 4 module
 * @returns {Object} { totalItems, lowStockCount, totalValue }
 */
exports.getAggregatedStatistics = async () => {
    try {
        // 1. PHỤ KIỆN (accessories)
        const [accessoriesStats] = await db.query(`
            SELECT 
                COUNT(*) as total_count,
                SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN stock_quantity > 0 THEN 1 ELSE 0 END) as items_in_stock,
                COALESCE(SUM(
                    CASE 
                        WHEN stock_quantity > 0 AND (sale_price > 0 OR purchase_price > 0)
                        THEN stock_quantity * COALESCE(sale_price, purchase_price, 0)
                        ELSE 0
                    END
                ), 0) as total_value
            FROM accessories
            WHERE is_active = 1
        `);

        // 2. HỆ NHÔM (aluminum_systems)
        // Tính tồn kho nhôm: giá trị = quantity (số cây/thanh) * unit_price (giá mỗi cây/thanh)
        let aluminumStats;
        try {
            // Count unique profiles, not total bars
            [aluminumStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_count,
                    SUM(CASE WHEN COALESCE(quantity_m, 0) < 10 THEN 1 ELSE 0 END) as low_stock_count,
                    SUM(CASE WHEN COALESCE(quantity, 0) > 0 OR COALESCE(quantity_m, 0) > 0 THEN 1 ELSE 0 END) as items_in_stock,
                    COALESCE(SUM(
                        CASE 
                            WHEN quantity IS NOT NULL AND quantity > 0 AND unit_price IS NOT NULL AND unit_price > 0
                            THEN quantity * unit_price
                            ELSE 0
                        END
                    ), 0) as total_value
                FROM aluminum_systems
                WHERE is_active = 1
            `);
        } catch (err) {
            console.warn('Error calculating aluminum stats:', err.message);
            aluminumStats = [{ total_count: 0, low_stock_count: 0, items_in_stock: 0, total_value: 0 }];
        }

        // 3. KÍNH (glass)
        // Giả sử có bảng glass hoặc lưu trong inventory với item_type = 'glass'
        // Nếu chưa có bảng riêng, sẽ tính từ inventory
        let glassStats;
        try {
            [glassStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_count,
                    SUM(CASE WHEN CAST(quantity AS DECIMAL(10,2)) <= COALESCE(min_stock_level, 0) THEN 1 ELSE 0 END) as low_stock_count,
                    SUM(CASE WHEN CAST(quantity AS DECIMAL(10,2)) > 0 THEN 1 ELSE 0 END) as items_in_stock,
                    COALESCE(SUM(
                        CASE 
                            WHEN CAST(quantity AS DECIMAL(10,2)) > 0 AND unit_price > 0
                            THEN CAST(quantity AS DECIMAL(10,2)) * unit_price
                            ELSE 0
                        END
                    ), 0) as total_value
                FROM inventory
                WHERE item_type = 'glass'
            `);
        } catch (err) {
            // Nếu không có bảng hoặc cột, trả về 0
            glassStats = [{ total_count: 0, low_stock_count: 0, items_in_stock: 0, total_value: 0 }];
        }

        // 4. KHÁC (inventory với item_type = 'other' hoặc vật tư phụ)
        let otherStats;
        try {
            [otherStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_count,
                    SUM(CASE WHEN CAST(quantity AS DECIMAL(10,2)) <= COALESCE(min_stock_level, 0) THEN 1 ELSE 0 END) as low_stock_count,
                    SUM(CASE WHEN CAST(quantity AS DECIMAL(10,2)) > 0 THEN 1 ELSE 0 END) as items_in_stock,
                    COALESCE(SUM(
                        CASE 
                            WHEN CAST(quantity AS DECIMAL(10,2)) > 0 AND unit_price > 0
                            THEN CAST(quantity AS DECIMAL(10,2)) * unit_price
                            ELSE 0
                        END
                    ), 0) as total_value
                FROM inventory
                WHERE item_type NOT IN ('glass', 'aluminum') 
                AND (item_type IN ('other', 'vatt') OR item_type IS NULL OR item_type = '')
            `);
        } catch (err) {
            console.error('Error querying other stats:', err);
            otherStats = [{ total_count: 0, low_stock_count: 0, items_in_stock: 0, total_value: 0 }];
        }

        // 5. NHÔM ĐỒ C (aluminum_scraps) - NEW
        let scrapStats;
        try {
            [scrapStats] = await db.query(`
                SELECT COUNT(*) as available_scraps
                FROM aluminum_scraps
                WHERE status = 'available'
            `);
        } catch (err) {
            console.warn('Error calculating scrap stats:', err.message);
            scrapStats = [{ available_scraps: 0 }];
        }

        // Tổng hợp kết quả
        const acc = accessoriesStats[0] || { total_count: 0, low_stock_count: 0, items_in_stock: 0, total_value: 0 };
        const alum = aluminumStats[0] || { total_count: 0, low_stock_count: 0, items_in_stock: 0, total_value: 0 };
        const gla = glassStats[0] || { total_count: 0, low_stock_count: 0, items_in_stock: 0, total_value: 0 };
        const oth = otherStats[0] || { total_count: 0, low_stock_count: 0, items_in_stock: 0, total_value: 0 };
        const availableScraps = scrapStats[0].available_scraps || 0;

        console.log('Aggregation results:', {
            accessories: acc,
            aluminum: alum,
            glass: gla,
            other: oth,
            scraps: availableScraps
        });

        // Tính tổng
        const totalItems =
            (parseInt(acc.total_count) || 0) +
            (parseInt(alum.total_count) || 0) +
            (parseInt(gla.total_count) || 0) +
            (parseInt(oth.total_count) || 0);

        const lowStockCount =
            (parseInt(acc.low_stock_count) || 0) +
            (parseInt(alum.low_stock_count) || 0) +
            (parseInt(gla.low_stock_count) || 0) +
            (parseInt(oth.low_stock_count) || 0);

        // Tính số vật tư trong kho (có stock > 0) - kể cả cảnh báo
        const itemsInStock =
            (parseInt(acc.items_in_stock) || 0) +
            (parseInt(alum.items_in_stock) || 0) +
            (parseInt(gla.items_in_stock) || 0) +
            (parseInt(oth.items_in_stock) || 0);

        const totalValue =
            (parseFloat(acc.total_value) || 0) +
            (parseFloat(alum.total_value) || 0) +
            (parseFloat(gla.total_value) || 0) +
            (parseFloat(oth.total_value) || 0);

        console.log('Final stats:', { totalItems, lowStockCount, itemsInStock, totalValue, totalScraps: availableScraps });

        return {
            totalItems,
            lowStockCount,
            itemsInStock, // Số vật tư có stock > 0 (kể cả cảnh báo)
            totalValue,
            totalScraps: availableScraps,
            breakdown: {
                accessories: {
                    count: parseInt(acc.total_count || 0),
                    lowStock: parseInt(acc.low_stock_count || 0),
                    itemsInStock: parseInt(acc.items_in_stock || 0),
                    value: parseFloat(acc.total_value || 0)
                },
                aluminum: {
                    count: parseInt(alum.total_count || 0),
                    lowStock: parseInt(alum.low_stock_count || 0),
                    itemsInStock: parseInt(alum.items_in_stock || 0),
                    value: parseFloat(alum.total_value || 0)
                },
                glass: {
                    count: parseInt(gla.total_count || 0),
                    lowStock: parseInt(gla.low_stock_count || 0),
                    itemsInStock: parseInt(gla.items_in_stock || 0),
                    value: parseFloat(gla.total_value || 0)
                },
                other: {
                    count: parseInt(oth.total_count || 0),
                    lowStock: parseInt(oth.low_stock_count || 0),
                    itemsInStock: parseInt(oth.items_in_stock || 0),
                    value: parseFloat(oth.total_value || 0)
                },
                scraps: availableScraps
            }
        };
    } catch (err) {
        console.error('Error in getAggregatedStatistics:', err);
        throw err;
    }
};

/**
 * Lấy danh sách vật tư vi phạm cảnh báo từ tất cả module
 * @returns {Array} Danh sách vật tư cần cảnh báo
 */
exports.getLowStockItems = async () => {
    try {
        const lowStockItems = [];

        // ===== WAREHOUSE MAP =====
        const WAREHOUSES = {
            1: 'Kho Nhôm VIRAL',
            2: 'Kho Nhôm YANGLY'
        };

        // 1. Phụ kiện vi phạm — thêm category
        const [accessories] = await db.query(`
            SELECT 
                id,
                code as item_code,
                name as item_name,
                'accessory' as module_type,
                'Phụ kiện' as module_name,
                category as item_type,
                category as category_name,
                stock_quantity as quantity,
                min_stock_level,
                unit,
                COALESCE(sale_price, purchase_price, 0) as unit_price,
                (stock_quantity * COALESCE(sale_price, purchase_price, 0)) as total_value
            FROM accessories
            WHERE is_active = 1 
            AND stock_quantity <= min_stock_level
            ORDER BY stock_quantity ASC
        `);

        accessories.forEach(item => {
            lowStockItems.push({
                ...item,
                module_type: 'accessory',
                module_name: 'Phụ kiện',
                warehouse_id: 1,
                warehouse_name: 'Kho Phụ kiện',
                aluminum_system: null
            });
        });

        // 2. Hệ nhôm vi phạm — TÁCH THEO TỪNG KHO (aluminum_warehouse_stock)
        try {
            // Lấy danh sách tất cả nhôm cùng thông tin hệ
            const [allAluminum] = await db.query(`
                SELECT 
                    als.id,
                    als.code as item_code,
                    als.name as item_name,
                    als.aluminum_system,
                    als.brand,
                    als.min_stock_level as profile_min_stock,
                    COALESCE(als.unit_price, 0) as unit_price
                FROM aluminum_systems als
                WHERE als.is_active = 1
            `);

            // Lấy tồn kho theo từng warehouse
            const [warehouseStocks] = await db.query(`
                SELECT 
                    aws.aluminum_system_id,
                    aws.warehouse_id,
                    COALESCE(aws.quantity, 0) as warehouse_qty
                FROM aluminum_warehouse_stock aws
            `);

            // Build map: { itemId_warehouseId: qty }
            const stockMap = {};
            warehouseStocks.forEach(ws => {
                const key = `${ws.aluminum_system_id}_${ws.warehouse_id}`;
                stockMap[key] = parseFloat(ws.warehouse_qty) || 0;
            });

            // Kiểm tra từng nhôm ở từng kho
            const warehouseIds = [1, 2]; // VIRAL, YANGLY
            const minStockPerWarehouse = 5; // Min stock mỗi kho (thanh)

            for (const whId of warehouseIds) {
                for (const alu of allAluminum) {
                    const key = `${alu.id}_${whId}`;
                    const whQty = stockMap[key] !== undefined ? stockMap[key] : 0;
                    const minStock = alu.profile_min_stock || minStockPerWarehouse;

                    if (whQty <= minStock) {
                        lowStockItems.push({
                            id: alu.id,
                            item_code: alu.item_code,
                            item_name: alu.item_name,
                            module_type: 'aluminum',
                            module_name: 'Kho nhôm',
                            item_type: 'Hệ nhôm',
                            category_name: alu.aluminum_system || 'Chưa phân hệ',
                            aluminum_system: alu.aluminum_system || null,
                            quantity: whQty,
                            min_stock_level: minStock,
                            unit: 'thanh',
                            unit_price: parseFloat(alu.unit_price) || 0,
                            total_value: whQty * (parseFloat(alu.unit_price) || 0),
                            warehouse_id: whId,
                            warehouse_name: WAREHOUSES[whId] || `Kho ${whId}`
                        });
                    }
                }
            }
        } catch (err) {
            console.warn('Error checking per-warehouse aluminum:', err.message);
            // Fallback: dùng query cũ nếu aluminum_warehouse_stock chưa tồn tại
            try {
                const [aluminumRows] = await db.query(`
                    SELECT 
                        id, code as item_code, name as item_name,
                        'aluminum' as module_type, 'Kho nhôm' as module_name,
                        'Hệ nhôm' as item_type,
                        aluminum_system as category_name,
                        aluminum_system,
                        COALESCE(quantity_m, 0) as quantity,
                        10 as min_stock_level, 'm' as unit,
                        COALESCE(unit_price, 0) as unit_price,
                        (COALESCE(quantity_m, 0) * COALESCE(unit_price, 0)) as total_value
                    FROM aluminum_systems
                    WHERE is_active = 1 AND (quantity_m IS NULL OR quantity_m < 10 OR quantity_m = 0)
                    ORDER BY COALESCE(quantity_m, 0) ASC
                `);
                (aluminumRows || []).forEach(item => {
                    lowStockItems.push({
                        ...item,
                        warehouse_id: 1,
                        warehouse_name: WAREHOUSES[1]
                    });
                });
            } catch (err2) {
                console.warn('Fallback aluminum query failed:', err2.message);
            }
        }

        // 3. Kính vi phạm — thêm category
        let glass = [];
        try {
            const [glassRows] = await db.query(`
                SELECT 
                    id, item_code, item_name,
                    'glass' as module_type, 'Kính' as module_name,
                    item_type,
                    item_type as category_name,
                    quantity, min_stock_level, unit,
                    COALESCE(unit_price, 0) as unit_price,
                    (quantity * COALESCE(unit_price, 0)) as total_value
                FROM inventory
                WHERE item_type = 'glass'
                AND quantity <= min_stock_level
                ORDER BY quantity ASC
            `);
            glass = glassRows || [];
        } catch (err) {
            glass = [];
        }

        glass.forEach(item => {
            lowStockItems.push({
                ...item,
                module_type: 'glass',
                module_name: 'Kính',
                warehouse_id: 1,
                warehouse_name: 'Kho Kính',
                aluminum_system: null
            });
        });

        // 4. Vật tư phụ / Khác vi phạm — thêm category
        const [other] = await db.query(`
            SELECT 
                id, item_code, item_name,
                'other' as module_type, 'Vật tư phụ' as module_name,
                item_type,
                item_type as category_name,
                quantity, min_stock_level, unit,
                COALESCE(unit_price, 0) as unit_price,
                (quantity * COALESCE(unit_price, 0)) as total_value
            FROM inventory
            WHERE item_type NOT IN ('glass', 'aluminum')
            AND (item_type = 'other' OR item_type IS NULL)
            AND quantity <= min_stock_level
            ORDER BY quantity ASC
        `);

        other.forEach(item => {
            lowStockItems.push({
                ...item,
                module_type: 'other',
                module_name: 'Vật tư phụ',
                warehouse_id: 1,
                warehouse_name: 'Kho Vật tư phụ',
                aluminum_system: null
            });
        });

        return lowStockItems;
    } catch (err) {
        console.error('Error in getLowStockItems:', err);
        throw err;
    }
};


/**
 * Lấy danh sách tất cả vật tư từ 4 module (để hiển thị trong dashboard)
 * @returns {Array} Danh sách tất cả vật tư
 */
exports.getAllItems = async () => {
    try {
        const allItems = [];

        // 1. Phụ kiện
        const [accessories] = await db.query(`
            SELECT 
                id,
                code as item_code,
                name as item_name,
                'accessory' as module_type,
                'Phụ kiện' as module_name,
                category as item_type,
                stock_quantity as quantity,
                min_stock_level,
                unit,
                COALESCE(sale_price, purchase_price, 0) as unit_price,
                (stock_quantity * COALESCE(sale_price, purchase_price, 0)) as total_value,
                CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END as is_low_stock
            FROM accessories
            WHERE is_active = 1
            ORDER BY code ASC
        `);

        accessories.forEach(item => {
            allItems.push({
                ...item,
                module_type: 'accessory',
                module_name: 'Phụ kiện'
            });
        });

        // 2. Hệ nhôm
        let aluminum = [];
        try {
            const [aluminumRows] = await db.query(`
                SELECT 
                    id,
                    code as item_code,
                    name as item_name,
                    'aluminum' as module_type,
                    'Hệ nhôm' as module_name,
                    'Hệ nhôm' as item_type,
                    COALESCE(quantity_m, 0) as quantity,
                    10 as min_stock_level,
                    'm' as unit,
                    COALESCE(unit_price, 0) as unit_price,
                    (COALESCE(quantity_m, 0) * COALESCE(unit_price, 0)) as total_value,
                    CASE WHEN COALESCE(quantity_m, 0) < 10 THEN 1 ELSE 0 END as is_low_stock
                FROM aluminum_systems
                WHERE is_active = 1
                ORDER BY code ASC
            `);
            aluminum = aluminumRows || [];
        } catch (err) {
            // Nếu cột quantity_m chưa tồn tại, dùng length_m
            console.warn('Column quantity_m may not exist, using length_m:', err.message);
            try {
                const [aluminumRows] = await db.query(`
                    SELECT 
                        id,
                        code as item_code,
                        name as item_name,
                        'aluminum' as module_type,
                        'Hệ nhôm' as module_name,
                        'Hệ nhôm' as item_type,
                        COALESCE(length_m, 0) as quantity,
                        10 as min_stock_level,
                        'm' as unit,
                        COALESCE(unit_price, 0) as unit_price,
                        (COALESCE(length_m, 0) * COALESCE(unit_price, 0)) as total_value,
                        CASE WHEN COALESCE(length_m, 0) < 10 THEN 1 ELSE 0 END as is_low_stock
                    FROM aluminum_systems
                    WHERE is_active = 1
                    ORDER BY code ASC
                `);
                aluminum = aluminumRows || [];
            } catch (err2) {
                aluminum = [];
            }
        }

        aluminum.forEach(item => {
            allItems.push({
                ...item,
                module_type: 'aluminum',
                module_name: 'Hệ nhôm'
            });
        });

        // 3. Kính
        let glass = [];
        try {
            const [glassRows] = await db.query(`
                SELECT 
                    id,
                    item_code,
                    item_name,
                    'glass' as module_type,
                    'Kính' as module_name,
                    item_type,
                    quantity,
                    min_stock_level,
                    unit,
                    COALESCE(unit_price, 0) as unit_price,
                    (quantity * COALESCE(unit_price, 0)) as total_value,
                    CASE WHEN quantity <= min_stock_level THEN 1 ELSE 0 END as is_low_stock
                FROM inventory
                WHERE item_type = 'glass'
                ORDER BY item_code ASC
            `);
            glass = glassRows || [];
        } catch (err) {
            // Bảng không tồn tại hoặc lỗi, bỏ qua
            glass = [];
        }

        glass.forEach(item => {
            allItems.push({
                ...item,
                module_type: 'glass',
                module_name: 'Kính'
            });
        });

        // 4. Khác
        const [other] = await db.query(`
            SELECT 
                id,
                item_code,
                item_name,
                'other' as module_type,
                'Khác' as module_name,
                item_type,
                quantity,
                min_stock_level,
                unit,
                COALESCE(unit_price, 0) as unit_price,
                (quantity * COALESCE(unit_price, 0)) as total_value,
                CASE WHEN quantity <= min_stock_level THEN 1 ELSE 0 END as is_low_stock
            FROM inventory
            WHERE item_type NOT IN ('glass', 'aluminum')
            AND (item_type = 'other' OR item_type IS NULL)
            ORDER BY item_code ASC
        `);

        other.forEach(item => {
            allItems.push({
                ...item,
                module_type: 'other',
                module_name: 'Khác'
            });
        });

        return allItems;
    } catch (err) {
        console.error('Error in getAllItems:', err);
        throw err;
    }
};

/**
 * Lấy tóm tắt cảnh báo cho Dashboard (Kết hợp từ tất cả các module)
 * @returns {Object} { outOfStockCount, lowStockCount, overdueProjects, pendingQuotations }
 */
exports.getDashboardAlertsSummary = async () => {
    try {
        // 1. Tính số lượng hết hàng (Out of Stock) từ tất cả kho
        const queries = [
            // Accessories
            db.query("SELECT COUNT(*) as count FROM accessories WHERE is_active = 1 AND stock_quantity <= 0"),
            // Aluminum
            db.query("SELECT COUNT(*) as count FROM aluminum_systems WHERE is_active = 1 AND (quantity_m <= 0 OR quantity_m IS NULL)"),
            // Glass
            db.query("SELECT COUNT(*) as count FROM inventory WHERE item_type = 'glass' AND quantity <= 0"),
            // Other
            db.query("SELECT COUNT(*) as count FROM inventory WHERE (item_type NOT IN ('glass', 'aluminum') OR item_type IS NULL) AND quantity <= 0")
        ];

        const results = await Promise.all(queries);
        const outOfStockCount = results.reduce((sum, res) => sum + (parseInt(res[0][0].count) || 0), 0);

        // 2. Tính số lượng sắp hết hàng (Low Stock)
        const lowStockQueries = [
            db.query("SELECT COUNT(*) as count FROM accessories WHERE is_active = 1 AND stock_quantity > 0 AND stock_quantity <= min_stock_level"),
            db.query("SELECT COUNT(*) as count FROM aluminum_systems WHERE is_active = 1 AND quantity_m > 0 AND quantity_m < 10"),
            db.query("SELECT COUNT(*) as count FROM inventory WHERE item_type = 'glass' AND quantity > 0 AND quantity <= min_stock_level"),
            db.query("SELECT COUNT(*) as count FROM inventory WHERE (item_type NOT IN ('glass', 'aluminum') OR item_type IS NULL) AND quantity > 0 AND quantity <= min_stock_level")
        ];

        const lowStockResults = await Promise.all(lowStockQueries);
        const lowStockCount = lowStockResults.reduce((sum, res) => sum + (parseInt(res[0][0].count) || 0), 0);

        // 3. Dự án quá hạn
        const [overdueProjects] = await db.query(
            "SELECT COUNT(*) as count FROM projects WHERE status NOT IN ('completed', 'cancelled', 'closed') AND deadline < NOW()"
        );

        // 4. Báo giá chờ duyệt / Sắp hết hạn
        const [quotationStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN status IN ('pending', 'draft') THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status IN ('pending', 'draft') AND DATE_ADD(quotation_date, INTERVAL COALESCE(validity_days, 30) DAY) < DATE_ADD(NOW(), INTERVAL 7 DAY) AND DATE_ADD(quotation_date, INTERVAL COALESCE(validity_days, 30) DAY) >= NOW() THEN 1 ELSE 0 END) as expiring_soon,
                SUM(CASE WHEN status IN ('pending', 'draft') AND DATE_ADD(quotation_date, INTERVAL COALESCE(validity_days, 30) DAY) < NOW() THEN 1 ELSE 0 END) as expired_count
            FROM quotations
        `);

        return {
            outOfStockCount,
            lowStockCount,
            overdueProjectsCount: overdueProjects[0].count || 0,
            pendingQuotationsCount: quotationStats[0].pending_count || 0,
            expiringQuotationsCount: quotationStats[0].expiring_soon || 0,
            expiredQuotationsCount: quotationStats[0].expired_count || 0
        };
    } catch (err) {
        console.error('Error in getDashboardAlertsSummary:', err);
        throw err;
    }
};
