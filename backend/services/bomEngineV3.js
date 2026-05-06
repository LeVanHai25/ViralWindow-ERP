/**
 * BOM ENGINE V3 - Tính BOM từ Panel Tree + Rules Engine
 * Dựa trên hệ nhôm và rules từ database
 */

const db = require("../config/db");

/**
 * Generate BOM from Panel Tree
 * @param {number} doorDrawingId - ID của door_drawing
 * @param {Object} paramsJson - Panel Tree structure (DoorModelTree format)
 * @param {number} systemId - Aluminum system ID
 * @returns {Array} BOM items
 */
async function generateBOMFromPanelTree(doorDrawingId, paramsJson, systemId) {
    const bomItems = [];
    
    if (!paramsJson || !systemId) {
        return bomItems;
    }
    
    // Load system rules
    const systemRules = await loadSystemRules(systemId);
    
    // Parse Panel Tree
    const panelTree = paramsJson.rootPanel || paramsJson;
    const doorWidth = paramsJson.width || 0;
    const doorHeight = paramsJson.height || 0;
    
    // 1. Calculate Frame Profiles
    const frameProfiles = await calculateFrameProfiles(doorWidth, doorHeight, systemRules);
    bomItems.push(...frameProfiles);
    
    // 2. Traverse Panel Tree to calculate panels, mullions, glass, accessories
    const panelResults = await traversePanelTree(panelTree, systemRules, doorWidth, doorHeight);
    bomItems.push(...panelResults.profiles);
    bomItems.push(...panelResults.glass);
    bomItems.push(...panelResults.accessories);
    bomItems.push(...panelResults.gaskets);
    
    // 3. Calculate Mullions from split panels
    const mullionProfiles = await calculateMullionProfiles(panelTree, systemRules, doorWidth, doorHeight);
    bomItems.push(...mullionProfiles);
    
    return bomItems;
}

/**
 * Load system rules from database
 */
async function loadSystemRules(systemId) {
    const [profiles] = await db.query(
        `SELECT * FROM aluminum_profiles WHERE system_id = ? AND is_active = 1`,
        [systemId]
    );
    
    const [hardwareRules] = await db.query(
        `SELECT * FROM hardware_rules WHERE system_id = ?`,
        [systemId]
    );
    
    const [glassRules] = await db.query(
        `SELECT * FROM glass_rules WHERE system_id = ?`,
        [systemId]
    );
    
    const [gasketRules] = await db.query(
        `SELECT * FROM gasket_rules WHERE system_id = ?`,
        [systemId]
    );
    
    return {
        profiles: profiles || [],
        hardwareRules: hardwareRules || [],
        glassRules: glassRules || [],
        gasketRules: gasketRules || []
    };
}

/**
 * Calculate Frame Profiles (Khung ngoài)
 */
async function calculateFrameProfiles(doorWidth, doorHeight, systemRules) {
    const items = [];
    
    // Find frame profiles
    const frameVertical = systemRules.profiles.find(p => 
        p.usage_type === 'frame_vertical' || p.profile_type === 'frame_vertical'
    );
    const frameHorizontal = systemRules.profiles.find(p => 
        p.usage_type === 'frame_horizontal' || p.profile_type === 'frame_horizontal'
    );
    
    // Frame top & bottom (horizontal)
    if (frameHorizontal) {
        const length = doorWidth - (frameHorizontal.cut_deduction_x_mm || 0);
        items.push({
            item_type: 'profile',
            item_code: frameHorizontal.profile_code || 'FRAME_H',
            description: frameHorizontal.profile_name || 'Khung ngang',
            length_mm: Math.round(length),
            qty: 2, // Top + Bottom
            material_id: null,
            note: `Khung trên + dưới`
        });
    } else {
        // Fallback
        items.push({
            item_type: 'profile',
            item_code: 'FRAME_H',
            description: 'Khung ngang',
            length_mm: Math.round(doorWidth - 76),
            qty: 2,
            note: 'Khung trên + dưới (default)'
        });
    }
    
    // Frame left & right (vertical)
    if (frameVertical) {
        const length = doorHeight - (frameVertical.cut_deduction_y_mm || 0);
        items.push({
            item_type: 'profile',
            item_code: frameVertical.profile_code || 'FRAME_V',
            description: frameVertical.profile_name || 'Khung đứng',
            length_mm: Math.round(length),
            qty: 2, // Left + Right
            material_id: null,
            note: `Khung trái + phải`
        });
    } else {
        // Fallback
        items.push({
            item_type: 'profile',
            item_code: 'FRAME_V',
            description: 'Khung đứng',
            length_mm: Math.round(doorHeight - 76),
            qty: 2,
            note: 'Khung trái + phải (default)'
        });
    }
    
    return items;
}

/**
 * Traverse Panel Tree recursively
 */
