const db = require("../config/db");
const bomEngineV3 = require("../services/bomEngineV3");
const cuttingEngine = require("../services/cuttingEngine");

// GET all drawings
exports.getAllDrawings = async (req, res) => {
    try {
        const { project_id, door_design_id } = req.query;
        let query = `
            SELECT 
                dd.*,
                dt.code AS template_code,
                dt.name AS template_name,
                p.project_name,
                p.project_code
            FROM door_drawings dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN projects p ON dd.project_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (project_id) {
            query += " AND dd.project_id = ?";
            params.push(project_id);
        }

        if (door_design_id) {
            query += " AND dd.door_design_id = ?";
            params.push(door_design_id);
        }

        query += " ORDER BY dd.created_at DESC";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT 
                dd.*,
                dt.code AS template_code,
                dt.name AS template_name,
                p.project_name,
                p.project_code
            FROM door_drawings dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN projects p ON dd.project_id = p.id
            WHERE dd.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản vẽ"
            });
        }

        // Parse JSON fields
        const drawing = rows[0];
        if (typeof drawing.drawing_data === 'string') {
            drawing.drawing_data = JSON.parse(drawing.drawing_data);
        }
        if (typeof drawing.params_json === 'string') {
            drawing.params_json = JSON.parse(drawing.params_json);
        }
        if (typeof drawing.calculated_dimensions === 'string') {
            drawing.calculated_dimensions = JSON.parse(drawing.calculated_dimensions);
        }

        res.json({
            success: true,
            data: drawing
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// POST create
exports.create = async (req, res) => {
    try {
        const {
            project_id,
            door_design_id,
            template_id,
            template_code,
            drawing_data,
            svg_data,
            image_data,
            width_mm,
            height_mm,
            params_json,
            calculated_dimensions
        } = req.body;

        const [result] = await db.query(
            `INSERT INTO door_drawings 
             (project_id, door_design_id, template_id, template_code, drawing_data, svg_data, image_data,
              width_mm, height_mm, params_json, calculated_dimensions) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                project_id,
                door_design_id || null,
                template_id || null,
                template_code || null,
                JSON.stringify(drawing_data || {}),
                svg_data || null,
                image_data || null,
                width_mm,
                height_mm,
                JSON.stringify(params_json || {}),
                JSON.stringify(calculated_dimensions || {})
            ]
        );

        // Update door_design if door_design_id provided
        if (door_design_id) {
            await db.query(
                `UPDATE door_designs 
                 SET door_drawing_id = ?, drawing_svg = ? 
                 WHERE id = ?`,
                [result.insertId, svg_data || null, door_design_id]
            );
        }

        // Tự động tính và lưu BOM khi có bản vẽ
        if (door_design_id && project_id) {
            try {
                const bomAutoSave = require("../services/bomAutoSave");
                await bomAutoSave.autoCalculateAndSaveBOM(door_design_id, project_id, result.insertId);
            } catch (bomErr) {
                console.error("Error auto-calculating BOM:", bomErr);
                // Không throw để không làm gián đoạn việc lưu bản vẽ
            }
        }

        res.status(201).json({
            success: true,
            message: "Lưu bản vẽ thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu bản vẽ"
        });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            drawing_data,
            svg_data,
            image_data,
            width_mm,
            height_mm,
            params_json,
            calculated_dimensions
        } = req.body;

        const updateFields = [];
        const params = [];

        if (drawing_data !== undefined) {
            updateFields.push("drawing_data = ?");
            params.push(JSON.stringify(drawing_data));
        }
        if (svg_data !== undefined) {
            updateFields.push("svg_data = ?");
            params.push(svg_data);
        }
        if (image_data !== undefined) {
            updateFields.push("image_data = ?");
            params.push(image_data);
        }
        if (width_mm !== undefined) {
            updateFields.push("width_mm = ?");
            params.push(width_mm);
        }
        if (height_mm !== undefined) {
            updateFields.push("height_mm = ?");
            params.push(height_mm);
        }
        if (params_json !== undefined) {
            updateFields.push("params_json = ?");
            params.push(JSON.stringify(params_json));
        }
        if (calculated_dimensions !== undefined) {
            updateFields.push("calculated_dimensions = ?");
            params.push(JSON.stringify(calculated_dimensions));
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        params.push(id);

        const [result] = await db.query(
            `UPDATE door_drawings SET ${updateFields.join(", ")} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản vẽ"
            });
        }

        // Tự động tính lại BOM khi bản vẽ được cập nhật
        try {
            const [drawingRows] = await db.query(
                "SELECT door_design_id, project_id FROM door_drawings WHERE id = ?",
                [id]
            );
            if (drawingRows.length > 0 && drawingRows[0].door_design_id && drawingRows[0].project_id) {
                const bomAutoSave = require("../services/bomAutoSave");
                await bomAutoSave.autoCalculateAndSaveBOM(
                    drawingRows[0].door_design_id, 
                    drawingRows[0].project_id, 
                    id
                );
            }
        } catch (bomErr) {
            console.error("Error auto-calculating BOM:", bomErr);
            // Không throw để không làm gián đoạn việc cập nhật bản vẽ
        }

        res.json({
            success: true,
            message: "Cập nhật bản vẽ thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật bản vẽ"
        });
    }
};

// DELETE
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "DELETE FROM door_drawings WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản vẽ"
            });
        }

        res.json({
            success: true,
            message: "Xóa bản vẽ thành công"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa bản vẽ"
        });
    }
};

// POST calculate dimensions
exports.calculateDimensions = async (req, res) => {
    try {
        const { id } = req.params;
        const { width_mm, height_mm, formula_id, aluminum_system_id } = req.body;

        // Get formula
        let formula = null;
        if (formula_id) {
            const [formulaRows] = await db.query(
                "SELECT * FROM deduction_formulas WHERE id = ?",
                [formula_id]
            );
            if (formulaRows.length > 0) {
                formula = formulaRows[0];
            }
        }

        // Default deductions if no formula
        const glassDeductionW = formula?.glass_deduction_width || 40;
        const glassDeductionH = formula?.glass_deduction_height || 40;
        const frameDeductionW = formula?.frame_deduction_width || 50;
        const frameDeductionH = formula?.frame_deduction_height || 50;

        // Calculate glass dimensions
        const glassWidth = Math.max(0, width_mm - glassDeductionW * 2);
        const glassHeight = Math.max(0, height_mm - glassDeductionH * 2);
        const glassArea = (glassWidth * glassHeight) / 1000000; // m²

        // Calculate frame dimensions
        const frameTop = width_mm;
        const frameBottom = width_mm;
        const frameLeft = height_mm;
        const frameRight = height_mm;

        // Calculate K1, K2, K3, K4 (example calculations)
        const K1 = width_mm / 2; // Center horizontal
        const K2 = 50; // Top offset
        const K3 = height_mm - 50; // Bottom offset
        const K4 = width_mm / 2; // Center vertical

        const calculated = {
            glass: {
                width_mm: glassWidth,
                height_mm: glassHeight,
                area_m2: glassArea
            },
            frame: {
                top_mm: frameTop,
                bottom_mm: frameBottom,
                left_mm: frameLeft,
                right_mm: frameRight
            },
            params: {
                K1: K1,
                K2: K2,
                K3: K3,
                K4: K4
            }
        };

        res.json({
            success: true,
            data: calculated
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tính toán"
        });
    }
};

// POST generate BOM for door drawing
exports.generateBOM = async (req, res) => {
    try {
        const { id } = req.params;
        const { recalcCutting = false } = req.body;

        // Get door drawing with aluminum system
        const [rows] = await db.query(
            `SELECT 
                dd.*,
                dt.code AS template_code,
                dt.name AS template_name,
                p.project_name,
                p.project_code,
                dds.aluminum_system_id
            FROM door_drawings dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN projects p ON dd.project_id = p.id
            LEFT JOIN door_designs dds ON dd.door_design_id = dds.id
            WHERE dd.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản vẽ"
            });
        }

        const drawing = rows[0];
        
        // Parse JSON fields
        let paramsJson = {};
        if (drawing.params_json) {
            paramsJson = typeof drawing.params_json === 'string' 
                ? JSON.parse(drawing.params_json) 
                : drawing.params_json;
        }

        // Use BOM Engine V3 if we have Panel Tree structure and system_id
        let bomItems = [];
        if (paramsJson.rootPanel && drawing.aluminum_system_id) {
            // Use new BOM Engine V3 (Panel Tree + Rules)
            bomItems = await bomEngineV3.generateBOMFromPanelTree(
                id,
                paramsJson,
                drawing.aluminum_system_id
            );
        } else {
            // Fallback to old method
            bomItems = await calculateBOMFromParams(paramsJson, drawing.width_mm, drawing.height_mm);
        }
        
        // Save BOM to door_bom_lines table
        // First, delete existing BOM
        await db.query("DELETE FROM door_bom_lines WHERE door_drawing_id = ?", [id]);
        
        // Insert new BOM items
        for (const item of bomItems) {
            await db.query(
                `INSERT INTO door_bom_lines 
                 (door_drawing_id, material_id, item_type, item_code, description, length_mm, width_mm, height_mm, qty, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    item.material_id || null,
                    item.item_type,
                    item.item_code || '',
                    item.description || item.item_name || '',
                    item.length_mm || null,
                    item.width_mm || null,
                    item.height_mm || null,
                    item.qty || 1,
                    item.note || null
                ]
            );
        }

        // Calculate cutting optimization if requested
        let cuttingPlan = null;
        if (recalcCutting) {
            const { algorithm = 'first-fit', stockLength = 6000 } = req.body;
            cuttingPlan = await calculateCuttingOptimization(bomItems, stockLength, algorithm);
            
            // Save cutting plan
            await db.query("DELETE FROM door_cutting_plan WHERE door_drawing_id = ?", [id]);
            
            for (const plan of cuttingPlan.plans) {
                await db.query(
                    `INSERT INTO door_cutting_plan 
                     (door_drawing_id, profile_code, stock_length_mm, total_bars, total_waste_mm, efficiency, plan_json)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        plan.profile_code,
                        plan.stock_length_mm,
                        plan.total_bars,
                        plan.total_waste_mm,
                        plan.efficiency,
                        JSON.stringify(plan.bars)
                    ]
                );
            }
        }

        // Calculate summary
        const summary = {
            total_items: bomItems.length,
            profiles: bomItems.filter(i => i.item_type === 'profile').length,
            glass: bomItems.filter(i => i.item_type === 'glass').length,
            accessories: bomItems.filter(i => i.item_type === 'accessory').length,
            gaskets: bomItems.filter(i => i.item_type === 'gasket').length
        };

        res.json({
            success: true,
            message: "Tính BOM thành công",
            data: {
                bom_items: bomItems,
                summary: summary,
                cutting_plan: cuttingPlan
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tính BOM: " + err.message
        });
    }
};

