/**
 * Items Controller
 * Unified API for managing items across all warehouse types
 * (aluminum, accessory, glass, other)
 */

const db = require('../config/db');

// Item type to table mapping
const ITEM_TABLES = {
    aluminum: 'aluminum_systems',
    accessory: 'accessories',
    glass: 'glass_items',
    other: 'inventory'  // "Vật tư phụ" uses generic inventory table
};

// Code prefixes for auto-generation
const CODE_PREFIXES = {
    aluminum: 'N',
    accessory: 'PK',
    glass: 'K',
    other: 'VTP'
};

/**
 * Generate next item code
 */
async function generateItemCode(itemType) {
    const prefix = CODE_PREFIXES[itemType] || 'ITM';
    const table = ITEM_TABLES[itemType];

    if (!table) {
        return `${prefix}-${Date.now()}`;
    }

    try {
        // Get the highest existing code with this prefix
        const codeColumn = 'code';  // aluminum_systems uses 'code' column
        const [rows] = await db.query(`
            SELECT ${codeColumn} as code 
            FROM ${table} 
            WHERE ${codeColumn} LIKE ?
            ORDER BY ${codeColumn} DESC
            LIMIT 1
        `, [`${prefix}-%`]);

        if (rows.length === 0) {
            return `${prefix}-0001`;
        }

        // Extract number and increment
        const lastCode = rows[0].code;
        const match = lastCode.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (match) {
            const nextNum = parseInt(match[1], 10) + 1;
            return `${prefix}-${String(nextNum).padStart(4, '0')}`;
        }

        // Fallback
        return `${prefix}-${Date.now().toString().slice(-6)}`;
    } catch (error) {
        console.error('Error generating code:', error);
        return `${prefix}-${Date.now().toString().slice(-6)}`;
    }
}

/**
 * Create new item
 * POST /api/items
 */
exports.createItem = async (req, res) => {
    try {
        const {
            item_type,
            code,
            name,
            unit = 'Chiếc',
            category_id,
            supplier_id,
            default_cost = 0,
            note = '',
            // Additional fields per type
            brand,
            system_name,
            density,
            length_m,
            thickness,
            color
        } = req.body;

        // Validate required fields
        if (!item_type || !['aluminum', 'accessory', 'glass', 'other'].includes(item_type)) {
            return res.status(400).json({
                success: false,
                message: 'item_type phải là: aluminum, accessory, glass, hoặc other'
            });
        }

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Tên vật tư không được để trống'
            });
        }

        // Generate or validate code
        let itemCode = code?.trim()?.toUpperCase()?.replace(/\s+/g, '-') || await generateItemCode(item_type);

        const table = ITEM_TABLES[item_type];
        let insertId;

        // Insert based on item type
        switch (item_type) {
            case 'aluminum':
                // Check unique
                const [existingAlu] = await db.query(
                    'SELECT id FROM aluminum_systems WHERE code = ?',
                    [itemCode]
                );
                if (existingAlu.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Mã vật tư ${itemCode} đã tồn tại`
                    });
                }

                const [aluResult] = await db.query(`
                    INSERT INTO aluminum_systems 
                    (code, name, brand, color, density, length_m, unit_price, quantity, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
                `, [itemCode, name.trim(), brand || 'Xingfa',
                    color || 'Đen', density || 2.7, length_m || 6.0, default_cost]);
                insertId = aluResult.insertId;
                break;

            case 'accessory':
                const [existingAcc] = await db.query(
                    'SELECT id FROM accessories WHERE code = ?',
                    [itemCode]
                );
                if (existingAcc.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Mã vật tư ${itemCode} đã tồn tại`
                    });
                }

                const [accResult] = await db.query(`
                    INSERT INTO accessories 
                    (code, name, unit, category_id, unit_price, stock_quantity, supplier_id, note, created_at)
                    VALUES (?, ?, ?, ?, ?, 0, ?, ?, NOW())
                `, [itemCode, name.trim(), unit, category_id || null, default_cost, supplier_id || null, note]);
                insertId = accResult.insertId;
                break;

            case 'glass':
                const [existingGlass] = await db.query(
                    'SELECT id FROM glass_items WHERE code = ?',
                    [itemCode]
                );
                if (existingGlass.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Mã vật tư ${itemCode} đã tồn tại`
                    });
                }

                const [glassResult] = await db.query(`
                    INSERT INTO glass_items 
                    (code, name, unit, thickness, color, unit_price, quantity, supplier_id, note, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())
                `, [itemCode, name.trim(), unit || 'm²', thickness || 5, color || 'Trắng',
                    default_cost, supplier_id || null, note]);
                insertId = glassResult.insertId;
                break;

            case 'other':
                const [existingOther] = await db.query(
                    'SELECT id FROM inventory WHERE code = ?',
                    [itemCode]
                );
                if (existingOther.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Mã vật tư ${itemCode} đã tồn tại`
                    });
                }

                const [otherResult] = await db.query(`
                    INSERT INTO inventory 
                    (code, name, unit, unit_price, quantity, supplier_id, note, created_at)
                    VALUES (?, ?, ?, ?, 0, ?, ?, NOW())
                `, [itemCode, name.trim(), unit, default_cost, supplier_id || null, note]);
                insertId = otherResult.insertId;
                break;
        }

        res.status(201).json({
            success: true,
            message: 'Tạo vật tư thành công',
            data: {
                id: insertId,
                item_type,
                code: itemCode,
                name: name.trim(),
                unit
            }
        });

    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi tạo vật tư: ' + error.message
        });
    }
};

