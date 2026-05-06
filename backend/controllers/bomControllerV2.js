const db = require("../config/db");

/**
 * Kiểm tra tồn kho cho các item trong BOM
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
 * Tính toán BOM với cutting formulas mới và accessory usage rules
 */
exports.calculateBOM = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;

        // First try: Get door design from door_designs table
        let [doorRows] = await db.query(`
            SELECT 
                dd.*,
                dt.structure_json,
                a.id AS aluminum_system_id,
                a.code AS aluminum_code,
                a.name AS aluminum_name,
                a.brand,
                a.weight_per_meter,
                a.door_type AS system_door_type,
                drw.drawing_data,
                drw.width_mm AS drawing_width_mm,
                drw.height_mm AS drawing_height_mm,
                COALESCE(pi.quantity, 1) AS project_item_quantity
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            LEFT JOIN door_drawings drw ON dd.door_drawing_id = drw.id OR drw.door_design_id = dd.id
            LEFT JOIN project_items pi ON dd.project_item_id = pi.id AND pi.project_id = dd.project_id
            WHERE dd.id = ? AND dd.project_id = ?
            ORDER BY drw.created_at DESC
            LIMIT 1
        `, [doorId, projectId]);

        // Fallback: If not found in door_designs, try project_items table
        if (doorRows.length === 0) {
            const [projectItemRows] = await db.query(`
                SELECT 
                    pi.id,
                    pi.project_id,
                    pi.quantity,
                    pi.status,
                    pi.aluminum_system,
                    pi.custom_width_mm as width_mm,
                    pi.custom_height_mm as height_mm,
                    pi.custom_glass_type as glass_type,
                    pi.snapshot_config,
                    pt.code as design_code,
                    pt.name as door_name,
                    pt.product_type as door_type,
                    pt.structure_json,
                    pt.template_json,
                    pt.default_width_mm,
                    pt.default_height_mm,
                    a.id AS aluminum_system_id,
                    a.code AS aluminum_code,
                    a.name AS aluminum_name,
                    a.brand,
                    a.weight_per_meter,
                    a.door_type AS system_door_type
                FROM project_items pi
                LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
                LEFT JOIN aluminum_systems a ON a.code = pi.aluminum_system OR a.id = pi.aluminum_system
                WHERE pi.id = ? AND pi.project_id = ?
                LIMIT 1
            `, [doorId, projectId]);

            if (projectItemRows.length > 0) {
                // Convert project_items format to door_designs format for compatibility
                const pi = projectItemRows[0];
                let snapshotConfig = null;
                if (pi.snapshot_config) {
                    try {
                        snapshotConfig = typeof pi.snapshot_config === 'string'
                            ? JSON.parse(pi.snapshot_config)
                            : pi.snapshot_config;
                    } catch (e) { }
                }

                doorRows = [{
                    id: pi.id,
                    project_id: pi.project_id,
                    design_code: pi.design_code,
                    door_type: pi.door_type || 'swing_single',
                    width_mm: pi.width_mm || snapshotConfig?.width_mm || snapshotConfig?.size?.w || pi.default_width_mm || 1200,
                    height_mm: pi.height_mm || snapshotConfig?.height_mm || snapshotConfig?.size?.h || pi.default_height_mm || 2200,
                    aluminum_system_id: pi.aluminum_system_id,
                    aluminum_code: pi.aluminum_code,
                    aluminum_name: pi.aluminum_name,
                    brand: pi.brand,
                    weight_per_meter: pi.weight_per_meter,
                    system_door_type: pi.system_door_type,
                    structure_json: pi.structure_json,
                    drawing_data: pi.template_json,
                    project_item_quantity: pi.quantity || 1
                }];
            }
        }

        if (doorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = doorRows[0];

        // Get project item quantity (how many doors of this type)
        const projectItemQuantity = parseFloat(door.project_item_quantity) || 1;

        // Extract dimensions from drawing_data
        let width = door.width_mm || 0;
        let height = door.height_mm || 0;
        let panels = [];
        let doorType = door.door_type || 'swing_single';

        if (door.drawing_data) {
            try {
                const drawingData = typeof door.drawing_data === 'string'
                    ? JSON.parse(door.drawing_data)
                    : door.drawing_data;

                if (drawingData.doorWidth) width = drawingData.doorWidth;
                if (drawingData.doorHeight) height = drawingData.doorHeight;
                if (drawingData.panels) panels = drawingData.panels;
                if (drawingData.doorType) doorType = drawingData.doorType;
            } catch (e) {
                console.error('Error parsing drawing_data:', e);
            }
        }

        if (width === 0 && door.drawing_width_mm) width = door.drawing_width_mm;
        if (height === 0 && door.drawing_height_mm) height = door.drawing_height_mm;

        if (width === 0 || height === 0) {
            return res.status(400).json({
                success: false,
                message: "Thiếu kích thước cửa"
            });
        }

        // Normalize door type
        doorType = normalizeDoorType(doorType, door.system_door_type);

        const bomItems = [];

        // ============================================
        // 1. NHÔM (ALUMINUM) - Sử dụng cutting formulas
        // ============================================
        if (door.aluminum_system_id) {
            const aluminumItems = await calculateAluminumBOM(
                door.aluminum_system_id,
                doorType,
                width,
                height,
                panels
            );
            bomItems.push(...aluminumItems);
        }

        // ============================================
        // 2. KÍNH (GLASS)
        // ============================================
        const glassItems = calculateGlassBOM(width, height, panels, doorType);
        bomItems.push(...glassItems);

        // ============================================
        // 3. PHỤ KIỆN (ACCESSORIES) - Sử dụng usage rules
        // ============================================
        const accessoryItems = await calculateAccessoryBOM(doorType, panels.length || 1);
        bomItems.push(...accessoryItems);

        // ============================================
        // 4. VẬT TƯ KHÁC (Gioăng, keo, vít)
        // ============================================
        const otherItems = calculateOtherMaterialsBOM(width, height, panels.length || 1);
        bomItems.push(...otherItems);

        // ============================================
        // 5. NHÂN TẤT CẢ SỐ LƯỢNG VỚI SỐ LƯỢNG PROJECT ITEM
        // ============================================
        // Multiply all quantities by project item quantity
        bomItems.forEach(item => {
            if (item.quantity) {
                item.quantity = (item.quantity || 1) * projectItemQuantity;
            }
            // Also multiply weight for aluminum items
            if (item.weight_kg) {
                item.weight_kg = (item.weight_kg || 0) * projectItemQuantity;
            }
            // Also multiply area for glass items
            if (item.area_m2) {
                item.area_m2 = (item.area_m2 || 0) * projectItemQuantity;
            }
            // Also multiply length for consumables
            if (item.length_mm && item.item_type === 'other') {
                item.length_mm = (item.length_mm || 0) * projectItemQuantity;
            }
        });

        // Calculate summary
        const summaryAluminumItems = bomItems.filter(item => item.item_type === 'frame' || item.item_type === 'mullion');
        const summaryGlassItems = bomItems.filter(item => item.item_type === 'glass');
        const summaryAccessoryItems = bomItems.filter(item => item.item_type === 'accessory');
        const summaryOtherItems = bomItems.filter(item => item.item_type === 'other');

        const summary = {
            aluminum_items: summaryAluminumItems.length,
            total_aluminum_length_m: summaryAluminumItems.reduce((sum, item) => sum + ((item.length_mm || 0) * (item.quantity || 1)) / 1000, 0),
            total_aluminum_weight_kg: summaryAluminumItems.reduce((sum, item) => sum + (item.weight_kg || 0), 0),
            glass_items: summaryGlassItems.length,
            total_glass_area_m2: summaryGlassItems.reduce((sum, item) => sum + (item.area_m2 || 0), 0),
            accessory_items: summaryAccessoryItems.length,
            total_accessories: summaryAccessoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
            other_items: summaryOtherItems.length
        };

        res.json({
            success: true,
            data: {
                door_id: doorId,
                door_code: door.design_code,
                width_mm: width,
                height_mm: height,
                door_type: doorType,
                project_item_quantity: projectItemQuantity,
                items: bomItems,
                summary: summary
            }
        });
    } catch (err) {
        console.error('Error calculating BOM:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tính BOM: " + err.message
        });
    }
};

