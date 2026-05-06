/**
 * BOM Calculation Engine V2
 * 
 * Tính BOM từ item_structure_templates + kích thước thực tế
 * Input: template_code + width_mm + height_mm
 * Output: BOM với 4 nhóm (aluminum, glass, hardware, consumables) + PRICING
 */

const db = require('../config/db');

class BomCalcEngineV2 {
    constructor() {
        this.systemCache = {};
        this.templateCache = {};
    }

    /**
     * Tính BOM cho một item
     * @param {string} templateCode - Mã template (VWDOOR_1L, VWWIN_2LR...)
     * @param {number} widthMm - Chiều rộng thực tế (mm)
     * @param {number} heightMm - Chiều cao thực tế (mm)
     * @returns {Object} BOM result với 4 nhóm vật tư + pricing
     */
    async calculateBOM(templateCode, widthMm, heightMm) {
        // 1. Load template
        const template = await this.loadTemplate(templateCode);
        if (!template) {
            throw new Error(`Template not found: ${templateCode}`);
        }

        // 2. Load system config
        const systemConfig = await this.loadSystemConfig(template.system_code);
        if (!systemConfig) {
            throw new Error(`System config not found: ${template.system_code}`);
        }

        // 3. Parse configs
        const bomRules = this.parseJSON(template.bom_rules_json);
        const profiles = this.parseJSON(systemConfig.profiles_json);
        const hardwareConfigs = this.parseJSON(systemConfig.hardware_config);
        const glassTypes = this.parseJSON(systemConfig.glass_types);
        const consumablesPrices = this.parseJSON(systemConfig.consumables_prices);

        // 4. Calculate each category with pricing
        const aluminum = this.calculateAluminum(bomRules.aluminum, profiles, widthMm, heightMm);
        const glass = this.calculateGlass(bomRules.glass, widthMm, heightMm, glassTypes);
        const hardware = this.calculateHardware(bomRules.hardware, hardwareConfigs);
        const consumables = this.calculateConsumables(bomRules.consumables, widthMm, heightMm, consumablesPrices);

        // 5. Build result with pricing
        const result = {
            template: {
                code: templateCode,
                name: template.template_name,
                type: template.item_type
            },
            config: {
                width_mm: widthMm,
                height_mm: heightMm,
                area_m2: parseFloat(((widthMm * heightMm) / 1000000).toFixed(4)),
                perimeter_m: parseFloat(((widthMm + heightMm) * 2 / 1000).toFixed(3))
            },
            bom: { aluminum, glass, hardware, consumables },
            summary: {
                aluminum_kg: aluminum.total_weight_kg,
                aluminum_cost: aluminum.total_cost,
                glass_m2: glass.total_area_m2,
                glass_cost: glass.total_cost,
                hardware_count: hardware.total_count,
                hardware_cost: hardware.total_cost,
                consumables_cost: consumables.total_cost,
                total_cost: aluminum.total_cost + glass.total_cost + hardware.total_cost + consumables.total_cost
            }
        };

        return result;
    }

    parseJSON(data) {
        if (!data) return {};
        if (typeof data === 'object') return data;
        try { return JSON.parse(data); } catch (e) { return {}; }
    }


