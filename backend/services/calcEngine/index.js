/**
 * CALC ENGINE - ATC STYLE
 * Tính BOM + Cost + Price cho các loại sản phẩm
 */

const db = require('../../config/db');
const { calcDoorSwingOut2Leaf } = require('./doorSwingOut2Leaf');
const { calcDoorSliding } = require('./doorSliding');
const { calcWindow } = require('./window');
const { calcGlassWall } = require('./glassWall');
const { calcRailing } = require('./railing');

/**
 * Main calc function - dispatch theo product_type
 * @param {Object} params
 * @param {string} params.productType - door, window, glass_wall, railing, roof, stair
 * @param {Object} params.snapshotConfig - cấu hình từ project_item
 * @param {Object} params.bomRules - từ product_bom_profiles
 * @param {number} params.templateId - product_template_id
 */
async function calcProduct({ productType, snapshotConfig, templateId }) {
    const snapshot = snapshotConfig || {};

    // Lấy BOM rules từ DB
    const bomRules = await getBomRulesForTemplate(templateId);

    // Lấy giá profiles và kính
    const prices = await getPrices(snapshot.aluminum_system || 'XINGFA_55', snapshot.glass?.type);

    let bom = null;

    // Dispatch theo product_type
    switch (productType) {
        case 'door':
            if (snapshot.category === 'sliding' || snapshot.open_style === 'sliding') {
                bom = calcDoorSliding(snapshot);
            } else {
                bom = calcDoorSwingOut2Leaf(snapshot);
            }
            break;
        case 'window':
            bom = calcWindow(snapshot);
            break;
        case 'glass_wall':
            bom = calcGlassWall(snapshot);
            break;
        case 'railing':
            bom = calcRailing(snapshot);
            break;
        default:
            // Fallback: dùng formula từ BOM rules
            bom = calcFromRules(snapshot, bomRules);
    }

    // Tính cost từ BOM
    const cost = calculateCost(bom, prices, bomRules);

    // Tính giá bán
    const profitPercent = snapshot.profit_percent ?? prices.profit_percent ?? 25;
    const salePrice = cost.total_cost * (1 + profitPercent / 100);

    return {
        bom,
        cost: {
            aluminum: Math.round(cost.aluminum),
            glass: Math.round(cost.glass),
            accessories: Math.round(cost.accessories),
            total_cost: Math.round(cost.total_cost)
        },
        price: {
            profit_percent: profitPercent,
            sale_price: Math.round(salePrice)
        }
    };
}

/**
 * Lấy BOM rules từ DB
 */
async function getBomRulesForTemplate(templateId) {
    if (!templateId) return [];

    try {
        const [rows] = await db.query(`
            SELECT  
                pbp.*,
                ap.code as profile_code,
                ap.name as profile_name,
                ap.role as profile_role,
                ap.price_per_m,
                ap.aluminum_system
            FROM atc_product_bom_profiles pbp
            JOIN atc_aluminum_profiles ap ON ap.id = pbp.profile_id
            WHERE pbp.product_template_id = ? AND ap.is_active = 1
            ORDER BY pbp.sort_order
        `, [templateId]);
        return rows;
    } catch (err) {
        console.error('Error getting BOM rules:', err);
        return [];
    }
}

/**
 * Lấy giá từ DB
 */
async function getPrices(aluminumSystem, glassType) {
    const prices = {
        aluminum_per_m: 180000, // default
        glass_per_m2: 520000,   // default
        accessories_total: 500000, // default
        profit_percent: 25
    };

    try {
        // Lấy giá nhôm trung bình theo hệ
        const [aluminumRows] = await db.query(`
            SELECT AVG(price_per_m) as avg_price 
            FROM atc_aluminum_profiles 
            WHERE aluminum_system = ? AND is_active = 1
        `, [aluminumSystem]);
        if (aluminumRows[0]?.avg_price) {
            prices.aluminum_per_m = parseFloat(aluminumRows[0].avg_price);
        }

        // Lấy giá kính
        const [glassRows] = await db.query(`
            SELECT price_per_m2 FROM atc_glass_types 
            WHERE type = ? AND is_active = 1 
            ORDER BY thickness_mm DESC LIMIT 1
        `, [glassType || 'tempered']);
        if (glassRows[0]?.price_per_m2) {
            prices.glass_per_m2 = parseFloat(glassRows[0].price_per_m2);
        }
    } catch (err) {
        console.error('Error getting prices:', err);
    }

    return prices;
}

/**
 * Tính BOM từ rules (formula-based)
 */
function calcFromRules(snapshot, bomRules) {
    const W = (snapshot.size?.w || snapshot.width || 1200) / 1000; // convert to m
    const H = (snapshot.size?.h || snapshot.height || 2200) / 1000;
    const leafCount = snapshot.leaf_count || 1;

    const profiles = [];
    let totalAluminumM = 0;

    for (const rule of bomRules) {
        // Eval formula
        let length = 0;
        try {
            // Replace variables in formula
            const formula = rule.formula
                .replace(/W/g, W.toString())
                .replace(/H/g, H.toString())
                .replace(/leaf_count/g, leafCount.toString());
            length = eval(formula);
        } catch (e) {
            length = 0;
        }

        const qty = rule.quantity || 1;
        const waste = 1 + (rule.waste_percent || 0) / 100;
        const totalLength = length * qty * waste;

        profiles.push({
            code: rule.profile_code,
            name: rule.profile_name,
            role: rule.profile_role,
            length_m: length,
            quantity: qty,
            waste_percent: rule.waste_percent,
            total_length_m: totalLength,
            price_per_m: rule.price_per_m
        });

        totalAluminumM += totalLength;
    }

    // Glass
    const glassArea = W * H;

    return {
        aluminum: {
            profiles,
            total_m: totalAluminumM
        },
        glass: {
            area_m2: glassArea
        },
        accessories: []
    };
}

/**
 * Tính chi phí từ BOM
 */
function calculateCost(bom, prices, bomRules) {
    let aluminumCost = 0;

    // Tính từ profiles với giá riêng
    if (bom.aluminum?.profiles) {
        for (const profile of bom.aluminum.profiles) {
            const pricePerM = profile.price_per_m || prices.aluminum_per_m;
            aluminumCost += profile.total_length_m * pricePerM;
        }
    } else {
        aluminumCost = (bom.aluminum?.total_m || 0) * prices.aluminum_per_m;
    }

    const glassCost = (bom.glass?.area_m2 || 0) * prices.glass_per_m2;
    const accessoriesCost = prices.accessories_total;

    return {
        aluminum: aluminumCost,
        glass: glassCost,
        accessories: accessoriesCost,
        total_cost: aluminumCost + glassCost + accessoriesCost
    };
}

module.exports = {
    calcProduct,
    getBomRulesForTemplate,
    getPrices,
    calcFromRules,
    calculateCost
};
