/**
 * INVENTORY LOOKUP OPTIMIZATION SYSTEM
 * Production-grade Map-based O(1) search for design-new.html
 * 
 * @module inventory-lookup-helper
 * @author Senior Developer
 * @version 2.0.0
 */

// ===================================================================
// GLOBAL LOOKUP MAPS FOR O(1) PERFORMANCE
// ===================================================================

/** 
 * Lookup maps indexed by "type:code" format
 * @type {Object.<string, Object>}
 */
window.inventoryMapByCode = {};

/** 
 * Lookup maps indexed by "type:name" format (case-insensitive)
 * @type {Object.<string, Object>}
 */
window.inventoryMapByName = {};

/** 
 * Lookup maps indexed by "type:fuzzyname" format (normalized)
 * @type {Object.<string, Object>}
 */
window.inventoryMapByFuzzyName = {};

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Normalize string for fuzzy matching
 * Removes spaces, accents, special chars, converts to lowercase
 * 
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 * 
 * @example
 * normalizeFuzzyString("Đố T")  // Returns: "dot"
 * normalizeFuzzyString("Kính cường lực 8mm")  // Returns: "kinhcuonguc8mm"
 */
window.normalizeFuzzyString = function (str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD') // Decompose accented chars (e.g., é -> e + ́)
        .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
        .replace(/[^a-z0-9]/g, ''); // Keep only alphanumeric
};

/**
 * Build lookup maps from inventoryData for fast O(1) access
 * Must be called after inventoryData array is populated
 * 
 * @param {Array<Object>} inventoryData - Array of inventory items
 * @returns {void}
 * 
 * @example
 * buildInventoryLookupMaps(inventoryData);
 * // Now you can use findInventoryItemFast() with O(1) performance
 */
window.buildInventoryLookupMaps = function (inventoryData) {
    console.time('⏱️ Building inventory lookup maps');

    window.inventoryMapByCode = {};
    window.inventoryMapByName = {};
    window.inventoryMapByFuzzyName = {};

    if (!inventoryData || inventoryData.length === 0) {
        console.warn('⚠️ Cannot build lookup maps: inventoryData is empty');
        console.timeEnd('⏱️ Building inventory lookup maps');
        return;
    }

    let codeCount = 0, nameCount = 0, fuzzyCount = 0, duplicates = 0;

    inventoryData.forEach((item) => {
        const code = (item.item_code || '').trim();
        const name = (item.item_name || '').trim();
        const type = item.item_type || 'unknown';

        // Map by CODE (exact match, case-insensitive)
        if (code) {
            const codeKey = `${type}:${code.toUpperCase()}`;
            if (!window.inventoryMapByCode[codeKey]) {
                window.inventoryMapByCode[codeKey] = item;
                codeCount++;
            } else {
                duplicates++;
                console.warn(`⚠️ Duplicate code detected: ${codeKey}`, {
                    existing: window.inventoryMapByCode[codeKey].item_name,
                    new: item.item_name
                });
            }
        }

        // Map by NAME (exact match, case-insensitive)
        if (name) {
            const nameKey = `${type}:${name.toLowerCase()}`;
            if (!window.inventoryMapByName[nameKey]) {
                window.inventoryMapByName[nameKey] = item;
                nameCount++;
            }
        }

        // Map by FUZZY NAME (normalized: remove spaces, accents, special chars)
        if (name) {
            const fuzzyName = window.normalizeFuzzyString(name);
            const fuzzyKey = `${type}:${fuzzyName}`;
            if (!window.inventoryMapByFuzzyName[fuzzyKey]) {
                window.inventoryMapByFuzzyName[fuzzyKey] = item;
                fuzzyCount++;
            }
        }
    });

    console.timeEnd('⏱️ Building inventory lookup maps');
    console.log(`📊 Lookup map statistics:`, {
        totalItems: inventoryData.length,
        indexedByCode: codeCount,
        indexedByName: nameCount,
        indexedByFuzzy: fuzzyCount,
        duplicates: duplicates
    });

    // Log sample keys for debugging
    const sampleCodeKeys = Object.keys(window.inventoryMapByCode).slice(0, 5);
    const sampleNameKeys = Object.keys(window.inventoryMapByName).slice(0, 5);
    console.log(`🔑 Sample lookup keys:`, {
        byCode: sampleCodeKeys,
        byName: sampleNameKeys
    });
};