/**
 * Get items by type with search
 * GET /api/items?item_type=accessory&search=ban%20le&limit=20
 */
exports.getItems = async (req, res) => {
    try {
        const { item_type, search, limit = 50 } = req.query;

        if (!item_type || !['aluminum', 'accessory', 'glass', 'other'].includes(item_type)) {
            return res.status(400).json({
                success: false,
                message: 'item_type phải là: aluminum, accessory, glass, hoặc other'
            });
        }

        let sql = '';
        let params = [];
        const searchPattern = search ? `%${search}%` : '%';

        switch (item_type) {
            case 'aluminum':
                sql = `
                    SELECT id, code, name, 
                           brand, color, 'Thanh' as unit, 
                           unit_price as default_cost, quantity
                    FROM aluminum_systems
                    WHERE (code LIKE ? OR name LIKE ?)
                    ORDER BY code
                    LIMIT ?
                `;
                params = [searchPattern, searchPattern, parseInt(limit)];
                break;

            case 'accessory':
                sql = `
                    SELECT a.id, a.code, a.name, a.unit, a.category_id,
                           a.unit_price as default_cost, a.stock_quantity as quantity,
                           c.name as category_name
                    FROM accessories a
                    LEFT JOIN accessory_categories c ON a.category_id = c.id
                    WHERE (a.code LIKE ? OR a.name LIKE ?)
                    ORDER BY a.code
                    LIMIT ?
                `;
                params = [searchPattern, searchPattern, parseInt(limit)];
                break;

            case 'glass':
                sql = `
                    SELECT id, code, name, unit, thickness, color,
                           unit_price as default_cost, quantity
                    FROM glass_items
                    WHERE (code LIKE ? OR name LIKE ?)
                    ORDER BY code
                    LIMIT ?
                `;
                params = [searchPattern, searchPattern, parseInt(limit)];
                break;

            case 'other':
                sql = `
                    SELECT id, code, name, unit,
                           unit_price as default_cost, quantity
                    FROM inventory
                    WHERE (code LIKE ? OR name LIKE ?)
                    ORDER BY code
                    LIMIT ?
                `;
                params = [searchPattern, searchPattern, parseInt(limit)];
                break;
        }

        const [rows] = await db.query(sql, params);

        res.json({
            success: true,
            data: rows,
            item_type,
            count: rows.length
        });

    } catch (error) {
        console.error('Error getting items:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách vật tư: ' + error.message
        });
    }
};

/**
 * Generate next code for item type
 * GET /api/items/next-code?item_type=accessory
 */
exports.getNextCode = async (req, res) => {
    try {
        const { item_type } = req.query;

        if (!item_type || !['aluminum', 'accessory', 'glass', 'other'].includes(item_type)) {
            return res.status(400).json({
                success: false,
                message: 'item_type phải là: aluminum, accessory, glass, hoặc other'
            });
        }

        const nextCode = await generateItemCode(item_type);

        res.json({
            success: true,
            data: { code: nextCode, item_type }
        });

    } catch (error) {
        console.error('Error generating code:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi sinh mã: ' + error.message
        });
    }
};

/**
 * Get units enum
 * GET /api/items/units
 */
exports.getUnits = async (req, res) => {
    try {
        // Hardcoded units for item creation
        const defaultUnits = [
            { key: 'piece', label: 'Chiếc' },
            { key: 'set', label: 'Bộ' },
            { key: 'meter', label: 'm' },
            { key: 'm2', label: 'm²' },
            { key: 'bar', label: 'Thanh' },
            { key: 'kg', label: 'Kg' },
            { key: 'box', label: 'Hộp' },
            { key: 'roll', label: 'Cuộn' }
        ];

        res.json({ success: true, data: defaultUnits });

    } catch (error) {
        console.error('Error getting units:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách đơn vị: ' + error.message
        });
    }
};

/**
 * Get accessory categories
 * GET /api/items/categories?item_type=accessory
 */
exports.getCategories = async (req, res) => {
    try {
        const { item_type } = req.query;

        if (item_type === 'accessory') {
            const [categories] = await db.query(
                'SELECT id, name FROM accessory_categories ORDER BY name'
            );
            return res.json({ success: true, data: categories });
        }

        // For other types, return empty or item-type specific categories
        res.json({ success: true, data: [] });

    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh mục: ' + error.message
        });
    }
};