async function traversePanelTree(panelNode, systemRules, parentWidth, parentHeight) {
    const results = {
        profiles: [],
        glass: [],
        accessories: [],
        gaskets: []
    };
    
    if (!panelNode) return results;
    
    // Check if this is a split panel
    if (panelNode.type === 'split' || panelNode.children) {
        // Recursively process children
        if (panelNode.children && Array.isArray(panelNode.children)) {
            for (const child of panelNode.children) {
                const childResults = await traversePanelTree(child, systemRules, child.width, child.height);
                results.profiles.push(...childResults.profiles);
                results.glass.push(...childResults.glass);
                results.accessories.push(...childResults.accessories);
                results.gaskets.push(...childResults.gaskets);
            }
        }
    } else {
        // This is a leaf panel - calculate its BOM
        const panelWidth = panelNode.width || 0;
        const panelHeight = panelNode.height || 0;
        const panelType = resolvePanelType(panelNode);
        
        // Calculate sash profiles for this panel
        const sashProfiles = await calculateSashProfiles(panelWidth, panelHeight, systemRules);
        results.profiles.push(...sashProfiles);
        
        // Calculate glass
        const glassType = panelNode.glassType || panelNode.glass || '8ly';
        const glass = await calculateGlass(panelWidth, panelHeight, glassType, systemRules);
        if (glass) results.glass.push(glass);
        
        // Calculate accessories based on panel type
        const accessories = await calculateAccessories(panelType, systemRules);
        results.accessories.push(...accessories);
        
        // Calculate gaskets
        const gaskets = await calculateGaskets(glass, systemRules);
        results.gaskets.push(...gaskets);
    }
    
    return results;
}

function resolvePanelType(panelNode) {
    if (!panelNode || typeof panelNode !== 'object') return 'fixed';

    const role = panelNode.role || '';
    const openType = panelNode.openType || '';

    if (role === 'door') {
        if (openType === 'turn-left') return 'door-single-left';
        if (openType === 'turn-right') return 'door-single-right';
        if (openType === 'fixed') return 'window-fixed';
    }

    if (role === 'fixed') {
        return 'window-fixed';
    }

    if (openType) return openType;
    if (panelNode.type && panelNode.type !== 'leaf') return panelNode.type;
    return 'fixed';
}

/**
 * Calculate Sash Profiles (Cánh cửa)
 */
async function calculateSashProfiles(panelWidth, panelHeight, systemRules) {
    const items = [];
    
    // Find sash profiles
    const sashVertical = systemRules.profiles.find(p => 
        p.usage_type === 'sash_vertical' || 
        (p.profile_type && (p.profile_type.includes('panel') || p.profile_type.includes('sash')))
    );
    const sashHorizontal = systemRules.profiles.find(p => 
        p.usage_type === 'sash_horizontal' || 
        (p.profile_type && p.profile_type.includes('sash'))
    );
    
    // Sash vertical (2 thanh dọc)
    if (sashVertical) {
        const length = panelHeight - (sashVertical.cut_deduction_y_mm || 0);
        items.push({
            item_type: 'profile',
            item_code: sashVertical.profile_code || 'SASH_V',
            description: sashVertical.profile_name || 'Cánh đứng',
            length_mm: Math.round(length),
            qty: 2,
            material_id: null,
            note: '2 thanh dọc cánh'
        });
    } else {
        // Fallback
        items.push({
            item_type: 'profile',
            item_code: 'SASH_V',
            description: 'Cánh đứng',
            length_mm: Math.round(panelHeight - 76),
            qty: 2,
            note: '2 thanh dọc cánh (default)'
        });
    }
    
    // Sash horizontal (2 thanh ngang)
    if (sashHorizontal) {
        const length = panelWidth - (sashHorizontal.cut_deduction_x_mm || 0);
        items.push({
            item_type: 'profile',
            item_code: sashHorizontal.profile_code || 'SASH_H',
            description: sashHorizontal.profile_name || 'Cánh ngang',
            length_mm: Math.round(length),
            qty: 2,
            material_id: null,
            note: '2 thanh ngang cánh'
        });
    } else {
        // Fallback
        items.push({
            item_type: 'profile',
            item_code: 'SASH_H',
            description: 'Cánh ngang',
            length_mm: Math.round(panelWidth - 46),
            qty: 2,
            note: '2 thanh ngang cánh (default)'
        });
    }
    
    return items;
}

/**
 * Calculate Mullion Profiles from split panels
 */