// GET BOM for a door drawing
exports.getBOM = async (req, res) => {
    try {
        const { id } = req.params;

        // Get BOM items from door_bom_lines
        const [bomRows] = await db.query(
            `SELECT * FROM door_bom_lines WHERE door_drawing_id = ? ORDER BY item_type, item_code`,
            [id]
        );

        // Group by item_type
        const grouped = {
            profile: [],
            glass: [],
            accessory: [],
            gasket: [],
            other: []
        };

        bomRows.forEach(item => {
            const type = item.item_type || 'other';
            if (grouped[type]) {
                grouped[type].push(item);
            } else {
                grouped.other.push(item);
            }
        });

        // Calculate totals
        const totals = {
            total_items: bomRows.length,
            total_profiles: grouped.profile.length,
            total_glass: grouped.glass.length,
            total_accessories: grouped.accessory.length,
            total_gaskets: grouped.gasket.length,
            // Calculate total length for profiles (for 6m bar estimation)
            total_profile_length_mm: grouped.profile.reduce((sum, item) => {
                return sum + ((item.length_mm || 0) * (item.qty || 1));
            }, 0)
        };

        // Estimate number of 6m bars needed
        totals.estimated_6m_bars = Math.ceil(totals.total_profile_length_mm / 6000);

        res.json({
            success: true,
            data: {
                items: bomRows,
                grouped: grouped,
                totals: totals
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy BOM: " + err.message
        });
    }
};

// Helper: Calculate BOM from params_json (Parser đầy đủ)
async function calculateBOMFromParams(paramsJson, widthMm, heightMm) {
    const bomItems = [];
    
    if (!paramsJson) {
        return bomItems;
    }

    // ============================================
    // 1. FRAME PROFILES (Khung ngoài)
    // ============================================
    const frameTop = widthMm;
    const frameBottom = widthMm;
    const frameLeft = heightMm;
    const frameRight = heightMm;

    bomItems.push(
        { 
            item_type: 'profile', 
            item_code: 'FRAME_TOP', 
            description: 'Khung trên', 
            length_mm: Math.round(frameTop), 
            qty: 1,
            note: 'Thanh nhôm khung trên'
        },
        { 
            item_type: 'profile', 
            item_code: 'FRAME_BOTTOM', 
            description: 'Khung dưới', 
            length_mm: Math.round(frameBottom), 
            qty: 1,
            note: 'Thanh nhôm khung dưới'
        },
        { 
            item_type: 'profile', 
            item_code: 'FRAME_LEFT', 
            description: 'Khung trái', 
            length_mm: Math.round(frameLeft), 
            qty: 1,
            note: 'Thanh nhôm khung trái'
        },
        { 
            item_type: 'profile', 
            item_code: 'FRAME_RIGHT', 
            description: 'Khung phải', 
            length_mm: Math.round(frameRight), 
            qty: 1,
            note: 'Thanh nhôm khung phải'
        }
    );

    // ============================================
    // 2. PANEL PROFILES (Cánh cửa)
    // ============================================
    if (paramsJson.panels && Array.isArray(paramsJson.panels)) {
        paramsJson.panels.forEach((panel, index) => {
            const panelWidth = panel.width || 0;
            const panelHeight = panel.height || 0;
            
            // Cánh đứng (2 thanh dọc)
            bomItems.push({
                item_type: 'profile',
                item_code: `PANEL_VERT_${index + 1}`,
                description: `Cánh đứng panel ${panel.id || index + 1}`,
                length_mm: Math.round(panelHeight),
                qty: 2,
                note: `Panel ${panel.id || index + 1} - 2 thanh dọc`
            });
            
            // Cánh ngang (2 thanh ngang)
            bomItems.push({
                item_type: 'profile',
                item_code: `PANEL_HORZ_${index + 1}`,
                description: `Cánh ngang panel ${panel.id || index + 1}`,
                length_mm: Math.round(panelWidth),
                qty: 2,
                note: `Panel ${panel.id || index + 1} - 2 thanh ngang`
            });
        });
    }

    // ============================================
    // 3. MULLIONS (Đố ngang/dọc)
    // ============================================
    if (paramsJson.bars && Array.isArray(paramsJson.bars)) {
        paramsJson.bars.forEach((bar, index) => {
            bomItems.push({
                item_type: 'profile',
                item_code: `MULLION_${bar.type === 'vertical' ? 'V' : 'H'}_${index + 1}`,
                description: `Đố ${bar.type === 'vertical' ? 'dọc' : 'ngang'}`,
                length_mm: Math.round(bar.length || 0),
                qty: 1,
                note: `Thanh đố ${bar.type === 'vertical' ? 'dọc' : 'ngang'}`
            });
        });
    }

    // ============================================
    // 4. GLASS (Kính)
    // ============================================
    if (paramsJson.panels && Array.isArray(paramsJson.panels)) {
        paramsJson.panels.forEach((panel, index) => {
            // Deduction 40mm mỗi bên (20mm mỗi cạnh)
            const glassWidth = Math.max(0, (panel.width || 0) - 40);
            const glassHeight = Math.max(0, (panel.height || 0) - 40);
            const glassArea = (glassWidth * glassHeight) / 1000000; // m²
            
            bomItems.push({
                item_type: 'glass',
                item_code: `GLASS_${index + 1}`,
                description: `Kính panel ${panel.id || index + 1}`,
                width_mm: Math.round(glassWidth),
                height_mm: Math.round(glassHeight),
                qty: 1,
                note: `Diện tích: ${glassArea.toFixed(3)} m²`
            });
        });
    }

    // ============================================
    // 5. ACCESSORIES (Phụ kiện) - Dựa trên panel type
    // ============================================
    if (paramsJson.panels && Array.isArray(paramsJson.panels)) {
        paramsJson.panels.forEach((panel, index) => {
            const openType = panel.openType || panel.open || 'fixed';
            
            // Bản lề
            if (openType.includes('turn') || openType.includes('swing')) {
                bomItems.push({
                    item_type: 'accessory',
                    item_code: `HINGE_${index + 1}`,
                    description: `Bản lề panel ${panel.id || index + 1}`,
                    qty: 3, // Thường 3 bản lề cho cửa quay
                    note: `Bản lề cho ${openType}`
                });
            }
            
            // Tay nắm
            if (openType !== 'fixed') {
                bomItems.push({
                    item_type: 'accessory',
                    item_code: `HANDLE_${index + 1}`,
                    description: `Tay nắm panel ${panel.id || index + 1}`,
                    qty: 1,
                    note: `Tay nắm cho ${openType}`
                });
            }
            
            // Khóa (cho cửa đi)
            if (openType.includes('door') || openType.includes('turn')) {
                bomItems.push({
                    item_type: 'accessory',
                    item_code: `LOCK_${index + 1}`,
                    description: `Khóa panel ${panel.id || index + 1}`,
                    qty: 1,
                    note: 'Khóa cửa đi'
                });
            }
        });
    }

    // ============================================
    // 6. GASKETS (Gioăng) - Tính theo chu vi panel
    // ============================================
    if (paramsJson.panels && Array.isArray(paramsJson.panels)) {
        paramsJson.panels.forEach((panel, index) => {
            const perimeter = 2 * (panel.width + panel.height);
            bomItems.push({
                item_type: 'gasket',
                item_code: `GASKET_${index + 1}`,
                description: `Gioăng panel ${panel.id || index + 1}`,
                length_mm: Math.round(perimeter),
                qty: 1,
                note: 'Gioăng EPDM'
            });
        });
    }

    return bomItems;
}

// Helper: Calculate cutting optimization (First-Fit Decreasing + Best-Fit)
async function calculateCuttingOptimization(bomItems, stockLength = 6000, algorithm = 'first-fit') {
    // Filter profile items
    const profileItems = bomItems.filter(item => item.item_type === 'profile' && item.length_mm);
    
    if (profileItems.length === 0) {
        return {
            plans: [],
            total_bars: 0,
            total_waste_mm: 0,
            efficiency: 0
        };
    }
    
    // Group by profile type (có thể group theo material_id sau)
    const grouped = {};
    profileItems.forEach(item => {
        // Group theo prefix của item_code (FRAME, PANEL, MULLION)
        const prefix = item.item_code.split('_')[0];
        if (!grouped[prefix]) {
            grouped[prefix] = [];
        }
        // Add items based on qty
        for (let i = 0; i < (item.qty || 1); i++) {
            grouped[prefix].push({
                code: item.item_code,
                description: item.description || item.item_name || '',
                length: item.length_mm
            });
        }
    });

    const plans = [];
    let globalBarIndex = 1;

    // Optimize cho từng nhóm profile
    for (const [profileCode, items] of Object.entries(grouped)) {
        if (items.length === 0) continue;
        
        // Sort descending (First-Fit Decreasing)
        items.sort((a, b) => b.length - a.length);

        let bars = [];
        if (algorithm === 'best-fit') {
            bars = bestFitDecreasing(items, stockLength, globalBarIndex);
        } else {
            bars = firstFitDecreasing(items, stockLength, globalBarIndex);
        }

        // Calculate efficiency for this profile type
        const totalUsed = bars.reduce((sum, bar) => sum + bar.used_length_mm, 0);
        const totalStock = bars.length * stockLength;
        const efficiency = totalStock > 0 ? (totalUsed / totalStock) * 100 : 0;

        plans.push({
            profile_code: profileCode,
            stock_length_mm: stockLength,
            total_bars: bars.length,
            total_waste_mm: bars.reduce((sum, bar) => sum + bar.waste_length_mm, 0),
            efficiency: parseFloat(efficiency.toFixed(2)),
            bars: bars
        });

        globalBarIndex += bars.length;
    }

    // Calculate overall summary
    const totalBars = plans.reduce((sum, plan) => sum + plan.total_bars, 0);
    const totalWaste = plans.reduce((sum, plan) => sum + plan.total_waste_mm, 0);
    const totalUsed = plans.reduce((sum, plan) => 
        sum + (plan.total_bars * stockLength - plan.total_waste_mm), 0);
    const overallEfficiency = totalBars > 0 
        ? (totalUsed / (totalBars * stockLength)) * 100 
        : 0;

    return {
        plans: plans,
        total_bars: totalBars,
        total_waste_mm: totalWaste,
        efficiency: parseFloat(overallEfficiency.toFixed(2))
    };
}

// First-Fit Decreasing Algorithm
function firstFitDecreasing(items, stockLength, startBarIndex = 1) {
    const bars = [];
    let barIndex = startBarIndex;

    items.forEach(item => {
        if (item.length > stockLength) {
            console.warn(`Item ${item.code} (${item.length}mm) exceeds stock length ${stockLength}mm`);
            return;
        }

        let placed = false;
        // Try to fit in existing bars
        for (let i = 0; i < bars.length; i++) {
            if (bars[i].used_length_mm + item.length <= stockLength) {
                bars[i].cuts.push({
                    code: item.code,
                    description: item.description,
                    length: item.length
                });
                bars[i].used_length_mm += item.length;
                bars[i].waste_length_mm = stockLength - bars[i].used_length_mm;
                placed = true;
                break;
            }
        }

        // Create new bar if not placed
        if (!placed) {
            bars.push({
                bar_number: barIndex++,
                stock_length_mm: stockLength,
                used_length_mm: item.length,
                waste_length_mm: stockLength - item.length,
                cuts: [{
                    code: item.code,
                    description: item.description,
                    length: item.length
                }]
            });
        }
    });

    return bars;
}

// Best-Fit Decreasing Algorithm (tối ưu hơn First-Fit)
function bestFitDecreasing(items, stockLength, startBarIndex = 1) {
    const bars = [];
    let barIndex = startBarIndex;

    items.forEach(item => {
        if (item.length > stockLength) {
            console.warn(`Item ${item.code} (${item.length}mm) exceeds stock length ${stockLength}mm`);
            return;
        }

        let bestBarIndex = -1;
        let bestWaste = stockLength;

        // Find bar with smallest waste that can fit
        for (let i = 0; i < bars.length; i++) {
            const remaining = stockLength - bars[i].used_length_mm;
            if (remaining >= item.length && remaining < bestWaste) {
                bestBarIndex = i;
                bestWaste = remaining;
            }
        }

        if (bestBarIndex >= 0) {
            // Add to best bar
            bars[bestBarIndex].cuts.push({
                code: item.code,
                description: item.description,
                length: item.length
            });
            bars[bestBarIndex].used_length_mm += item.length;
            bars[bestBarIndex].waste_length_mm = stockLength - bars[bestBarIndex].used_length_mm;
        } else {
            // Create new bar
            bars.push({
                bar_number: barIndex++,
                stock_length_mm: stockLength,
                used_length_mm: item.length,
                waste_length_mm: stockLength - item.length,
                cuts: [{
                    code: item.code,
                    description: item.description,
                    length: item.length
                }]
            });
        }
    });

    return bars;
}

// GET BOM for door drawing
exports.getBOM = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT * FROM door_bom_lines WHERE door_drawing_id = ? ORDER BY item_type, item_code`,
            [id]
        );

        // Calculate summary
        const summary = {
            total_items: rows.length,
            profiles: rows.filter(i => i.item_type === 'profile').length,
            glass: rows.filter(i => i.item_type === 'glass').length,
            accessories: rows.filter(i => i.item_type === 'accessory').length,
            total_profile_length: rows
                .filter(i => i.item_type === 'profile' && i.length_mm)
                .reduce((sum, i) => sum + (i.length_mm * i.qty), 0),
            total_glass_area: rows
                .filter(i => i.item_type === 'glass' && i.width_mm && i.height_mm)
                .reduce((sum, i) => sum + ((i.width_mm * i.height_mm * i.qty) / 1000000), 0)
        };

        res.json({
            success: true,
            data: {
                items: rows,
                summary: summary
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy BOM"
        });
    }
};

// POST generate cutting plan for door drawing
exports.generateCuttingPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { stockLength = 6000, kerf = 3, algorithm = 'best-fit' } = req.body;

        // 1. Get BOM profile items for this door
        const [bomRows] = await db.query(
            `SELECT item_code, length_mm, qty 
             FROM door_bom_lines 
             WHERE door_drawing_id = ? AND item_type = 'profile' AND length_mm IS NOT NULL`,
            [id]
        );

        if (!bomRows || bomRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có BOM profile để tối ưu cắt. Vui lòng bóc tách BOM trước."
            });
        }

        // 2. Group by profile_code (item_code)
        const byProfile = {};
        for (const row of bomRows) {
            const profileCode = row.item_code || 'UNKNOWN';
            if (!byProfile[profileCode]) {
                byProfile[profileCode] = [];
            }
            // Add pieces based on quantity
            for (let i = 0; i < (row.qty || 1); i++) {
                byProfile[profileCode].push(row.length_mm);
            }
        }

        // 3. Delete old cutting plan
        await db.query("DELETE FROM door_cutting_plan WHERE door_drawing_id = ?", [id]);

        const result = [];

        // 4. Calculate cutting plan for each profile
        for (const [profileCode, pieces] of Object.entries(byProfile)) {
            if (pieces.length === 0) continue;

            // Use cutting engine
            const plan = cuttingEngine.calculateCuttingPlan(
                { [profileCode]: pieces },
                stockLength,
                kerf,
                algorithm
            );

            const bars = plan[profileCode] || [];
            if (bars.length === 0) continue;

            // Calculate totals for this profile
            const totalBars = bars.length;
            const totalUsed = bars.reduce((sum, bar) => sum + bar.usedLength, 0);
            const totalWaste = bars.reduce((sum, bar) => sum + bar.waste, 0);
            const efficiency = totalBars > 0 
                ? (totalUsed / (totalBars * stockLength)) * 100 
                : 0;

            // Format bars for plan_json
            const planJson = bars.map(bar => ({
                bar: bar.barIndex,
                cuts: bar.pieces.map((length, idx) => ({
                    length: length,
                    code: `${profileCode}_${idx + 1}`
                })),
                waste: bar.waste,
                used: bar.usedLength,
                efficiency: bar.efficiency
            }));

            // Save to database
            await db.query(
                `INSERT INTO door_cutting_plan 
                 (door_drawing_id, profile_code, stock_length_mm, total_bars, total_waste_mm, efficiency, plan_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    profileCode,
                    stockLength,
                    totalBars,
                    totalWaste,
                    parseFloat(efficiency.toFixed(2)),
                    JSON.stringify(planJson)
                ]
            );

            result.push({
                profileCode,
                totalBars,
                totalUsed,
                totalWaste,
                efficiency: parseFloat(efficiency.toFixed(2)),
                bars: bars
            });
        }

        // Calculate overall summary
        const overallSummary = {
            totalBars: result.reduce((sum, r) => sum + r.totalBars, 0),
            totalUsed: result.reduce((sum, r) => sum + r.totalUsed, 0),
            totalWaste: result.reduce((sum, r) => sum + r.totalWaste, 0)
        };
        overallSummary.totalStock = overallSummary.totalUsed + overallSummary.totalWaste;
        overallSummary.overallEfficiency = overallSummary.totalStock > 0
            ? (overallSummary.totalUsed / overallSummary.totalStock) * 100
            : 0;

        res.json({
            success: true,
            message: "Tạo kế hoạch cắt thành công",
            data: {
                profiles: result,
                summary: overallSummary,
                stockLength,
                kerf,
                algorithm
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo kế hoạch cắt: " + err.message
        });
    }
};

// GET cutting plan for door drawing
exports.getCuttingPlan = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT * FROM door_cutting_plan WHERE door_drawing_id = ? ORDER BY profile_code`,
            [id]
        );

        // Parse plan_json
        const plans = rows.map(row => ({
            ...row,
            bars: typeof row.plan_json === 'string' ? JSON.parse(row.plan_json) : row.plan_json
        }));

        // Calculate overall summary
        const totalBars = plans.reduce((sum, p) => sum + p.total_bars, 0);
        const totalWaste = plans.reduce((sum, p) => sum + p.total_waste_mm, 0);

        res.json({
            success: true,
            data: {
                plans: plans,
                summary: {
                    total_bars: totalBars,
                    total_waste_mm: totalWaste
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy kế hoạch cắt"
        });
    }
};



