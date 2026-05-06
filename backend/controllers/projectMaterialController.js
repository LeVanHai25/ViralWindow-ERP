const db = require("../config/db");

const { emitDataChange } = require('../services/socketService');
/**
 * Controller quáº£n lÃ½ váº­t tÆ° xuáº¥t cho dá»± Ã¡n
 */

// Auto-migrate: Táº¡o báº£ng project_materials náº¿u chÆ°a tá»“n táº¡i
(async () => {
    try {
        // Táº¡o báº£ng vá»›i ENUM bao gá»“m 'phukien'
        await db.query(`
            CREATE TABLE IF NOT EXISTS project_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                material_type ENUM('accessory', 'aluminum', 'glass', 'other', 'phukien') NULL,
                material_id INT NOT NULL,
                material_name VARCHAR(255) NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                unit VARCHAR(50) NOT NULL,
                unit_price DECIMAL(15,2) DEFAULT 0,
                total_cost DECIMAL(15,2) DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_project_id (project_id),
                INDEX idx_material_type (material_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('âœ… Báº£ng project_materials Ä‘Ã£ sáºµn sÃ ng');

        // Migration: Cáº­p nháº­t ENUM Ä‘á»ƒ bao gá»“m 'phukien' (cho database Ä‘Ã£ tá»“n táº¡i)
        try {
            await db.query(`
                ALTER TABLE project_materials 
                MODIFY COLUMN material_type ENUM('accessory', 'aluminum', 'glass', 'other', 'phukien') NULL
            `);
            console.log('âœ… ÄÃ£ cáº­p nháº­t ENUM material_type Ä‘á»ƒ bao gá»“m phukien');
        } catch (alterErr) {
            // Ignore error if ENUM already has the value
            if (!alterErr.message.includes('Duplicate')) {
                console.log('â„¹ï¸ ENUM material_type:', alterErr.message);
            }
        }
    } catch (err) {
        console.error('âŒ Lá»—i táº¡o báº£ng project_materials:', err.message);
    }
})();

// GET /api/project-materials/:projectId - Láº¥y danh sÃ¡ch váº­t tÆ° cá»§a dá»± Ã¡n
exports.getByProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        // BÆ¯á»šC 1: Láº¥y thÃ´ng tin dá»± Ã¡n
        const [projectRows] = await db.query(
            `SELECT id, project_code, project_name FROM projects WHERE id = ?`,
            [projectId]
        );
        const project = projectRows[0] || {};

        // BÆ¯á»šC 2: Láº¥y táº¥t cáº£ váº­t tÆ° Ä‘Ã£ xuáº¥t (tá»« project_materials) - ÄÃ‚Y LÃ€ "Váº¬T TÆ¯ ÄÃƒ XUáº¤T"
        const [exportedRows] = await db.query(
            `SELECT 
                pm.id,
                pm.project_id,
                pm.material_code,
                -- Xá»­ lÃ½ cáº£ dá»¯ liá»‡u cÅ© vÃ  má»›i: Æ°u tiÃªn cá»™t má»›i, náº¿u null thÃ¬ dÃ¹ng cá»™t cÅ©
                COALESCE(pm.material_name, pm.item_name) as material_name,
                COALESCE(pm.quantity, pm.quantity_used) as quantity,
                COALESCE(pm.unit, pm.item_unit) as unit,
                pm.unit_price,
                pm.total_cost,
                pm.notes,
                pm.created_at,
                pm.updated_at,
                -- Náº¿u khÃ´ng cÃ³ material_type, thá»­ suy luáº­n tá»« inventory_id/accessory_id
                COALESCE(pm.material_type, 
                    CASE 
                        WHEN pm.accessory_id IS NOT NULL THEN 'accessory'
                        WHEN pm.inventory_id IS NOT NULL THEN 
                            COALESCE(
                                (SELECT item_type FROM inventory WHERE id = pm.inventory_id LIMIT 1),
                                'other'
                            )
                        ELSE 'other'
                    END
                ) as material_type,
                -- Material_id: Æ°u tiÃªn material_id má»›i, náº¿u khÃ´ng cÃ³ thÃ¬ dÃ¹ng inventory_id hoáº·c accessory_id
                COALESCE(pm.material_id, pm.inventory_id, pm.accessory_id) as material_id,
                -- Cá»™t Ä‘Ã¡nh dáº¥u Ä‘Ã£ trá»« kho hay chÆ°a
                COALESCE(pm.stock_deducted, 0) as stock_deducted
             FROM project_materials pm
             WHERE pm.project_id = ?
             ORDER BY pm.created_at DESC`,
            [projectId]
        );

        // BÆ¯á»šC 3: Láº¥y sá»‘ lÆ°á»£ng cáº§n tá»« BOM (bom_items) - ÄÃ‚Y LÃ€ DANH SÃCH Váº¬T TÆ¯ Cáº¦N
        // bom_items khÃ´ng cÃ³ project_id, cáº§n join qua door_designs hoáº·c project_items
        let bomRequiredMaterials = [];
        try {
            // Thá»­ láº¥y tá»« bom_items qua door_designs
            const [bomRows] = await db.query(
                `SELECT 
                    bi.item_type,
                    bi.item_code,
                    bi.item_name,
                    SUM(bi.quantity) as total_required,
                    bi.unit
                 FROM bom_items bi
                 INNER JOIN door_designs dd ON dd.id = bi.design_id
                 WHERE dd.project_id = ?
                 GROUP BY bi.item_type, bi.item_code, bi.item_name, bi.unit`,
                [projectId]
            );

            bomRequiredMaterials = bomRows.map(bom => {
                const itemType = bom.item_type || 'other';
                return {
                    material_type: itemType === 'frame' || itemType === 'mullion' ? 'aluminum' :
                        itemType === 'glass' ? 'glass' :
                            itemType === 'accessory' ? 'accessory' : 'other',
                    material_name: bom.item_name || '',
                    item_code: bom.item_code || '',
                    total_required: parseFloat(bom.total_required) || 0,
                    unit: bom.unit || 'cÃ¡i'
                };
            });
        } catch (bomErr) {
            console.warn('Could not get BOM requirements:', bomErr.message);
        }

        // BÆ¯á»šC 4: TÃ­nh tá»•ng sá»‘ lÆ°á»£ng Ä‘Ã£ xuáº¥t cho má»—i váº­t tÆ° (gom nhÃ³m theo material_id + material_type + material_name)
        const exportedByMaterial = {};
        exportedRows.forEach(item => {
            const key = `${item.material_type}_${item.material_id || 'unknown'}_${item.material_name || ''}`;
            if (!exportedByMaterial[key]) {
                exportedByMaterial[key] = {
                    material_type: item.material_type,
                    material_id: item.material_id,
                    material_name: item.material_name,
                    total_exported: 0,
                    unit: item.unit
                };
            }
            exportedByMaterial[key].total_exported += parseFloat(item.quantity) || 0;
        });

        // BÆ¯á»šC 5: Xá»­ lÃ½ "Váº¬T TÆ¯ ÄÃƒ XUáº¤T" - Láº¥y giÃ¡ vÃ  tá»“n kho tá»« kho cho má»—i váº­t tÆ° Ä‘Ã£ xuáº¥t
        const exportedMaterials = await Promise.all(exportedRows.map(async (item) => {
            const materialType = item.material_type;
            let materialId = item.material_id;
            const materialCode = (item.material_code || '').trim(); // MÃ£ váº­t tÆ° Ä‘á»ƒ sync vá»›i kho
            const materialName = (item.material_name || '').trim(); // Loáº¡i bá» khoáº£ng tráº¯ng thá»«a
            const exportedQty = parseFloat(item.quantity) || 0; // Sá»‘ lÆ°á»£ng Ä‘Ã£ xuáº¥t (cho record nÃ y)

            // TÃ­nh tá»•ng sá»‘ lÆ°á»£ng Ä‘Ã£ xuáº¥t cho váº­t tÆ° nÃ y (cÃ³ thá»ƒ cÃ³ nhiá»u record)
            const exportedKey = `${materialType}_${materialId || 'unknown'}_${materialName}`;
            const totalExportedQty = exportedByMaterial[exportedKey]?.total_exported || exportedQty;

            // TÃ¬m sá»‘ lÆ°á»£ng cáº§n tá»« BOM (náº¿u cÃ³) - tÃ¬m theo tÃªn
            let totalRequiredQty = exportedQty; // Máº·c Ä‘á»‹nh = sá»‘ Ä‘Ã£ xuáº¥t
            const bomMatch = bomRequiredMaterials.find(bom =>
                bom.material_name === materialName && bom.material_type === materialType
            );
            if (bomMatch) {
                totalRequiredQty = bomMatch.total_required;
            }

            let availableStock = 0;
            let stockPrice = 0; // LuÃ´n báº¯t Ä‘áº§u tá»« 0, sáº½ láº¥y tá»« kho (khÃ´ng dÃ¹ng giÃ¡ Ä‘Ã£ lÆ°u)
            let stockStatus = 'unknown'; // 'sufficient', 'partial', 'shortage', 'not_found'
            let stockNote = '';
            let foundInInventory = false; // Flag Ä‘á»ƒ Ä‘Ã¡nh dáº¥u Ä‘Ã£ tÃ¬m tháº¥y trong kho

            // TÃ­nh toÃ¡n sá»‘ lÆ°á»£ng cÃ²n cáº§n vÃ  shortage (sáº½ Ä‘Æ°á»£c tÃ­nh sau khi cÃ³ totalRequiredQty vÃ  totalExportedQty)
            let stillNeeded = 0;
            let remainingStock = 0; // Sáº½ Ä‘Æ°á»£c cáº­p nháº­t trong try block
            let shortage = 0; // Sáº½ Ä‘Æ°á»£c tÃ­nh sau khi cÃ³ remainingStock

            try {
                // Náº¿u material_id = 0 hoáº·c null (tá»« BOM data), tÃ¬m theo tÃªn/mÃ£
                if (!materialId || materialId === 0) {
                    // Thá»­ tÃ¬m theo tÃªn trong kho
                    let foundInStock = false;

                    if (materialType === 'accessory') {
                        // TÃ¬m trong accessories - Æ¯U TIÃŠN TÃŒM THEO CODE, náº¿u khÃ´ng cÃ³ thÃ¬ tÃ¬m theo tÃªn
                        const searchTerm = materialCode || materialName;
                        const [accRows] = await db.query(
                            `SELECT id, stock_quantity, COALESCE(sale_price, purchase_price, 0) as price 
                             FROM accessories 
                             WHERE (code = ? OR name = ? OR code LIKE ? OR name LIKE ?) AND is_active = 1
                             ORDER BY CASE WHEN code = ? THEN 0 ELSE 1 END
                             LIMIT 1`,
                            [searchTerm, searchTerm, `%${searchTerm}%`, `%${searchTerm}%`, searchTerm]
                        );
                        if (accRows.length > 0) {
                            materialId = accRows[0].id; // Cáº­p nháº­t material_id Ä‘á»ƒ dÃ¹ng sau nÃ y
                            availableStock = parseFloat(accRows[0].stock_quantity) || 0;
                            stockPrice = parseFloat(accRows[0].price) || 0;
                            foundInStock = true;
                            foundInInventory = true;
                        }
                    } else if (materialType === 'aluminum') {
                        // TÃ¬m trong aluminum_systems - Æ¯U TIÃŠN TÃŒM THEO CODE
                        const searchTerm = materialCode || materialName;
                        const [alumRows] = await db.query(
                            `SELECT id, CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock, unit_price as price 
                             FROM aluminum_systems 
                             WHERE (code = ? OR name = ? OR code LIKE ? OR name LIKE ?) AND is_active = 1
                             ORDER BY CASE WHEN code = ? THEN 0 ELSE 1 END
                             LIMIT 1`,
                            [searchTerm, searchTerm, `%${searchTerm}%`, `%${searchTerm}%`, searchTerm]
                        );
                        if (alumRows.length > 0) {
                            materialId = alumRows[0].id; // Cáº­p nháº­t material_id Ä‘á»ƒ dÃ¹ng sau nÃ y
                            availableStock = parseFloat(alumRows[0].stock) || 0;
                            stockPrice = parseFloat(alumRows[0].price) || 0;
                            foundInStock = true;
                            foundInInventory = true;
                        }
                    } else if (materialType === 'glass') {
                        // âœ… FIX: Glass tá»« báº£ng glass_items (Ä‘á»“ng bá»™ vá»›i inventory.html vÃ  design-new.html)
                        // TÃ¬m theo code hoáº·c K-{id} format hoáº·c tÃªn
                        const searchTerm = materialCode || materialName;
                        let glassRows = [];

                        // 1. Thá»­ tÃ¬m chÃ­nh xÃ¡c theo code trÆ°á»›c
                        if (materialCode) {
                            [glassRows] = await db.query(
                                `SELECT id, COALESCE(quantity, 0) as stock, COALESCE(price, 0) as price 
                                 FROM glass_items 
                                 WHERE code = ? OR CONCAT('K-', id) = ?
                                 LIMIT 1`,
                                [materialCode, materialCode]
                            );
                        }
                        // 2. Náº¿u khÃ´ng tÃ¬m tháº¥y theo code, thá»­ tÃ¬m theo tÃªn
                        if (glassRows.length === 0 && materialName) {
                            [glassRows] = await db.query(
                                `SELECT id, COALESCE(quantity, 0) as stock, COALESCE(price, 0) as price 
                                 FROM glass_items 
                                 WHERE name = ? OR name LIKE ?
                                 LIMIT 1`,
                                [materialName, `%${materialName}%`]
                            );
                        }
                        if (glassRows.length > 0) {
                            materialId = glassRows[0].id;
                            availableStock = parseFloat(glassRows[0].stock) || 0;
                            stockPrice = parseFloat(glassRows[0].price) || 0;
                            foundInStock = true;
                            foundInInventory = true;
                            console.log(`âœ… TÃ¬m tháº¥y glass trong glass_items: code=${materialCode}, name=${materialName}, id=${materialId}, stock=${availableStock}`);
                        } else {
                            console.log(`âŒ KhÃ´ng tÃ¬m tháº¥y glass trong glass_items: code=${materialCode}, name=${materialName}`);
                        }
                    } else if (materialType === 'other') {
                        // Other tá»« báº£ng inventory
                        let invRows = [];
                        if (materialCode) {
                            [invRows] = await db.query(
                                `SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock, unit_price as price 
                                 FROM inventory 
                                 WHERE item_code = ?
                                 LIMIT 1`,
                                [materialCode]
                            );
                        }
                        if (invRows.length === 0 && materialName) {
                            [invRows] = await db.query(
                                `SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock, unit_price as price 
                                 FROM inventory 
                                 WHERE item_name = ?
                                 LIMIT 1`,
                                [materialName]
                            );
                        }
                        if (invRows.length > 0) {
                            materialId = invRows[0].id;
                            let stockValue = invRows[0].stock;
                            if (typeof stockValue === 'string') {
                                stockValue = stockValue.replace(/[^\d.,]/g, '').replace(',', '.');
                            }
                            availableStock = parseFloat(stockValue) || 0;
                            stockPrice = parseFloat(invRows[0].price) || 0;
                            foundInStock = true;
                            foundInInventory = true;
                            console.log(`âœ… TÃ¬m tháº¥y other trong inventory: code=${materialCode}, name=${materialName}, id=${materialId}, stock=${availableStock}`);
                        } else {
                            console.log(`âŒ KhÃ´ng tÃ¬m tháº¥y other trong inventory: code=${materialCode}, name=${materialName}`);
                        }
                    }

                    if (!foundInStock) {
                        stockStatus = 'not_found';
                        stockNote = 'Vui lÃ²ng nháº­p váº­t tÆ° nÃ y';
                    }
                } else {
                    // Láº¥y tá»“n kho vÃ  giÃ¡ tá»« báº£ng tÆ°Æ¡ng á»©ng báº±ng ID
                    if (materialType === 'accessory') {
                        const [accRows] = await db.query(
                            `SELECT stock_quantity, COALESCE(sale_price, purchase_price, 0) as price 
                             FROM accessories WHERE id = ?`,
                            [materialId]
                        );
                        if (accRows.length > 0) {
                            availableStock = parseFloat(accRows[0].stock_quantity) || 0;
                            stockPrice = parseFloat(accRows[0].price) || 0;
                            foundInInventory = true;
                        } else {
                            stockStatus = 'not_found';
                            stockNote = 'Vui lÃ²ng nháº­p váº­t tÆ° nÃ y';
                        }
                    } else if (materialType === 'aluminum') {
                        const [alumRows] = await db.query(
                            `SELECT CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock, unit_price as price 
                             FROM aluminum_systems WHERE id = ?`,
                            [materialId]
                        );
                        if (alumRows.length > 0) {
                            availableStock = parseFloat(alumRows[0].stock) || 0;
                            stockPrice = parseFloat(alumRows[0].price) || 0;
                            foundInInventory = true;
                        } else {
                            stockStatus = 'not_found';
                            stockNote = 'Vui lÃ²ng nháº­p váº­t tÆ° nÃ y';
                        }
                    } else if (materialType === 'glass') {
                        // âœ… FIX: Glass tá»« báº£ng glass_items (Ä‘á»“ng bá»™ vá»›i inventory.html vÃ  design-new.html)
                        const [glassRows] = await db.query(
                            `SELECT COALESCE(quantity, 0) as stock, COALESCE(price, 0) as price 
                             FROM glass_items WHERE id = ?`,
                            [materialId]
                        );
                        if (glassRows.length > 0) {
                            availableStock = parseFloat(glassRows[0].stock) || 0;
                            stockPrice = parseFloat(glassRows[0].price) || 0;
                            foundInInventory = true;
                        } else {
                            stockStatus = 'not_found';
                            stockNote = 'Vui lÃ²ng nháº­p váº­t tÆ° nÃ y';
                        }
                    } else if (materialType === 'other' || materialType === 'accessory') {
                        // Váº­t tÆ° phá»¥ / Phá»¥ kiá»‡n: Thá»­ tÃ¬m trong cáº£ 2 báº£ng inventory vÃ  accessories
                        // 1. Thá»­ trong inventory trÆ°á»›c (Æ°u tiÃªn hÃ ng kho)
                        const [invRows] = await db.query(
                            `SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock, unit_price as price 
                             FROM inventory WHERE id = ? OR item_code = ?`,
                            [materialId, materialCode]
                        );
                        if (invRows.length > 0) {
                            let stockValue = invRows[0].stock;
                            if (typeof stockValue === 'string') {
                                stockValue = stockValue.replace(/[^\d.,]/g, '').replace(',', '.');
                            }
                            availableStock = parseFloat(stockValue) || 0;
                            stockPrice = parseFloat(invRows[0].price) || 0;
                            foundInInventory = true;
                            if (!materialId) materialId = invRows[0].id;
                        } else {
                            // 2. Thá»­ trong accessories
                            const [accRows] = await db.query(
                                `SELECT id, stock_quantity, COALESCE(sale_price, purchase_price, 0) as price 
                                 FROM accessories WHERE id = ? OR code = ?`,
                                [materialId, materialCode]
                            );
                            if (accRows.length > 0) {
                                availableStock = parseFloat(accRows[0].stock_quantity) || 0;
                                stockPrice = parseFloat(accRows[0].price) || 0;
                                foundInInventory = true;
                                if (!materialId) materialId = accRows[0].id;
                            } else {
                                stockStatus = 'not_found';
                                stockNote = 'Vui lÃ²ng nháº­p váº­t tÆ° nÃ y';
                            }
                        }
                    }
                }

                // TÃ­nh toÃ¡n sá»‘ lÆ°á»£ng cÃ²n cáº§n vÃ  shortage sau khi Ä‘Ã£ cÃ³ totalRequiredQty vÃ  totalExportedQty
                stillNeeded = Math.max(0, totalRequiredQty - totalExportedQty); // Sá»‘ lÆ°á»£ng cÃ²n cáº§n = (tá»•ng cáº§n) - (Ä‘Ã£ xuáº¥t)
                remainingStock = availableStock; // Tá»“n kho hiá»‡n táº¡i (Ä‘Ã£ trá»« khi xuáº¥t)
                shortage = Math.max(0, stillNeeded - remainingStock); // Sá»‘ lÆ°á»£ng thiáº¿u = (cÃ²n cáº§n) - (tá»“n kho)

                // XÃ¡c Ä‘á»‹nh tráº¡ng thÃ¡i tá»“n kho dá»±a trÃªn sá»‘ lÆ°á»£ng Cáº¦N vÃ  sá»‘ lÆ°á»£ng ÄÃƒ XUáº¤T
                if (stockStatus === 'unknown') {
                    if (foundInInventory) {
                        // ÄÃ£ tÃ¬m tháº¥y váº­t tÆ° trong kho
                        // So sÃ¡nh: (tá»“n kho hiá»‡n táº¡i) vá»›i (sá»‘ lÆ°á»£ng cÃ²n cáº§n)
                        // QUAN TRá»ŒNG: Náº¿u kho = 0, LUÃ”N lÃ  "shortage" báº¥t ká»ƒ Ä‘Ã£ xuáº¥t bao nhiÃªu
                        if (remainingStock === 0) {
                            // Háº¿t kho - LUÃ”N Ä‘Ã¡nh dáº¥u lÃ  shortage
                            stockStatus = 'shortage';
                            stockNote = 'Kho Ä‘Ã£ háº¿t hÃ£y cung cáº¥p';
                        } else if (stillNeeded === 0 && remainingStock > 0) {
                            // ÄÃ£ xuáº¥t Ä‘á»§ sá»‘ lÆ°á»£ng cáº§n VÃ€ kho váº«n cÃ²n
                            stockStatus = 'sufficient';
                            stockNote = 'Váº­t tÆ° cÃ²n Ä‘á»§ dÃ¹ng';
                        } else if (remainingStock >= stillNeeded && remainingStock > 0) {
                            // Tá»“n kho Ä‘á»§ cho sá»‘ lÆ°á»£ng cÃ²n cáº§n VÃ€ kho váº«n cÃ²n
                            stockStatus = 'sufficient';
                            stockNote = 'Váº­t tÆ° cÃ²n Ä‘á»§ dÃ¹ng';
                        } else if (remainingStock > 0) {
                            // Tá»“n kho cÃ³ nhÆ°ng khÃ´ng Ä‘á»§
                            stockStatus = 'partial';
                            stockNote = `Thiáº¿u ${shortage.toFixed(2)} ${item.unit || ''} - Cáº§n bá»• sung`;
                        } else {
                            // Case an toÃ n - khÃ´ng nÃªn Ä‘áº¿n Ä‘Ã¢y
                            stockStatus = 'shortage';
                            stockNote = 'Kho Ä‘Ã£ háº¿t hÃ£y cung cáº¥p';
                        }
                    } else {
                        // KhÃ´ng tÃ¬m tháº¥y váº­t tÆ° trong kho
                        stockStatus = 'not_found';
                        stockNote = 'Vui lÃ²ng nháº­p váº­t tÆ° nÃ y';
                    }
                }
                // Náº¿u stockStatus Ä‘Ã£ lÃ  'not_found', giá»¯ nguyÃªn (Ä‘Ã£ Ä‘Æ°á»£c set á»Ÿ trÃªn)

                // LUÃ”N cáº­p nháº­t giÃ¡ tá»« kho (láº¥y giÃ¡ má»›i nháº¥t) cho Táº¤T Cáº¢ record
                // Äáº£m báº£o cÃ¹ng má»™t váº­t tÆ° luÃ´n cÃ³ cÃ¹ng má»™t giÃ¡ tá»« kho
                // Náº¿u stockPrice = 0, thá»­ láº¥y láº¡i tá»« kho (cÃ³ thá»ƒ do query lá»—i hoáº·c giÃ¡ tháº­t sá»± = 0)
                if (stockPrice <= 0) {
                    // Thá»­ láº¥y láº¡i giÃ¡ tá»« kho má»™t láº§n ná»¯a Ä‘á»ƒ cháº¯c cháº¯n
                    let retryPrice = 0;
                    try {
                        if (materialType === 'accessory') {
                            if (materialId) {
                                // Thá»­ theo ID trÆ°á»›c
                                const [retryRows] = await db.query(
                                    'SELECT COALESCE(sale_price, purchase_price, 0) as price FROM accessories WHERE id = ?',
                                    [materialId]
                                );
                                if (retryRows.length > 0) {
                                    retryPrice = parseFloat(retryRows[0].price) || 0;
                                }
                            }
                            // Náº¿u váº«n khÃ´ng cÃ³ giÃ¡, thá»­ tÃ¬m theo tÃªn
                            if (retryPrice <= 0 && materialName) {
                                const [retryRows] = await db.query(
                                    'SELECT COALESCE(sale_price, purchase_price, 0) as price FROM accessories WHERE (name LIKE ? OR code LIKE ?) AND (sale_price > 0 OR purchase_price > 0) LIMIT 1',
                                    [`%${materialName}%`, `%${materialName}%`]
                                );
                                if (retryRows.length > 0) {
                                    retryPrice = parseFloat(retryRows[0].price) || 0;
                                }
                            }
                        } else if (materialType === 'aluminum') {
                            if (materialId) {
                                // Thá»­ theo ID trÆ°á»›c
                                const [retryRows] = await db.query(
                                    'SELECT unit_price as price FROM aluminum_systems WHERE id = ? AND unit_price > 0',
                                    [materialId]
                                );
                                if (retryRows.length > 0) {
                                    retryPrice = parseFloat(retryRows[0].price) || 0;
                                }
                            }
                            // Náº¿u váº«n khÃ´ng cÃ³ giÃ¡, thá»­ tÃ¬m theo tÃªn
                            if (retryPrice <= 0 && materialName) {
                                const [retryRows] = await db.query(
                                    'SELECT unit_price as price FROM aluminum_systems WHERE (name LIKE ? OR code LIKE ?) AND unit_price > 0 LIMIT 1',
                                    [`%${materialName}%`, `%${materialName}%`]
                                );
                                if (retryRows.length > 0) {
                                    retryPrice = parseFloat(retryRows[0].price) || 0;
                                }
                            }
                        } else if (materialType === 'glass' || materialType === 'other') {
                            if (materialId) {
                                // Thá»­ theo ID trÆ°á»›c
                                const [retryRows] = await db.query(
                                    'SELECT unit_price as price FROM inventory WHERE id = ? AND unit_price > 0',
                                    [materialId]
                                );
                                if (retryRows.length > 0) {
                                    retryPrice = parseFloat(retryRows[0].price) || 0;
                                }
                            }
                            // Náº¿u váº«n khÃ´ng cÃ³ giÃ¡, thá»­ tÃ¬m theo tÃªn
                            if (retryPrice <= 0 && materialName) {
                                const [retryRows] = await db.query(
                                    'SELECT unit_price as price FROM inventory WHERE (item_name LIKE ? OR item_code LIKE ?) AND unit_price > 0 LIMIT 1',
                                    [`%${materialName}%`, `%${materialName}%`]
                                );
                                if (retryRows.length > 0) {
                                    retryPrice = parseFloat(retryRows[0].price) || 0;
                                }
                            }
                        }
                    } catch (retryErr) {
                        console.warn(`Retry price fetch failed for ${materialId || materialName}:`, retryErr);
                    }

                    // Cáº­p nháº­t stockPrice náº¿u tÃ¬m tháº¥y giÃ¡
                    if (retryPrice > 0) {
                        stockPrice = retryPrice;
                    }
                }

                // FALLBACK UNIVERSAL: Náº¿u váº«n khÃ´ng cÃ³ giÃ¡, tÃ¬m trong Táº¤T Cáº¢ cÃ¡c báº£ng theo tÃªn
                // Äiá»u nÃ y xá»­ lÃ½ trÆ°á»ng há»£p material_type bá»‹ sai (vÃ­ dá»¥: lÆ°u lÃ  'other' nhÆ°ng thá»±c táº¿ lÃ  nhÃ´m)
                if (stockPrice <= 0 && materialName) {
                    console.log(`ðŸ” [UNIVERSAL FALLBACK] Searching all tables for: "${materialName}"`);
                    let fallbackPrice = 0;
                    let fallbackSource = '';

                    try {
                        // 1. Thá»­ tÃ¬m trong accessories
                        if (fallbackPrice <= 0) {
                            const [accRows] = await db.query(
                                `SELECT COALESCE(sale_price, purchase_price, 0) as price, name 
                                 FROM accessories 
                                 WHERE (name LIKE ? OR code LIKE ?) AND (sale_price > 0 OR purchase_price > 0)
                                 LIMIT 1`,
                                [`%${materialName}%`, `%${materialName}%`]
                            );
                            if (accRows.length > 0 && parseFloat(accRows[0].price) > 0) {
                                fallbackPrice = parseFloat(accRows[0].price);
                                fallbackSource = 'accessories';
                                console.log(`   âœ… Found in accessories: ${fallbackPrice} (${accRows[0].name})`);
                            }
                        }

                        // 2. Thá»­ tÃ¬m trong aluminum_systems
                        if (fallbackPrice <= 0) {
                            const [alumRows] = await db.query(
                                `SELECT unit_price as price, name 
                                 FROM aluminum_systems 
                                 WHERE (name LIKE ? OR code LIKE ?) AND unit_price > 0
                                 LIMIT 1`,
                                [`%${materialName}%`, `%${materialName}%`]
                            );
                            if (alumRows.length > 0 && parseFloat(alumRows[0].price) > 0) {
                                fallbackPrice = parseFloat(alumRows[0].price);
                                fallbackSource = 'aluminum_systems';
                                console.log(`   âœ… Found in aluminum_systems: ${fallbackPrice} (${alumRows[0].name})`);
                            }
                        }

                        // 3. Thá»­ tÃ¬m trong inventory
                        if (fallbackPrice <= 0) {
                            const [invRows] = await db.query(
                                `SELECT unit_price as price, item_name 
                                 FROM inventory 
                                 WHERE (item_name LIKE ? OR item_code LIKE ?) AND unit_price > 0
                                 LIMIT 1`,
                                [`%${materialName}%`, `%${materialName}%`]
                            );
                            if (invRows.length > 0 && parseFloat(invRows[0].price) > 0) {
                                fallbackPrice = parseFloat(invRows[0].price);
                                fallbackSource = 'inventory';
                                console.log(`   âœ… Found in inventory: ${fallbackPrice} (${invRows[0].item_name})`);
                            }
                        }

                        if (fallbackPrice > 0) {
                            stockPrice = fallbackPrice;
                            console.log(`   ðŸ“¦ Using fallback price from ${fallbackSource}: ${stockPrice}`);
                        } else {
                            console.log(`   âŒ No price found in any table for: "${materialName}"`);
                        }
                    } catch (fallbackErr) {
                        console.warn(`   âš ï¸ Fallback search failed for "${materialName}":`, fallbackErr.message);
                    }
                }

                // Ãp dá»¥ng giÃ¡ cuá»‘i cÃ¹ng
                if (stockPrice > 0) {
                    // CÃ³ giÃ¡ trong kho â†’ luÃ´n dÃ¹ng giÃ¡ tá»« kho (nháº¥t quÃ¡n)
                    item.unit_price = stockPrice;
                    item.total_cost = exportedQty * stockPrice; // TÃ­nh theo sá»‘ lÆ°á»£ng Ä‘Ã£ xuáº¥t (cho record nÃ y)
                } else if (item.unit_price > 0) {
                    // KhÃ´ng cÃ³ giÃ¡ trong kho nhÆ°ng cÃ³ giÃ¡ Ä‘Ã£ lÆ°u â†’ giá»¯ nguyÃªn giÃ¡ Ä‘Ã£ lÆ°u
                    item.total_cost = exportedQty * item.unit_price;
                } else {
                    // KhÃ´ng cÃ³ giÃ¡ cáº£ trong kho vÃ  Ä‘Ã£ lÆ°u â†’ Ä‘á»ƒ 0
                    item.unit_price = 0;
                    item.total_cost = 0;
                }
            } catch (err) {
                console.error(`Error getting stock for material ${materialId || materialName}:`, err);
                stockStatus = 'error';
                stockNote = 'Lá»—i kiá»ƒm tra kho';
                // Äáº£m báº£o remainingStock vÃ  shortage Ä‘Æ°á»£c tÃ­nh ngay cáº£ khi cÃ³ lá»—i
                stillNeeded = Math.max(0, totalRequiredQty - totalExportedQty);
                remainingStock = availableStock || 0;
                shortage = Math.max(0, stillNeeded - remainingStock);

                // QUAN TRá»ŒNG: DÃ¹ cÃ³ lá»—i, váº«n thá»­ tÃ¬m giÃ¡ tá»« kho theo tÃªn
                if (stockPrice <= 0 && materialName) {
                    console.log(`ðŸ”§ [ERROR FALLBACK] Trying to find price despite error for: "${materialName}"`);
                    try {
                        // TÃ¬m trong accessories
                        const [accRows] = await db.query(
                            `SELECT COALESCE(sale_price, purchase_price, 0) as price FROM accessories 
                             WHERE (name LIKE ? OR code LIKE ?) AND (sale_price > 0 OR purchase_price > 0) LIMIT 1`,
                            [`%${materialName}%`, `%${materialName}%`]
                        );
                        if (accRows.length > 0 && parseFloat(accRows[0].price) > 0) {
                            stockPrice = parseFloat(accRows[0].price);
                            item.unit_price = stockPrice;
                            item.total_cost = exportedQty * stockPrice;
                            console.log(`   âœ… Found price in accessories: ${stockPrice}`);
                        }

                        if (stockPrice <= 0) {
                            // TÃ¬m trong aluminum_systems
                            const [alumRows] = await db.query(
                                `SELECT unit_price as price FROM aluminum_systems 
                                 WHERE (name LIKE ? OR code LIKE ?) AND unit_price > 0 LIMIT 1`,
                                [`%${materialName}%`, `%${materialName}%`]
                            );
                            if (alumRows.length > 0 && parseFloat(alumRows[0].price) > 0) {
                                stockPrice = parseFloat(alumRows[0].price);
                                item.unit_price = stockPrice;
                                item.total_cost = exportedQty * stockPrice;
                                console.log(`   âœ… Found price in aluminum_systems: ${stockPrice}`);
                            }
                        }

                        if (stockPrice <= 0) {
                            // TÃ¬m trong inventory
                            const [invRows] = await db.query(
                                `SELECT unit_price as price FROM inventory 
                                 WHERE (item_name LIKE ? OR item_code LIKE ?) AND unit_price > 0 LIMIT 1`,
                                [`%${materialName}%`, `%${materialName}%`]
                            );
                            if (invRows.length > 0 && parseFloat(invRows[0].price) > 0) {
                                stockPrice = parseFloat(invRows[0].price);
                                item.unit_price = stockPrice;
                                item.total_cost = exportedQty * stockPrice;
                                console.log(`   âœ… Found price in inventory: ${stockPrice}`);
                            }
                        }
                    } catch (fallbackErr) {
                        console.error(`   âŒ Error fallback also failed:`, fallbackErr.message);
                    }
                }
            }

            // XÃ¡c Ä‘á»‹nh xem váº­t tÆ° nÃ y Ä‘Ã£ xuáº¥t Ä‘á»§ chÆ°a
            // CHá»ˆ coi lÃ  "Ä‘Ã£ xuáº¥t Ä‘á»§" khi stockStatus lÃ  'sufficient' (kho Ä‘á»§)
            // CÃ¡c tráº¡ng thÃ¡i khÃ¡c (partial, shortage, not_found, error) Ä‘á»u lÃ  "chÆ°a Ä‘á»§"
            const isFullyExported = stockStatus === 'sufficient';

            return {
                ...item,
                project_code: project.project_code,
                project_name: project.project_name,
                material_code: materialCode, // MÃ£ váº­t tÆ° Ä‘á»ƒ sync vá»›i kho
                quantity: exportedQty, // Sá»‘ lÆ°á»£ng Ä‘Ã£ xuáº¥t (cho record nÃ y)
                total_required: totalRequiredQty, // Tá»•ng sá»‘ lÆ°á»£ng cáº§n (tá»« BOM)
                total_exported: totalExportedQty, // Tá»•ng sá»‘ lÆ°á»£ng Ä‘Ã£ xuáº¥t (táº¥t cáº£ record)
                still_needed: Math.max(0, totalRequiredQty - totalExportedQty), // Sá»‘ lÆ°á»£ng cÃ²n cáº§n
                available_stock: remainingStock, // Tá»“n kho hiá»‡n táº¡i
                stock_status: stockStatus, // Giá»¯ nguyÃªn stockStatus Ä‘Ã£ tÃ­nh toÃ¡n
                stock_note: stockNote, // Giá»¯ nguyÃªn stockNote Ä‘Ã£ tÃ­nh toÃ¡n  
                shortage: shortage, // Sá»‘ lÆ°á»£ng thiáº¿u
                is_fully_exported: isFullyExported // Flag Ä‘á»ƒ phÃ¢n loáº¡i
            };
        }));

        // PhÃ¢n loáº¡i: "Váº­t tÆ° Ä‘Ã£ xuáº¥t" = Ä‘Ã£ xuáº¥t Ä‘á»§, "Váº­t tÆ° chÆ°a Ä‘á»§" = chÆ°a xuáº¥t hoáº·c chÆ°a Ä‘á»§
        const fullyExportedMaterials = exportedMaterials.filter(m => m.is_fully_exported);
        const partiallyExportedMaterials = exportedMaterials.filter(m => !m.is_fully_exported);

        // BÆ¯á»šC 6: Xá»­ lÃ½ "Váº¬T TÆ¯ CHÆ¯A Äá»¦" - Tá»« BOM nhÆ°ng chÆ°a xuáº¥t hoáº·c chÆ°a Ä‘á»§
        // Bao gá»“m cáº£ váº­t tÆ° Ä‘Ã£ xuáº¥t nhÆ°ng chÆ°a Ä‘á»§ (tá»« partiallyExportedMaterials)
        const insufficientMaterialsFromBOM = await Promise.all(bomRequiredMaterials.map(async (bom) => {
            const materialType = bom.material_type;
            const materialName = bom.material_name;
            const totalRequiredQty = bom.total_required;
            const materialCode = bom.item_code || ''; // MÃ£ váº­t tÆ° tá»« BOM
            const unit = bom.unit;

            // Kiá»ƒm tra xem váº­t tÆ° nÃ y Ä‘Ã£ Ä‘Æ°á»£c xuáº¥t chÆ°a (tÃ¬m theo tÃªn)
            let totalExportedQty = 0;
            for (const key in exportedByMaterial) {
                const exported = exportedByMaterial[key];
                if (exported.material_name === materialName && exported.material_type === materialType) {
                    totalExportedQty = exported.total_exported;
                    break;
                }
            }

            const stillNeeded = Math.max(0, totalRequiredQty - totalExportedQty);

            // Náº¿u Ä‘Ã£ xuáº¥t Ä‘á»§, khÃ´ng hiá»ƒn thá»‹ á»Ÿ "Váº­t tÆ° chÆ°a Ä‘á»§"
            if (stillNeeded <= 0) {
                return null;
            }

            // TÃ¬m material_id tá»« kho (náº¿u cÃ³)
            let materialId = null;
            let availableStock = 0;
            let stockPrice = 0;
            let stockStatus = 'not_found';
            let stockNote = 'KhÃ´ng cÃ³ trong kho - Cáº§n bá»• sung';
            let foundInInventory = false;

            try {
                if (materialType === 'accessory') {
                    const [accRows] = await db.query(
                        `SELECT id, stock_quantity, COALESCE(sale_price, purchase_price, 0) as price 
                         FROM accessories 
                         WHERE (name LIKE ? OR code LIKE ?) AND is_active = 1
                         LIMIT 1`,
                        [`%${materialName}%`, `%${materialName}%`]
                    );
                    if (accRows.length > 0) {
                        materialId = accRows[0].id;
                        availableStock = parseFloat(accRows[0].stock_quantity) || 0;
                        stockPrice = parseFloat(accRows[0].price) || 0;
                        foundInInventory = true;
                    }
                } else if (materialType === 'aluminum') {
                    const [alumRows] = await db.query(
                        `SELECT id, CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock, unit_price as price 
                         FROM aluminum_systems 
                         WHERE (name LIKE ? OR code LIKE ?) AND is_active = 1
                         LIMIT 1`,
                        [`%${materialName}%`, `%${materialName}%`]
                    );
                    if (alumRows.length > 0) {
                        materialId = alumRows[0].id;
                        availableStock = parseFloat(alumRows[0].stock) || 0;
                        stockPrice = parseFloat(alumRows[0].price) || 0;
                        foundInInventory = true;
                    }
                } else if (materialType === 'glass' || materialType === 'other') {
                    // Æ¯U TIÃŠN TÃŒM THEO MÃƒ VT (item_code) TRÆ¯á»šC
                    let invRows = [];
                    const searchCode = bom.item_code || materialCode;
                    // 1. Thá»­ tÃ¬m chÃ­nh xÃ¡c theo item_code trÆ°á»›c
                    if (searchCode) {
                        [invRows] = await db.query(
                            `SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock, unit_price as price 
                             FROM inventory 
                             WHERE item_code = ?
                             LIMIT 1`,
                            [searchCode]
                        );
                    }
                    // 2. Náº¿u khÃ´ng tÃ¬m tháº¥y theo code, thá»­ tÃ¬m theo tÃªn (exact match)
                    if (invRows.length === 0 && materialName) {
                        [invRows] = await db.query(
                            `SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock, unit_price as price 
                             FROM inventory 
                             WHERE item_name = ?
                             LIMIT 1`,
                            [materialName]
                        );
                    }
                    if (invRows.length > 0) {
                        materialId = invRows[0].id;
                        let stockValue = invRows[0].stock;
                        if (typeof stockValue === 'string') {
                            stockValue = stockValue.replace(/[^\d.,]/g, '').replace(',', '.');
                        }
                        availableStock = parseFloat(stockValue) || 0;
                        stockPrice = parseFloat(invRows[0].price) || 0;
                        foundInInventory = true;
                        console.log(`âœ… BOM: TÃ¬m tháº¥y glass/other trong kho: code=${searchCode}, name=${materialName}, stock=${availableStock}`);
                    } else {
                        console.log(`âŒ BOM: KhÃ´ng tÃ¬m tháº¥y glass/other trong kho: code=${searchCode}, name=${materialName}`);
                    }
                }

                // XÃ¡c Ä‘á»‹nh tráº¡ng thÃ¡i
                if (foundInInventory) {
                    const shortage = Math.max(0, stillNeeded - availableStock);
                    // QUAN TRá»ŒNG: Náº¿u kho = 0, LUÃ”N lÃ  "shortage"
                    if (availableStock === 0) {
                        stockStatus = 'shortage';
                        stockNote = 'Kho Ä‘Ã£ háº¿t hÃ£y cung cáº¥p';
                    } else if (availableStock >= stillNeeded && availableStock > 0) {
                        stockStatus = 'sufficient';
                        stockNote = 'Váº­t tÆ° cÃ²n Ä‘á»§ dÃ¹ng';
                    } else if (availableStock > 0) {
                        stockStatus = 'partial';
                        stockNote = `Thiếu ${shortage.toFixed(2)} ${unit} - Cần bổ sung`;
                    } else {
                        stockStatus = 'shortage';
                        stockNote = 'Kho đã hết hãy cung cấp';
                    }
                }
            } catch (err) {
                console.error(`Error getting stock for insufficient material ${materialName}:`, err);
                stockStatus = 'error';
                stockNote = 'Lỗi kiểm tra kho';
            }

            return {
                id: null, // Chưa có trong project_materials
                project_id: projectId,
                project_code: project.project_code,
                project_name: project.project_name,
                material_code: materialCode, // Mã vật tư từ BOM
                material_name: materialName,
                material_type: materialType,
                material_id: materialId,
                quantity: 0, // Chưa xuất
                unit: unit,
                total_required: totalRequiredQty,
                total_exported: totalExportedQty,
                still_needed: stillNeeded,
                available_stock: availableStock,
                stock_status: stockStatus,
                stock_note: stockNote,
                shortage: Math.max(0, stillNeeded - availableStock),
                unit_price: stockPrice,
                total_cost: 0,
                notes: '',
                created_at: null,
                updated_at: null
            };
        }));

        // Lá»c bá» cÃ¡c váº­t tÆ° null (Ä‘Ã£ xuáº¥t Ä‘á»§)
        const filteredInsufficientFromBOM = insufficientMaterialsFromBOM.filter(m => m !== null);

        // Káº¿t há»£p: "Váº­t tÆ° chÆ°a Ä‘á»§" = váº­t tÆ° tá»« BOM chÆ°a xuáº¥t/chÆ°a Ä‘á»§ + váº­t tÆ° Ä‘Ã£ xuáº¥t nhÆ°ng chÆ°a Ä‘á»§
        // Chuyá»ƒn Ä‘á»•i partiallyExportedMaterials sang format cá»§a insufficient
        const insufficientFromPartiallyExported = partiallyExportedMaterials.map(item => ({
            id: item.id, // CÃ³ ID vÃ¬ Ä‘Ã£ cÃ³ trong project_materials
            project_id: item.project_id,
            project_code: item.project_code,
            project_name: item.project_name,
            material_code: item.material_code, // MÃ£ váº­t tÆ°
            material_name: item.material_name,
            material_type: item.material_type,
            material_id: item.material_id,
            quantity: item.quantity, // Sá»‘ lÆ°á»£ng Ä‘Ã£ xuáº¥t
            unit: item.unit,
            total_required: item.total_required,
            total_exported: item.total_exported,
            still_needed: item.still_needed,
            available_stock: item.available_stock,
            stock_status: item.stock_status,
            stock_note: item.stock_note,
            shortage: item.shortage,
            unit_price: item.unit_price,
            total_cost: item.total_cost,
            notes: item.notes,
            created_at: item.created_at,
            updated_at: item.updated_at
        }));

        // Gộp lại: vật tư từ BOM chưa xuất/chưa đủ + vật tư đã xuất nhưng chưa đủ
        const allInsufficientMaterials = [...filteredInsufficientFromBOM, ...insufficientFromPartiallyExported];

        // Tính tổng chi phí cho TẤT CẢ vật tư đã xuất (không chỉ fully exported)
        const totalCost = exportedMaterials.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);

        // CẬP NHẬT GIÁ VÀO DATABASE để đồng bộ với API danh sách
        // Chỉ cập nhật nếu có sự thay đổi về giá
        try {
            for (const mat of exportedMaterials) {
                if (mat.id && (mat.unit_price > 0 || mat.total_cost > 0)) {
                    await db.query(
                        `UPDATE project_materials 
                         SET unit_price = ?, total_cost = ?, updated_at = NOW() 
                         WHERE id = ?`,
                        [mat.unit_price || 0, mat.total_cost || 0, mat.id]
                    );
                }
            }
            console.log(`ðŸ’¾ ÄÃ£ cáº­p nháº­t giÃ¡ cho ${exportedMaterials.length} váº­t tÆ° vÃ o database`);
        } catch (updateErr) {
            console.error('âš ï¸ Lá»—i khi cáº­p nháº­t giÃ¡ vÃ o database:', updateErr.message);
            // KhÃ´ng throw error, váº«n tiáº¿p tá»¥c tráº£ vá» response
        }

        // Debug log Ä‘á»ƒ kiá»ƒm tra
        console.log(`ðŸ“Š Project ${projectId} materials summary:`);
        console.log(`   Fully exported materials: ${fullyExportedMaterials.length}`);
        console.log(`   Partially exported materials: ${partiallyExportedMaterials.length}`);
        console.log(`   Insufficient materials (from BOM): ${filteredInsufficientFromBOM.length}`);
        console.log(`   Total insufficient materials: ${allInsufficientMaterials.length}`);
        console.log(`   Total cost (all exported): ${totalCost}`);

        // Äáº£m báº£o exported vÃ  insufficient luÃ´n lÃ  arrays
        const response = {
            success: true,
            data: [...fullyExportedMaterials, ...allInsufficientMaterials] || [],
            exported: fullyExportedMaterials || [], // Chá»‰ váº­t tÆ° Ä‘Ã£ xuáº¥t Äá»¦
            insufficient: allInsufficientMaterials || [], // Váº­t tÆ° chÆ°a xuáº¥t hoáº·c chÆ°a Ä‘á»§
            total_cost: totalCost || 0,
            count: (fullyExportedMaterials.length + allInsufficientMaterials.length) || 0,
            exported_count: fullyExportedMaterials.length || 0,
            insufficient_count: allInsufficientMaterials.length || 0
        };

        // Debug log chi tiáº¿t
        console.log(`ðŸ“Š Project ${projectId} - Final Response:`);
        console.log(`   Total: ${response.count}`);
        console.log(`   Exported: ${response.exported_count} (array length: ${response.exported.length})`);
        console.log(`   Insufficient: ${response.insufficient_count} (array length: ${response.insufficient.length})`);
        if (response.exported.length > 0) {
            console.log(`   Sample exported:`, response.exported[0]);
        }
        if (response.insufficient.length > 0) {
            console.log(`   Sample insufficient:`, response.insufficient[0]);
        }

        res.json(response);
    } catch (err) {
        console.error('Error getting project materials:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi láº¥y danh sÃ¡ch váº­t tÆ° dá»± Ã¡n"
        });
    }
};

// GET /api/project-materials/projects/bom-extraction - Láº¥y danh sÃ¡ch dá»± Ã¡n á»Ÿ giai Ä‘oáº¡n BÃ³c tÃ¡ch - Sáº£n xuáº¥t
exports.getProjectsForExport = async (req, res) => {
    try {
        // Chá»‰ láº¥y dá»± Ã¡n á»Ÿ giai Ä‘oáº¡n BÃ³c tÃ¡ch (40-60%) vÃ  Sáº£n xuáº¥t (60-80%)
        // CÃ¡c giai Ä‘oáº¡n: BÃ¡o giÃ¡ (0-20%), Thiáº¿t káº¿ (20-40%), BÃ³c tÃ¡ch (40-60%), Sáº£n xuáº¥t (60-80%), Láº¯p Ä‘áº·t (80-90%), BÃ n giao (90-100%)
        const [rows] = await db.query(
            `SELECT p.id, p.project_code, p.project_name, p.status, p.progress_percent,
                    c.full_name as customer_name,
                    (SELECT COUNT(*) FROM project_materials WHERE project_id = p.id) as material_count
             FROM projects p
             LEFT JOIN customers c ON p.customer_id = c.id
             WHERE p.status NOT IN ('completed', 'cancelled')
               AND p.progress_percent >= 40 
               AND p.progress_percent < 80
             ORDER BY p.created_at DESC`
        );

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error getting projects for export:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi láº¥y danh sÃ¡ch dá»± Ã¡n"
        });
    }
};

// POST /api/project-materials - ThÃªm váº­t tÆ° vÃ o dá»± Ã¡n (trá»« tá»“n kho)
exports.create = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { project_id, materials } = req.body;

        if (!project_id) {
            return res.status(400).json({
                success: false,
                message: "Vui lÃ²ng chá»n dá»± Ã¡n"
            });
        }

        if (!materials || !Array.isArray(materials) || materials.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Vui lÃ²ng chá»n Ã­t nháº¥t 1 váº­t tÆ°"
            });
        }

        const insertedIds = [];
        const insufficientMaterials = [];

        for (const mat of materials) {
            let { material_type, material_id, material_code, material_name, quantity, unit, unit_price, notes } = mat;

            // DEBUG: Log táº¥t cáº£ dá»¯ liá»‡u nháº­n Ä‘Æ°á»£c tá»« frontend
            console.log(`ðŸ“¥ [RECEIVED MATERIAL]`, {
                material_type,
                material_id,
                material_name,
                quantity,
                unit,
                unit_price,
                notes
            });

            if (!material_id || !quantity || quantity <= 0) {
                console.log(`âš ï¸ [SKIP MATERIAL] Missing required fields:`, { material_type, material_id, quantity });
                continue;
            }

            // Tá»° Äá»˜NG PHÃT HIá»†N material_type náº¿u khÃ´ng cÃ³ hoáº·c khÃ´ng Ä‘Ãºng
            // Kiá»ƒm tra xem ID cÃ³ tá»“n táº¡i trong báº£ng nÃ o
            if (!material_type) {
                try {
                    // Kiá»ƒm tra trong inventory (glass/other)
                    const [invCheck] = await connection.query(
                        `SELECT item_type FROM inventory WHERE id = ? LIMIT 1`,
                        [material_id]
                    );
                    if (invCheck.length > 0) {
                        const itemType = invCheck[0].item_type;
                        if (itemType === 'glass') {
                            material_type = 'glass';
                        } else if (itemType) {
                            material_type = 'other';
                        }
                    } else {
                        // Kiá»ƒm tra trong accessories
                        const [accCheck] = await connection.query(
                            `SELECT id FROM accessories WHERE id = ? LIMIT 1`,
                            [material_id]
                        );
                        if (accCheck.length > 0) {
                            material_type = 'accessory';
                        } else {
                            // Kiá»ƒm tra trong aluminum_systems
                            const [alumCheck] = await connection.query(
                                `SELECT id FROM aluminum_systems WHERE id = ? LIMIT 1`,
                                [material_id]
                            );
                            if (alumCheck.length > 0) {
                                material_type = 'aluminum';
                            }
                        }
                    }

                    if (material_type) {
                        console.log(`âœ… [AUTO-DETECTED TYPE] ID ${material_id} -> ${material_type}`);
                    }
                } catch (detectErr) {
                    console.warn(`Could not auto-detect material type:`, detectErr);
                }
            } else {
                // Kiá»ƒm tra xem material_type cÃ³ Ä‘Ãºng khÃ´ng
                try {
                    let actualType = null;
                    // Kiá»ƒm tra trong inventory (glass/other)
                    const [invCheck] = await connection.query(
                        `SELECT item_type FROM inventory WHERE id = ? LIMIT 1`,
                        [material_id]
                    );
                    if (invCheck.length > 0) {
                        const itemType = invCheck[0].item_type;
                        if (itemType === 'glass') {
                            actualType = 'glass';
                        } else if (itemType) {
                            actualType = 'other';
                        }
                    } else {
                        // Kiá»ƒm tra trong accessories
                        const [accCheck] = await connection.query(
                            `SELECT id FROM accessories WHERE id = ? LIMIT 1`,
                            [material_id]
                        );
                        if (accCheck.length > 0) {
                            actualType = 'accessory';
                        } else {
                            // Kiá»ƒm tra trong aluminum_systems
                            const [alumCheck] = await connection.query(
                                `SELECT id FROM aluminum_systems WHERE id = ? LIMIT 1`,
                                [material_id]
                            );
                            if (alumCheck.length > 0) {
                                actualType = 'aluminum';
                            }
                        }
                    }

                    if (actualType && actualType !== material_type) {
                        console.log(`âš ï¸ [TYPE MISMATCH] Frontend sent: ${material_type}, Actual: ${actualType}. Using actual type.`);
                        material_type = actualType;
                    }
                } catch (detectErr) {
                    console.warn(`Could not verify material type:`, detectErr);
                }
            }

            if (!material_type) {
                console.log(`âŒ [SKIP MATERIAL] Cannot determine material type for ID: ${material_id}`);
                continue;
            }

            const requestedQty = parseFloat(quantity) || 0;

            // DEBUG: Log thÃ´ng tin váº­t tÆ° Ä‘Æ°á»£c xá»­ lÃ½
            console.log(`ðŸ“¦ [PROCESSING MATERIAL] Type: ${material_type}, ID: ${material_id}, Name: ${material_name}, Qty: ${requestedQty}, Unit: ${unit}`);

            // KIá»‚M TRA Tá»’N KHO TRÆ¯á»šC KHI THÃŠM
            let availableStock = 0;
            let stockTable = '';
            let stockColumn = '';

            try {
                // Láº¥y tá»“n kho tá»« báº£ng tÆ°Æ¡ng á»©ng
                if (material_type === 'accessory') {
                    stockTable = 'accessories';
                    stockColumn = 'stock_quantity';
                    const [accRows] = await connection.query(
                        `SELECT ${stockColumn} FROM ${stockTable} WHERE id = ?`,
                        [material_id]
                    );
                    if (accRows.length > 0) {
                        availableStock = parseFloat(accRows[0][stockColumn]) || 0;
                    } else {
                        insufficientMaterials.push({
                            name: material_name,
                            reason: 'not_found',
                            message: 'KhÃ´ng cÃ³ trong kho'
                        });
                        continue;
                    }
                } else if (material_type === 'aluminum') {
                    stockTable = 'aluminum_systems';
                    stockColumn = 'CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END';
                    const [alumRows] = await connection.query(
                        `SELECT ${stockColumn} as stock FROM ${stockTable} WHERE id = ?`,
                        [material_id]
                    );
                    if (alumRows.length > 0) {
                        availableStock = parseFloat(alumRows[0].stock) || 0;
                    } else {
                        insufficientMaterials.push({
                            name: material_name,
                            reason: 'not_found',
                            message: 'KhÃ´ng cÃ³ trong kho'
                        });
                        continue;
                    }
                } else if (material_type === 'glass' || material_type === 'other') {
                    stockTable = 'inventory';
                    stockColumn = 'quantity';
                    // Sá»­ dá»¥ng CAST Ä‘á»ƒ Ä‘áº£m báº£o quantity lÃ  sá»‘, khÃ´ng pháº£i string
                    const [invRows] = await connection.query(
                        `SELECT CAST(${stockColumn} AS DECIMAL(10,2)) as stock_value, 
                                ${stockColumn} as raw_quantity,
                                item_type, unit, item_code, item_name 
                         FROM ${stockTable} WHERE id = ?`,
                        [material_id]
                    );
                    if (invRows.length > 0) {
                        // Æ¯u tiÃªn dÃ¹ng stock_value (Ä‘Ã£ CAST), náº¿u khÃ´ng cÃ³ thÃ¬ parse tá»« raw_quantity
                        let rawStock = invRows[0].stock_value !== null && invRows[0].stock_value !== undefined
                            ? invRows[0].stock_value
                            : invRows[0].raw_quantity;

                        // Xá»­ lÃ½ trÆ°á»ng há»£p rawStock lÃ  string cÃ³ chá»©a "mÂ²" hoáº·c Ä‘Æ¡n vá»‹ khÃ¡c
                        if (typeof rawStock === 'string') {
                            // Loáº¡i bá» táº¥t cáº£ kÃ½ tá»± khÃ´ng pháº£i sá»‘, dáº¥u cháº¥m, dáº¥u pháº©y
                            rawStock = rawStock.replace(/[^\d.,]/g, '').replace(',', '.');
                        }

                        availableStock = parseFloat(rawStock) || 0;

                        // DEBUG: Log thÃ´ng tin tá»“n kho kÃ­nh CHI TIáº¾T
                        if (material_type === 'glass') {
                            console.log(`ðŸ” [GLASS STOCK CHECK] Material: ${material_name}, ID: ${material_id}`);
                            console.log(`   - Raw Stock Value (from DB): ${invRows[0].raw_quantity} (type: ${typeof invRows[0].raw_quantity})`);
                            console.log(`   - CAST Stock Value: ${invRows[0].stock_value} (type: ${typeof invRows[0].stock_value})`);
                            console.log(`   - Processed Raw Stock: ${rawStock}`);
                            console.log(`   - Final Available Stock: ${availableStock}`);
                            console.log(`   - Requested Qty: ${requestedQty} (type: ${typeof requestedQty})`);
                            console.log(`   - Item Code: ${invRows[0].item_code}`);
                            console.log(`   - Item Name: ${invRows[0].item_name}`);
                            console.log(`   - Item Type: ${invRows[0].item_type}`);
                            console.log(`   - Unit: ${invRows[0].unit}`);
                            console.log(`   - Comparison: ${requestedQty} <= ${availableStock} = ${requestedQty <= availableStock}`);
                        }
                    } else {
                        console.log(`âŒ [GLASS NOT FOUND] Material ID ${material_id} not found in inventory table`);
                        insufficientMaterials.push({
                            name: material_name,
                            reason: 'not_found',
                            message: 'KhÃ´ng cÃ³ trong kho'
                        });
                        continue;
                    }
                }

                // GHI CHÃš: KHÃ”NG KIá»‚M TRA Tá»’N KHO á»ž ÄÃ‚Y
                // Váº­t tÆ° sáº½ Ä‘Æ°á»£c thÃªm vÃ o project_materials dÃ¹ kho = 0 hoáº·c thiáº¿u
                // Viá»‡c trá»« kho sáº½ Ä‘Æ°á»£c thá»±c hiá»‡n khi confirmExport

                // Debug log tá»“n kho (chá»‰ info, khÃ´ng cháº·n)
                if (availableStock === 0 || availableStock < 0) {
                    console.log(`âš ï¸ [INFO] ${material_name}: Kho = 0, sáº½ cáº§n nháº­p kho trÆ°á»›c khi xuáº¥t`);
                } else if (requestedQty > availableStock) {
                    console.log(`âš ï¸ [INFO] ${material_name}: YÃªu cáº§u ${requestedQty}, kho cÃ³ ${availableStock} - thiáº¿u ${requestedQty - availableStock}`);
                }

                // DEBUG: Log khi kiá»ƒm tra thÃ nh cÃ´ng
                if (material_type === 'glass') {
                    console.log(`âœ… [GLASS] ${material_name}: Äang thÃªm ${requestedQty}, kho hiá»‡n cÃ³ ${availableStock}`);
                }

                // Láº¥y giÃ¡ tá»« kho náº¿u giÃ¡ = 0 hoáº·c khÃ´ng cÃ³
                let finalUnitPrice = parseFloat(unit_price) || 0;
                if (finalUnitPrice === 0) {
                    // Láº¥y giÃ¡ tá»« kho theo loáº¡i váº­t tÆ°
                    if (material_type === 'accessory') {
                        const [accRows] = await connection.query(
                            'SELECT COALESCE(sale_price, purchase_price, 0) as price FROM accessories WHERE id = ?',
                            [material_id]
                        );
                        if (accRows.length > 0) {
                            finalUnitPrice = parseFloat(accRows[0].price) || 0;
                        }
                    } else if (material_type === 'aluminum') {
                        const [alumRows] = await connection.query(
                            'SELECT unit_price as price FROM aluminum_systems WHERE id = ?',
                            [material_id]
                        );
                        if (alumRows.length > 0) {
                            finalUnitPrice = parseFloat(alumRows[0].price) || 0;
                        }
                    } else if (material_type === 'glass' || material_type === 'other') {
                        const [invRows] = await connection.query(
                            'SELECT unit_price as price FROM inventory WHERE id = ?',
                            [material_id]
                        );
                        if (invRows.length > 0) {
                            finalUnitPrice = parseFloat(invRows[0].price) || 0;
                        }
                    }
                }

                // THÃŠM Váº¬T TÆ¯ VÃ€O PROJECT_MATERIALS (khÃ´ng trá»« kho)
                const totalCost = requestedQty * finalUnitPrice;

                const [result] = await connection.query(
                    `INSERT INTO project_materials 
                 (project_id, material_type, material_id, material_code, material_name, quantity, unit, unit_price, total_cost, notes, stock_deducted)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                    [project_id, material_type, material_id, material_code || null, material_name, requestedQty, unit || 'cÃ¡i', finalUnitPrice, totalCost, notes || null]
                );

                insertedIds.push(result.insertId);

                // GHI CHÃš: KHÃ”NG TRá»ª KHO á»ž ÄÃ‚Y - sáº½ trá»« khi confirmExport
                // await updateInventoryStock(connection, material_type, material_id, -requestedQty);
            } catch (err) {
                console.error(`Error adding material ${material_id}:`, err);
                // KhÃ´ng thÃªm vÃ o insufficientMaterials Ä‘á»ƒ trÃ¡nh rollback
                // Chá»‰ log lá»—i vÃ  tiáº¿p tá»¥c vá»›i váº­t tÆ° tiáº¿p theo
                continue;
            }
        }

        // GHI CHÃš: Logic rollback khi cÃ³ váº­t tÆ° thiáº¿u kho Ä‘Ã£ bá»‹ xÃ³a
        // VÃ¬ bÃ¢y giá» cho phÃ©p thÃªm Táº¤T Cáº¢ váº­t tÆ°, kho sáº½ Ä‘Æ°á»£c trá»« khi confirmExport

        // 3. Cáº­p nháº­t material_cost trong projects
        await updateProjectMaterialCost(connection, project_id);

        // LÆ°u Ã½: KhÃ´ng tá»± Ä‘á»™ng chuyá»ƒn tráº¡ng thÃ¡i á»Ÿ Ä‘Ã¢y
        // Chá»‰ chuyá»ƒn tráº¡ng thÃ¡i khi ngÆ°á»i dÃ¹ng nháº¥n nÃºt "XÃ¡c nháº­n xuáº¥t"

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: `ÄÃ£ thÃªm ${insertedIds.length} váº­t tÆ° vÃ o dá»± Ã¡n. Vui lÃ²ng nháº¥n "XÃ¡c nháº­n xuáº¥t" Ä‘á»ƒ chuyá»ƒn dá»± Ã¡n sang giai Ä‘oáº¡n Sáº£n xuáº¥t.`,
            data: { inserted_ids: insertedIds }
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error adding project materials:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi thÃªm váº­t tÆ°: " + err.message
        });
    }
};