async function calculateMullionProfiles(panelNode, systemRules, parentWidth, parentHeight) {
    const items = [];
    
    if (!panelNode) return items;
    
    // If this is a split panel, calculate mullion
    if (panelNode.type === 'split' && panelNode.children) {
        const splitDirection = panelNode.split || panelNode.splitDirection;
        
        // Find mullion profile
        const mullionProfile = systemRules.profiles.find(p => 
            p.usage_type === 'mullion_vertical' || 
            p.usage_type === 'mullion_horizontal' ||
            p.profile_type === 'mullion'
        );
        
        if (splitDirection === 'vertical') {
            // Vertical mullion (đố dọc)
            const length = panelNode.height - (mullionProfile?.cut_deduction_y_mm || 10);
            items.push({
                item_type: 'profile',
                item_code: mullionProfile?.profile_code || 'MULLION_V',
                description: mullionProfile?.profile_name || 'Đố dọc',
                length_mm: Math.round(length),
                qty: panelNode.children.length - 1, // Number of dividers
                material_id: null,
                note: `Đố dọc chia panel`
            });
        } else if (splitDirection === 'horizontal') {
            // Horizontal mullion (đố ngang)
            const length = panelNode.width - (mullionProfile?.cut_deduction_x_mm || 10);
            items.push({
                item_type: 'profile',
                item_code: mullionProfile?.profile_code || 'MULLION_H',
                description: mullionProfile?.profile_name || 'Đố ngang',
                length_mm: Math.round(length),
                qty: panelNode.children.length - 1,
                material_id: null,
                note: `Đố ngang chia panel`
            });
        }
        
        // Recursively process children for nested splits
        for (const child of panelNode.children) {
            const childMullions = await calculateMullionProfiles(child, systemRules, child.width, child.height);
            items.push(...childMullions);
        }
    }
    
    return items;
}

/**
 * Calculate Glass
 */
async function calculateGlass(panelWidth, panelHeight, glassType, systemRules) {
    // Find glass rule
    const glassRule = systemRules.glassRules.find(r => r.glass_type === glassType) ||
                     systemRules.glassRules.find(r => r.is_default === 1) ||
                     systemRules.glassRules[0];
    
    if (!glassRule) {
        // Fallback
        return {
            item_type: 'glass',
            item_code: glassType || '8ly',
            description: `Kính ${glassType || '8ly'}`,
            width_mm: Math.round(panelWidth - 30),
            height_mm: Math.round(panelHeight - 30),
            qty: 1,
            note: 'Kính panel (default deduction 30mm)'
        };
    }
    
    const width = panelWidth - (glassRule.deduction_x_mm || 30);
    const height = panelHeight - (glassRule.deduction_y_mm || 30);
    const areaM2 = (width / 1000) * (height / 1000);
    
    return {
        item_type: 'glass',
        item_code: glassType || glassRule.glass_type,
        description: `Kính ${glassRule.glass_type}`,
        width_mm: Math.round(width),
        height_mm: Math.round(height),
        qty: 1,
        note: `Kính panel (deduction: ${glassRule.deduction_x_mm}x${glassRule.deduction_y_mm}mm)`
    };
}

/**
 * Calculate Accessories based on panel type
 */
async function calculateAccessories(panelType, systemRules) {
    const items = [];
    
    // Normalize panel type
    let normalizedType = panelType;
    if (panelType.includes('window-')) {
        normalizedType = panelType.replace('window-', 'window-');
    } else if (panelType.includes('door-')) {
        normalizedType = panelType.replace('door-', 'door-');
    } else if (panelType.startsWith('sliding')) {
        normalizedType = `sliding-${panelType.split('-')[1] || '2'}`;
    }
    
    // Find hardware rules for this panel type
    const rules = systemRules.hardwareRules.filter(r => r.panel_type === normalizedType);
    
    for (const rule of rules) {
        items.push({
            item_type: 'accessory',
            item_code: rule.hardware_code,
            description: rule.hardware_name || rule.hardware_code,
            qty: rule.qty_per_panel || 1,
            material_id: null,
            note: rule.position ? `Vị trí: ${rule.position}` : null
        });
    }
    
    return items;
}

/**
 * Calculate Gaskets
 */
async function calculateGaskets(glass, systemRules) {
    const items = [];
    
    if (!glass) return items;
    
    // Find gasket rules
    const gasketRules = systemRules.gasketRules.filter(r => r.is_required === 1);
    
    for (const rule of gasketRules) {
        // Calculate perimeter
        const perimeter = 2 * (glass.width_mm + glass.height_mm);
        const gasketLength = Math.round(perimeter * (rule.perimeter_factor || 1.0));
        
        items.push({
            item_type: 'gasket',
            item_code: rule.gasket_code,
            description: rule.gasket_name || rule.gasket_code,
            length_mm: gasketLength,
            qty: 1,
            material_id: null,
            note: `Chu vi: ${perimeter}mm × ${rule.perimeter_factor || 1.0}`
        });
    }
    
    return items;
}

module.exports = {
    generateBOMFromPanelTree,
    loadSystemRules
};






