/**
 * Tính toán nhôm sử dụng cutting formulas
 */
async function calculateAluminumBOM(systemId, doorType, width, height, panels) {
    const items = [];

    // Get cutting formulas for this system and door type
    const [formulas] = await db.query(`
        SELECT * FROM cutting_formulas
        WHERE system_id = ? AND door_type = ? AND is_active = 1
    `, [systemId, doorType]);

    // Get system info
    const [systems] = await db.query(
        "SELECT * FROM aluminum_systems WHERE id = ?",
        [systemId]
    );
    const system = systems[0] || {};

    // Get profiles
    const [profiles] = await db.query(`
        SELECT * FROM aluminum_profiles
        WHERE system_id = ? AND is_active = 1
    `, [systemId]);

    // Calculate for each formula
    for (const formula of formulas) {
        let calculated = null;

        // Calculate based on dimension type
        if (formula.dimension_type === 'width') {
            calculated = calculateFormula(formula.formula_expression, width, height);
        } else if (formula.dimension_type === 'height') {
            calculated = calculateFormula(formula.formula_expression, width, height);
        } else {
            // 'both' - calculate both dimensions if needed
            calculated = calculateFormula(formula.formula_expression, width, height);
        }

        // Find matching profile
        const profile = profiles.find(p => p.profile_type === formula.profile_type);

        if (calculated !== null && calculated > 0) {
            const length_mm = Math.round(calculated);
            const quantity = getProfileQuantity(formula.profile_type, doorType, panels.length || 1);
            const weight_kg = profile && profile.weight_per_meter
                ? (length_mm / 1000) * profile.weight_per_meter * quantity
                : (length_mm / 1000) * (system.weight_per_meter || 1.2) * quantity;

            items.push({
                item_type: 'frame',
                item_code: profile ? profile.profile_code : `${system.code}-${formula.profile_type}`,
                item_name: profile ? profile.profile_name : getProfileName(formula.profile_type),
                profile_type: formula.profile_type,
                length_mm: length_mm,
                quantity: quantity,
                unit: 'mm',
                weight_kg: parseFloat(weight_kg.toFixed(3)),
                aluminum_system_id: systemId,
                position: getProfilePosition(formula.profile_type),
                symbol: getProfileSymbol(formula.profile_type),
                formula_used: formula.formula_expression, // Show which formula was used
                profile_code: profile ? profile.profile_code : null
            });
        }
    }

    // If we have panels, calculate panel-specific profiles
    if (panels.length > 0) {
        panels.forEach((panel, panelIndex) => {
            const panelWidth = panel.width || (width / panels.length);
            const panelHeight = panel.height || height;

            // Get formulas for panel profiles
            const panelFormulas = formulas.filter(f =>
                f.profile_type === 'panel_left' ||
                f.profile_type === 'panel_right' ||
                f.profile_type === 'glass_bead'
            );

            for (const formula of panelFormulas) {
                const calculated = calculateFormula(formula.formula_expression, panelWidth, panelHeight);
                const profile = profiles.find(p => p.profile_type === formula.profile_type);

                if (calculated !== null && calculated > 0) {
                    const length_mm = Math.round(calculated);
                    const quantity = getPanelProfileQuantity(formula.profile_type, panelIndex);
                    const weight_kg = profile && profile.weight_per_meter
                        ? (length_mm / 1000) * profile.weight_per_meter * quantity
                        : (length_mm / 1000) * (system.weight_per_meter || 1.2) * quantity;

                    items.push({
                        item_type: 'frame',
                        item_code: profile ? `${profile.profile_code}-P${panelIndex + 1}` : `${system.code}-${formula.profile_type}-P${panelIndex + 1}`,
                        item_name: `${profile ? profile.profile_name : getProfileName(formula.profile_type)} - Cánh ${panelIndex + 1}`,
                        profile_type: formula.profile_type,
                        length_mm: length_mm,
                        quantity: quantity,
                        unit: 'mm',
                        weight_kg: parseFloat(weight_kg.toFixed(3)),
                        aluminum_system_id: systemId,
                        position: `Cánh ${panelIndex + 1}`,
                        symbol: `${getProfileSymbol(formula.profile_type)}${panelIndex + 1}`,
                        formula_used: formula.formula_expression,
                        profile_code: profile ? profile.profile_code : null
                    });
                }
            }
        });
    }

    // If no formulas found, use default calculation
    if (items.length === 0) {
        items.push(...calculateDefaultAluminum(system, width, height, doorType));
    }

    return items;
}