/**
 * Find inventory item with O(1) Map-based lookup and multi-level fallback
 * 
 * Search order:
 * 1. Exact match by CODE (O(1))
 * 2. Exact match by NAME (O(1))
 * 3. Fuzzy match by NAME (O(1))
 * 4. Partial match (O(n) fallback)
 * 
 * @param {string} code - Item code (e.g., "AL5506", "K-123", "VT001")
 * @param {string} name - Item name (e.g., "Đố T", "Kính 1", "Ke nhôm")
 * @param {string} type - Item type ("aluminum", "glass", "accessory", "material")
 * @param {Array<Object>} inventoryData - Fallback inventory array for partial matching
 * @returns {Object|null} Inventory item with stock_quantity field, or null if not found
 * 
 * @example
 * const item = findInventoryItemFast('AL5506', 'Đố T', 'aluminum', inventoryData);
 * if (item) {
 *     console.log(`Stock: ${item.stock_quantity} ${item.unit}`);
 * }
 */
window.findInventoryItemFast = function (code, name, type, inventoryData) {
    // Validate type parameter
    if (!type) {
        console.error('❌ findInventoryItemFast: type parameter is required');
        return null;
    }

    // Check if maps are built
    const mapsBuilt = Object.keys(window.inventoryMapByCode).length > 0 ||
        Object.keys(window.inventoryMapByName).length > 0;

    if (!mapsBuilt) {
        console.warn('⚠️ Lookup maps not built, using existing findInventoryItem function');
        // Fallback to existing function if available
        if (typeof window.findInventoryItem === 'function') {
            return window.findInventoryItem(code, name, type);
        }
        return null;
    }

    const searchCode = (code || '').trim();
    const searchName = (name || '').trim();

    // Level 1: Exact match by CODE (O(1), highest priority)
    if (searchCode) {
        const codeKey = `${type}:${searchCode.toUpperCase()}`;
        const item = window.inventoryMapByCode[codeKey];
        if (item) {
            console.log(`✅ Found by CODE [${codeKey}]: ${item.item_name}, stock=${item.stock_quantity || item.quantity}`);
            return item;
        }
    }

    // Level 2: Exact match by NAME (O(1))
    if (searchName) {
        const nameKey = `${type}:${searchName.toLowerCase()}`;
        const item = window.inventoryMapByName[nameKey];
        if (item) {
            console.log(`✅ Found by NAME [${nameKey}]: ${item.item_code}, stock=${item.stock_quantity || item.quantity}`);
            return item;
        }
    }

    // Level 3: Fuzzy match by NAME (O(1), normalized)
    if (searchName) {
        const fuzzyName = window.normalizeFuzzyString(searchName);
        const fuzzyKey = `${type}:${fuzzyName}`;
        const item = window.inventoryMapByFuzzyName[fuzzyKey];
        if (item) {
            console.log(`✅ Found by FUZZY [${fuzzyKey}]: "${searchName}" -> "${item.item_name}", stock=${item.stock_quantity || item.quantity}`);
            return item;
        }
    }

    // Level 4: Partial match (O(n) fallback for typos/variations)
    if (searchName && inventoryData && inventoryData.length > 0) {
        const searchLower = searchName.toLowerCase();
        const partialMatch = inventoryData.find(item =>
            item.item_type === type &&
            item.item_name &&
            item.item_name.toLowerCase().includes(searchLower)
        );
        if (partialMatch) {
            console.log(`⚠️ Found by PARTIAL match: "${searchName}" -> "${partialMatch.item_name}", stock=${partialMatch.stock_quantity || partialMatch.quantity}`);
            return partialMatch;
        }
    }

    // Not found - detailed debugging info
    console.warn(`❌ NOT FOUND in inventory:`, {
        code: searchCode || '(empty)',
        name: searchName || '(empty)',
        type: type,
        suggestion: 'Check if this item exists in "Kho vật tư" page',
        availableTypes: Object.keys(window.inventoryMapByCode)
            .map(k => k.split(':')[0])
            .filter((v, i, a) => a.indexOf(v) === i) // unique
    });

    return null;
};

// ===================================================================
// INITIALIZATION MESSAGE
// ===================================================================

console.log('✅ Inventory Lookup Optimization System loaded');
console.log('📚 Functions available:');
console.log('  - buildInventoryLookupMaps(inventoryData)');
console.log('  - findInventoryItemFast(code, name, type, inventoryData)');
console.log('  - normalizeFuzzyString(str)');
