const db = require("../config/db");
const doorCalcCtrl = require("./doorCalculationController");

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
        if (item.item_type === 'frame' || item.item_type === 'glass' || item.item_type === 'material') {
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
 * Tính toán và tạo BOM tự động từ thiết kế cửa
 */
exports.calculateBOM = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;

        // Get door design info (including door_drawings for drawing_data)
        const [doorRows] = await db.query(`
            SELECT 
                dd.*,
                dt.structure_json,
                a.cutting_formula,
                a.weight_per_meter,
                a.brand,
                a.code AS aluminum_code,
                a.name AS aluminum_name,
                f.glass_deduction_width,
                f.glass_deduction_height,
                f.frame_deduction_width,
                f.frame_deduction_height,
                drw.drawing_data,
                drw.width_mm AS drawing_width_mm,
                drw.height_mm AS drawing_height_mm
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            LEFT JOIN deduction_formulas f ON dd.formula_id = f.id
            LEFT JOIN door_drawings drw ON dd.door_drawing_id = drw.id OR drw.door_design_id = dd.id
            WHERE dd.id = ? AND dd.project_id = ?
            ORDER BY drw.created_at DESC
            LIMIT 1
        `, [doorId, projectId]);

        if (doorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = doorRows[0];

        // Try to get dimensions from drawing_data first (from door-canvas-engine-v2)
        let drawingData = null;
        let width = door.width_mm || 0;
        let height = door.height_mm || 0;
        let panels = [];

        if (door.drawing_data) {
            try {
                drawingData = typeof door.drawing_data === 'string'
                    ? JSON.parse(door.drawing_data)
                    : door.drawing_data;

                // Extract data from door-canvas-engine-v2 JSON format
                if (drawingData.doorWidth) {
                    width = drawingData.doorWidth;
                }
                if (drawingData.doorHeight) {
                    height = drawingData.doorHeight;
                }
                if (drawingData.panels && Array.isArray(drawingData.panels)) {
                    panels = drawingData.panels;
                }
            } catch (e) {
                console.error('Error parsing drawing_data:', e);
            }
        }

        // Fallback to door_drawings dimensions
        if (width === 0 && door.drawing_width_mm) {
            width = door.drawing_width_mm;
        }
        if (height === 0 && door.drawing_height_mm) {
            height = door.drawing_height_mm;
        }

        // Calculate number of panels from drawing_data or use door.number_of_panels
        const number_of_panels = panels.length > 0 ? panels.length : (door.number_of_panels || 1);

        // Parse structure
        let structure = null;
        if (door.structure_json) {
            structure = typeof door.structure_json === 'string'
                ? JSON.parse(door.structure_json)
                : door.structure_json;
        }

        // If we have panels from drawing_data, use them to calculate BOM more accurately
        const usePanelData = panels.length > 0;

        // Get deduction values
        const glassDeductionW = door.glass_deduction_width || 40;
        const glassDeductionH = door.glass_deduction_height || 40;
        const frameDeductionW = door.frame_deduction_width || 50;
        const frameDeductionH = door.frame_deduction_height || 50;

        // Parse cutting formula
        const cuttingFormula = door.cutting_formula || "W - 50, H - 30";
        const wMatch = cuttingFormula.match(/W\s*-\s*(\d+)/i);
        const hMatch = cuttingFormula.match(/H\s*-\s*(\d+)/i);
        const deductionW = wMatch ? parseInt(wMatch[1]) : frameDeductionW;
        const deductionH = hMatch ? parseInt(hMatch[1]) : frameDeductionH;

        const bomItems = [];

        // ============================================
        // 1. NHÔM (ALUMINUM)
        // ============================================
        const weightPerMeter = door.weight_per_meter || 1.2;

        // Frame bars
        const frameTopLength = width - deductionW * 2;
        const frameBottomLength = width - deductionW * 2;
        const frameLeftLength = height - deductionH * 2;
        const frameRightLength = height - deductionH * 2;

        bomItems.push({
            item_type: 'frame',
            item_code: `${door.aluminum_code || 'AL'}-FRAME-TOP`,
            item_name: `${door.aluminum_name || 'Nhôm'} - Thanh ngang trên`,
            length_mm: frameTopLength,
            quantity: 1,
            unit: 'mm',
            weight_kg: (frameTopLength / 1000) * weightPerMeter,
            aluminum_system_id: door.aluminum_system_id,
            position: 'Ngang trên',
            symbol: 'N1'
        });

        bomItems.push({
            item_type: 'frame',
            item_code: `${door.aluminum_code || 'AL'}-FRAME-BOTTOM`,
            item_name: `${door.aluminum_name || 'Nhôm'} - Thanh ngang dưới`,
            length_mm: frameBottomLength,
            quantity: 1,
            unit: 'mm',
            weight_kg: (frameBottomLength / 1000) * weightPerMeter,
            aluminum_system_id: door.aluminum_system_id,
            position: 'Ngang dưới',
            symbol: 'N2'
        });

        bomItems.push({
            item_type: 'frame',
            item_code: `${door.aluminum_code || 'AL'}-FRAME-LEFT`,
            item_name: `${door.aluminum_name || 'Nhôm'} - Thanh dọc trái`,
            length_mm: frameLeftLength,
            quantity: 1,
            unit: 'mm',
            weight_kg: (frameLeftLength / 1000) * weightPerMeter,
            aluminum_system_id: door.aluminum_system_id,
            position: 'Dọc trái',
            symbol: 'D1'
        });

        bomItems.push({
            item_type: 'frame',
            item_code: `${door.aluminum_code || 'AL'}-FRAME-RIGHT`,
            item_name: `${door.aluminum_name || 'Nhôm'} - Thanh dọc phải`,
            length_mm: frameRightLength,
            quantity: 1,
            unit: 'mm',
            weight_kg: (frameRightLength / 1000) * weightPerMeter,
            aluminum_system_id: door.aluminum_system_id,
            position: 'Dọc phải',
            symbol: 'D2'
        });

        // Calculate mullions if structure has cells
        if (structure && structure.cells) {
            const rows = structure.rows || 1;
            const cols = structure.cols || 1;

            // Vertical mullions
            if (cols > 1) {
                for (let i = 1; i < cols; i++) {
                    bomItems.push({
                        item_type: 'frame',
                        item_code: `${door.aluminum_code || 'AL'}-MULLION-V-${i}`,
                        item_name: `${door.aluminum_name || 'Nhôm'} - Thanh đố dọc ${i}`,
                        length_mm: frameLeftLength,
                        quantity: 1,
                        unit: 'mm',
                        weight_kg: (frameLeftLength / 1000) * weightPerMeter,
                        aluminum_system_id: door.aluminum_system_id,
                        position: 'Đố dọc',
                        symbol: `ĐD${i}`
                    });
                }
            }

            // Horizontal mullions
            if (rows > 1) {
                for (let i = 1; i < rows; i++) {
                    bomItems.push({
                        item_type: 'frame',
                        item_code: `${door.aluminum_code || 'AL'}-MULLION-H-${i}`,
                        item_name: `${door.aluminum_name || 'Nhôm'} - Thanh đố ngang ${i}`,
                        length_mm: frameTopLength,
                        quantity: 1,
                        unit: 'mm',
                        weight_kg: (frameTopLength / 1000) * weightPerMeter,
                        aluminum_system_id: door.aluminum_system_id,
                        position: 'Đố ngang',
                        symbol: `ĐN${i}`
                    });
                }
            }
        }

        // Panel frames (for swing doors)
        if (door.door_type === 'swing' && number_of_panels > 0) {
            for (let i = 0; i < number_of_panels; i++) {
                let panelWidth, panelHeight;

                if (usePanelData && panels[i]) {
                    // Use actual panel dimensions from drawing_data
                    const panel = panels[i];
                    panelWidth = panel.width || ((width - deductionW * 2) / number_of_panels);
                    panelHeight = panel.height || (height - deductionH * 2);
                } else {
                    // Calculate from door dimensions
                    panelWidth = (width - deductionW * 2) / number_of_panels;
                    panelHeight = height - deductionH * 2;
                }

                const panelIndex = i + 1;

                // Panel frame top
                bomItems.push({
                    item_type: 'frame',
                    item_code: `${door.aluminum_code || 'AL'}-PANEL-${panelIndex}-TOP`,
                    item_name: `${door.aluminum_name || 'Nhôm'} - Khung cánh ${panelIndex} ngang trên`,
                    length_mm: Math.round(panelWidth),
                    quantity: 1,
                    unit: 'mm',
                    weight_kg: (panelWidth / 1000) * weightPerMeter,
                    aluminum_system_id: door.aluminum_system_id,
                    position: `Cánh ${panelIndex} ngang trên`,
                    symbol: `P${panelIndex}N1`
                });

                // Panel frame bottom
                bomItems.push({
                    item_type: 'frame',
                    item_code: `${door.aluminum_code || 'AL'}-PANEL-${panelIndex}-BOTTOM`,
                    item_name: `${door.aluminum_name || 'Nhôm'} - Khung cánh ${panelIndex} ngang dưới`,
                    length_mm: Math.round(panelWidth),
                    quantity: 1,
                    unit: 'mm',
                    weight_kg: (panelWidth / 1000) * weightPerMeter,
                    aluminum_system_id: door.aluminum_system_id,
                    position: `Cánh ${panelIndex} ngang dưới`,
                    symbol: `P${panelIndex}N2`
                });

                // Panel frame left
                bomItems.push({
                    item_type: 'frame',
                    item_code: `${door.aluminum_code || 'AL'}-PANEL-${panelIndex}-LEFT`,
                    item_name: `${door.aluminum_name || 'Nhôm'} - Khung cánh ${panelIndex} dọc trái`,
                    length_mm: Math.round(panelHeight),
                    quantity: 1,
                    unit: 'mm',
                    weight_kg: (panelHeight / 1000) * weightPerMeter,
                    aluminum_system_id: door.aluminum_system_id,
                    position: `Cánh ${panelIndex} dọc trái`,
                    symbol: `P${panelIndex}D1`
                });

                // Panel frame right
                bomItems.push({
                    item_type: 'frame',
                    item_code: `${door.aluminum_code || 'AL'}-PANEL-${panelIndex}-RIGHT`,
                    item_name: `${door.aluminum_name || 'Nhôm'} - Khung cánh ${panelIndex} dọc phải`,
                    length_mm: Math.round(panelHeight),
                    quantity: 1,
                    unit: 'mm',
                    weight_kg: (panelHeight / 1000) * weightPerMeter,
                    aluminum_system_id: door.aluminum_system_id,
                    position: `Cánh ${panelIndex} dọc phải`,
                    symbol: `P${panelIndex}D2`
                });
            }
        }

        // Calculate glass for each panel if we have panel data
        if (usePanelData && panels.length > 0) {
            // Clear existing glass items if any
            const glassItems = bomItems.filter(item => item.item_type === 'glass');
            glassItems.forEach(item => {
                const index = bomItems.indexOf(item);
                if (index > -1) bomItems.splice(index, 1);
            });

            // Add glass for each panel
            panels.forEach((panel, index) => {
                const panelWidth = panel.width || (width - glassDeductionW * 2);
                const panelHeight = panel.height || (height - glassDeductionH * 2);
                const glassW = Math.max(0, panelWidth - glassDeductionW * 2);
                const glassH = Math.max(0, panelHeight - glassDeductionH * 2);
                const area = (glassW * glassH) / 1000000; // m²

                bomItems.push({
                    item_type: 'glass',
                    item_code: `GLASS-PANEL-${index + 1}`,
                    item_name: `Kính 12mm - Cánh ${index + 1}`,
                    length_mm: Math.round(glassW),
                    quantity: 1,
                    unit: 'm²',
                    area_m2: parseFloat(area.toFixed(6)),
                    position: `Cánh ${index + 1}`,
                    width_mm: Math.round(glassW),
                    height_mm: Math.round(glassH)
                });
            });
        }

        // ============================================
        // 2. KÍNH (GLASS)
        // ============================================
        if (structure && structure.cells) {
            const rows = structure.rows || 1;
            const cols = structure.cols || 1;
            const cellWidth = (width - 100) / cols; // 100mm for frame
            const cellHeight = (height - 60) / rows; // 60mm for frame

            structure.cells.forEach((cell, index) => {
                const glassW = Math.max(0, cellWidth - glassDeductionW);
                const glassH = Math.max(0, cellHeight - glassDeductionH);
                const area = (glassW * glassH) / 1000000; // m²

                bomItems.push({
                    item_type: 'glass',
                    item_code: `GLASS-${cell.label || `K${index + 1}`}`,
                    item_name: `Kính 12mm - ${cell.label || `Ô ${index + 1}`}`,
                    length_mm: glassW,
                    quantity: 1,
                    unit: 'm²',
                    area_m2: parseFloat(area.toFixed(6)),
                    position: cell.label || `K${index + 1}`,
                    width_mm: glassW,
                    height_mm: glassH
                });
            });
        } else {
            // Single panel glass
            const glassW = Math.max(0, width - glassDeductionW * 2);
            const glassH = Math.max(0, height - glassDeductionH * 2);
            const area = (glassW * glassH) / 1000000; // m²

            bomItems.push({
                item_type: 'glass',
                item_code: 'GLASS-MAIN',
                item_name: 'Kính 12mm - Cánh chính',
                length_mm: glassW,
                quantity: number_of_panels,
                unit: 'm²',
                area_m2: parseFloat(area.toFixed(6)),
                position: 'Cánh',
                width_mm: glassW,
                height_mm: glassH
            });
        }

        // ============================================
        // 3. PHỤ KIỆN (ACCESSORIES)
        // ============================================
        const doorType = door.door_type || 'swing';

        // Get accessories from database
        const [accessories] = await db.query(`
            SELECT * FROM accessories 
            WHERE is_active = 1 
            AND (category LIKE ? OR category = ? OR category = 'general')
            ORDER BY category, code
        `, [`%${doorType}%`, doorType]);

        // Default accessories based on door type
        const defaultAccessories = [];

        if (doorType === 'swing') {
            defaultAccessories.push(
                { code: 'CL-BLS', name: 'Bản lề sàn', unit: 'Bộ', qty: number_of_panels },
                { code: 'CL-KKT', name: 'Kẹp kính trên', unit: 'Chiếc', qty: number_of_panels },
                { code: 'CL-KKD', name: 'Kẹp kính dưới', unit: 'Chiếc', qty: number_of_panels },
                { code: 'CL-NLK', name: 'Ngõng liên kết', unit: 'Chiếc', qty: number_of_panels },
                { code: 'CL-KS', name: 'Khóa sàn', unit: 'Chiếc', qty: number_of_panels },
                { code: 'CL-TN', name: 'Tay nắm', unit: 'Vòng', qty: number_of_panels }
            );
        } else if (doorType === 'sliding') {
            defaultAccessories.push(
                { code: 'CL-RAY', name: 'Ray trượt', unit: 'm dài', qty: width / 1000 },
                { code: 'CL-BL', name: 'Bánh lăn', unit: 'Bộ', qty: number_of_panels },
                { code: 'CL-KKT', name: 'Kẹp kính trên', unit: 'Chiếc', qty: number_of_panels },
                { code: 'CL-KKD', name: 'Kẹp kính dưới', unit: 'Chiếc', qty: number_of_panels },
                { code: 'CL-TN', name: 'Tay nắm', unit: 'Vòng', qty: number_of_panels }
            );
        }

        defaultAccessories.forEach(def => {
            const dbAcc = accessories.find(a => a.code === def.code);
            bomItems.push({
                item_type: 'accessory',
                item_code: def.code,
                item_name: def.name,
                quantity: def.qty,
                unit: def.unit,
                accessory_id: dbAcc ? dbAcc.id : null,
                position: 'Phụ kiện'
            });
        });

        // ============================================
        // 4. GIOĂNG VÀ KEO (GASKETS & GLUE)
        // ============================================
        const perimeter = (width + height) * 2 / 1000; // meters

        bomItems.push({
            item_type: 'accessory',
            item_code: 'GKMT',
            item_name: 'Gioăng kính mặt trong',
            quantity: parseFloat((perimeter * 1.0).toFixed(3)),
            unit: 'm dài',
            position: 'Gioăng'
        });

        bomItems.push({
            item_type: 'accessory',
            item_code: 'KKMN',
            item_name: 'Keo kính mặt ngoài',
            quantity: parseFloat((perimeter * 1.0).toFixed(3)),
            unit: 'm dài',
            position: 'Keo'
        });

        bomItems.push({
            item_type: 'accessory',
            item_code: 'KT2M',
            item_name: 'Keo tường - 2 mặt',
            quantity: parseFloat((perimeter * 2.0).toFixed(1)),
            unit: 'm dài',
            position: 'Keo'
        });

        bomItems.push({
            item_type: 'accessory',
            item_code: 'VNLD',
            item_name: 'Vít nở lắp đặt',
            quantity: Math.ceil(perimeter * 0.5), // 0.5 screws per meter
            unit: 'Chiếc',
            position: 'Vít'
        });

        // Calculate totals
        const totalAluminumWeight = bomItems
            .filter(item => item.item_type === 'frame')
            .reduce((sum, item) => sum + (item.weight_kg || 0), 0);

        const totalGlassArea = bomItems
            .filter(item => item.item_type === 'glass')
            .reduce((sum, item) => sum + (item.area_m2 || 0) * (item.quantity || 1), 0);

        // Kiểm tra tồn kho cho từng item trong BOM
        const stockWarnings = await checkBOMStockAvailability(bomItems);

        res.json({
            success: true,
            data: {
                door_id: parseInt(doorId),
                door_code: door.design_code,
                items: bomItems,
                summary: {
                    total_aluminum_weight_kg: parseFloat(totalAluminumWeight.toFixed(3)),
                    total_glass_area_m2: parseFloat(totalGlassArea.toFixed(4)),
                    total_items: bomItems.length,
                    aluminum_items: bomItems.filter(i => i.item_type === 'frame').length,
                    glass_items: bomItems.filter(i => i.item_type === 'glass').length,
                    accessory_items: bomItems.filter(i => i.item_type === 'accessory').length
                },
                stock_warnings: stockWarnings.warnings,
                stock_status: stockWarnings.hasInsufficientStock ? 'insufficient' : 'sufficient'
            }
        });
    } catch (err) {
        console.error('Error calculating BOM:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tính toán BOM: " + err.message
        });
    }
};

