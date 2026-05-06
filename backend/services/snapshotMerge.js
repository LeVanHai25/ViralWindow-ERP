/**
 * SNAPSHOT MERGE SERVICE
 * Deep merge snapshot configs theo ATC style
 * Không replace toàn bộ, chỉ merge các field đã thay đổi
 */

/**
 * Deep merge 2 objects, giữ lại các field không thay đổi
 */
function deepMerge(target, source) {
    if (!source) return target;
    if (!target) return source;

    const result = { ...target };

    for (const key of Object.keys(source)) {
        if (source[key] === null || source[key] === undefined) {
            continue; // Skip null/undefined values
        }

        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }

    return result;
}

/**
 * Merge snapshot_config mới vào existing
 * @param {Object} existing - snapshot_config hiện tại
 * @param {Object} newData - dữ liệu mới cần merge
 * @returns {Object} - merged snapshot_config
 */
function mergeSnapshotConfig(existing, newData) {
    const existingObj = typeof existing === 'string' ? JSON.parse(existing || '{}') : (existing || {});
    const newObj = typeof newData === 'string' ? JSON.parse(newData || '{}') : (newData || {});

    const merged = deepMerge(existingObj, newObj);

    // Add metadata
    merged._last_updated = new Date().toISOString();

    return merged;
}

/**
 * Tạo snapshot_config ban đầu từ product_template
 */
function createInitialSnapshot(template, customParams = {}) {
    const snapshot = {
        _created_at: new Date().toISOString(),
        _source: 'template',
        _template_id: template.id,
        _template_code: template.code,

        size: {
            w: customParams.width || template.default_width || 1200,
            h: customParams.height || template.default_height || 2200,
            unit: 'mm'
        },
        product_type: template.product_type,
        category: template.category,
        open_style: template.open_style || null,
        leaf_count: customParams.leaf_count || template.leaf_count || 1,
        leaf_layout: template.leaf_layout || 'equal',

        aluminum_system: customParams.aluminum_system || template.default_aluminum_system || 'XINGFA_55',
        glass: {
            type: customParams.glass_type || 'tempered',
            thickness_mm: customParams.glass_thickness || 8,
            code: template.default_glass_code
        },
        color: customParams.color || 'white',

        profit_percent: template.profit_percent || 25,

        technical_params: {
            waste_percent: 2,
            install_gap: 10,
            glass_gap: 20
        },

        notes: customParams.notes || ''
    };

    return snapshot;
}

/**
 * Validate snapshot_config theo rules
 */
function validateSnapshot(snapshot, rules = {}) {
    const errors = [];

    if (!snapshot.size?.w || snapshot.size.w < 300) {
        errors.push('Chiều rộng phải >= 300mm');
    }
    if (!snapshot.size?.h || snapshot.size.h < 300) {
        errors.push('Chiều cao phải >= 300mm');
    }
    if (snapshot.size?.w > 5000) {
        errors.push('Chiều rộng phải <= 5000mm');
    }
    if (snapshot.size?.h > 4000) {
        errors.push('Chiều cao phải <= 4000mm');
    }

    // Check aluminum system
    const validSystems = ['XINGFA_55', 'XINGFA_93', 'PMI', 'VIET_PHAP', 'ATC_65'];
    if (snapshot.aluminum_system && !validSystems.includes(snapshot.aluminum_system)) {
        errors.push(`Hệ nhôm không hợp lệ: ${snapshot.aluminum_system}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    deepMerge,
    mergeSnapshotConfig,
    createInitialSnapshot,
    validateSnapshot
};
