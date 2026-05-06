/**
 * BOM Auto-Save Service
 * Tự động tính và lưu BOM khi cửa được tạo/cập nhật
 */

const db = require("../config/db");
const bomEngineV3 = require("./bomEngineV3");
const bomControllerV2 = require("../controllers/bomControllerV2");

/**
 * Tự động tính và lưu BOM cho cửa
 * @param {number} doorDesignId - ID của door_designs
 * @param {number} projectId - ID của project
 * @param {number} doorDrawingId - ID của door_drawings (optional)
 */
async function autoCalculateAndSaveBOM(doorDesignId, projectId, doorDrawingId = null) {
    try {
        // Lấy thông tin cửa
        const [doorRows] = await db.query(`
            SELECT 
                dd.*,
                dt.structure_json,
                a.id AS aluminum_system_id,
                a.code AS aluminum_code,
                a.name AS aluminum_name,
                drw.id AS drawing_id,
                drw.drawing_data,
                drw.width_mm AS drawing_width_mm,
                drw.height_mm AS drawing_height_mm,
                drw.params_json AS drawing_params_json
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            LEFT JOIN door_drawings drw ON (dd.door_drawing_id = drw.id OR drw.door_design_id = dd.id)
            WHERE dd.id = ? AND dd.project_id = ?
            ORDER BY drw.created_at DESC
            LIMIT 1
        `, [doorDesignId, projectId]);

        if (doorRows.length === 0) {
            console.warn(`Door not found: doorDesignId=${doorDesignId}, projectId=${projectId}`);
            return { success: false, message: "Không tìm thấy cửa" };
        }

        const door = doorRows[0];
        
        // Xác định door_drawing_id
        const finalDrawingId = doorDrawingId || door.drawing_id || null;
        
        if (!finalDrawingId) {
            console.warn(`No door drawing found for door ${doorDesignId}, skipping BOM calculation`);
            return { success: false, message: "Chưa có bản vẽ cửa" };
        }

        // Lấy kích thước và params
        let width = door.width_mm || 0;
        let height = door.height_mm || 0;
        let paramsJson = door.params_json || door.drawing_params_json || null;
        let panels = [];

        // Parse params_json để lấy panel tree
        if (paramsJson) {
            try {
                const params = typeof paramsJson === 'string' ? JSON.parse(paramsJson) : paramsJson;
                if (params.width) width = params.width;
                if (params.height) height = params.height;
                if (params.rootPanel) {
                    // Sử dụng bomEngineV3 để tính BOM từ panel tree
                    return await calculateBOMFromPanelTree(
                        finalDrawingId,
                        doorDesignId,
                        projectId,
                        door,
                        params
                    );
                }
                if (params.panels) panels = params.panels;
            } catch (e) {
                console.error('Error parsing params_json:', e);
            }
        }

        // Lấy từ drawing_data nếu có
        if (door.drawing_data) {
            try {
                const drawingData = typeof door.drawing_data === 'string' 
                    ? JSON.parse(door.drawing_data) 
                    : door.drawing_data;
                
                if (drawingData.doorWidth) width = drawingData.doorWidth;
                if (drawingData.doorHeight) height = drawingData.doorHeight;
                if (drawingData.panels) panels = drawingData.panels;
            } catch (e) {
                console.error('Error parsing drawing_data:', e);
            }
        }

        if (width === 0 && door.drawing_width_mm) width = door.drawing_width_mm;
        if (height === 0 && door.drawing_height_mm) height = door.drawing_height_mm;

        if (width === 0 || height === 0) {
            console.warn(`Invalid dimensions for door ${doorDesignId}: width=${width}, height=${height}`);
            return { success: false, message: "Thiếu kích thước cửa" };
        }

        // Tính BOM sử dụng bomControllerV2
        const bomItems = await calculateBOMItems(door, width, height, panels);

        // Lưu BOM vào database
        await saveBOMToDatabase(finalDrawingId, doorDesignId, bomItems);

        // Cập nhật tổng hợp vật tư cho project
        await updateProjectMaterialSummary(projectId);

        return { 
            success: true, 
            bomItemsCount: bomItems.length,
            drawingId: finalDrawingId
        };
    } catch (err) {
        console.error('Error in autoCalculateAndSaveBOM:', err);
        return { success: false, message: err.message };
    }
}

/**
 * Tính BOM từ Panel Tree (sử dụng bomEngineV3)
 */
