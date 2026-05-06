/**
 * HELPERS - Hàm tiện ích cho Calc Engine
 */

/**
 * Tính diện tích kính theo công thức cửa/vách
 */
function calculateGlassArea(W, H, options = {}) {
    const {
        frameDeduction = 0.1, // Trừ khung 
        leafCount = 1,
        isFixed = false
    } = options;

    const effectiveW = W - frameDeduction;
    const effectiveH = H - frameDeduction;

    if (isFixed) {
        return effectiveW * effectiveH;
    }

    const leafWidth = effectiveW / leafCount;
    const leafGlassW = leafWidth - 0.05; // Trừ khung cánh
    const leafGlassH = effectiveH - 0.08;

    return leafCount * leafGlassW * leafGlassH;
}

/**
 * Tính số mét thanh nhôm 
 */
function calculateProfileLength(dimension, quantity = 1, wastePercent = 2) {
    const wasteFactor = 1 + wastePercent / 100;
    return dimension * quantity * wasteFactor;
}

/**
 * Parse công thức BOM 
 */
function parseFormula(formula, vars) {
    let expr = formula;
    for (const [key, value] of Object.entries(vars)) {
        expr = expr.replace(new RegExp(key, 'g'), value.toString());
    }
    try {
        return eval(expr);
    } catch (e) {
        return 0;
    }
}

/**
 * Round to 2 decimal places
 */
function round2(num) {
    return Math.round(num * 100) / 100;
}

/**
 * Format currency VND
 */
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

module.exports = {
    calculateGlassArea,
    calculateProfileLength,
    parseFormula,
    round2,
    formatVND
};
