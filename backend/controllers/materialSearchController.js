/**
 * =====================================================
 * MATERIAL SEARCH CONTROLLER
 * Tìm kiếm vật tư thống nhất từ nhiều nguồn (kho)
 * Hỗ trợ autocomplete cho trang Yêu cầu vật tư
 * =====================================================
 */

const db = require("../config/db");

/**
 * Tìm kiếm vật tư theo loại và từ khóa
 * GET /api/materials/search
 * Query params:
 *   - type: 'nhom' | 'kinh' | 'phukien' | 'vattu' | 'all'
 *   - q: search keyword
 *   - limit: max results (default 20)
 */
exports.searchMaterials = async (req, res) => {
    try {
        const { type = 'all', q = '', limit = 20 } = req.query;
        const searchTerm = `%${q}%`;
        let results = [];

        if (type === 'nhom' || type === 'all') {
            // Tìm trong inventory có item_type = 'nhom' hoặc 'aluminum'
            const [inventoryRows] = await db.query(`
                SELECT 
                    id,
                    item_code as code,
                    item_name as name,
                    unit,
                    quantity as stock_quantity,
                    unit_price,
                    notes as description,
                    'inventory' as source,
                    'nhom' as material_type
                FROM inventory 
                WHERE (item_type IN ('nhom', 'aluminum', 'nhôm'))
                    AND (item_name LIKE ? OR item_code LIKE ?)
                ORDER BY item_name ASC
                LIMIT ?
            `, [searchTerm, searchTerm, parseInt(limit)]);

            // Tìm trong aluminum_systems
            const [aluminumRows] = await db.query(`
                SELECT 
                    id,
                    code,
                    name,
                    'cây' as unit,
                    NULL as stock_quantity,
                    unit_price,
                    CONCAT('Hệ: ', brand, ' - ', COALESCE(description, '')) as description,
                    density,
                    'aluminum_systems' as source,
                    'nhom' as material_type
                FROM aluminum_systems 
                WHERE is_active = 1
                    AND (name LIKE ? OR code LIKE ? OR brand LIKE ?)
                ORDER BY code ASC
                LIMIT ?
            `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);

            // Tìm trong aluminum_profiles
            const [profileRows] = await db.query(`
                SELECT 
                    ap.id,
                    ap.profile_code as code,
                    ap.profile_name as name,
                    'cây' as unit,
                    NULL as stock_quantity,
                    ap.unit_price,
                    CONCAT('Profile ', ap.profile_type, ' - ', COALESCE(als.name, '')) as description,
                    ap.weight_per_meter as density,
                    'aluminum_profiles' as source,
                    'nhom' as material_type
                FROM aluminum_profiles ap
                LEFT JOIN aluminum_systems als ON ap.system_id = als.id
                WHERE ap.is_active = 1
                    AND (ap.profile_name LIKE ? OR ap.profile_code LIKE ?)
                ORDER BY ap.profile_code ASC
                LIMIT ?
            `, [searchTerm, searchTerm, parseInt(limit)]);

            results = results.concat(inventoryRows, aluminumRows, profileRows);
        }

        if (type === 'kinh' || type === 'all') {
            // 1. Tìm trong inventory có item_type = 'glass' hoặc 'kinh' (Warehouse)
            const [inventoryGlassRows] = await db.query(`
                SELECT 
                    id,
                    item_code as code,
                    item_name as name,
                    unit,
                    quantity as stock_quantity,
                    unit_price,
                    notes as description,
                    'inventory' as source,
                    'kinh' as material_type
                FROM inventory 
                WHERE item_type IN ('glass', 'kinh', 'kính')
                    AND (item_name LIKE ? OR item_code LIKE ?)
                ORDER BY item_name ASC
                LIMIT ?
            `, [searchTerm, searchTerm, parseInt(limit)]);

            // 2. Tìm trong materials có type = 'glass' (Catalog bổ sung)
            const [materialGlassRows] = await db.query(`
                SELECT 
                    id,
                    code,
                    name,
                    unit,
                    NULL as stock_quantity,
                    price as unit_price,
                    NULL as description,
                    'materials' as source,
                    'kinh' as material_type
                FROM materials 
                WHERE type = 'glass'
                    AND (name LIKE ? OR code LIKE ?)
                ORDER BY name ASC
                LIMIT ?
            `, [searchTerm, searchTerm, parseInt(limit)]);

            // 3. Tìm trong glass_items (Catalog - thường có tồn kho = 0)
            const [glassRows] = await db.query(`
                SELECT 
                    id,
                    code,
                    name,
                    'tấm' as unit,
                    quantity as stock_quantity,
                    price as unit_price,
                    structure as description,
                    'glass_items' as source,
                    'kinh' as material_type
                FROM glass_items 
                WHERE (name LIKE ? OR code LIKE ? OR structure LIKE ?)
                ORDER BY name ASC
                LIMIT ?
            `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);

            // Thứ tự ưu tiên: Inventory (Kho) -> Materials (Kho bổ sung) -> Glass Items (Catalog)
            // Đánh dấu là stock để frontend dễ xử lý
            const stockResults = [...inventoryGlassRows, ...materialGlassRows].map(item => ({ ...item, is_stock: true }));
            const catalogResults = glassRows.map(item => ({ ...item, is_stock: false }));

            results = results.concat(stockResults, catalogResults);
        }

        if (type === 'phukien' || type === 'all') {
            // Tìm trong accessories
            const [accessoryRows] = await db.query(`
                SELECT 
                    id,
                    code,
                    name,
                    unit,
                    stock_quantity,
                    purchase_price as unit_price,
                    description,
                    category,
                    'accessories' as source,
                    'phukien' as material_type
                FROM accessories 
                WHERE is_active = 1
                    AND (name LIKE ? OR code LIKE ? OR category LIKE ?)
                ORDER BY name ASC
                LIMIT ?
            `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);

            // Tìm trong inventory có item_type = 'accessory' hoặc 'phukien'
            const [inventoryAccessoryRows] = await db.query(`
                SELECT 
                    id,
                    item_code as code,
                    item_name as name,
                    unit,
                    quantity as stock_quantity,
                    unit_price,
                    notes as description,
                    'inventory' as source,
                    'phukien' as material_type
                FROM inventory 
                WHERE item_type IN ('accessory', 'phukien', 'phụ kiện')
                    AND (item_name LIKE ? OR item_code LIKE ?)
                ORDER BY item_name ASC
                LIMIT ?
            `, [searchTerm, searchTerm, parseInt(limit)]);

            results = results.concat(accessoryRows, inventoryAccessoryRows);
        }

        if (type === 'vattu' || type === 'all') {
            // Tìm trong inventory với các item_type khác
            const [vattuRows] = await db.query(`
                SELECT 
                    id,
                    item_code as code,
                    item_name as name,
                    unit,
                    quantity as stock_quantity,
                    unit_price,
                    notes as description,
                    'inventory' as source,
                    'vattu' as material_type
                FROM inventory 
                WHERE (item_type IS NULL OR item_type NOT IN ('nhom', 'aluminum', 'nhôm', 'glass', 'kinh', 'kính', 'accessory', 'phukien', 'phụ kiện'))
                    AND (item_name LIKE ? OR item_code LIKE ?)
                ORDER BY item_name ASC
                LIMIT ?
            `, [searchTerm, searchTerm, parseInt(limit)]);

            results = results.concat(vattuRows);
        }

        // Remove duplicates based on code + source
        const uniqueResults = [];
        const seen = new Set();
        for (const item of results) {
            const key = `${item.code}-${item.source}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(item);
            }
        }

        // Limit final results
        const finalResults = uniqueResults.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: finalResults,
            count: finalResults.length,
            query: { type, q, limit }
        });

    } catch (err) {
        console.error('Error searching materials:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi tìm kiếm vật tư",
            error: err.message
        });
    }
};

/**
 * Lấy thông tin chi tiết của một vật tư
 * GET /api/materials/:source/:id
 */
exports.getMaterialDetail = async (req, res) => {
    try {
        const { source, id } = req.params;
        let query, result;

        switch (source) {
            case 'inventory':
                [result] = await db.query(`
                    SELECT 
                        id, item_code as code, item_name as name, item_type,
                        unit, quantity as stock_quantity, min_stock_level,
                        unit_price, notes as description, location
                    FROM inventory WHERE id = ?
                `, [id]);
                break;

            case 'aluminum_systems':
                [result] = await db.query(`
                    SELECT 
                        id, code, name, brand, density, unit_price, 
                        description, 'cây' as unit
                    FROM aluminum_systems WHERE id = ? AND is_active = 1
                `, [id]);
                break;

            case 'aluminum_profiles':
                [result] = await db.query(`
                    SELECT 
                        ap.id, ap.profile_code as code, ap.profile_name as name,
                        ap.profile_type, ap.weight_per_meter as density,
                        ap.unit_price, ap.description, 'cây' as unit,
                        als.name as system_name, als.brand
                    FROM aluminum_profiles ap
                    LEFT JOIN aluminum_systems als ON ap.system_id = als.id
                    WHERE ap.id = ? AND ap.is_active = 1
                `, [id]);
                break;

            case 'glass_items':
                [result] = await db.query(`
                    SELECT 
                        id, code, name, structure as description,
                        price as unit_price, quantity as stock_quantity, 'tấm' as unit
                    FROM glass_items WHERE id = ?
                `, [id]);
                break;

            case 'accessories':
                [result] = await db.query(`
                    SELECT 
                        id, code, name, category, description,
                        unit, stock_quantity, purchase_price as unit_price
                    FROM accessories WHERE id = ? AND is_active = 1
                `, [id]);
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: "Nguồn dữ liệu không hợp lệ"
                });
        }

        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy vật tư"
            });
        }

        res.json({
            success: true,
            data: result[0]
        });

    } catch (err) {
        console.error('Error getting material detail:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: err.message
        });
    }
};