/**
 * Tính toán kính
 */
function calculateGlassBOM(width, height, panels, doorType) {
    const items = [];

    if (panels.length > 0) {
        // Calculate glass for each panel
        panels.forEach((panel, index) => {
            const panelWidth = panel.width || (width / panels.length);
            const panelHeight = panel.height || height;

            // Glass deduction (typically 40mm total: 20mm each side)
            const glassWidth = Math.max(0, panelWidth - 40);
            const glassHeight = Math.max(0, panelHeight - 40);
            const area_m2 = (glassWidth * glassHeight) / 1000000;

            items.push({
                item_type: 'glass',
                item_code: `GLASS-${index + 1}`,
                item_name: `Kính - Cánh ${index + 1}`,
                width_mm: Math.round(glassWidth),
                height_mm: Math.round(glassHeight),
                area_m2: parseFloat(area_m2.toFixed(3)),
                quantity: 1,
                unit: 'm2',
                position: `Cánh ${index + 1}`
            });
        });
    } else {
        // Single panel
        const glassWidth = Math.max(0, width - 40);
        const glassHeight = Math.max(0, height - 40);
        const area_m2 = (glassWidth * glassHeight) / 1000000;

        items.push({
            item_type: 'glass',
            item_code: 'GLASS-1',
            item_name: 'Kính',
            width_mm: Math.round(glassWidth),
            height_mm: Math.round(glassHeight),
            area_m2: parseFloat(area_m2.toFixed(3)),
            quantity: 1,
            unit: 'm2'
        });
    }

    return items;
}