/**
 * Lưu BOM vào database
 */
exports.saveBOM = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { projectId, doorId } = req.params;
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Dữ liệu BOM không hợp lệ"
            });
        }

        await connection.beginTransaction();

        // Find or create door_design_id
        let designId = doorId;

        // First, check if doorId is a door_designs.id
        const [doorDesignRows] = await connection.query(
            "SELECT id FROM door_designs WHERE id = ? AND project_id = ?",
            [doorId, projectId]
        );

        if (doorDesignRows.length === 0) {
            // If not found in door_designs, check if it's a project_item_id
            const [projectItemRows] = await connection.query(`
                SELECT 
                    pi.id,
                    pi.project_id,
                    pi.quantity,
                    pi.aluminum_system,
                    pi.custom_width_mm as width_mm,
                    pi.custom_height_mm as height_mm,
                    pi.custom_glass_type as glass_type,
                    pi.snapshot_config,
                    pt.code as design_code,
                    pt.name as door_name,
                    pt.product_type as door_type,
                    pt.structure_json,
                    a.id AS aluminum_system_id
                FROM project_items pi
                LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
                LEFT JOIN aluminum_systems a ON a.code = pi.aluminum_system OR a.id = pi.aluminum_system
                WHERE pi.id = ? AND pi.project_id = ?
                LIMIT 1
            `, [doorId, projectId]);

            if (projectItemRows.length > 0) {
                const pi = projectItemRows[0];

                // Check if door_design already exists for this project_item
                // First check if project_item_id column exists
                const [colCheckRows] = await connection.query(`
                    SELECT COUNT(*) as count 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'door_designs' 
                    AND COLUMN_NAME = 'project_item_id'
                `);
                
                let existingDesignRows = [];
                if (colCheckRows[0]?.count > 0) {
                    [existingDesignRows] = await connection.query(
                        "SELECT id FROM door_designs WHERE project_item_id = ?",
                        [doorId]
                    );
                }

                if (existingDesignRows.length > 0) {
                    designId = existingDesignRows[0].id;
                } else {
                    // Create new door_design from project_item
                    let snapshotConfig = null;
                    if (pi.snapshot_config) {
                        try {
                            snapshotConfig = typeof pi.snapshot_config === 'string'
                                ? JSON.parse(pi.snapshot_config)
                                : pi.snapshot_config;
                        } catch (e) { }
                    }

                    const width = pi.width_mm || snapshotConfig?.width_mm || snapshotConfig?.size?.w || 1200;
                    const height = pi.height_mm || snapshotConfig?.height_mm || snapshotConfig?.size?.h || 2200;

                    // Map door_type from product_type to door_designs enum values
                    let doorType = 'swing';
                    if (pi.door_type) {
                        const dt = pi.door_type.toLowerCase();
                        if (dt.includes('sliding') || dt.includes('lùa')) {
                            doorType = 'sliding';
                        } else if (dt.includes('tilt')) {
                            doorType = 'tilt';
                        } else if (dt.includes('folding')) {
                            doorType = 'folding';
                        } else if (dt.includes('fixed')) {
                            doorType = 'fixed';
                        }
                    }

                    // Check which columns exist in door_designs table
                    const [columnRows] = await connection.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = 'door_designs'
                    `);
                    
                    const columns = columnRows.map(row => row.COLUMN_NAME);
                    const hasProjectItemId = columns.includes('project_item_id');
                    
                    // Build INSERT query based on available columns
                    if (hasProjectItemId) {
                        const [insertResult] = await connection.query(`
                            INSERT INTO door_designs 
                            (project_id, project_item_id, design_code, door_type, width_mm, height_mm, 
                             aluminum_system_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [
                            projectId,
                            doorId,
                            pi.design_code || `DOOR-${doorId}`,
                            doorType,
                            width,
                            height,
                            pi.aluminum_system_id || null
                        ]);
                        designId = insertResult.insertId;
                    } else {
                        // Fallback: Create without project_item_id
                        const [insertResult] = await connection.query(`
                            INSERT INTO door_designs 
                            (project_id, design_code, door_type, width_mm, height_mm, 
                             aluminum_system_id)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                            projectId,
                            pi.design_code || `DOOR-${doorId}`,
                            doorType,
                            width,
                            height,
                            pi.aluminum_system_id || null
                        ]);
                        designId = insertResult.insertId;
                    }

                    console.log(`Created door_designs entry: id=${designId} for project_item_id=${doorId}`);
                }
            } else {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy cửa hoặc sản phẩm"
                });
            }
        }

        // Delete existing BOM items for this door
        await connection.query(
            "DELETE FROM bom_items WHERE design_id = ?",
            [designId]
        );

        // Insert new BOM items
        for (const item of items) {
            await connection.query(
                `INSERT INTO bom_items 
                (design_id, item_type, item_code, item_name, length_mm, quantity, unit, 
                 weight_kg, aluminum_system_id, accessory_id, area_m2)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    designId,
                    item.item_type,
                    item.item_code || null,
                    item.item_name,
                    item.length_mm || null,
                    item.quantity || 1,
                    item.unit || 'pcs',
                    item.weight_kg || null,
                    item.aluminum_system_id || null,
                    item.accessory_id || null,
                    item.area_m2 || null
                ]
            );
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: "Lưu BOM thành công",
            data: {
                design_id: parseInt(designId),
                door_id: parseInt(doorId),
                items_count: items.length
            }
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error saving BOM:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu BOM: " + err.message
        });
    }
};