async function calculateBOMFromPanelTree(doorDrawingId, doorDesignId, projectId, door, paramsJson) {
    try {
        const systemId = door.aluminum_system_id;
        if (!systemId) {
            return { success: false, message: "Chưa chọn hệ nhôm" };
        }

        // Sử dụng bomEngineV3 để generate BOM
        const bomItems = await bomEngineV3.generateBOMFromPanelTree(
            doorDrawingId,
            paramsJson,
            systemId
        );

        // Lưu BOM vào database
        await saveBOMToDatabase(doorDrawingId, doorDesignId, bomItems);

        // Cập nhật tổng hợp vật tư cho project
        await updateProjectMaterialSummary(projectId);

        return { 
            success: true, 
            bomItemsCount: bomItems.length,
            drawingId: doorDrawingId
        };
    } catch (err) {
        console.error('Error calculating BOM from panel tree:', err);
        return { success: false, message: err.message };
    }
}

/**
 * Tính BOM items sử dụng logic từ bomControllerV2
 */
async function calculateBOMItems(door, width, height, panels) {
    const bomItems = [];
    const doorType = door.door_type || 'swing_single';

    // 1. Tính nhôm
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

    // 2. Tính kính
    const glassItems = calculateGlassBOM(width, height, panels, doorType);
    bomItems.push(...glassItems);

    // 3. Tính phụ kiện
    const accessoryItems = await calculateAccessoryBOM(doorType, panels.length || 1);
    bomItems.push(...accessoryItems);

    // 4. Tính vật tư khác
    const otherItems = calculateOtherMaterialsBOM(width, height, panels.length || 1);
    bomItems.push(...otherItems);

    return bomItems;
}

/**
 * Tính nhôm (tái sử dụng logic từ bomControllerV2)
 */
async function calculateAluminumBOM(systemId, doorType, width, height, panels) {
    const items = [];

    // Get cutting formulas
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
        const calculated = calculateFormula(formula.formula_expression, width, height);
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
                description: profile ? profile.profile_name : getProfileName(formula.profile_type),
                length_mm: length_mm,
                qty: quantity,
                unit: 'mm',
                weight_kg: parseFloat(weight_kg.toFixed(3)),
                note: `Hệ nhôm: ${system.name || system.code}`
            });
        }
    }

    // Default calculation if no formulas
    if (items.length === 0) {
        const weightPerMeter = system.weight_per_meter || 1.2;
        const deduction = 50;

        items.push({
            item_type: 'frame',
            item_code: `${system.code || 'AL'}-FRAME-TOP`,
            description: `${system.name || 'Nhôm'} - Thanh ngang trên`,
            length_mm: width - deduction * 2,
            qty: 1,
            unit: 'mm',
            note: 'Khung ngang trên'
        });

        items.push({
            item_type: 'frame',
            item_code: `${system.code || 'AL'}-FRAME-BOTTOM`,
            description: `${system.name || 'Nhôm'} - Thanh ngang dưới`,
            length_mm: width - deduction * 2,
            qty: 1,
            unit: 'mm',
            note: 'Khung ngang dưới'
        });

        items.push({
            item_type: 'frame',
            item_code: `${system.code || 'AL'}-FRAME-LEFT`,
            description: `${system.name || 'Nhôm'} - Thanh đứng trái`,
            length_mm: height - deduction * 2,
            qty: 1,
            unit: 'mm',
            note: 'Khung đứng trái'
        });

        items.push({
            item_type: 'frame',
            item_code: `${system.code || 'AL'}-FRAME-RIGHT`,
            description: `${system.name || 'Nhôm'} - Thanh đứng phải`,
            length_mm: height - deduction * 2,
            qty: 1,
            unit: 'mm',
            note: 'Khung đứng phải'
        });
    }

    return items;
}

/**
 * Tính kính
 */