/**
 * Tính toán phụ kiện sử dụng usage rules
 */
async function calculateAccessoryBOM(doorType, panelCount) {
    const items = [];

    // Get recommended accessories for this door type
    const [rules] = await db.query(`
        SELECT 
            a.*,
            aur.quantity,
            aur.position,
            aur.description as usage_description,
            aur.is_required
        FROM accessories a
        INNER JOIN accessory_usage_rules aur ON a.id = aur.accessory_id
        WHERE aur.door_type = ? AND a.is_active = 1
    `, [doorType]);

    // Group by accessory and sum quantities
    const accessoryMap = {};
    rules.forEach(rule => {
        const key = rule.id;
        if (!accessoryMap[key]) {
            accessoryMap[key] = {
                item_type: 'accessory',
                item_code: rule.code,
                item_name: rule.name,
                category: rule.category,
                quantity: 0,
                unit: rule.unit,
                purchase_price: rule.purchase_price || 0,
                position: rule.position || '',
                is_required: rule.is_required
            };
        }
        // Multiply by panel count for multi-panel doors
        accessoryMap[key].quantity += (rule.quantity || 1) * panelCount;
    });

    // Convert to array
    Object.values(accessoryMap).forEach(item => {
        items.push(item);
    });

    return items;
}

/**
 * Tính toán vật tư khác (gioăng, keo, vít)
 */
function calculateOtherMaterialsBOM(width, height, panelCount) {
    const perimeter = (width + height) * 2; // mm
    const items = [];

    // Gioăng (gasket) - tính theo chu vi
    items.push({
        item_type: 'other',
        item_code: 'GASKET',
        item_name: 'Gioăng kính',
        length_mm: Math.round(perimeter * panelCount),
        quantity: 1,
        unit: 'mm'
    });

    // Keo (sealant) - tính theo chu vi
    items.push({
        item_type: 'other',
        item_code: 'SEALANT',
        item_name: 'Keo silicon',
        length_mm: Math.round(perimeter * panelCount),
        quantity: 1,
        unit: 'mm'
    });

    // Vít (screws) - ước tính 4 vít/cánh
    items.push({
        item_type: 'other',
        item_code: 'SCREWS',
        item_name: 'Vít bắt khung',
        quantity: 4 * panelCount,
        unit: 'cái'
    });

    return items;
}

/**
 * Tính toán công thức - Sử dụng mathjs để an toàn hơn
 */
function calculateFormula(expression, width, height) {
    try {
        // Replace W and H with actual values
        let expr = expression
            .replace(/W/g, width)
            .replace(/H/g, height);

        // Remove any whitespace
        expr = expr.replace(/\s+/g, '');

        // Simple safe evaluation
        // Support basic operations: +, -, *, /, (, )
        // Validate expression contains only numbers, operators, and parentheses
        if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
            console.error('Invalid formula expression:', expression);
            return null;
        }

        // Use Function constructor for safer evaluation (still not perfect, but better than eval)
        // In production, consider using mathjs library
        try {
            return Function(`"use strict"; return (${expr})`)();
        } catch (e) {
            // Fallback to eval if Function constructor fails
            console.warn('Function constructor failed, using eval fallback:', e);
            return eval(expr);
        }
    } catch (e) {
        console.error('Error calculating formula:', expression, e);
        return null;
    }
}

/**
 * Lấy số lượng profile theo loại
 */
function getProfileQuantity(profileType, doorType, panelCount) {
    const quantityMap = {
        'frame_vertical': 2, // 2 thanh đứng (trái, phải)
        'frame_horizontal': 2, // 2 thanh ngang (trên, dưới)
        'panel_left': doorType.includes('single') ? 1 : (doorType.includes('double') ? 1 : 0),
        'panel_right': doorType.includes('single') ? 0 : (doorType.includes('double') ? 1 : 0),
        'panel_fixed': 0,
        'mullion': panelCount > 1 ? panelCount - 1 : 0, // Đố giữa = số cánh - 1
        'glass_bead': panelCount * 4, // 4 cạnh mỗi cánh
        'sliding_rail': doorType.includes('sliding') ? 1 : 0
    };
    return quantityMap[profileType] || 1;
}

