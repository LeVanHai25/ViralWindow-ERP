const db = require("../config/db");

/**
 * Kiểm tra tồn kho cho các item trong BOM (helper function)
 */
async function checkBOMStockAvailability(bomItems) {
    const warnings = [];
    let hasInsufficientStock = false;

    for (const item of bomItems) {
        const requiredQty = parseFloat(item.quantity) || 0;
        if (requiredQty <= 0) continue;

        let availableQty = 0;
        let stockItem = null;
        let itemCode = item.item_code || '';
        let itemName = item.item_name || '';

        // Kiểm tra trong bảng inventory (nhôm, kính, vật tư chung)
        if (item.item_type === 'frame' || item.item_type === 'glass' || item.item_type === 'material' || item.item_type === 'mullion') {
            const [inventoryRows] = await db.query(`
                SELECT id, item_code, item_name, quantity, min_stock_level, unit
                FROM inventory 
                WHERE (item_code = ? OR item_name LIKE ?) 
                AND item_type IN ('aluminum', 'glass', 'material', 'steel')
                LIMIT 1
            `, [itemCode, `%${itemName}%`]);

            if (inventoryRows.length > 0) {
                stockItem = inventoryRows[0];
                availableQty = parseFloat(stockItem.quantity) || 0;
            }
        }
        
        // Kiểm tra trong bảng accessories (phụ kiện)
        if (item.item_type === 'accessory' && itemCode) {
            const [accessoryRows] = await db.query(`
                SELECT id, code, name, stock_quantity, min_stock_level, unit
                FROM accessories 
                WHERE code = ? OR name LIKE ?
                LIMIT 1
            `, [itemCode, `%${itemName}%`]);

            if (accessoryRows.length > 0) {
                stockItem = {
                    id: accessoryRows[0].id,
                    item_code: accessoryRows[0].code,
                    item_name: accessoryRows[0].name,
                    quantity: accessoryRows[0].stock_quantity,
                    min_stock_level: accessoryRows[0].min_stock_level,
                    unit: accessoryRows[0].unit
                };
                availableQty = parseFloat(accessoryRows[0].stock_quantity) || 0;
            }
        }

        // Kiểm tra nếu không tìm thấy hoặc không đủ
        if (!stockItem) {
            warnings.push({
                item_code: itemCode,
                item_name: itemName,
                item_type: item.item_type,
                required_quantity: requiredQty,
                available_quantity: 0,
                unit: item.unit || 'N/A',
                status: 'not_found',
                message: `Không tìm thấy "${itemName}" trong kho`
            });
            hasInsufficientStock = true;
        } else if (availableQty < requiredQty) {
            const shortage = requiredQty - availableQty;
            warnings.push({
                item_code: stockItem.item_code,
                item_name: stockItem.item_name || itemName,
                item_type: item.item_type,
                required_quantity: requiredQty,
                available_quantity: availableQty,
                shortage: shortage,
                unit: item.unit || stockItem.unit || 'N/A',
                status: 'insufficient',
                message: `Không đủ tồn kho: Cần ${requiredQty} ${item.unit || ''}, Có ${availableQty} ${item.unit || ''}, Thiếu ${shortage} ${item.unit || ''}`
            });
            hasInsufficientStock = true;
        } else if (availableQty < (stockItem.min_stock_level || 0) + requiredQty) {
            // Cảnh báo nếu sau khi trừ sẽ dưới mức tối thiểu
            warnings.push({
                item_code: stockItem.item_code,
                item_name: stockItem.item_name || itemName,
                item_type: item.item_type,
                required_quantity: requiredQty,
                available_quantity: availableQty,
                unit: item.unit || stockItem.unit || 'N/A',
                status: 'low_stock_warning',
                message: `Cảnh báo: Sau khi sử dụng sẽ còn ${(availableQty - requiredQty).toFixed(2)} ${item.unit || ''}, dưới mức tối thiểu ${stockItem.min_stock_level || 0} ${item.unit || ''}`
            });
        }
    }

    return {
        warnings,
        hasInsufficientStock,
        total_warnings: warnings.length
    };
}

/**
 * Tự động tính giá báo giá từ BOM
 * Tính giá dựa trên:
 * - Diện tích kính (m²) × Giá kính/m²
 * - Số kg nhôm × Giá nhôm/kg
 * - Phụ kiện (từ BOM)
 * - Công lắp đặt (có thể tính theo m² hoặc cố định)
 */
