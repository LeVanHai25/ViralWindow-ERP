/**
 * =====================================================
 * ACT STYLE CALC ENGINE v2.0
 * =====================================================
 * 
 * KIẾN TRÚC:
 * project_item → item_version → load config → load structure
 *      ↓
 * áp rule theo item_type (+ override theo aluminum_system)
 *      ↓
 * sinh BOM theo NHÓM (aluminum, glass, hardware, consumable)
 * 
 * V2.1 UPDATE: Thêm support cho item_structure_templates (VW-AL55)
 * =====================================================
 */

const db = require('../../config/db');
const bomCalcEngineV2 = require('../bomCalcEngineV2');

/**
 * Main Calc Engine - Tính BOM cho 1 project_item
 * @param {number} projectItemId - ID của project_item
 * @param {number} versionId - ID của item_version (optional, mặc định lấy current)
 * @returns {Object} BOM data theo 4 nhóm vật tư
 */
async function calculateBOM(projectItemId, versionId = null) {
    try {
        // 1. Lấy thông tin project_item
        const [items] = await db.query(`
            SELECT pi.*, p.project_name, c.full_name as customer_name
            FROM project_items_v2 pi
            LEFT JOIN projects p ON pi.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE pi.id = ?
        `, [projectItemId]);

        if (items.length === 0) {
            throw new Error('Project item not found');
        }

        const item = items[0];

        // 2. Lấy version (current hoặc specified)
        let version;
        if (versionId) {
            const [versions] = await db.query(
                'SELECT * FROM item_versions WHERE id = ? AND project_item_id = ?',
                [versionId, projectItemId]
            );
            version = versions[0];
        } else {
            const [versions] = await db.query(
                'SELECT * FROM item_versions WHERE project_item_id = ? ORDER BY version_number DESC LIMIT 1',
                [projectItemId]
            );
            version = versions[0];
        }

        if (!version) {
            throw new Error('No version found for this item');
        }

        // 3. Lấy config (kích thước & cấu hình)
        const [configs] = await db.query(
            'SELECT * FROM item_config WHERE item_version_id = ?',
            [version.id]
        );
        const config = configs[0] || {};

        // ========================================
        // V2.1: CHECK IF HAS TEMPLATE_CODE → USE NEW ENGINE
        // ========================================
        if (config.template_code) {
            try {
                const templateResult = await bomCalcEngineV2.calculateBOM(
                    config.template_code,
                    config.width_mm || 1200,
                    config.height_mm || 2200
                );

                // Map to expected response format
                return {
                    success: true,
                    item: {
                        id: item.id,
                        item_type: item.item_type,
                        item_code: item.item_code,
                        item_name: item.item_name,
                        quantity: item.quantity
                    },
                    version: {
                        id: version.id,
                        version_number: version.version_number
                    },
                    config: {
                        width_mm: config.width_mm,
                        height_mm: config.height_mm,
                        length_mm: config.length_mm,
                        leaf_count: config.leaf_count,
                        aluminum_system: config.aluminum_system,
                        template_code: config.template_code
                    },
                    bom: templateResult.bom,
                    summary: templateResult.summary
                };
            } catch (templateError) {
                console.warn('Template engine failed, falling back to rules:', templateError.message);
                // Fall through to rules-based calculation
            }
        }
        // ========================================

        // 4. Load rules (cấp 1 + cấp 2 override)
        const rules = await loadRules(item.item_type, config.aluminum_system);

        // 5. Tính toán context cho formulas
        const context = buildCalculationContext(config, item);

        // 6. Tính BOM theo 4 nhóm
        const bomResult = {
            aluminum: await calculateAluminum(version.id, rules, context),
            glass: await calculateGlass(version.id, rules, context),
            hardware: await calculateHardware(version.id, rules, context),
            consumables: await calculateConsumables(version.id, rules, context)
        };

        // 7. Tính tổng
        const summary = calculateSummary(bomResult, context);

        return {
            success: true,
            item: {
                id: item.id,
                item_type: item.item_type,
                item_code: item.item_code,
                item_name: item.item_name,
                quantity: item.quantity
            },
            version: {
                id: version.id,
                version_number: version.version_number
            },
            config: {
                width_mm: config.width_mm,
                height_mm: config.height_mm,
                length_mm: config.length_mm,
                leaf_count: config.leaf_count,
                aluminum_system: config.aluminum_system
            },
            bom: bomResult,
            summary: summary
        };

    } catch (error) {
        console.error('CalcEngine Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}


/**
 * Load rules (cấp 1 + override cấp 2)
 */
async function loadRules(itemType, aluminumSystem) {
    // Load cấp 1
    const [typeRules] = await db.query(`
        SELECT * FROM item_type_rules 
        WHERE item_type = ? AND is_active = 1
        ORDER BY rule_category, priority DESC, sort_order
    `, [itemType]);

    // Load cấp 2 (override)
    let systemRules = [];
    if (aluminumSystem) {
        const [overrides] = await db.query(`
            SELECT * FROM item_type_system_rules 
            WHERE item_type = ? AND aluminum_system = ? AND is_active = 1
            ORDER BY rule_category, priority DESC, sort_order
        `, [itemType, aluminumSystem]);
        systemRules = overrides;
    }

    // Merge: system rules override type rules (by rule_code)
    const rulesMap = {};

    // Add type rules first
    for (const rule of typeRules) {
        const key = `${rule.rule_category}_${rule.rule_code}`;
        rulesMap[key] = rule;
    }

    // Override with system rules
    for (const rule of systemRules) {
        const key = `${rule.rule_category}_${rule.rule_code}`;
        rulesMap[key] = rule; // Override
    }

    // Group by category
    const grouped = {
        structure: [],
        bom: [],
        pricing: []
    };

    for (const rule of Object.values(rulesMap)) {
        if (grouped[rule.rule_category]) {
            grouped[rule.rule_category].push(rule);
        }
    }

    return grouped;
}

/**
 * Build calculation context từ config
 */
function buildCalculationContext(config, item) {
    const W = config.width_mm || 1200;
    const H = config.height_mm || 2200;
    const L = config.length_mm || W;  // Cho lan can, mái
    const D = config.depth_mm || 0;
    const slope = config.slope_deg || 0;

    const leafCount = config.leaf_count || 1;
    const spanCount = config.span_count || 1;

    const perimeter = 2 * (W + H) / 1000;  // m

    return {
        W, H, L, D, slope,
        width_mm: W,
        height_mm: H,
        length_mm: L,
        leaf_count: leafCount,
        span_count: spanCount,
        perimeter: perimeter,
        perimeter_mm: 2 * (W + H),
        area_m2: (W * H) / 1000000,
        quantity: item.quantity || 1,
        aluminum_system: config.aluminum_system || 'XINGFA_55',
        handrail_height: config.handrail_height_mm || 1000
    };
}

/**
 * Evaluate formula với context
 */
function evaluateFormula(formula, context) {
    if (!formula) return 0;

    try {
        // Replace variables
        let expr = formula
            .replace(/\bW\b/g, context.W)
            .replace(/\bH\b/g, context.H)
            .replace(/\bL\b/g, context.L)
            .replace(/\bD\b/g, context.D)
            .replace(/\bleaf_count\b/g, context.leaf_count)
            .replace(/\bspan_count\b/g, context.span_count)
            .replace(/\bperimeter\b/g, context.perimeter)
            .replace(/\bperimeter_mm\b/g, context.perimeter_mm)
            .replace(/\bhandrail_height\b/g, context.handrail_height)
            .replace(/\bslope\b/g, context.slope);

        // Handle math functions
        expr = expr.replace(/sqrt\(/g, 'Math.sqrt(');
        expr = expr.replace(/cos\(/g, 'Math.cos(Math.PI/180*');
        expr = expr.replace(/sin\(/g, 'Math.sin(Math.PI/180*');

        // Evaluate
        const result = eval(expr);
        return typeof result === 'number' ? result : 0;
    } catch (e) {
        console.warn('Formula evaluation error:', formula, e.message);
        return 0;
    }
}

/**
 * Tính BOM Nhôm
 */
async function calculateAluminum(versionId, rules, context) {
    const bomLines = [];

    // Lấy structure aluminum từ DB (nếu có)
    const [structures] = await db.query(`
        SELECT * FROM item_structure_aluminum 
        WHERE item_version_id = ? 
        ORDER BY sort_order
    `, [versionId]);

    // Nếu có structure trong DB, dùng nó
    if (structures.length > 0) {
        for (const struct of structures) {
            const cutLength = evaluateFormula(struct.length_formula, context);
            const quantity = 1; // Mỗi structure line là 1
            const weightPerM = 0.5; // Default, sau lấy từ profile
            const weightKg = (cutLength / 1000) * weightPerM * quantity;

            bomLines.push({
                material_code: struct.profile_code,
                material_name: struct.profile_name,
                position: struct.position,
                direction: struct.direction,
                cut_length_mm: Math.round(cutLength),
                cut_angle: struct.cut_angle,
                quantity: quantity,
                weight_kg: parseFloat(weightKg.toFixed(3)),
                formula_used: struct.length_formula
            });
        }
    } else {
        // Dùng rules để sinh structure
        for (const rule of rules.structure) {
            const params = parseJSON(rule.parameters);
            if (!params.position) continue;

            const positions = params.position.split(',');
            for (const pos of positions) {
                const cutLength = evaluateFormula(rule.formula, context);
                const qty = params.per_leaf ? context.leaf_count : 1;
                const weightPerM = 0.5;
                const weightKg = (cutLength / 1000) * weightPerM * qty;

                bomLines.push({
                    material_code: params.profile_code || `AL_${pos.toUpperCase()}`,
                    material_name: rule.rule_name,
                    position: pos.trim(),
                    direction: params.direction || 'vertical',
                    cut_length_mm: Math.round(cutLength),
                    cut_angle: params.cut_angle || '90-90',
                    quantity: qty,
                    weight_kg: parseFloat(weightKg.toFixed(3)),
                    formula_used: rule.formula
                });
            }
        }
    }

    // Tính tổng
    const totalWeight = bomLines.reduce((sum, l) => sum + (l.weight_kg || 0), 0);
    const totalLength = bomLines.reduce((sum, l) => sum + ((l.cut_length_mm || 0) * (l.quantity || 1)), 0);

    return {
        lines: bomLines,
        total_weight_kg: parseFloat(totalWeight.toFixed(3)),
        total_length_mm: totalLength,
        total_length_m: parseFloat((totalLength / 1000).toFixed(3))
    };
}

/**
 * Tính BOM Kính
 */
async function calculateGlass(versionId, rules, context) {
    const bomLines = [];

    // Lấy structure glass từ DB (nếu có)
    const [structures] = await db.query(`
        SELECT * FROM item_structure_glass 
        WHERE item_version_id = ? 
        ORDER BY sort_order
    `, [versionId]);

    if (structures.length > 0) {
        for (const struct of structures) {
            const width = evaluateFormula(struct.width_formula, context);
            const height = evaluateFormula(struct.height_formula, context);
            const area = (width * height) / 1000000;

            bomLines.push({
                material_code: struct.glass_type_code,
                material_name: struct.glass_type_name,
                position: struct.position,
                width_mm: Math.round(width),
                height_mm: Math.round(height),
                quantity: 1,
                area_m2: parseFloat(area.toFixed(6)),
                formula_used: `${struct.width_formula} x ${struct.height_formula}`
            });
        }
    } else {
        // Dùng BOM rules để tính kính - tìm rule có GLASS trong code hoặc position=sash
        let glassRule = rules.bom.find(r => r.rule_code.includes('GLASS'));

        // Parse deduction từ GLASS_DEDUCTION rule nếu có
        let widthDeduct = 80, heightDeduct = 150;
        const deductRule = rules.bom.find(r => r.rule_code.includes('DEDUCTION'));
        if (deductRule) {
            const deductParams = parseJSON(deductRule.parameters);
            widthDeduct = deductParams.width_deduct || 80;
            heightDeduct = deductParams.height_deduct || 150;
        }

        // Luôn tính kính nếu có kích thước
        if (context.W > 0 && context.H > 0) {
            const glassWidth = (context.W / context.leaf_count) - widthDeduct;
            const glassHeight = context.H - heightDeduct;
            const area = (glassWidth * glassHeight) / 1000000;
            const qty = context.leaf_count;

            bomLines.push({
                material_code: 'TEMPERED_8',
                material_name: 'Kính cường lực 8mm',
                position: 'sash',
                width_mm: Math.round(glassWidth),
                height_mm: Math.round(glassHeight),
                quantity: qty,
                area_m2: parseFloat((area * qty).toFixed(6)),
                formula_used: glassRule ? glassRule.formula : `(W/leaf_count-${widthDeduct})*(H-${heightDeduct})`
            });
        }
    }

    const totalArea = bomLines.reduce((sum, l) => sum + (l.area_m2 || 0), 0);

    return {
        lines: bomLines,
        total_area_m2: parseFloat(totalArea.toFixed(3))
    };
}

/**
 * Tính BOM Phụ kiện
 */
async function calculateHardware(versionId, rules, context) {
    const bomLines = [];

    // Lấy từ DB nếu có
    const [structures] = await db.query(`
        SELECT * FROM item_structure_hardware 
        WHERE item_version_id = ? 
        ORDER BY sort_order
    `, [versionId]);

    if (structures.length > 0) {
        for (const struct of structures) {
            const qty = evaluateFormula(struct.quantity_formula, context);
            bomLines.push({
                material_code: struct.hardware_code,
                material_name: struct.hardware_name,
                quantity: Math.ceil(qty),
                unit: 'pcs',
                formula_used: struct.quantity_formula
            });
        }
    } else {
        // Dùng BOM rules - Hardware có unit là pcs hoặc set
        const hwRuleCodes = ['HINGE', 'LOCK', 'HANDLE', 'ROLLER', 'STAY_ARM', 'POST_CAP', 'GLASS_CLAMP', 'STANDOFF'];

        for (const rule of rules.bom) {
            const params = parseJSON(rule.parameters);
            const isHardware = hwRuleCodes.some(code => rule.rule_code.includes(code)) ||
                params.unit === 'pcs' || params.unit === 'set';

            // Loại trừ các rule kính và gioăng
            if (rule.rule_code.includes('GLASS') || rule.rule_code.includes('GASKET') ||
                rule.rule_code.includes('SEAL') || params.unit === 'm') continue;

            if (!isHardware) continue;

            const qty = evaluateFormula(rule.formula, context);
            if (qty <= 0) continue;

            bomLines.push({
                material_code: rule.rule_code,
                material_name: rule.rule_name,
                quantity: Math.ceil(qty),
                unit: params.unit || 'pcs',
                formula_used: rule.formula
            });
        }
    }

    const totalCount = bomLines.reduce((sum, l) => sum + (l.quantity || 0), 0);

    return {
        lines: bomLines,
        total_count: totalCount
    };
}

/**
 * Tính BOM Gioăng, Keo
 */
async function calculateConsumables(versionId, rules, context) {
    const bomLines = [];

    // Lấy từ DB nếu có
    const [structures] = await db.query(`
        SELECT * FROM item_structure_consumables 
        WHERE item_version_id = ? 
        ORDER BY sort_order
    `, [versionId]);

    if (structures.length > 0) {
        for (const struct of structures) {
            const qty = evaluateFormula(struct.quantity_formula, context);
            bomLines.push({
                material_code: struct.material_code,
                material_name: struct.material_name,
                quantity: parseFloat(qty.toFixed(2)),
                unit: struct.unit,
                formula_used: struct.quantity_formula
            });
        }
    } else {
        // Dùng BOM rules - Consumables: gioăng, keo (unit = m hoặc chứa GASKET/SEAL)
        for (const rule of rules.bom) {
            const params = parseJSON(rule.parameters);
            const isConsumable = params.unit === 'm' ||
                rule.rule_code.includes('GASKET') ||
                rule.rule_code.includes('SEAL');

            if (!isConsumable) continue;

            const qty = evaluateFormula(rule.formula, context);
            if (qty <= 0) continue;

            bomLines.push({
                material_code: rule.rule_code,
                material_name: rule.rule_name,
                quantity: parseFloat(qty.toFixed(2)),
                unit: params.unit || 'm',
                formula_used: rule.formula
            });
        }
    }

    return {
        lines: bomLines
    };
}

/**
 * Tính tổng hợp
 */
function calculateSummary(bomResult, context) {
    // Giá mặc định
    const ALUMINUM_PRICE_PER_KG = 90000;
    const GLASS_PRICE_PER_M2 = 520000;
    const HARDWARE_AVG_PRICE = 150000;
    const CONSUMABLE_PRICE_PER_M = 10000;

    const aluminumCost = (bomResult.aluminum.total_weight_kg || 0) * ALUMINUM_PRICE_PER_KG;
    const glassCost = (bomResult.glass.total_area_m2 || 0) * GLASS_PRICE_PER_M2;
    const hardwareCost = (bomResult.hardware.total_count || 0) * HARDWARE_AVG_PRICE;

    let consumablesCost = 0;
    for (const line of bomResult.consumables.lines || []) {
        if (line.unit === 'm') {
            consumablesCost += line.quantity * CONSUMABLE_PRICE_PER_M;
        } else {
            consumablesCost += line.quantity * 5000;
        }
    }

    const totalCost = aluminumCost + glassCost + hardwareCost + consumablesCost;
    const costPerUnit = Math.round(totalCost / context.quantity);

    return {
        aluminum_kg: bomResult.aluminum.total_weight_kg || 0,
        aluminum_cost: Math.round(aluminumCost),
        glass_m2: bomResult.glass.total_area_m2 || 0,
        glass_cost: Math.round(glassCost),
        hardware_count: bomResult.hardware.total_count || 0,
        hardware_cost: Math.round(hardwareCost),
        consumables_cost: Math.round(consumablesCost),
        total_cost: Math.round(totalCost),
        cost_per_unit: costPerUnit
    };
}

/**
 * Helper: Parse JSON safely
 */
function parseJSON(str) {
    if (!str) return {};
    if (typeof str === 'object') return str;
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
}

/**
 * Lưu BOM vào database
 */
async function saveBOM(projectItemId, versionId, bomData) {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Tạo BOM version mới
        const [bomVersionResult] = await connection.query(`
            INSERT INTO item_bom_versions 
            (project_item_id, source_item_version_id, bom_version_number, status,
             total_aluminum_kg, total_glass_m2, total_cost)
            SELECT ?, ?, COALESCE(MAX(bom_version_number), 0) + 1, 'draft', ?, ?, ?
            FROM item_bom_versions WHERE project_item_id = ?
        `, [
            projectItemId,
            versionId,
            bomData.summary.aluminum_kg,
            bomData.summary.glass_m2,
            bomData.summary.total_cost,
            projectItemId
        ]);

        const bomVersionId = bomVersionResult.insertId;

        // 2. Insert BOM lines
        // Aluminum
        for (const line of bomData.bom.aluminum.lines || []) {
            await connection.query(`
                INSERT INTO item_bom_lines 
                (bom_version_id, material_group, material_code, material_name,
                 quantity, unit, cut_length_mm, cut_angle, weight_kg, position, formula_used)
                VALUES (?, 'aluminum', ?, ?, ?, 'pcs', ?, ?, ?, ?, ?)
            `, [
                bomVersionId,
                line.material_code,
                line.material_name,
                line.quantity,
                line.cut_length_mm,
                line.cut_angle,
                line.weight_kg,
                line.position,
                line.formula_used
            ]);
        }

        // Glass
        for (const line of bomData.bom.glass.lines || []) {
            await connection.query(`
                INSERT INTO item_bom_lines 
                (bom_version_id, material_group, material_code, material_name,
                 quantity, unit, width_mm, height_mm, area_m2, position, formula_used)
                VALUES (?, 'glass', ?, ?, ?, 'pcs', ?, ?, ?, ?, ?)
            `, [
                bomVersionId,
                line.material_code,
                line.material_name,
                line.quantity,
                line.width_mm,
                line.height_mm,
                line.area_m2,
                line.position,
                line.formula_used
            ]);
        }

        // Hardware
        for (const line of bomData.bom.hardware.lines || []) {
            await connection.query(`
                INSERT INTO item_bom_lines 
                (bom_version_id, material_group, material_code, material_name,
                 quantity, unit, formula_used)
                VALUES (?, 'hardware', ?, ?, ?, ?, ?)
            `, [
                bomVersionId,
                line.material_code,
                line.material_name,
                line.quantity,
                line.unit,
                line.formula_used
            ]);
        }

        // Consumables
        for (const line of bomData.bom.consumables.lines || []) {
            await connection.query(`
                INSERT INTO item_bom_lines 
                (bom_version_id, material_group, material_code, material_name,
                 quantity, unit, formula_used)
                VALUES (?, 'consumable', ?, ?, ?, ?, ?)
            `, [
                bomVersionId,
                line.material_code,
                line.material_name,
                line.quantity,
                line.unit,
                line.formula_used
            ]);
        }

        // 3. Update project_item status
        await connection.query(`
            UPDATE project_items_v2 SET status = 'bom_generated', updated_at = NOW()
            WHERE id = ?
        `, [projectItemId]);

        await connection.commit();

        return {
            success: true,
            bom_version_id: bomVersionId
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    calculateBOM,
    saveBOM,
    loadRules,
    evaluateFormula
};