function calculateGlassBOM(width, height, panels, doorType) {
    const items = [];
    
    if (panels.length > 0) {
        panels.forEach((panel, index) => {
            const panelWidth = panel.width || (width / panels.length);
            const panelHeight = panel.height || height;
            const glassWidth = Math.max(0, panelWidth - 40);
            const glassHeight = Math.max(0, panelHeight - 40);
            const area_m2 = (glassWidth * glassHeight) / 1000000;

            items.push({
                item_type: 'glass',
                item_code: `GLASS-${index + 1}`,
                description: `Kính - Cánh ${index + 1}`,
                width_mm: Math.round(glassWidth),
                height_mm: Math.round(glassHeight),
                qty: 1,
                unit: 'm2',
                area_m2: parseFloat(area_m2.toFixed(3)),
                note: `Cánh ${index + 1}`
            });
        });
    } else {
        const glassWidth = Math.max(0, width - 40);
        const glassHeight = Math.max(0, height - 40);
        const area_m2 = (glassWidth * glassHeight) / 1000000;

        items.push({
            item_type: 'glass',
            item_code: 'GLASS-1',
            description: 'Kính',
            width_mm: Math.round(glassWidth),
            height_mm: Math.round(glassHeight),
            qty: 1,
            unit: 'm2',
            area_m2: parseFloat(area_m2.toFixed(3)),
            note: 'Kính chính'
        });
    }

    return items;
}

/**
 * Tính phụ kiện
 */
async function calculateAccessoryBOM(doorType, panelCount) {
    const items = [];

    // Get recommended accessories
    const [rules] = await db.query(`
        SELECT 
            a.*,
            aur.quantity,
            aur.position,
            aur.is_required
        FROM accessories a
        INNER JOIN accessory_usage_rules aur ON a.id = aur.accessory_id
        WHERE aur.door_type = ? AND a.is_active = 1
    `, [doorType]);

    // Group by accessory
    const accessoryMap = {};
    rules.forEach(rule => {
        const key = rule.id;
        if (!accessoryMap[key]) {
            accessoryMap[key] = {
                item_type: 'accessory',
                item_code: rule.code,
                description: rule.name,
                qty: 0,
                unit: rule.unit,
                note: rule.position || ''
            };
        }
        accessoryMap[key].qty += (rule.quantity || 1) * panelCount;
    });

    Object.values(accessoryMap).forEach(item => {
        items.push(item);
    });

    return items;
}

/**
 * Tính vật tư khác
 */
function calculateOtherMaterialsBOM(width, height, panelCount) {
    const perimeter = (width + height) * 2;
    const items = [];

    items.push({
        item_type: 'gasket',
        item_code: 'GASKET',
        description: 'Gioăng kính',
        length_mm: Math.round(perimeter * panelCount),
        qty: 1,
        unit: 'mm',
        note: 'Gioăng kính'
    });

    items.push({
        item_type: 'other',
        item_code: 'SEALANT',
        description: 'Keo silicon',
        length_mm: Math.round(perimeter * panelCount),
        qty: 1,
        unit: 'mm',
        note: 'Keo silicon'
    });

    return items;
}

/**
 * Lưu BOM vào database
 */