exports.calculateQuotationFromBOM = async (req, res) => {
    try {
        const { projectId, doorIds, glassPricePerM2, aluminumPricePerKg, installationCostPerM2, installationCostFixed } = req.body;

        if (!doorIds || !Array.isArray(doorIds) || doorIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn ít nhất một cửa"
            });
        }

        // Lấy BOM cho tất cả các cửa
        const quotationItems = [];
        let totalGlassArea = 0;
        let totalAluminumWeight = 0;
        let totalAccessories = 0;

        for (const doorId of doorIds) {
            // Lấy BOM của cửa
            const [bomRows] = await db.query(`
                SELECT 
                    bi.*,
                    dd.design_code,
                    dd.width_mm,
                    dd.height_mm,
                    a.code AS aluminum_code,
                    a.name AS aluminum_name
                FROM bom_items bi
                INNER JOIN door_designs dd ON bi.design_id = dd.id
                LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id
                WHERE bi.design_id = ?
            `, [doorId]);

            // Tính giá cho từng loại vật tư
            for (const item of bomRows) {
                let unitPrice = 0;
                let totalPrice = 0;

                if (item.item_type === 'glass') {
                    // Kính: tính theo m²
                    const areaM2 = item.area_m2 || ((item.width_mm || 0) * (item.height_mm || 0)) / 1000000;
                    unitPrice = glassPricePerM2 || 0;
                    totalPrice = areaM2 * unitPrice * (item.quantity || 1);
                    totalGlassArea += areaM2 * (item.quantity || 1);

                    quotationItems.push({
                        item_name: `${item.item_name} - ${item.design_code}`,
                        quantity: item.quantity || 1,
                        unit: 'm²',
                        unit_price: unitPrice,
                        total_price: totalPrice,
                        item_type: 'material',
                        bom_item_id: item.id,
                        door_id: doorId,
                        door_code: item.design_code
                    });
                } else if (item.item_type === 'frame' || item.item_type === 'mullion') {
                    // Nhôm: tính theo kg
                    const weightKg = item.weight_kg || 0;
                    unitPrice = aluminumPricePerKg || 0;
                    totalPrice = weightKg * unitPrice;
                    totalAluminumWeight += weightKg;

                    quotationItems.push({
                        item_name: `${item.item_name} - ${item.design_code}`,
                        quantity: weightKg,
                        unit: 'kg',
                        unit_price: unitPrice,
                        total_price: totalPrice,
                        item_type: 'material',
                        bom_item_id: item.id,
                        door_id: doorId,
                        door_code: item.design_code
                    });
                } else if (item.item_type === 'accessory') {
                    // Phụ kiện: tính theo số lượng
                    const [accRows] = await db.query(
                        "SELECT sale_price FROM accessories WHERE id = ?",
                        [item.accessory_id]
                    );
                    unitPrice = (accRows[0]?.sale_price) || item.purchase_price || 0;
                    totalPrice = unitPrice * (item.quantity || 1);
                    totalAccessories += item.quantity || 1;

                    quotationItems.push({
                        item_name: `${item.item_name} - ${item.design_code}`,
                        quantity: item.quantity || 1,
                        unit: item.unit || 'pcs',
                        unit_price: unitPrice,
                        total_price: totalPrice,
                        item_type: 'material',
                        bom_item_id: item.id,
                        door_id: doorId,
                        door_code: item.design_code
                    });
                }
            }
        }

        // Tính công lắp đặt
        let installationCost = 0;
        if (installationCostPerM2) {
            // Tính theo m² kính
            installationCost = totalGlassArea * installationCostPerM2;
        } else if (installationCostFixed) {
            // Cố định
            installationCost = installationCostFixed * doorIds.length;
        }

        if (installationCost > 0) {
            quotationItems.push({
                item_name: 'Công lắp đặt',
                quantity: installationCostPerM2 ? totalGlassArea : doorIds.length,
                unit: installationCostPerM2 ? 'm²' : 'cửa',
                unit_price: installationCostPerM2 || installationCostFixed,
                total_price: installationCost,
                item_type: 'labor'
            });
        }

        // Tính tổng
        const subtotal = quotationItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

        // Kiểm tra tồn kho cho tất cả BOM items
        const allBOMItems = [];
        for (const doorId of doorIds) {
            const [bomRows] = await db.query(`
                SELECT bi.*, dd.design_code
                FROM bom_items bi
                INNER JOIN door_designs dd ON bi.design_id = dd.id
                WHERE bi.design_id = ?
            `, [doorId]);
            allBOMItems.push(...bomRows);
        }
        
        const stockWarnings = await checkBOMStockAvailability(allBOMItems);

        res.json({
            success: true,
            data: {
                items: quotationItems,
                summary: {
                    total_glass_area_m2: totalGlassArea,
                    total_aluminum_weight_kg: totalAluminumWeight,
                    total_accessories: totalAccessories,
                    installation_cost: installationCost,
                    subtotal: subtotal
                },
                stock_warnings: stockWarnings.warnings,
                stock_status: stockWarnings.hasInsufficientStock ? 'insufficient' : 'sufficient'
            }
        });
    } catch (err) {
        console.error('Error calculating quotation from BOM:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tính giá từ BOM: " + err.message
        });
    }
};

/**
 * Lấy danh sách cửa từ dự án để chọn cho báo giá
 */
exports.getDoorsForQuotation = async (req, res) => {
    try {
        const { projectId } = req.params;

        const [doors] = await db.query(`
            SELECT 
                dd.id,
                dd.design_code,
                dd.door_type,
                dd.width_mm,
                dd.height_mm,
                a.code AS aluminum_code,
                a.name AS aluminum_name,
                (SELECT COUNT(*) FROM bom_items WHERE design_id = dd.id) as bom_items_count
            FROM door_designs dd
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.project_id = ?
            ORDER BY dd.created_at DESC
        `, [projectId]);

        res.json({
            success: true,
            data: doors
        });
    } catch (err) {
        console.error('Error getting doors for quotation:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách cửa: " + err.message
        });
    }
};