    /**
     * Tính nhôm với giá
     */
    calculateAluminum(rules, profiles, W, H) {
        const lines = [];
        let totalWeight = 0;
        let totalCost = 0;

        if (!rules || !Array.isArray(rules)) {
            return { lines: [], total_weight_kg: 0, total_cost: 0 };
        }

        for (const rule of rules) {
            const profile = profiles[rule.profile];
            if (!profile) {
                console.warn(`Profile not found: ${rule.profile}`);
                continue;
            }

            const lengthMm = this.evaluateFormula(rule.formula, { W, H });
            const quantity = rule.qty || 1;
            const totalLengthMm = lengthMm * quantity;
            const totalLengthM = totalLengthMm / 1000;
            const weightKg = totalLengthM * (profile.weight_kg_m || 0.8);
            const pricePerM = profile.price_vnd_m || 70000;
            const lineCost = totalLengthM * pricePerM;

            lines.push({
                profile_code: profile.code,
                material_name: profile.name,
                length_mm: Math.round(lengthMm),
                quantity: quantity,
                total_length_m: parseFloat(totalLengthM.toFixed(3)),
                weight_kg_m: profile.weight_kg_m,
                total_weight_kg: parseFloat(weightKg.toFixed(3)),
                price_vnd_m: pricePerM,
                cost_vnd: Math.round(lineCost),
                position: rule.profile
            });

            totalWeight += weightKg;
            totalCost += lineCost;
        }

        return {
            lines,
            total_weight_kg: parseFloat(totalWeight.toFixed(3)),
            total_cost: Math.round(totalCost)
        };
    }

    /**
     * Tính kính với giá
     */
    calculateGlass(rules, W, H, glassTypes = {}) {
        const lines = [];
        let totalArea = 0;
        let totalCost = 0;

        if (!rules || !Array.isArray(rules)) {
            return { lines: [], total_area_m2: 0, total_cost: 0 };
        }

        // Default prices by thickness
        const defaultPrices = { 6: 380000, 8: 450000, 10: 550000, 12: 680000 };

        for (const rule of rules) {
            const glassWidth = W - (rule.width_deduct || 0);
            const glassHeight = H - (rule.height_deduct || 0);
            const quantity = rule.qty || 1;

            // Nếu là cửa nhiều cánh, tính chiều rộng mỗi tấm
            let actualWidth = glassWidth;
            if (quantity > 1 && !rule.note) {
                actualWidth = (W / quantity) - (rule.width_deduct || 0);
            }

            const areaPer = (actualWidth * glassHeight) / 1000000;
            const totalAreaItem = areaPer * quantity;

            // Lấy giá từ glassTypes hoặc default
            const glassType = glassTypes[rule.type] || {};
            const pricePerM2 = glassType.price_vnd_m2 || defaultPrices[rule.thickness] || 450000;
            const lineCost = totalAreaItem * pricePerM2;

            lines.push({
                material_code: rule.type || `tempered_${rule.thickness}`,
                material_name: glassType.name || `Kính cường lực ${rule.thickness}mm`,
                thickness_mm: rule.thickness,
                width_mm: Math.round(actualWidth),
                height_mm: Math.round(glassHeight),
                area_m2: parseFloat(areaPer.toFixed(4)),
                quantity: quantity,
                total_area_m2: parseFloat(totalAreaItem.toFixed(4)),
                price_vnd_m2: pricePerM2,
                cost_vnd: Math.round(lineCost)
            });

            totalArea += totalAreaItem;
            totalCost += lineCost;
        }

        return {
            lines,
            total_area_m2: parseFloat(totalArea.toFixed(4)),
            total_cost: Math.round(totalCost)
        };
    }

    /**
     * Tính phụ kiện với giá
     */
    calculateHardware(hardwareKey, hardwareConfigs) {
        const lines = [];
        let totalCount = 0;
        let totalCost = 0;

        if (!hardwareKey || !hardwareConfigs) {
            return { lines: [], total_count: 0, total_cost: 0 };
        }

        const config = hardwareConfigs[hardwareKey];
        if (!config || !Array.isArray(config)) {
            return { lines: [], total_count: 0, total_cost: 0 };
        }

        for (const item of config) {
            const pricePerUnit = item.price_vnd || 100000;
            const lineCost = item.qty * pricePerUnit;

            lines.push({
                material_code: item.code,
                material_name: item.name,
                quantity: item.qty,
                unit: item.unit,
                price_vnd: pricePerUnit,
                cost_vnd: Math.round(lineCost)
            });
            totalCount += item.qty;
            totalCost += lineCost;
        }

        return {
            lines,
            total_count: totalCount,
            total_cost: Math.round(totalCost)
        };
    }