// PUT /api/project-materials/:id - Sá»­a sá»‘ lÆ°á»£ng váº­t tÆ° (Ä‘iá»u chá»‰nh tá»“n kho)
exports.update = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { id } = req.params;
        const { quantity, notes } = req.body;

        // Láº¥y thÃ´ng tin hiá»‡n táº¡i
        const [currentRows] = await connection.query(
            `SELECT * FROM project_materials WHERE id = ?`,
            [id]
        );

        if (currentRows.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y váº­t tÆ°"
            });
        }

        const current = currentRows[0];
        const oldQuantity = parseFloat(current.quantity) || 0;
        const newQuantity = parseFloat(quantity) || oldQuantity;
        const quantityDiff = newQuantity - oldQuantity;

        const totalCost = newQuantity * (parseFloat(current.unit_price) || 0);

        // 1. Cáº­p nháº­t project_materials
        await connection.query(
            `UPDATE project_materials 
             SET quantity = ?, total_cost = ?, notes = ?, updated_at = NOW()
             WHERE id = ?`,
            [newQuantity, totalCost, notes !== undefined ? notes : current.notes, id]
        );

        // 2. KHÃ”NG ÄIá»€U CHá»ˆNH Tá»’N KHO KHI Sá»¬A REQUEST (KiotViet rule)
        // Tá»“n kho chá»‰ thay Ä‘á»•i khi Phiáº¿u xuáº¥t Ä‘Æ°á»£c Posted
        // if (quantityDiff !== 0) {
        //     await updateInventoryStock(connection, current.material_type, current.material_id, -quantityDiff);
        // }

        // 3. Cáº­p nháº­t material_cost trong projects
        await updateProjectMaterialCost(connection, current.project_id);

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: "Cáº­p nháº­t váº­t tÆ° thÃ nh cÃ´ng"
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error updating project material:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi cáº­p nháº­t váº­t tÆ°"
        });
    }
};