/**
 * Lấy BOM đã lưu từ database
 */
exports.getBOM = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;

        // Find design_id - could be door_designs.id or need to find from project_item_id
        let designId = doorId;

        // First check if it's a door_designs.id
        const [doorDesignRows] = await db.query(
            "SELECT id FROM door_designs WHERE id = ? AND project_id = ?",
            [doorId, projectId]
        );

        if (doorDesignRows.length === 0) {
            // Check if it's a project_item_id and find associated door_design
            const [projectItemRows] = await db.query(
                "SELECT id FROM project_items WHERE id = ? AND project_id = ?",
                [doorId, projectId]
            );

            if (projectItemRows.length > 0) {
                // Check if project_item_id column exists
                const [colCheckRows] = await db.query(`
                    SELECT COUNT(*) as count 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'door_designs' 
                    AND COLUMN_NAME = 'project_item_id'
                `);
                
                let designRows = [];
                if (colCheckRows[0]?.count > 0) {
                    // Find door_design by project_item_id
                    [designRows] = await db.query(
                        "SELECT id FROM door_designs WHERE project_item_id = ?",
                        [doorId]
                    );
                }
                
                // If no door_design found, try to find by matching project_id and design_code
                if (designRows.length === 0) {
                    const [projectItem] = await db.query(`
                        SELECT pt.code as design_code
                        FROM project_items pi
                        LEFT JOIN product_templates pt ON pt.id = pi.product_template_id
                        WHERE pi.id = ? AND pi.project_id = ?
                        LIMIT 1
                    `, [doorId, projectId]);
                    
                    if (projectItem.length > 0 && projectItem[0].design_code) {
                        [designRows] = await db.query(
                            "SELECT id FROM door_designs WHERE project_id = ? AND design_code = ?",
                            [projectId, projectItem[0].design_code]
                        );
                    }
                }

                if (designRows.length > 0) {
                    designId = designRows[0].id;
                } else {
                    // No door_design found, return empty BOM
                    return res.json({
                        success: true,
                        data: {
                            door_id: parseInt(doorId),
                            items: [],
                            summary: {
                                total_aluminum_weight_kg: 0,
                                total_items: 0,
                                aluminum_items: 0,
                                glass_items: 0,
                                accessory_items: 0
                            }
                        }
                    });
                }
            }
        }

        const [rows] = await db.query(`
            SELECT 
                bi.*,
                a.code AS aluminum_code,
                a.name AS aluminum_name,
                acc.code AS accessory_code,
                acc.name AS accessory_name
            FROM bom_items bi
            LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id
            LEFT JOIN accessories acc ON bi.accessory_id = acc.id
            WHERE bi.design_id = ?
            ORDER BY 
                CASE bi.item_type 
                    WHEN 'frame' THEN 1 
                    WHEN 'glass' THEN 2 
                    WHEN 'accessory' THEN 3 
                    ELSE 4 
                END,
                bi.item_code
        `, [designId]);

        // Calculate summary
        const totalAluminumWeight = rows
            .filter(item => item.item_type === 'frame')
            .reduce((sum, item) => sum + (parseFloat(item.weight_kg) || 0), 0);

        res.json({
            success: true,
            data: {
                door_id: parseInt(doorId),
                items: rows,
                summary: {
                    total_aluminum_weight_kg: parseFloat(totalAluminumWeight.toFixed(3)),
                    total_items: rows.length,
                    aluminum_items: rows.filter(i => i.item_type === 'frame').length,
                    glass_items: rows.filter(i => i.item_type === 'glass').length,
                    accessory_items: rows.filter(i => i.item_type === 'accessory').length
                }
            }
        });
    } catch (err) {
        console.error('Error getting BOM:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy BOM: " + err.message
        });
    }
};