/**
 * Lấy số lượng profile cho panel cụ thể
 */
function getPanelProfileQuantity(profileType, panelIndex) {
    if (profileType === 'glass_bead') {
        return 4; // 4 cạnh mỗi cánh
    }
    if (profileType === 'panel_left' || profileType === 'panel_right') {
        return 1; // 1 thanh mỗi cánh
    }
    return 1;
}

/**
 * Helper functions
 */
function normalizeDoorType(doorType, systemDoorType) {
    if (doorType.includes('swing')) {
        if (doorType.includes('double') || doorType.includes('2')) return 'swing_double';
        if (doorType.includes('4')) return 'swing_double'; // Treat 4 as double
        return 'swing_single';
    }
    if (doorType.includes('sliding')) {
        if (doorType.includes('double') || doorType.includes('2')) return 'sliding_double';
        return 'sliding_single';
    }
    return systemDoorType || 'swing_single';
}

function getProfileName(profileType) {
    const names = {
        'frame_vertical': 'Khung đứng',
        'frame_horizontal': 'Khung ngang',
        'panel_left': 'Cánh trái',
        'panel_right': 'Cánh phải',
        'panel_fixed': 'Cánh cố định',
        'mullion': 'Đố giữa',
        'glass_bead': 'Nẹp kính',
        'sliding_rail': 'Ray lùa'
    };
    return names[profileType] || profileType;
}

function getProfilePosition(profileType) {
    const positions = {
        'frame_vertical': 'Đứng',
        'frame_horizontal': 'Ngang',
        'panel_left': 'Trái',
        'panel_right': 'Phải',
        'mullion': 'Giữa',
        'glass_bead': 'Nẹp',
        'sliding_rail': 'Ray'
    };
    return positions[profileType] || '';
}

function getProfileSymbol(profileType) {
    const symbols = {
        'frame_vertical': 'Đ',
        'frame_horizontal': 'N',
        'panel_left': 'CT',
        'panel_right': 'CP',
        'mullion': 'ĐG',
        'glass_bead': 'NK',
        'sliding_rail': 'R'
    };
    return symbols[profileType] || '';
}

/**
 * Tính toán nhôm mặc định (fallback)
 */
function calculateDefaultAluminum(system, width, height, doorType) {
    const items = [];
    const weightPerMeter = system.weight_per_meter || 1.2;
    const deduction = 50; // Default deduction

    // Frame
    items.push({
        item_type: 'frame',
        item_code: `${system.code || 'AL'}-FRAME-TOP`,
        item_name: `${system.name || 'Nhôm'} - Thanh ngang trên`,
        length_mm: width - deduction * 2,
        quantity: 1,
        unit: 'mm',
        weight_kg: ((width - deduction * 2) / 1000) * weightPerMeter,
        aluminum_system_id: system.id,
        position: 'Ngang trên',
        symbol: 'N1'
    });

    items.push({
        item_type: 'frame',
        item_code: `${system.code || 'AL'}-FRAME-BOTTOM`,
        item_name: `${system.name || 'Nhôm'} - Thanh ngang dưới`,
        length_mm: width - deduction * 2,
        quantity: 1,
        unit: 'mm',
        weight_kg: ((width - deduction * 2) / 1000) * weightPerMeter,
        aluminum_system_id: system.id,
        position: 'Ngang dưới',
        symbol: 'N2'
    });

    items.push({
        item_type: 'frame',
        item_code: `${system.code || 'AL'}-FRAME-LEFT`,
        item_name: `${system.name || 'Nhôm'} - Thanh đứng trái`,
        length_mm: height - deduction * 2,
        quantity: 1,
        unit: 'mm',
        weight_kg: ((height - deduction * 2) / 1000) * weightPerMeter,
        aluminum_system_id: system.id,
        position: 'Đứng trái',
        symbol: 'Đ1'
    });

    items.push({
        item_type: 'frame',
        item_code: `${system.code || 'AL'}-FRAME-RIGHT`,
        item_name: `${system.name || 'Nhôm'} - Thanh đứng phải`,
        length_mm: height - deduction * 2,
        quantity: 1,
        unit: 'mm',
        weight_kg: ((height - deduction * 2) / 1000) * weightPerMeter,
        aluminum_system_id: system.id,
        position: 'Đứng phải',
        symbol: 'Đ2'
    });

    return items;
}