// DELETE /api/project-materials/:id - XÃ³a váº­t tÆ° (hoÃ n láº¡i tá»“n kho)
exports.delete = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { id } = req.params;

        // Láº¥y thÃ´ng tin váº­t tÆ°
        const [rows] = await connection.query(
            `SELECT * FROM project_materials WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y váº­t tÆ°"
            });
        }

        const material = rows[0];

        // 1. KHÃ”NG HOÃ€N Tá»’N KHO KHI Há»¦Y REQUEST (KiotViet rule)
        // Request chÆ°a xuáº¥t tháº­t (stock_deducted = 0) thÃ¬ khÃ´ng cÃ³ gÃ¬ Ä‘á»ƒ hoÃ n
        // Náº¿u Ä‘Ã£ xuáº¥t (stock_deducted = 1) thÃ¬ pháº£i táº¡o Phiáº¿u tráº£ kho, khÃ´ng xÃ³a trá»±c tiáº¿p
        // await updateInventoryStock(connection, material.material_type, material.material_id, material.quantity);

        // 2. XÃ³a khá»i project_materials
        await connection.query(
            `DELETE FROM project_materials WHERE id = ?`,
            [id]
        );

        // 3. Cáº­p nháº­t material_cost trong projects
        await updateProjectMaterialCost(connection, material.project_id);

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: "ÄÃ£ há»§y yÃªu cáº§u xuáº¥t váº­t tÆ°"
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error deleting project material:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi xÃ³a váº­t tÆ°"
        });
    }
};

// POST /api/project-materials/confirm-export/:projectId - XÃ¡c nháº­n xuáº¥t váº­t tÆ° vÃ  chuyá»ƒn tráº¡ng thÃ¡i dá»± Ã¡n
exports.confirmExport = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { projectId } = req.params;

        // Kiá»ƒm tra xem dá»± Ã¡n cÃ³ váº­t tÆ° Ä‘Æ°á»£c xuáº¥t chÆ°a
        const hasMaterials = await hasExportedMaterials(connection, projectId);
        if (!hasMaterials) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "ChÆ°a cÃ³ váº­t tÆ° nÃ o Ä‘Æ°á»£c xuáº¥t. Vui lÃ²ng thÃªm váº­t tÆ° trÆ°á»›c khi xÃ¡c nháº­n xuáº¥t."
            });
        }

        // Láº¥y thÃ´ng tin dá»± Ã¡n
        const [projectRows] = await connection.query(
            `SELECT id, progress_percent, status FROM projects WHERE id = ?`,
            [projectId]
        );

        if (projectRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        const project = projectRows[0];
        const currentProgress = parseFloat(project.progress_percent) || 0;

        // Náº¿u dá»± Ã¡n Ä‘Ã£ hoÃ n thÃ nh, khÃ´ng cho phÃ©p xuáº¥t thÃªm
        if (currentProgress >= 100 || project.status === 'completed') {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Dá»± Ã¡n Ä‘Ã£ hoÃ n thÃ nh. KhÃ´ng thá»ƒ xuáº¥t váº­t tÆ° thÃªm."
            });
        }

        // ========== LUÃ”N TRá»ª KHO TRÆ¯á»šC - dÃ¹ dá»± Ã¡n á»Ÿ giai Ä‘oáº¡n nÃ o ==========
        // Láº¥y táº¥t cáº£ váº­t tÆ° Ä‘Ã£ xuáº¥t nhÆ°ng chÆ°a trá»« kho
        const [materialsToDeduct] = await connection.query(
            `SELECT id, material_type, material_id, material_name, quantity, material_code
             FROM project_materials 
             WHERE project_id = ? AND (stock_deducted IS NULL OR stock_deducted = 0)`,
            [projectId]
        );

        console.log(`ðŸ“¦ Found ${materialsToDeduct.length} materials to deduct stock for project ${projectId}`);

        // Trá»« kho cho tá»«ng váº­t tÆ° - CHá»ˆ TRá»ª Náº¾U CÃ“ Äá»¦ KHO
        const exportedMaterials = []; // Váº­t tÆ° Ä‘Ã£ xuáº¥t thÃ nh cÃ´ng
        const insufficientMaterials = []; // Váº­t tÆ° khÃ´ng Ä‘á»§ kho

        for (const mat of materialsToDeduct) {
            const { id, material_type, material_id, material_name, quantity, material_code } = mat;
            const qty = parseFloat(quantity) || 0;

            if (qty <= 0) continue;

            console.log(`ðŸ” Checking stock for: ${material_name} (type: ${material_type}, qty: ${qty})`);

            try {
                // BÆ¯á»šC 1: KIá»‚M TRA Tá»’N KHO TRÆ¯á»šC KHI TRá»ª
                let availableStock = 0;
                let stockTable = '';
                let stockColumn = '';
                let foundMaterialId = null;

                if (material_type === 'accessory' || material_type === 'other') {
                    // Tìm trong cả accessories và inventory
                    let found = false;

                    // 1. Thử trong inventory (hàng kho mới)
                    let invRows = [];
                    if (material_id && material_id !== 0 && material_type === 'other') {
                        [invRows] = await connection.query(`SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock FROM inventory WHERE id = ?`, [material_id]);
                    } else if (material_code) {
                        [invRows] = await connection.query(`SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock FROM inventory WHERE item_code = ?`, [material_code]);
                    }

                    if (invRows.length > 0) {
                        availableStock = parseFloat(invRows[0].stock) || 0;
                        foundMaterialId = invRows[0].id;
                        stockTable = 'inventory';
                        stockColumn = 'quantity';
                        found = true;
                    }

                    // 2. Thử trong accessories (nếu chưa tìm thấy)
                    if (!found) {
                        let accRows = [];
                        if (material_id && material_id !== 0 && material_type === 'accessory') {
                            [accRows] = await connection.query(`SELECT id, stock_quantity FROM accessories WHERE id = ?`, [material_id]);
                        } else if (material_code) {
                            [accRows] = await connection.query(`SELECT id, stock_quantity FROM accessories WHERE code = ?`, [material_code]);
                        }

                        if (accRows.length === 0 && material_name) {
                            [accRows] = await connection.query(`SELECT id, stock_quantity FROM accessories WHERE name = ? LIMIT 1`, [material_name]);
                        }

                        if (accRows.length > 0) {
                            availableStock = parseFloat(accRows[0].stock_quantity) || 0;
                            foundMaterialId = accRows[0].id;
                            stockTable = 'accessories';
                            stockColumn = 'stock_quantity';
                            found = true;
                        }
                    }
                } else if (material_type === 'aluminum') {
                    // ... (rest remains same but slightly cleaned up for flow)
                    let alumRows = [];
                    if (material_id && material_id !== 0) {
                        [alumRows] = await connection.query(
                            `SELECT id, CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock FROM aluminum_systems WHERE id = ?`, [material_id]
                        );
                    } else if (material_code) {
                        [alumRows] = await connection.query(
                            `SELECT id, CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock FROM aluminum_systems WHERE code = ?`, [material_code]
                        );
                    }
                    if (alumRows.length === 0 && material_name) {
                        [alumRows] = await connection.query(
                            `SELECT id, CASE WHEN quantity IS NOT NULL AND quantity > 0 THEN quantity ELSE COALESCE(quantity_m, 0) END as stock FROM aluminum_systems WHERE name = ? LIMIT 1`,
                            [material_name]
                        );
                    }
                    if (alumRows.length > 0) {
                        availableStock = parseFloat(alumRows[0].stock) || 0;
                        foundMaterialId = alumRows[0].id;
                        stockTable = 'aluminum_systems';
                        stockColumn = 'quantity';
                    }
                } else if (material_type === 'glass') {
                    // Tìm trong inventory cho kính
                    let invRows = [];
                    if (material_id && material_id !== 0) {
                        [invRows] = await connection.query(`SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock FROM inventory WHERE id = ?`, [material_id]);
                    } else if (material_code) {
                        [invRows] = await connection.query(`SELECT id, CAST(quantity AS DECIMAL(10,2)) as stock FROM inventory WHERE item_code = ?`, [material_code]);
                    }
                    if (invRows.length > 0) {
                        availableStock = parseFloat(invRows[0].stock) || 0;
                        foundMaterialId = invRows[0].id;
                        stockTable = 'inventory';
                        stockColumn = 'quantity';
                    }
                }

                // BÆ¯á»šC 2: KIá»‚M TRA Náº¾U Äá»¦ KHO
                if (!foundMaterialId) {
                    // KhÃ´ng tÃ¬m tháº¥y váº­t tÆ° trong kho
                    console.warn(`âš ï¸ KhÃ´ng tÃ¬m tháº¥y trong kho: ${material_name}`);
                    insufficientMaterials.push({
                        name: material_name,
                        required: qty,
                        available: 0,
                        reason: 'not_found',
                        message: 'KhÃ´ng cÃ³ trong kho'
                    });
                    continue;
                }

                if (availableStock < qty) {
                    // KhÃ´ng Ä‘á»§ kho - KHÃ”NG TRá»ª, giá»¯ láº¡i Ä‘á»ƒ xuáº¥t sau
                    console.warn(`âš ï¸ KhÃ´ng Ä‘á»§ kho: ${material_name} (cáº§n: ${qty}, cÃ³: ${availableStock})`);
                    insufficientMaterials.push({
                        name: material_name,
                        required: qty,
                        available: availableStock,
                        shortage: qty - availableStock,
                        reason: 'insufficient',
                        message: `Cáº§n ${qty}, kho chá»‰ cÃ³ ${availableStock}`
                    });
                    // KHÃ”NG Ä‘Ã¡nh dáº¥u stock_deducted = 1, Ä‘á»ƒ láº§n sau xuáº¥t Ä‘Æ°á»£c
                    continue;
                }

                // BÆ¯á»šC 3: Äá»¦ KHO - TIáº¾N HÃ€NH TRá»ª
                console.log(`âœ… Äá»§ kho: ${material_name} (cáº§n: ${qty}, cÃ³: ${availableStock}) â†’ Äang trá»«...`);

                const [updateResult] = await connection.query(
                    `UPDATE ${stockTable} SET ${stockColumn} = ${stockColumn} - ? WHERE id = ?`,
                    [qty, foundMaterialId]
                );

                if (updateResult.affectedRows > 0) {
                    // Trá»« thÃ nh cÃ´ng - Ä‘Ã¡nh dáº¥u stock_deducted = 1
                    await connection.query(
                        `UPDATE project_materials SET stock_deducted = 1 WHERE id = ?`,
                        [id]
                    );
                    console.log(`âœ… ÄÃ£ trá»« ${qty} tá»« ${material_name} (ID: ${foundMaterialId})`);
                    exportedMaterials.push({
                        name: material_name,
                        quantity: qty,
                        stockBefore: availableStock,
                        stockAfter: availableStock - qty
                    });
                } else {
                    console.error(`âŒ KhÃ´ng thá»ƒ trá»« kho cho ${material_name}`);
                }
            } catch (deductError) {
                console.error(`âŒ Error deducting stock for ${material_name}:`, deductError);
            }
        }
        // ========== Káº¾T THÃšC LOGIC TRá»ª KHO ==========

        // Táº¡o thÃ´ng bÃ¡o chi tiáº¿t
        let message = '';
        if (exportedMaterials.length > 0) {
            message += `âœ… ÄÃ£ xuáº¥t thÃ nh cÃ´ng ${exportedMaterials.length} váº­t tÆ°.\n`;
        }
        if (insufficientMaterials.length > 0) {
            message += `âš ï¸ CÃ³ ${insufficientMaterials.length} váº­t tÆ° chÆ°a Ä‘á»§ kho (chá» nháº­p kho rá»“i xuáº¥t sau).\n`;
        }

        // Náº¿u dá»± Ã¡n Ä‘Ã£ á»Ÿ giai Ä‘oáº¡n Sáº£n xuáº¥t trá»Ÿ Ä‘i (>= 60%), chá»‰ trá»« kho, khÃ´ng chuyá»ƒn status
        if (currentProgress >= 60) {
            await connection.commit();
            connection.release();
            return res.json({
                success: true,
                message: message || `Dá»± Ã¡n Ä‘ang á»Ÿ giai Ä‘oáº¡n Sáº£n xuáº¥t (${currentProgress}%).`,
                exported: exportedMaterials,
                insufficient: insufficientMaterials,
                summary: {
                    total: materialsToDeduct.length,
                    exported: exportedMaterials.length,
                    pending: insufficientMaterials.length
                }
            });
        }

        // Chuyá»ƒn dá»± Ã¡n sang giai Ä‘oáº¡n Sáº£n xuáº¥t (60%) - CHá»ˆ KHI CÃ“ ÃT NHáº¤T 1 Váº¬T TÆ¯ ÄÃƒ XUáº¤T
        if (exportedMaterials.length > 0) {
            const newProgress = 60;

            await connection.query(
                `UPDATE projects 
                 SET progress_percent = ?, 
                     status = 'in_production'
                 WHERE id = ?`,
                [newProgress, projectId]
            );

            message += `ðŸ“¦ Dá»± Ã¡n Ä‘Ã£ chuyá»ƒn sang giai Ä‘oáº¡n Sáº£n xuáº¥t (${newProgress}%).`;
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: message || 'KhÃ´ng cÃ³ váº­t tÆ° nÃ o Ä‘Æ°á»£c xuáº¥t.',
            exported: exportedMaterials,
            insufficient: insufficientMaterials,
            summary: {
                total: materialsToDeduct.length,
                exported: exportedMaterials.length,
                pending: insufficientMaterials.length
            }
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error confirming export:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi xÃ¡c nháº­n xuáº¥t váº­t tÆ°: " + err.message
        });
    }
};

// GET /api/project-materials/check-export-requirement/:projectId - Kiá»ƒm tra Ä‘iá»u kiá»‡n xuáº¥t váº­t tÆ°
exports.checkExportRequirement = async (req, res) => {
    console.log('ðŸ” checkExportRequirement Ä‘Æ°á»£c gá»i vá»›i projectId:', req.params.projectId);
    try {
        const { projectId } = req.params;

        // Láº¥y thÃ´ng tin dá»± Ã¡n
        const [projectRows] = await db.query(
            `SELECT id, progress_percent, status FROM projects WHERE id = ?`,
            [projectId]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        const project = projectRows[0];
        const currentProgress = parseFloat(project.progress_percent) || 0;

        // Kiá»ƒm tra xem Ä‘Ã£ cÃ³ váº­t tÆ° Ä‘Æ°á»£c xuáº¥t chÆ°a
        const [materialRows] = await db.query(
            `SELECT COUNT(*) as count FROM project_materials WHERE project_id = ?`,
            [projectId]
        );

        const hasExportedMaterials = parseInt(materialRows[0]?.count || 0) > 0;

        // Dá»± Ã¡n cÃ³ thá»ƒ xuáº¥t váº­t tÆ° náº¿u chÆ°a hoÃ n thÃ nh (< 100%)
        const canExport = currentProgress < 100 && project.status !== 'completed';

        // Cáº§n xuáº¥t váº­t tÆ° Ä‘á»ƒ chuyá»ƒn sang sáº£n xuáº¥t náº¿u progress < 60%
        const needsMaterialExport = currentProgress < 60;

        res.json({
            success: true,
            data: {
                project_id: parseInt(projectId),
                current_progress: currentProgress,
                current_status: project.status,
                has_exported_materials: hasExportedMaterials,
                needs_material_export: needsMaterialExport,
                can_export: canExport,
                can_move_to_production: hasExportedMaterials && canExport,
                message: !canExport
                    ? "Dá»± Ã¡n Ä‘Ã£ hoÃ n thÃ nh, khÃ´ng thá»ƒ xuáº¥t váº­t tÆ° thÃªm."
                    : (!hasExportedMaterials
                        ? "ChÆ°a cÃ³ váº­t tÆ° nÃ o Ä‘Æ°á»£c xuáº¥t. Vui lÃ²ng thÃªm váº­t tÆ° trÆ°á»›c khi xÃ¡c nháº­n."
                        : null)
            }
        });
    } catch (err) {
        console.error('Error checking export requirement:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi kiá»ƒm tra Ä‘iá»u kiá»‡n xuáº¥t váº­t tÆ°"
        });
    }
};

// GET /api/project-materials/inventory/:type - Lấy vật tư kho theo loại
exports.getInventoryByType = async (req, res) => {
    try {
        const { type } = req.params;
        const { warehouse_id } = req.query; // Nhận thêm ID kho để lọc
        let query = '';
        let params = [];

        switch (type) {
            case 'accessory':
                // Phụ kiện: Lấy tất cả phụ kiện đang hoạt động (không lọc cứng danh mục để tránh bỏ sót)
                query = `SELECT id, code, name, category, unit, 
                         COALESCE(sale_price, purchase_price, 0) as price, 
                         stock_quantity as stock, min_stock_level
                         FROM accessories 
                         WHERE is_active = 1 
                         ORDER BY category, name`;
                break;
            case 'scrap':
                // Nhôm đề c (scrap)
                query = `SELECT id, scrap_code as code, profile_name as name, 'Scrap' as category, 'm' as unit,
                         0 as price, (length_mm / 1000) as stock, 0 as min_stock_level,
                         length_mm, source_doc_id
                         FROM aluminum_scraps 
                         WHERE status = 'available'
                         ORDER BY created_at DESC`;
                break;
            case 'aluminum':
                // ✅ FIX: Hỗ trợ lọc theo kho cụ thể nếu có warehouse_id
                if (warehouse_id && warehouse_id !== 'all' && warehouse_id !== 'total') {
                    query = `SELECT s.id, 
                             COALESCE(s.code, s.name) as code, 
                             s.name, 
                             s.aluminum_system, 
                             'cây' as unit, 
                             s.unit_price as price, 
                             COALESCE(ws.quantity, 0) as stock,
                             COALESCE(ws.quantity, 0) as quantity,
                             s.quantity as total_stock_cay,
                             s.quantity_m as total_stock_m,
                             s.length_m,
                             s.density
                             FROM aluminum_systems s
                             LEFT JOIN aluminum_warehouse_stock ws ON ws.aluminum_system_id = s.id AND ws.warehouse_id = ?
                             WHERE s.is_active = 1 
                             ORDER BY s.aluminum_system, s.name`;
                    params.push(warehouse_id);
                } else {
                    // Mặc định (hoặc chọn 'tổng'): Tính tổng từ tất cả các kho
                    query = `SELECT s.id, 
                             COALESCE(s.code, s.name) as code, 
                             s.name, 
                             s.aluminum_system, 
                             'cây' as unit, 
                             s.unit_price as price, 
                             COALESCE(
                                (SELECT SUM(ws2.quantity) FROM aluminum_warehouse_stock ws2 WHERE ws2.aluminum_system_id = s.id),
                                s.quantity, 
                                0
                             ) as stock,
                             COALESCE(
                                (SELECT SUM(ws2.quantity) FROM aluminum_warehouse_stock ws2 WHERE ws2.aluminum_system_id = s.id),
                                s.quantity, 
                                0
                             ) as quantity,
                             s.quantity as total_stock_cay,
                             s.quantity_m as total_stock_m,
                             s.length_m,
                             s.density
                             FROM aluminum_systems s
                             WHERE s.is_active = 1 
                             ORDER BY s.aluminum_system, s.name`;
                }
                break;
            case 'glass':
                // ✅ FIX: Kính hiện tại được quản lý trong bảng inventory (item_type = 'glass')
                // Thống nhất với loadGlassItems() trong frontend
                query = `SELECT id, 
                         item_code as code, 
                         item_name as name, 
                         'glass' as type, 
                         unit, 
                         unit_price as price, 
                         COALESCE(quantity, 0) as stock,
                         notes as structure,
                         supplier_id
                         FROM inventory 
                         WHERE item_type = 'glass'
                         ORDER BY item_name`;
                break;
            case 'other':
            case 'consumable':
                // Vật tư phụ: Lấy từ cả 2 nguồn (accessories và inventory cho hàng mới import)
                query = `
                    (SELECT 
                        id, 
                        code, 
                        name, 
                        category, 
                        unit, 
                        COALESCE(sale_price, purchase_price, 0) as price, 
                        stock_quantity as stock, 
                        min_stock_level,
                        'accessories' as source_table
                    FROM accessories 
                    WHERE is_active = 1 
                    AND category IN ('Ke', 'Gioăng', 'Nhựa ốp', 'Keo', 'Khác'))
                    UNION ALL
                    (SELECT 
                        id, 
                        item_code as code, 
                        item_name as name, 
                        notes as category, 
                        unit,
                        unit_price as price, 
                        quantity as stock, 
                        min_stock_level,
                        'inventory' as source_table
                    FROM inventory
                    WHERE item_type = 'other' OR item_type = 'vật tư')
                    ORDER BY name ASC`;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: "Loại vật tư không hợp lệ"
                });
        }

        console.log(`ðŸ“¦ Getting inventory for type: ${type}`);
        console.log(`ðŸ“ Query: ${query.substring(0, 100)}...`);

        const [rows] = await db.query(query, params);

        console.log(`âœ… Found ${rows.length} items for type: ${type}`);
        if (rows.length > 0) {
            console.log(`ðŸ“‹ Sample item:`, {
                id: rows[0].id,
                code: rows[0].code,
                name: rows[0].name?.substring(0, 30),
                price: rows[0].price,
                stock: rows[0].stock
            });
        }

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('âŒ Error getting inventory by type:', err);
        console.error('âŒ Error details:', {
            type: req.params.type,
            message: err.message,
            sqlMessage: err.sqlMessage,
            code: err.code
        });
        res.status(500).json({
            success: false,
            message: "Lá»—i khi láº¥y danh sÃ¡ch váº­t tÆ° kho: " + (err.message || 'Lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh')
        });
    }
};

// GET /api/project-materials/exported - Láº¥y danh sÃ¡ch váº­t tÆ° Ä‘Ã£ xuáº¥t (dá»± Ã¡n Ä‘Ã£ chuyá»ƒn sang sáº£n xuáº¥t)
// âœ… FIXED: Now uses same calculation logic as detail view (BOM data + inventory prices)
exports.getExportedMaterials = async (req, res) => {
    try {
        // Láº¥y cÃ¡c dá»± Ã¡n Ä‘Ã£ xuáº¥t váº­t tÆ° (status = 'in_production' hoáº·c progress >= 60%)
        const [projectRows] = await db.query(
            `SELECT 
                p.id,
                p.project_code,
                p.project_name,
                p.status,
                p.progress_percent,
                c.full_name as customer_name
             FROM projects p
             LEFT JOIN customers c ON p.customer_id = c.id
             WHERE (p.status = 'in_production' OR p.progress_percent >= 60)
             AND p.status != 'completed'
             ORDER BY p.updated_at DESC, p.created_at DESC`
        );

        // âœ… Build price maps from ALL inventory tables (same as detail view)
        // IMPORTANT: Use only VERIFIED column names that exist in each table
        const priceMap = {};
        const stockMap = {};

        // Accessories prices & stock - use sale_price first, fallback to purchase_price
        try {
            const [accessories] = await db.query(`SELECT code, name, sale_price, purchase_price, stock_quantity FROM accessories`);
            accessories.forEach(acc => {
                const price = parseFloat(acc.sale_price) || parseFloat(acc.purchase_price) || 0;
                const stock = parseFloat(acc.stock_quantity) || 0;
                if (acc.code) { priceMap[acc.code.toLowerCase()] = price; priceMap[acc.code.toUpperCase()] = price; stockMap[acc.code.toLowerCase()] = stock; }
                if (acc.name) { priceMap[acc.name.toLowerCase()] = price; stockMap[acc.name.toLowerCase()] = stock; }
            });
            console.log(`ðŸ“Š Loaded ${accessories.length} accessories`);
        } catch (e) { console.error('Error loading accessories prices:', e.message); }

        // Aluminum prices & stock - has unit_price column
        try {
            const [aluminum] = await db.query(`SELECT code, name, unit_price, quantity FROM aluminum_systems`);
            aluminum.forEach(alu => {
                const price = parseFloat(alu.unit_price) || 0;
                const stock = parseFloat(alu.quantity) || 0;
                if (alu.code) { priceMap[alu.code.toLowerCase()] = price; priceMap[alu.code.toUpperCase()] = price; stockMap[alu.code.toLowerCase()] = stock; }
                if (alu.name) { priceMap[alu.name.toLowerCase()] = price; stockMap[alu.name.toLowerCase()] = stock; }
            });
            console.log(`ðŸ“Š Loaded ${aluminum.length} aluminum, sample prices:`, aluminum.slice(0, 3).map(a => ({ code: a.code, price: a.unit_price })));
        } catch (e) { console.error('Error loading aluminum prices:', e.message); }

        // Glass prices & stock - use price column (NOT unit_price)
        try {
            const [glass] = await db.query(`SELECT code, name, price, quantity FROM glass_items`);
            glass.forEach(g => {
                const price = parseFloat(g.price) || 0;
                const stock = parseFloat(g.quantity) || 0;
                if (g.code) { priceMap[g.code.toLowerCase()] = price; priceMap[g.code.toUpperCase()] = price; stockMap[g.code.toLowerCase()] = stock; }
                if (g.name) { priceMap[g.name.toLowerCase()] = price; stockMap[g.name.toLowerCase()] = stock; }
            });
            console.log(`ðŸ“Š Loaded ${glass.length} glass items, sample prices:`, glass.slice(0, 3).map(g => ({ code: g.code, price: g.price })));
        } catch (e) { console.error('Error loading glass prices:', e.message); }

        // General inventory prices & stock - has unit_price column
        try {
            const [inv] = await db.query(`SELECT item_code, item_name, unit_price, quantity FROM inventory`);
            inv.forEach(i => {
                const price = parseFloat(i.unit_price) || 0;
                const stock = parseFloat(i.quantity) || 0;
                if (i.item_code) { priceMap[i.item_code.toLowerCase()] = price; priceMap[i.item_code.toUpperCase()] = price; stockMap[i.item_code.toLowerCase()] = stock; }
                if (i.item_name) { priceMap[i.item_name.toLowerCase()] = price; stockMap[i.item_name.toLowerCase()] = stock; }
            });
            console.log(`ðŸ“Š Loaded ${inv.length} inventory items`);
        } catch (e) { console.error('Error loading inventory prices:', e.message); }

        console.log(`ðŸ“Š Total priceMap entries: ${Object.keys(priceMap).length}`);
        // Debug: Check if specific BOM codes exist in priceMap
        ['al5506', 'AL5506', 'ke-cl12006', 'KE-CL12006', 'cm-bl4d-b', 'CM-BL4D-B'].forEach(key => {
            console.log(`   priceMap['${key}'] = ${priceMap[key] || 'NOT FOUND'}`);
        });


        // âœ… For each project, get BOM data using SAME query as getBOMData
        const projectSummaries = {};
        for (const project of projectRows) {
            const projectId = project.id;

            // âœ… Use exact same query as getBOMData (line 2228-2232)
            const [bomRows] = await db.query(
                `SELECT * FROM project_materials 
                 WHERE project_id = ? 
                 AND material_type IN ('aluminum', 'glass', 'accessory', 'phukien')
                 ORDER BY material_type, created_at`,
                [projectId]
            );

            let totalCost = 0;
            let materialsCount = bomRows.length;

            // Calculate total cost using inventory prices (same logic as frontend detail view)
            bomRows.forEach(row => {
                const code = (row.material_code || '').toLowerCase();
                const name = (row.material_name || '').toLowerCase();
                const codeUpper = (row.material_code || '').toUpperCase();
                const qty = parseFloat(row.quantity) || 0;

                // Try to find price from inventory (try multiple lookups)
                const priceByCode = priceMap[code] || priceMap[codeUpper] || 0;
                const priceByName = priceMap[name] || 0;
                const priceFromDB = parseFloat(row.unit_price) || 0;
                const price = priceByCode || priceByName || priceFromDB;

                const itemCost = qty * price;
                totalCost += itemCost;
            });

            projectSummaries[projectId] = {
                total_cost: totalCost,
                materials_count: materialsCount
            };
        }

        // Merge summaries with project data
        const projectsWithCost = projectRows.map(p => ({
            ...p,
            total_cost: projectSummaries[p.id]?.total_cost || 0,
            materials_count: projectSummaries[p.id]?.materials_count || 0
        }));

        console.log('ðŸ“Š getExportedMaterials (FIXED) - Projects with costs:', projectsWithCost.map(p => ({
            id: p.id,
            code: p.project_code,
            total_cost: p.total_cost,
            materials_count: p.materials_count
        })));

        res.json({
            success: true,
            data: {
                projects: projectsWithCost,
                materials: [] // Not used in list view, leave empty for performance
            },
            count: {
                projects: projectRows.length,
                materials: 0
            }
        });
    } catch (err) {
        console.error('Error getting exported materials:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi láº¥y danh sÃ¡ch váº­t tÆ° Ä‘Ã£ xuáº¥t: " + err.message
        });
    }
};

/**
 * Helper: Cáº­p nháº­t tá»“n kho
 */
async function updateInventoryStock(connection, materialType, materialId, quantityChange) {
    let tableName = '';
    let stockColumn = 'quantity';

    switch (materialType) {
        case 'accessory':
            tableName = 'accessories';
            stockColumn = 'stock_quantity';
            break;
        case 'aluminum':
            tableName = 'aluminum_systems';
            stockColumn = 'quantity_m'; // aluminum_systems dÃ¹ng quantity_m
            break;
        case 'glass':
        case 'other':
            tableName = 'inventory';
            stockColumn = 'quantity'; // báº£ng inventory dÃ¹ng quantity
            break;
        default:
            console.warn(`Unknown material type: ${materialType}`);
            return;
    }

    await connection.query(
        `UPDATE ${tableName} 
         SET ${stockColumn} = GREATEST(0, ${stockColumn} + ?)
         WHERE id = ?`,
        [quantityChange, materialId]
    );

    console.log(`Updated ${tableName} id=${materialId} ${stockColumn} by ${quantityChange}`);
}

/**
 * Helper: Cáº­p nháº­t tá»•ng chi phÃ­ váº­t tÆ° trong báº£ng projects
 */
async function updateProjectMaterialCost(connection, projectId) {
    const [result] = await connection.query(
        `SELECT SUM(total_cost) as total FROM project_materials WHERE project_id = ?`,
        [projectId]
    );

    const totalCost = parseFloat(result[0]?.total || 0);

    await connection.query(
        `UPDATE projects SET material_cost = ? WHERE id = ?`,
        [totalCost, projectId]
    );

    console.log(`Updated project ${projectId} material_cost to ${totalCost}`);
}

/**
 * Helper: Kiá»ƒm tra xem dá»± Ã¡n Ä‘Ã£ cÃ³ váº­t tÆ° Ä‘Æ°á»£c xuáº¥t chÆ°a
 */
async function hasExportedMaterials(connection, projectId) {
    try {
        const [result] = await connection.query(
            `SELECT COUNT(*) as count FROM project_materials WHERE project_id = ?`,
            [projectId]
        );
        return parseInt(result[0]?.count || 0) > 0;
    } catch (err) {
        console.error(`Error checking exported materials:`, err);
        return false;
    }
}

/**
 * Helper: Tá»± Ä‘á»™ng chuyá»ƒn tráº¡ng thÃ¡i dá»± Ã¡n tá»« BÃ³c tÃ¡ch sang Sáº£n xuáº¥t khi xuáº¥t váº­t tÆ°
 * Äiá»u kiá»‡n: Dá»± Ã¡n Ä‘ang á»Ÿ giai Ä‘oáº¡n BÃ³c tÃ¡ch (40-60%) sáº½ chuyá»ƒn sang Sáº£n xuáº¥t (60-80%)
 */
async function updateProjectStatusForMaterialExport(connection, projectId) {
    try {
        // Láº¥y thÃ´ng tin dá»± Ã¡n hiá»‡n táº¡i
        const [projectRows] = await connection.query(
            `SELECT id, progress_percent, status FROM projects WHERE id = ?`,
            [projectId]
        );

        if (projectRows.length === 0) {
            console.warn(`Project ${projectId} not found`);
            return;
        }

        const project = projectRows[0];
        const currentProgress = parseFloat(project.progress_percent) || 0;

        // Kiá»ƒm tra xem dá»± Ã¡n cÃ³ Ä‘ang á»Ÿ giai Ä‘oáº¡n BÃ³c tÃ¡ch (40-60%) khÃ´ng
        // Náº¿u cÃ³, chuyá»ƒn sang Sáº£n xuáº¥t (60-80%)
        if (currentProgress >= 40 && currentProgress < 60) {
            const newProgress = 60; // Chuyá»ƒn sang giai Ä‘oáº¡n Sáº£n xuáº¥t (60-80%)

            await connection.query(
                `UPDATE projects 
                 SET progress_percent = ?, 
                     status = CASE 
                         WHEN status IN ('waiting_quotation', 'quotation_pending', 'quotation_approved', 'designing') 
                         THEN 'in_production'
                         WHEN status IS NULL OR status = '' 
                         THEN 'in_production'
                         ELSE status
                     END
                 WHERE id = ?`,
                [newProgress, projectId]
            );

            console.log(`âœ… Project ${projectId} chuyá»ƒn tá»« BÃ³c tÃ¡ch (${currentProgress}%) sang Sáº£n xuáº¥t (${newProgress}%) sau khi xuáº¥t váº­t tÆ°`);
        }
    } catch (err) {
        console.error(`Error updating project status for material export:`, err);
        // KhÃ´ng throw error Ä‘á»ƒ khÃ´ng lÃ m giÃ¡n Ä‘oáº¡n quÃ¡ trÃ¬nh thÃªm váº­t tÆ°
    }
}

// Aliases cho tÆ°Æ¡ng thÃ­ch vá»›i routes cÅ© trong projects.js
exports.getProjectMaterials = async (req, res) => {
    req.params.projectId = req.params.id;
    return exports.getByProject(req, res);
};

exports.deleteProjectMaterial = async (req, res) => {
    req.params.id = req.params.materialId;
    return exports.delete(req, res);
};

// ============================================
// LÆ¯U/LOAD Dá»® LIá»†U BÃ“C TÃCH (NhÃ´m, KÃ­nh, Váº­t tÆ° Phá»¥)
// ============================================

/**
 * POST /api/project-materials/:projectId/bom-data
 * LÆ°u dá»¯ liá»‡u BÃ³c tÃ¡ch (nhÃ´m, kÃ­nh, váº­t tÆ° phá»¥) vÃ o database
 */
exports.saveBOMData = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { projectId } = req.params;
        const { nhom, kinh, vattu, phukien } = req.body;

        console.log('ðŸ“¦ saveBOMData called for project:', projectId);
        console.log('ðŸ“¦ Received data counts:', {
            nhom: nhom?.length || 0,
            kinh: kinh?.length || 0,
            vattu: vattu?.length || 0,
            phukien: phukien?.length || 0
        });
        if (phukien && phukien.length > 0) {
            console.log('ðŸ“¦ Phukien items:', JSON.stringify(phukien, null, 2));
        }

        await connection.beginTransaction();

        // XÃ³a dá»¯ liá»‡u cÅ© cá»§a project nÃ y (náº¿u cÃ³) - bao gá»“m cáº£ phukien
        await connection.query(
            `DELETE FROM project_materials 
             WHERE project_id = ? 
             AND material_type IN ('aluminum', 'glass', 'accessory', 'phukien', 'other')`,
            [projectId]
        );

        // LÆ°u dá»¯ liá»‡u NhÃ´m
        if (nhom && Array.isArray(nhom) && nhom.length > 0) {
            for (const item of nhom) {
                await connection.query(
                    `INSERT INTO project_materials 
                    (project_id, material_type, material_id, material_code, material_name, quantity, quantity_used, unit, notes)
                    VALUES (?, 'aluminum', 0, ?, ?, ?, 0, ?, ?)`,
                    [
                        projectId,
                        item.code || item.item_code || null,
                        item.name || item.item_name || '',
                        item.quantity || 0,
                        item.unit || 'cÃ¢y',
                        JSON.stringify({
                            code: item.code || item.item_code,
                            density: item.density,
                            length_m: item.length_m,
                            weight_kg: item.weight_kg,
                            user_notes: item.notes || ''
                        })
                    ]
                );
            }
        }

        // LÆ°u dá»¯ liá»‡u KÃ­nh
        if (kinh && Array.isArray(kinh) && kinh.length > 0) {
            for (const item of kinh) {
                await connection.query(
                    `INSERT INTO project_materials 
                    (project_id, material_type, material_id, material_code, material_name, quantity, quantity_used, unit, notes)
                    VALUES (?, 'glass', 0, ?, ?, ?, 0, ?, ?)`,
                    [
                        projectId,
                        // âœ… FIX: ThÃªm item_code vÃ o fallback Ä‘á»ƒ láº¥y Ä‘Ãºng mÃ£ kÃ­nh tá»« BOM (VD: K22, K-902)
                        item.code || item.item_code || item.glass_code || null,
                        // âœ… FIX: ThÃªm item_name vÃ o fallback Ä‘á»ƒ láº¥y Ä‘Ãºng tÃªn kÃ­nh
                        item.name || item.item_name || item.type || item.glass_type || '',
                        item.quantity || 1,
                        item.unit || 'táº¥m',
                        JSON.stringify({
                            code: item.code || item.item_code || item.glass_code,
                            width_mm: item.width_mm || item.width,
                            height_mm: item.height_mm || item.height,
                            area_m2: item.area_m2,
                            position: item.position || item.location
                        })
                    ]
                );
            }
        }


        // LÆ°u dá»¯ liá»‡u Váº­t tÆ° Phá»¥
        if (vattu && Array.isArray(vattu) && vattu.length > 0) {
            for (const item of vattu) {
                await connection.query(
                    `INSERT INTO project_materials 
                    (project_id, material_type, material_id, material_code, material_name, quantity, quantity_used, unit, notes)
                    VALUES (?, 'other', 0, ?, ?, ?, 0, ?, ?)`,
                    [
                        projectId,
                        item.code || item.item_code || null,
                        item.name || item.item_name || '',
                        item.quantity || 0,
                        item.unit || 'cÃ¡i',
                        JSON.stringify({
                            code: item.code || item.item_code,
                            category: item.category || item.type || '',
                            user_notes: item.notes || ''
                        })
                    ]
                );
            }
        }

        // âœ… LÆ°u dá»¯ liá»‡u Phá»¥ kiá»‡n (riÃªng biá»‡t vá»›i Váº­t tÆ° phá»¥)
        if (phukien && Array.isArray(phukien) && phukien.length > 0) {
            console.log('ðŸ“¦ Inserting', phukien.length, 'phukien items...');
            for (const item of phukien) {
                console.log('ðŸ“¦ Inserting phukien:', item.name, 'with material_type=phukien');
                const [insertResult] = await connection.query(
                    `INSERT INTO project_materials 
                    (project_id, material_type, material_id, material_code, material_name, quantity, quantity_used, unit, notes)
                    VALUES (?, 'phukien', 0, ?, ?, ?, 0, ?, ?)`,
                    [
                        projectId,
                        item.code || item.item_code || null,
                        item.name || item.item_name || '',
                        item.quantity || 0,
                        item.unit || 'cÃ¡i',
                        JSON.stringify({
                            code: item.code || item.item_code,
                            category: item.category || '',
                            user_notes: item.notes || ''
                        })
                    ]
                );
                console.log('ðŸ“¦ Insert result:', insertResult.insertId, 'affectedRows:', insertResult.affectedRows);
            }
        }

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'ÄÃ£ lÆ°u dá»¯ liá»‡u BÃ³c tÃ¡ch thÃ nh cÃ´ng',
            data: {
                nhom_count: nhom?.length || 0,
                kinh_count: kinh?.length || 0,
                vattu_count: vattu?.length || 0,
                phukien_count: phukien?.length || 0
            }
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error saving BOM data:', err);
        res.status(500).json({
            success: false,
            message: 'Lá»—i khi lÆ°u dá»¯ liá»‡u BÃ³c tÃ¡ch: ' + err.message
        });
    }
};

/**
 * GET /api/project-materials/:projectId/bom-data
 * Load dá»¯ liá»‡u BÃ³c tÃ¡ch Ä‘Ã£ lÆ°u (tá»« project_materials hoáº·c fallback tá»« bom_items)
 */
exports.getBOMData = async (req, res) => {
    try {
        const { projectId } = req.params;

        // âœ… Bao gá»“m cáº£ 'phukien' trong query
        const [rows] = await db.query(
            `SELECT * FROM project_materials 
             WHERE project_id = ? 
             AND material_type IN ('aluminum', 'glass', 'accessory', 'phukien', 'other')
             ORDER BY material_type, created_at`,
            [projectId]
        );

        console.log('ðŸ“¥ getBOMData for project:', projectId);
        console.log('ðŸ“¥ project_materials rows:', rows.length);

        // PhÃ¢n loáº¡i dá»¯ liá»‡u - bao gá»“m phukien
        const nhom = [];
        const kinh = [];
        const vattu = [];
        const phukien = [];
        let isFallback = false;

        if (rows.length > 0) {
            // âœ… DÃ¹ng project_materials (Ä‘Ã£ lÆ°u tá»« trang thiáº¿t káº¿)
            rows.forEach(row => {
                let extraData = {};
                try {
                    if (row.notes) extraData = JSON.parse(row.notes);
                } catch (e) { }

                const baseItem = {
                    id: row.id,
                    name: row.material_name,
                    quantity: parseFloat(row.quantity),
                    unit: row.unit,
                    ...extraData
                };

                if (row.material_type === 'aluminum') {
                    nhom.push({ ...baseItem, item_name: row.material_name, item_code: extraData.code, density: extraData.density, length_m: extraData.length_m, weight_kg: extraData.weight_kg, notes: extraData.user_notes || '' });
                } else if (row.material_type === 'glass') {
                    kinh.push({ ...baseItem, glass_type: row.material_name, type: row.material_name, glass_code: extraData.code, code: extraData.code, width_mm: extraData.width_mm, width: extraData.width_mm, height_mm: extraData.height_mm, height: extraData.height_mm, area_m2: extraData.area_m2, position: extraData.position, location: extraData.position });
                } else if (row.material_type === 'accessory' || row.material_type === 'other') {
                    vattu.push({ ...baseItem, item_name: row.material_name, item_code: extraData.code, category: extraData.category || '', notes: extraData.user_notes || '' });
                } else if (row.material_type === 'phukien') {
                    phukien.push({ ...baseItem, item_name: row.material_name, item_code: extraData.code, code: extraData.code, category: extraData.category || '', notes: extraData.user_notes || '' });
                }
            });

        } else {
            // âœ… FALLBACK: Náº¿u project_materials trá»‘ng, Ä‘á»c tá»« bom_items qua door_designs
            console.log('ðŸ“¥ project_materials trá»‘ng â†’ fallback sang bom_items');
            try {
                const [bomRows] = await db.query(
                    `SELECT 
                        bi.item_type,
                        bi.item_code,
                        bi.item_name,
                        bi.profile_code,
                        bi.unit,
                        SUM(bi.quantity) as quantity,
                        SUM(bi.length_mm) as total_length_mm
                     FROM bom_items bi
                     INNER JOIN door_designs dd ON dd.id = bi.design_id
                     WHERE dd.project_id = ?
                     GROUP BY bi.item_type, bi.item_code, bi.item_name, bi.profile_code, bi.unit
                     ORDER BY bi.item_type, bi.item_name`,
                    [projectId]
                );
                console.log('ðŸ“¥ bom_items fallback rows:', bomRows.length);

                bomRows.forEach(row => {
                    const qty = parseFloat(row.quantity) || 0;
                    const code = row.profile_code || row.item_code || '';
                    const name = row.item_name || row.profile_code || '';
                    const unit = row.unit || 'cÃ¡i';
                    const type = (row.item_type || '').toLowerCase();

                    if (type === 'frame' || type === 'mullion' || type === 'sash' || type === 'bead' || type === 'profile' || type === 'aluminum') {
                        nhom.push({ id: null, name: name, item_name: name, item_code: code, code: code, quantity: qty, unit: unit || 'cÃ¢y', notes: '' });
                    } else if (type === 'glass') {
                        kinh.push({ id: null, name: name, item_name: name, glass_type: name, type: name, code: code, glass_code: code, item_code: code, quantity: qty, unit: unit || 'táº¥m' });
                    } else if (type === 'accessory' || type === 'hardware' || type === 'gasket' || type === 'glue') {
                        phukien.push({ id: null, name: name, item_name: name, item_code: code, code: code, category: type, quantity: qty, unit: unit });
                    } else {
                        vattu.push({ id: null, name: name, item_name: name, item_code: code, category: type, quantity: qty, unit: unit });
                    }
                });
            } catch (bomErr) {
                console.warn('âš ï¸ bom_items fallback failed:', bomErr.message);
            }
        }

        console.log(`ðŸ“¥ Result: nhom=${nhom.length}, kinh=${kinh.length}, vattu=${vattu.length}, phukien=${phukien.length}`);

        res.json({
            success: true,
            isFallback: isFallback,
            data: { nhom, kinh, vattu, phukien }
        });

    } catch (err) {
        console.error('Error getting BOM data:', err);
        res.status(500).json({
            success: false,
            message: 'Lá»—i khi láº¥y dá»¯ liá»‡u BÃ³c tÃ¡ch: ' + err.message
        });
    }
};