    /**
     * Tính vật tư tiêu hao với giá
     */
    calculateConsumables(rules, W, H, consumablesPrices = {}) {
        const lines = [];
        let totalLength = 0;
        let totalCost = 0;

        if (!rules || !Array.isArray(rules)) {
            return { lines: [], total_length_m: 0, total_cost: 0 };
        }

        // Default prices
        const defaultPrices = {
            'GASKET-EPDM': { price_vnd_m: 8000 },
            'SEALANT-SIL': { price_vnd_unit: 45000 }
        };

        for (const rule of rules) {
            let quantity = rule.qty || 0;

            if (rule.formula) {
                const lengthMm = this.evaluateFormula(rule.formula, { W, H });
                quantity = lengthMm / 1000; // Convert to m
            }

            // Get price
            const priceInfo = consumablesPrices[rule.code] || defaultPrices[rule.code] || {};
            let lineCost = 0;
            let priceLabel = '';

            if (rule.unit === 'm' || rule.unit === 'mm') {
                const pricePerM = priceInfo.price_vnd_m || 8000;
                lineCost = quantity * pricePerM;
                priceLabel = pricePerM;
                totalLength += quantity;
            } else {
                const pricePerUnit = priceInfo.price_vnd_unit || 45000;
                lineCost = quantity * pricePerUnit;
                priceLabel = pricePerUnit;
            }

            lines.push({
                material_code: rule.code,
                material_name: rule.name,
                quantity: parseFloat(quantity.toFixed(2)),
                unit: rule.unit || 'm',
                price_vnd: priceLabel,
                cost_vnd: Math.round(lineCost)
            });

            totalCost += lineCost;
        }

        return {
            lines,
            total_length_m: parseFloat(totalLength.toFixed(2)),
            total_cost: Math.round(totalCost)
        };
    }

    /**
     * Evaluate formula với biến W, H
     */
    evaluateFormula(formula, vars) {
        if (typeof formula === 'number') {
            return formula;
        }

        if (typeof formula !== 'string') {
            return 0;
        }

        try {
            // Replace variables
            let expression = formula
                .replace(/\bW\b/g, vars.W)
                .replace(/\bH\b/g, vars.H)
                .replace(/\bPERIMETER\b/g, (vars.W + vars.H) * 2);

            // Evaluate safely (simple math only)
            // Only allow: digits, operators, parentheses, spaces, decimal points
            if (/^[\d\s+\-*/().]+$/.test(expression)) {
                return eval(expression);
            }

            console.warn(`Invalid formula: ${formula}`);
            return 0;
        } catch (e) {
            console.error(`Formula evaluation error: ${formula}`, e);
            return 0;
        }
    }

    /**
     * Load template from database (with cache)
     */
    async loadTemplate(templateCode) {
        if (this.templateCache[templateCode]) {
            return this.templateCache[templateCode];
        }

        const [rows] = await db.query(
            'SELECT * FROM item_structure_templates WHERE template_code = ? AND is_active = 1',
            [templateCode]
        );

        if (rows.length > 0) {
            this.templateCache[templateCode] = rows[0];
            return rows[0];
        }
        return null;
    }

    /**
     * Load system config from database (with cache)
     */
    async loadSystemConfig(systemCode) {
        if (this.systemCache[systemCode]) {
            return this.systemCache[systemCode];
        }

        const [rows] = await db.query(
            'SELECT * FROM vw_aluminum_system_config WHERE system_code = ? AND is_active = 1',
            [systemCode]
        );

        if (rows.length > 0) {
            this.systemCache[systemCode] = rows[0];
            return rows[0];
        }
        return null;
    }

    /**
     * Clear caches
     */
    clearCache() {
        this.templateCache = {};
        this.systemCache = {};
    }
}

// Singleton instance
const bomCalcEngine = new BomCalcEngineV2();

module.exports = bomCalcEngine;
module.exports.BomCalcEngineV2 = BomCalcEngineV2;