async function saveBOMToDatabase(doorDrawingId, doorDesignId, bomItems) {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Xóa BOM cũ
        await connection.query(
            "DELETE FROM door_bom_lines WHERE door_drawing_id = ?",
            [doorDrawingId]
        );

        // Lưu BOM mới
        for (const item of bomItems) {
            await connection.query(`
                INSERT INTO door_bom_lines 
                (door_drawing_id, item_type, item_code, description, 
                 length_mm, width_mm, height_mm, qty, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                doorDrawingId,
                item.item_type || 'other',
                item.item_code || null,
                item.description || item.item_name || '',
                item.length_mm || null,
                item.width_mm || null,
                item.height_mm || null,
                item.qty || item.quantity || 1,
                item.note || null
            ]);
        }

        // Cập nhật summary
        await updateBOMSummary(doorDrawingId, bomItems, connection);

        await connection.commit();
        connection.release();
    } catch (err) {
        await connection.rollback();
        connection.release();
        throw err;
    }
}

/**
 * Cập nhật BOM summary
 */
async function updateBOMSummary(doorDrawingId, bomItems, connection) {
    // Xóa summary cũ
    await connection.query(
        "DELETE FROM door_bom_summary WHERE door_drawing_id = ?",
        [doorDrawingId]
    );

    // Nhóm theo item_type
    const summaryMap = {};
    
    bomItems.forEach(item => {
        const type = item.item_type || 'other';
        if (!summaryMap[type]) {
            summaryMap[type] = {
                item_type: type,
                total_qty: 0,
                total_length_mm: 0,
                total_area_m2: 0
            };
        }

        summaryMap[type].total_qty += parseFloat(item.qty || item.quantity || 1);
        
        if (item.length_mm) {
            summaryMap[type].total_length_mm += (item.length_mm * (item.qty || item.quantity || 1));
        }
        
        if (item.area_m2) {
            summaryMap[type].total_area_m2 += item.area_m2;
        } else if (item.width_mm && item.height_mm) {
            const area = (item.width_mm * item.height_mm * (item.qty || item.quantity || 1)) / 1000000;
            summaryMap[type].total_area_m2 += area;
        }
    });

    // Lưu summary
    for (const [type, summary] of Object.entries(summaryMap)) {
        await connection.query(`
            INSERT INTO door_bom_summary 
            (door_drawing_id, item_type, total_qty, total_length_mm, total_area_m2)
            VALUES (?, ?, ?, ?, ?)
        `, [
            doorDrawingId,
            summary.item_type,
            summary.total_qty,
            Math.round(summary.total_length_mm),
            parseFloat(summary.total_area_m2.toFixed(3))
        ]);
    }
}

/**
 * Cập nhật tổng hợp vật tư cho project
 */
async function updateProjectMaterialSummary(projectId) {
    try {
        // Xóa summary cũ
        await db.query(
            "DELETE FROM projects_material_summary WHERE project_id = ?",
            [projectId]
        );

        // Lấy tất cả BOM của các cửa trong project
        const [bomRows] = await db.query(`
            SELECT 
                dbl.*,
                dd.project_id
            FROM door_bom_lines dbl
            INNER JOIN door_drawings ddw ON dbl.door_drawing_id = ddw.id
            INNER JOIN door_designs dd ON (ddw.door_design_id = dd.id OR dd.door_drawing_id = ddw.id)
            WHERE dd.project_id = ?
        `, [projectId]);

        // Nhóm theo item_code và item_type
        const summaryMap = {};
        
        bomRows.forEach(row => {
            const key = `${row.item_type}_${row.item_code || 'UNKNOWN'}`;
            if (!summaryMap[key]) {
                summaryMap[key] = {
                    project_id: projectId,
                    item_type: row.item_type,
                    item_code: row.item_code,
                    total_qty: 0,
                    total_length_mm: 0,
                    total_area_m2: 0
                };
            }

            summaryMap[key].total_qty += parseFloat(row.qty || 1);
            if (row.length_mm) {
                summaryMap[key].total_length_mm += (row.length_mm * (row.qty || 1));
            }
            if (row.width_mm && row.height_mm) {
                const area = (row.width_mm * row.height_mm * (row.qty || 1)) / 1000000;
                summaryMap[key].total_area_m2 += area;
            }
        });

        // Lưu summary
        for (const [key, summary] of Object.entries(summaryMap)) {
            await db.query(`
                INSERT INTO projects_material_summary 
                (project_id, item_type, item_code, total_qty, total_length_mm, total_area_m2)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                summary.project_id,
                summary.item_type,
                summary.item_code,
                summary.total_qty,
                Math.round(summary.total_length_mm),
                parseFloat(summary.total_area_m2.toFixed(3))
            ]);
        }
    } catch (err) {
        console.error('Error updating project material summary:', err);
        // Không throw để không làm gián đoạn flow chính
    }
}

// Helper functions
function calculateFormula(expression, width, height) {
    try {
        let expr = expression.replace(/W/g, width).replace(/H/g, height);
        expr = expr.replace(/\s+/g, '');
        if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
            return null;
        }
        return Function(`"use strict"; return (${expr})`)();
    } catch (e) {
        console.error('Error calculating formula:', expression, e);
        return null;
    }
}

function getProfileQuantity(profileType, doorType, panelCount) {
    const quantityMap = {
        'frame_vertical': 2,
        'frame_horizontal': 2,
        'panel_left': doorType.includes('single') ? 1 : (doorType.includes('double') ? 1 : 0),
        'panel_right': doorType.includes('single') ? 0 : (doorType.includes('double') ? 1 : 0),
        'mullion': panelCount > 1 ? panelCount - 1 : 0,
        'glass_bead': panelCount * 4
    };
    return quantityMap[profileType] || 1;
}

function getProfileName(profileType) {
    const names = {
        'frame_vertical': 'Khung đứng',
        'frame_horizontal': 'Khung ngang',
        'panel_left': 'Cánh trái',
        'panel_right': 'Cánh phải',
        'mullion': 'Đố giữa',
        'glass_bead': 'Nẹp kính'
    };
    return names[profileType] || profileType;
}

module.exports = {
    autoCalculateAndSaveBOM,
    updateProjectMaterialSummary
};





