/**
 * Tính BOM cho toàn bộ dự án
 */
exports.calculateProjectBOM = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Get all doors in project
        const [doors] = await db.query(
            "SELECT id, design_code FROM door_designs WHERE project_id = ?",
            [projectId]
        );

        const projectBOM = {
            project_id: parseInt(projectId),
            doors: [],
            summary: {
                total_doors: doors.length,
                total_aluminum_weight_kg: 0,
                total_glass_area_m2: 0,
                total_items: 0
            }
        };

        // Calculate BOM for each door
        for (const door of doors) {
            try {
                // Use internal calculation (simplified)
                const reqMock = { params: { projectId, doorId: door.id } };
                const resMock = {
                    json: (data) => {
                        if (data.success) {
                            projectBOM.doors.push({
                                door_id: door.id,
                                door_code: door.design_code,
                                bom: data.data
                            });
                            projectBOM.summary.total_aluminum_weight_kg +=
                                data.data.summary.total_aluminum_weight_kg || 0;
                            projectBOM.summary.total_glass_area_m2 +=
                                data.data.summary.total_glass_area_m2 || 0;
                            projectBOM.summary.total_items +=
                                data.data.summary.total_items || 0;
                        }
                    }
                };

                await exports.calculateBOM(reqMock, resMock);
            } catch (err) {
                console.error(`Error calculating BOM for door ${door.id}:`, err);
            }
        }

        res.json({
            success: true,
            data: projectBOM
        });
    } catch (err) {
        console.error('Error calculating project BOM:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tính toán BOM dự án: " + err.message
        });
    }
};

