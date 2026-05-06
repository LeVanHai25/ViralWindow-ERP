const db = require("../config/db");
const NotificationService = require("../services/notificationService");
const NotificationEventService = require("../services/notificationEventService");
const SystemNotifier = require("../services/SystemNotifier");

const { emitDataChange } = require('../services/socketService');
// GET all projects
exports.getAllProjects = async (req, res) => {
    try {
        const { status, progress, search, customer_id, without_quotation, exclude_inactive } = req.query;

        let query = `
            SELECT 
                p.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                c.address AS customer_address,
                a.name AS agency_name,
                a.code AS agency_code,
                (SELECT COUNT(*) FROM quotations WHERE project_id = p.id) AS quotation_count,
                (SELECT status FROM quotations WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) AS quotation_status,
                (SELECT COUNT(DISTINCT design_id) FROM bom_items 
                 WHERE design_id IN (SELECT id FROM door_designs WHERE project_id = p.id)) AS bom_count,
                 COALESCE(
                    (SELECT approved_at FROM quotations q WHERE q.project_id = p.id AND q.status = 'approved' AND q.approved_at IS NOT NULL ORDER BY q.approved_at DESC LIMIT 1),
                    (SELECT quotation_date FROM quotations q WHERE q.project_id = p.id AND q.status = 'approved' ORDER BY q.updated_at DESC LIMIT 1)
                 ) AS contract_date
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN agencies a ON c.agency_id = a.id
            WHERE 1=1
        `;
        let params = [];


        if (exclude_inactive === 'true') {
            query += " AND (p.status IS NULL OR p.status NOT IN ('closed', 'completed', 'handover', 'paused', 'cancelled'))";
            query += " AND (p.progress_percent IS NULL OR p.progress_percent < 100)";
        }


        if (customer_id) {
            query += " AND p.customer_id = ?";
            params.push(customer_id);
        }

        // Lá»c cÃ¡c dá»± Ã¡n chÆ°a cÃ³ bÃ¡o giÃ¡ (chÆ°a Ä‘áº¿n giai Ä‘oáº¡n bÃ¡o giÃ¡)
        if (without_quotation === 'true') {
            query += ` AND p.id NOT IN (
                SELECT DISTINCT project_id 
                FROM quotations 
                WHERE project_id IS NOT NULL
            )`;
            // Chá»‰ láº¥y cÃ¡c dá»± Ã¡n cÃ³ tráº¡ng thÃ¡i chÆ°a Ä‘áº¿n giai Ä‘oáº¡n bÃ¡o giÃ¡
            query += ` AND p.status NOT IN ('waiting_quotation', 'quotation_approved', 'in_production', 'completed', 'cancelled', 'closed')`;
        }

        // Lá»c bá» cÃ¡c dá»± Ã¡n Ä‘Ã£ há»§y khá»i danh sÃ¡ch chÃ­nh (trá»« khi cÃ³ filter status = 'cancelled')
        if (status !== 'cancelled') {
            query += " AND (p.status IS NULL OR p.status != 'cancelled')";
        }

        if (status && status !== 'all' && status !== 'cancelled') {
            query += " AND p.status = ?";
            params.push(status);
        }

        if (progress && progress !== 'all') {
            if (progress === '0-25') {
                query += " AND p.progress_percent >= 0 AND p.progress_percent <= 25";
            } else if (progress === '25-50') {
                query += " AND p.progress_percent > 25 AND p.progress_percent <= 50";
            } else if (progress === '50-75') {
                query += " AND p.progress_percent > 50 AND p.progress_percent <= 75";
            } else if (progress === '75-100') {
                query += " AND p.progress_percent > 75 AND p.progress_percent <= 100";
            }
        }

        if (search) {
            query += " AND (p.project_name LIKE ? OR p.project_code LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += " ORDER BY p.created_at DESC";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server"
        });
    }
};

// GET detail (full project info with products, materials, financial, timeline)
exports.getDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get project info
        const [projectRows] = await db.query(
            `SELECT 
                p.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                c.address AS customer_address
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.id = ?`,
            [id]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        const project = projectRows[0];

        // 2. Get quotation info
        const [quotationRows] = await db.query(
            `SELECT id, quotation_code, total_amount, created_at, status
             FROM quotations 
             WHERE project_id = ? 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [id]
        );
        const quotation = quotationRows.length > 0 ? quotationRows[0] : null;

        // 3. Get products (from quotation_items if available, otherwise from door_designs)
        let products = [];
        if (quotation) {
            const [quotationItems] = await db.query(
                `SELECT 
                    qi.id,
                    qi.code,
                    qi.item_name as name,
                    qi.spec,
                    qi.glass,
                    qi.aluminum_system,
                    qi.accessories,
                    qi.width,
                    qi.height,
                    qi.area,
                    qi.quantity,
                    qi.unit_price,
                    qi.accessory_price,
                    qi.total_price
                FROM quotation_items qi
                WHERE qi.quotation_id = ?
                ORDER BY qi.id`,
                [quotation.id]
            );
            products = quotationItems.map(item => ({
                code: item.code || `SP-${item.id}`,
                name: item.name || 'Sáº£n pháº©m',
                spec: item.spec || '',
                glass_spec: item.glass || '',
                aluminum_system_name: item.aluminum_system || '',
                accessory_name: item.accessories || '',
                width: item.width || 0,
                height: item.height || 0,
                area_m2: item.area || 0,
                quantity: item.quantity || 1,
                unit_price: item.unit_price || 0,
                accessory_price: item.accessory_price || 0,
                total_price: item.total_price || 0
            }));
        }

        // If no products from quotation, try project_door_items
        if (products.length === 0) {
            try {
                const [doors] = await db.query(
                    `SELECT 
                        pdi.id,
                        COALESCE(dt.code, CONCAT('C-', pdi.id)) as code,
                        COALESCE(dt.name, 'Cá»­a') as name,
                        pdi.width_mm as width,
                        pdi.height_mm as height,
                        pdi.quantity
                    FROM project_door_items pdi
                    LEFT JOIN door_templates dt ON pdi.door_template_id = dt.id
                    WHERE pdi.project_id = ?
                    ORDER BY pdi.id`,
                    [id]
                );
                products = doors.map(door => ({
                    code: door.code || `C-${door.id}`,
                    name: door.name || 'Cá»­a',
                    width: door.width || 0,
                    height: door.height || 0,
                    quantity: door.quantity || 1,
                    unit_price: 0,
                    total_price: 0
                }));
            } catch (doorErr) {
                console.warn('[getDetail] Could not fetch door items:', doorErr.message);
                products = [];
            }
        }

        // 4. Get materials (from project_materials)
        const [materials] = await db.query(
            `SELECT 
                pm.material_type,
                COALESCE(pm.material_name, pm.item_name) as material_name,
                COALESCE(pm.quantity, pm.quantity_used) as quantity,
                COALESCE(pm.unit, pm.item_unit) as unit,
                pm.unit_price,
                pm.total_cost
            FROM project_materials pm
            WHERE pm.project_id = ?
            ORDER BY pm.material_type, pm.material_name`,
            [id]
        );

        // 5. Calculate financial info
        // Sá»­ dá»¥ng project.total_value (giÃ¡ trá»‹ Ä‘Ã£ xÃ¡c nháº­n) thay vÃ¬ quotation.total_amount
        const quotation_total = parseFloat(project.total_value) || (quotation ? parseFloat(quotation.total_amount) || 0 : 0);
        const materials_total = materials.reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0);
        const net_total = quotation_total - materials_total;

        // 6. Build timeline
        const timeline = {
            created_at: project.created_at,
            start_date: project.start_date,
            deadline: project.deadline,
            quotation_date: quotation ? quotation.created_at : null,
            design_date: null,
            bom_date: null,
            production_date: null,
            moved_to_installation_at: project.moved_to_installation_at,
            installation_date: project.moved_to_installation_at, // Alias for frontend consistency
            handover_date: project.handover_date
        };

        // ===== TÃŒM DESIGN DATE tá»« nhiá»u nguá»“n =====
        // 1. Tá»« door_drawings (báº£n váº½ Ä‘Ã£ táº¡o)
        const [designDates1] = await db.query(
            `SELECT MIN(created_at) as design_date
             FROM door_drawings 
             WHERE project_id = ? OR door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)`,
            [id, id]
        );
        if (designDates1[0]?.design_date) {
            timeline.design_date = designDates1[0].design_date;
        }

        // 2. Náº¿u chÆ°a cÃ³, tÃ¬m tá»« door_designs (khi cá»­a Ä‘Æ°á»£c táº¡o)
        if (!timeline.design_date) {
            const [designDates2] = await db.query(
                `SELECT MIN(created_at) as design_date
                 FROM door_designs 
                 WHERE project_id = ?`,
                [id]
            );
            if (designDates2[0]?.design_date) {
                timeline.design_date = designDates2[0].design_date;
            }
        }

        // 3. Náº¿u chÆ°a cÃ³, tÃ¬m tá»« project_items (khi item Ä‘Æ°á»£c táº¡o vÃ  cÃ³ status DESIGNING trá»Ÿ lÃªn)
        if (!timeline.design_date) {
            const [designDates3] = await db.query(
                `SELECT MIN(created_at) as design_date
                 FROM project_items 
                 WHERE project_id = ? AND status IN ('DESIGNING', 'DESIGN_CONFIRMED', 'BOM_EXTRACTED', 'EXPORTED')`,
                [id]
            );
            if (designDates3[0]?.design_date) {
                timeline.design_date = designDates3[0].design_date;
            }
        }

        // ===== TÃŒM BOM DATE tá»« nhiá»u nguá»“n =====
        // 1. Tá»« bom_items (BOM Ä‘Ã£ Ä‘Æ°á»£c táº¡o)
        const [bomDates1] = await db.query(
            `SELECT MIN(created_at) as bom_date
             FROM bom_items 
             WHERE design_id IN (SELECT id FROM door_designs WHERE project_id = ?)`,
            [id]
        );
        if (bomDates1[0]?.bom_date) {
            timeline.bom_date = bomDates1[0].bom_date;
        }

        // 2. Náº¿u chÆ°a cÃ³, tÃ¬m tá»« project_items khi status = 'BOM_EXTRACTED' (updated_at khi chuyá»ƒn sang BOM_EXTRACTED)
        if (!timeline.bom_date) {
            const [bomDates2] = await db.query(
                `SELECT MIN(updated_at) as bom_date
                 FROM project_items 
                 WHERE project_id = ? AND status = 'BOM_EXTRACTED'`,
                [id]
            );
            if (bomDates2[0]?.bom_date) {
                timeline.bom_date = bomDates2[0].bom_date;
            }
        }

        // 3. Náº¿u chÆ°a cÃ³, tÃ¬m tá»« door_bom_lines (BOM tá»« door_drawings)
        if (!timeline.bom_date) {
            try {
                const [bomDates3] = await db.query(
                    `SELECT MIN(created_at) as bom_date
                     FROM door_bom_lines 
                     WHERE door_drawing_id IN (
                         SELECT id FROM door_drawings 
                         WHERE project_id = ? OR door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
                     )`,
                    [id, id]
                );
                if (bomDates3[0]?.bom_date) {
                    timeline.bom_date = bomDates3[0].bom_date;
                }
            } catch (err) {
                // Báº£ng door_bom_lines cÃ³ thá»ƒ khÃ´ng tá»“n táº¡i, bá» qua
                console.log('door_bom_lines table not found, skipping');
            }
        }

        // ===== TÃŒM PRODUCTION DATE =====
        const [productionDates] = await db.query(
            `SELECT MIN(created_at) as production_date
             FROM production_orders 
             WHERE project_id = ?`,
            [id]
        );
        if (productionDates[0]?.production_date) {
            timeline.production_date = productionDates[0].production_date;
        }

        // Try to get installation_date from installation_progress if moved_to_installation_at is null
        if (!timeline.moved_to_installation_at) {
            try {
                const [installationDates] = await db.query(
                    `SELECT MIN(installation_date) as installation_date, MIN(created_at) as installation_created_at
                     FROM installation_progress 
                     WHERE project_id = ? AND installation_date IS NOT NULL`,
                    [id]
                );
                if (installationDates[0]?.installation_date) {
                    timeline.moved_to_installation_at = installationDates[0].installation_date;
                    timeline.installation_date = installationDates[0].installation_date;
                } else if (installationDates[0]?.installation_created_at) {
                    // Fallback to created_at if installation_date is null
                    timeline.moved_to_installation_at = installationDates[0].installation_created_at;
                    timeline.installation_date = installationDates[0].installation_created_at;
                }
            } catch (err) {
                // Table might not exist, ignore error
                console.log('Could not get installation date from installation_progress:', err.message);
            }
        }

        // ===== FALLBACK: TÃ¬m tá»« project_items vá»›i cÃ¡c status khÃ¡c nhau =====
        // Náº¿u váº«n chÆ°a cÃ³ design_date, thá»­ tÃ¬m tá»« project_items.created_at (khi item Ä‘Æ°á»£c táº¡o)
        if (!timeline.design_date) {
            const [fallbackDesign] = await db.query(
                `SELECT MIN(created_at) as design_date
                 FROM project_items 
                 WHERE project_id = ?`,
                [id]
            );
            if (fallbackDesign[0]?.design_date) {
                timeline.design_date = fallbackDesign[0].design_date;
            }
        }

        // Náº¿u váº«n chÆ°a cÃ³ bom_date, thá»­ tÃ¬m tá»« project_items khi cÃ³ bom_override hoáº·c calc_cache
        if (!timeline.bom_date) {
            const [fallbackBom] = await db.query(
                `SELECT MIN(updated_at) as bom_date
                 FROM project_items 
                 WHERE project_id = ? AND (bom_override IS NOT NULL OR calc_cache IS NOT NULL)`,
                [id]
            );
            if (fallbackBom[0]?.bom_date) {
                timeline.bom_date = fallbackBom[0].bom_date;
            }
        }

        // Náº¿u váº«n chÆ°a cÃ³ production_date, thá»­ tÃ¬m tá»« production_orders vá»›i cÃ¡c tráº¡ng thÃ¡i khÃ¡c
        if (!timeline.production_date) {
            const [fallbackProduction] = await db.query(
                `SELECT MIN(order_date) as production_date
                 FROM production_orders 
                 WHERE project_id = ?`,
                [id]
            );
            if (fallbackProduction[0]?.production_date) {
                timeline.production_date = fallbackProduction[0].production_date;
            }
        }

        // ===== FINAL FALLBACKS: Sá»­ dá»¥ng cá»™t trong báº£ng projects =====
        // Thiáº¿t káº¿: Náº¿u váº«n chÆ°a cÃ³, dÃ¹ng quotation created_at hoáº·c project created_at
        if (!timeline.design_date && quotation) {
            timeline.design_date = quotation.created_at; // Sau khi cÃ³ bÃ¡o giÃ¡ thÃ¬ báº¯t Ä‘áº§u thiáº¿t káº¿
        }

        // BÃ³c tÃ¡ch: Náº¿u váº«n chÆ°a cÃ³, dÃ¹ng production_started_at (vÃ¬ bÃ³c tÃ¡ch xong má»›i sáº£n xuáº¥t)
        if (!timeline.bom_date && project.production_started_at) {
            timeline.bom_date = project.production_started_at;
        }

        // Sáº£n xuáº¥t: Náº¿u váº«n chÆ°a cÃ³, dÃ¹ng production_started_at tá»« project
        if (!timeline.production_date && project.production_started_at) {
            timeline.production_date = project.production_started_at;
        }

        // ===== 7. QUOTATION DETAILS (Full info with items) =====
        let quotationDetails = null;
        if (quotation) {
            const [quotationItems] = await db.query(
                `SELECT 
                    qi.id,
                    qi.code,
                    qi.item_name,
                    qi.spec,
                    qi.glass,
                    qi.aluminum_system,
                    qi.accessories,
                    qi.width,
                    qi.height,
                    qi.area,
                    qi.quantity,
                    qi.unit_price,
                    qi.accessory_price,
                    qi.total_price
                FROM quotation_items qi
                WHERE qi.quotation_id = ?
                ORDER BY qi.id`,
                [quotation.id]
            );
            quotationDetails = {
                id: quotation.id,
                quotation_code: quotation.quotation_code,
                total_amount: quotation.total_amount,
                status: quotation.status,
                created_at: quotation.created_at,
                items: quotationItems
            };
        }

        // ===== 8. EXPORTED MATERIALS BY TYPE =====
        const exportedMaterials = {
            aluminum: [],
            glass: [],
            accessory: [],
            auxiliary: []
        };

        // Láº¥y váº­t tÆ° Ä‘Ã£ xuáº¥t tá»« project_materials - Æ°u tiÃªn quantity, fallback quantity_used
        const [exportedRows] = await db.query(
            `SELECT 
                pm.id,
                pm.material_type,
                pm.material_code,
                COALESCE(pm.material_name, pm.item_name) as material_name,
                COALESCE(pm.quantity, pm.quantity_used, 0) as quantity_exported,
                COALESCE(pm.unit, pm.item_unit) as unit,
                pm.unit_price,
                pm.total_cost,
                pm.created_at as exported_at
            FROM project_materials pm
            WHERE pm.project_id = ?
            ORDER BY pm.material_type, pm.created_at DESC`,
            [id]
        );

        exportedRows.forEach(row => {
            const type = (row.material_type || '').toLowerCase();
            let category = 'auxiliary'; // Default

            if (type.includes('aluminum') || type.includes('nhom') || type === 'nhÃ´m') {
                category = 'aluminum';
            } else if (type.includes('glass') || type.includes('kinh') || type === 'kÃ­nh') {
                category = 'glass';
            } else if (type === 'phukien' || type === 'phá»¥ kiá»‡n' || type.includes('phá»¥ kiá»‡n')) {
                // Phá»¥ kiá»‡n cÆ¡ khÃ­: Báº£n lá», BÃ¡nh xe, Ke cÃ¡nh...
                category = 'accessory';
            } else if (type === 'accessory' || type.includes('vattu') || type.includes('auxiliary') || type === 'váº­t tÆ° phá»¥') {
                // Váº­t tÆ° phá»¥/tiÃªu hao: GioÄƒng, Keo, Silicone...
                category = 'auxiliary';
            }

            const qtyExported = parseFloat(row.quantity_exported) || 0;
            exportedMaterials[category].push({
                id: row.id,
                code: row.material_code,
                name: row.material_name,
                quantity_required: Math.round(qtyExported), // Sá»‘ nguyÃªn
                quantity_exported: Math.round(qtyExported), // Sá»‘ nguyÃªn
                unit: row.unit,
                unit_price: parseFloat(row.unit_price) || 0,
                total_cost: parseFloat(row.total_cost) || 0,
                status: qtyExported > 0 ? 'exported' : 'pending',
                exported_at: row.exported_at
            });
        });

        // ===== 9. REAL-TIME INVENTORY STATUS =====
        // Láº¥y BOM data hoáº·c materials data Ä‘á»ƒ so sÃ¡nh vá»›i tá»“n kho hiá»‡n táº¡i
        let inventoryStatus = [];
        try {
            // Build inventory lookup maps FIRST
            const inventoryMap = {};

            // Aluminum inventory - Use COALESCE to match frontend logic (quantity || quantity_m)
            const [aluminumStock] = await db.query(`SELECT code, name, COALESCE(quantity, 0) as quantity, COALESCE(quantity_m, 0) as quantity_m FROM aluminum_systems`);
            aluminumStock.forEach(item => {
                if (item.code) {
                    // Use quantity if > 0, otherwise use quantity_m (same logic as frontend)
                    const stockQty = parseFloat(item.quantity) > 0 ? parseFloat(item.quantity) : parseFloat(item.quantity_m) || 0;
                    inventoryMap[item.code.toUpperCase()] = stockQty;
                }
            });

            // Glass inventory
            const [glassStock] = await db.query(`SELECT code, name, quantity FROM glass_items`);
            glassStock.forEach(item => {
                if (item.code) inventoryMap[item.code.toUpperCase()] = parseFloat(item.quantity) || 0;
            });

            // Accessories inventory
            const [accessoryStock] = await db.query(`SELECT code, name, stock_quantity FROM accessories`);
            accessoryStock.forEach(item => {
                if (item.code) inventoryMap[item.code.toUpperCase()] = parseFloat(item.stock_quantity) || 0;
            });

            // General inventory
            const [generalStock] = await db.query(`SELECT item_code, item_name, quantity FROM inventory`);
            generalStock.forEach(item => {
                if (item.item_code) inventoryMap[item.item_code.toUpperCase()] = parseFloat(item.quantity) || 0;
            });

            // Try to get BOM items first
            const [bomItems] = await db.query(
                `SELECT 
                    bi.item_code as code,
                    bi.item_name as name,
                    bi.item_type as type,
                    bi.quantity as required_qty,
                    bi.unit
                FROM bom_items bi
                WHERE bi.design_id IN (SELECT id FROM door_designs WHERE project_id = ?)`,
                [id]
            );

            // If no BOM items, fallback to project_materials
            let itemsToCheck = bomItems;
            if (bomItems.length === 0 && materials.length > 0) {
                // Use materials from earlier query
                itemsToCheck = materials.map(m => ({
                    code: '', // Will get from project_materials in next step
                    name: m.material_name,
                    type: m.material_type,
                    required_qty: parseFloat(m.quantity) || 0,
                    unit: m.unit
                }));

                // Get material codes from project_materials
                const [pmCodes] = await db.query(
                    `SELECT material_code, material_name 
                     FROM project_materials 
                     WHERE project_id = ? AND material_code IS NOT NULL`,
                    [id]
                );
                const codeMap = {};
                pmCodes.forEach(p => { if (p.material_code) codeMap[p.material_name] = p.material_code; });
                itemsToCheck.forEach(item => { item.code = codeMap[item.name] || ''; });
            }

            // Compare with current inventory
            const bomSummary = {};
            itemsToCheck.forEach(item => {
                const key = item.code?.toUpperCase() || item.name;
                if (!bomSummary[key]) {
                    bomSummary[key] = {
                        code: item.code,
                        name: item.name,
                        type: item.type,
                        required_qty: 0,
                        unit: item.unit
                    };
                }
                bomSummary[key].required_qty += parseFloat(item.required_qty) || 0;
            });

            inventoryStatus = Object.values(bomSummary).map(item => {
                const stockKey = item.code?.toUpperCase() || '';
                const stock_qty = inventoryMap[stockKey] || 0;
                const required = Math.round(item.required_qty);

                let status = 'sufficient'; // Äá»§
                if (stock_qty === 0) {
                    status = 'out_of_stock'; // Háº¿t hÃ ng
                } else if (stock_qty < required) {
                    status = 'insufficient'; // Thiáº¿u
                }

                return {
                    code: item.code || '-',
                    name: item.name,
                    type: item.type,
                    required_qty: required,
                    stock_qty: Math.round(stock_qty),
                    shortage: Math.max(0, required - stock_qty),
                    unit: item.unit,
                    status: status
                };
            });
        } catch (invErr) {
            console.log('Could not get inventory status:', invErr.message);
        }

        res.json({
            success: true,
            data: {
                project: {
                    ...project,
                    quotation: quotation ? { quotation_code: quotation.quotation_code, id: quotation.id } : null
                },
                products,
                materials,
                financial: {
                    quotation_total,
                    materials_total,
                    net_total
                },
                timeline,
                quotationDetails,
                exportedMaterials,
                inventoryStatus
            }
        });
    } catch (err) {
        console.error('Error getting project detail:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server"
        });
    }
};

// GET by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT 
                p.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                c.address AS customer_address,
                a.name AS agency_name,
                COALESCE(
                    (SELECT approved_at FROM quotations q WHERE q.project_id = p.id AND q.status = 'approved' AND q.approved_at IS NOT NULL ORDER BY q.approved_at DESC LIMIT 1),
                    (SELECT quotation_date FROM quotations q WHERE q.project_id = p.id AND q.status = 'approved' ORDER BY q.updated_at DESC LIMIT 1)
                ) AS contract_date
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN agencies a ON p.agency_id = a.id
            WHERE p.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server"
        });
    }
};

// POST create
exports.create = async (req, res) => {
    try {
        const {
            project_code, project_name, customer_id, start_date, deadline, status, notes,
            agency_id, construction_province, construction_district, construction_address
        } = req.body;

        // Validation
        if (!project_code || !project_code.trim()) {
            return res.status(400).json({
                success: false,
                message: "MÃ£ dá»± Ã¡n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng"
            });
        }

        if (!project_name || !project_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "TÃªn dá»± Ã¡n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng"
            });
        }

        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "Vui lÃ²ng chá»n khÃ¡ch hÃ ng"
            });
        }

        if (!start_date) {
            return res.status(400).json({
                success: false,
                message: "NgÃ y báº¯t Ä‘áº§u khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng"
            });
        }

        if (!deadline) {
            return res.status(400).json({
                success: false,
                message: "NgÃ y giao dá»± kiáº¿n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng"
            });
        }

        // Check if customer exists
        const [customerRows] = await db.query(
            "SELECT id FROM customers WHERE id = ?",
            [customer_id]
        );

        if (customerRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "KhÃ¡ch hÃ ng khÃ´ng tá»“n táº¡i"
            });
        }

        // Check if project_code already exists
        const [existingRows] = await db.query(
            "SELECT id FROM projects WHERE project_code = ?",
            [project_code.trim()]
        );

        if (existingRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: `MÃ£ dá»± Ã¡n "${project_code}" Ä‘Ã£ tá»“n táº¡i. Vui lÃ²ng chá»n mÃ£ khÃ¡c.`
            });
        }

        // Validate dates
        const startDate = new Date(start_date);
        const deadlineDate = new Date(deadline);

        if (deadlineDate < startDate) {
            return res.status(400).json({
                success: false,
                message: "NgÃ y giao dá»± kiáº¿n pháº£i sau ngÃ y báº¯t Ä‘áº§u"
            });
        }

        const [result] = await db.query(
            `INSERT INTO projects 
             (project_code, project_name, customer_id, start_date, deadline, status, notes,
              agency_id, construction_province, construction_district, construction_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                project_code.trim(),
                project_name.trim(),
                customer_id,
                start_date,
                deadline,
                status || 'new',
                notes ? notes.trim() : null,
                agency_id || null,
                construction_province || null,
                construction_district || null,
                construction_address || null
            ]
        );

        // Láº¥y thÃ´ng tin khÃ¡ch hÃ ng Ä‘á»ƒ thÃ´ng bÃ¡o
        const [customerInfo] = await db.query(
            "SELECT full_name FROM customers WHERE id = ?",
            [customer_id]
        );

        // Táº¡o thÃ´ng bÃ¡o dá»± Ã¡n má»›i (Event-based)
        try {
            await SystemNotifier.notify('project.created', {
                entityName: project_name.trim(),
                entityId: result.insertId,
                actor: SystemNotifier.getActor(req),
                afterData: {
                    project_code: project_code.trim(),
                    customer_name: customerInfo[0]?.full_name || 'N/A'
                }
            });
        } catch (notifErr) {
            console.error('Error creating notification:', notifErr);
        }

        res.status(201).json({
            success: true,
            message: "ThÃªm dá»± Ã¡n thÃ nh cÃ´ng",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error creating project:', err);

        // Handle specific database errors
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "MÃ£ dá»± Ã¡n Ä‘Ã£ tá»“n táº¡i. Vui lÃ²ng chá»n mÃ£ khÃ¡c."
            });
        }

        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: "KhÃ¡ch hÃ ng khÃ´ng tá»“n táº¡i"
            });
        }

        res.status(500).json({
            success: false,
            message: err.message || "Lá»—i khi thÃªm dá»± Ã¡n",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            project_name, customer_id, start_date, deadline, status,
            progress_percent, total_value, notes,
            construction_province, construction_district, construction_address,
            agency_id, workforce, manual_weight
        } = req.body;

        // Lấy thông tin dự án hiện tại (JOIN c., a. để có name so sánh)
        const [currentRows] = await db.query(
            `SELECT 
                p.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                a.name AS agency_name
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN agencies a ON p.agency_id = a.id
            WHERE p.id = ?`,
            [id]
        );

        if (currentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dự án"
            });
        }

        const current = currentRows[0];

        // Chỉ cập nhật các trường được cung cấp (partial update)
        const updateFields = [];
        const updateValues = [];

        if (project_name !== undefined) {
            updateFields.push("project_name = ?");
            updateValues.push(project_name);
        }
        if (customer_id !== undefined) {
            updateFields.push("customer_id = ?");
            updateValues.push(customer_id);
        }
        if (agency_id !== undefined) {
            updateFields.push("agency_id = ?");
            updateValues.push(agency_id);
        }
        if (start_date !== undefined) {
            updateFields.push("start_date = ?");
            updateValues.push(start_date);
        }
        if (deadline !== undefined) {
            updateFields.push("deadline = ?");
            updateValues.push(deadline);
        }
        if (construction_province !== undefined) {
            updateFields.push("construction_province = ?");
            updateValues.push(construction_province);
        }
        if (construction_district !== undefined) {
            updateFields.push("construction_district = ?");
            updateValues.push(construction_district);
        }
        if (construction_address !== undefined) {
            updateFields.push("construction_address = ?");
            updateValues.push(construction_address);
        }
        if (status !== undefined) {
            updateFields.push("status = ?");
            updateValues.push(status);

            // Auto-set timestamps when status changes to specific stages
            const currentTimestamp = new Date();

            if (status === 'installation' && !current.moved_to_installation_at) {
                updateFields.push("moved_to_installation_at = ?");
                updateValues.push(currentTimestamp);
            }

            if (status === 'handover' && !current.handover_date) {
                updateFields.push("handover_date = ?");
                updateValues.push(currentTimestamp);
            }

            if (status === 'completed' && !current.completed_at) {
                updateFields.push("completed_at = ?");
                updateValues.push(currentTimestamp);
            }
        }
        if (progress_percent !== undefined) {
            updateFields.push("progress_percent = ?");
            updateValues.push(progress_percent);
        }
        if (total_value !== undefined) {
            updateFields.push("total_value = ?");
            updateValues.push(total_value);
        }
        if (notes !== undefined) {
            updateFields.push("notes = ?");
            updateValues.push(notes || null);
        }
        if (workforce !== undefined) {
            updateFields.push("workforce = ?");
            updateValues.push(workforce || "");
        }
        if (manual_weight !== undefined) {
            updateFields.push("manual_weight = ?");
            updateValues.push(manual_weight || "");
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "KhÃ´ng cÃ³ trÆ°á»ng nÃ o Ä‘á»ƒ cáº­p nháº­t"
            });
        }

        updateValues.push(id);

        console.log(`[DEBUG] Executing UPDATE with fields: ${updateFields.join(", ")}`);
        console.log(`[DEBUG] Values:`, updateValues);

        const [result] = await db.query(
            `UPDATE projects 
             SET ${updateFields.join(", ")} 
             WHERE id = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        // Lấy lại thông tin dự án đã cập nhật
        const [updatedRows] = await db.query(
            `SELECT 
                p.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                a.name AS agency_name
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN agencies a ON p.agency_id = a.id
            WHERE p.id = ?`,
            [id]
        );

        // ThÃ´ng bÃ¡o náº¿u tráº¡ng thÃ¡i thay Ä‘á»•i (Event-based)
        if (status !== undefined && status !== current.status) {
            try {
                // [Senior Architect] Sáng cáº¥p sá» lÃ½ track Ä‘á»ƒ cÃ³ diff chi tiáº¿t
                await SystemNotifier.track('project.status_changed', {
                    entityType: 'project',
                    entityId: parseInt(id),
                    entityName: updatedRows[0]?.project_name || current.project_name,
                    action: 'status_changed',
                    before: current,
                    after: updatedRows[0],
                    actor: SystemNotifier.getActor(req),
                    extraMetadata: { project_code: updatedRows[0]?.project_code || current.project_code }
                });
            } catch (notifErr) {
                console.error('Error creating status change notification:', notifErr);
            }

            // Náº¿u hoÃ n thÃ nh 100%
            if (status === 'completed' || (progress_percent !== undefined && progress_percent >= 100)) {
                try {
                    await SystemNotifier.notify('project.completed', {
                        entityName: updatedRows[0]?.project_name || current.project_name,
                        entityId: parseInt(id),
                        actor: SystemNotifier.getActor(req),
                        afterData: { project_code: updatedRows[0]?.project_code || current.project_code }
                    });
                } catch (e) {
                    console.error('Error creating completion notification:', e);
                }
            }
        } else {
            // Náº¿u chÆ°a thay Ä‘á»•i status nhÆ°ng cÃ³ update thÃ´ng tin khÃ¡c
            try {
                await SystemNotifier.track('project.updated', {
                    entityType: 'project',
                    entityId: parseInt(id),
                    entityName: updatedRows[0]?.project_name || current.project_name,
                    action: 'updated',
                    before: current,
                    after: updatedRows[0],
                    actor: SystemNotifier.getActor(req)
                });
            } catch (e) { }
        }

        res.json({
            success: true,
            message: "Cáº­p nháº­t dá»± Ã¡n thÃ nh cÃ´ng",
            data: updatedRows[0] || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi cáº­p nháº­t dá»± Ã¡n",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// DELETE project - CASCADE DELETE all related data
exports.delete = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { id } = req.params;

        // Táº¯t foreign key checks táº¡m thá»i Ä‘á»ƒ trÃ¡nh lá»—i constraint
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Check if project exists
        const [projectRows] = await connection.query(
            "SELECT id, project_code, project_name FROM projects WHERE id = ?",
            [id]
        );

        if (projectRows.length === 0) {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        const project = projectRows[0];
        console.log(`ðŸ—‘ï¸ Cascade deleting project: ${project.project_code} - ${project.project_name}`);

        // 1. XÃ³a door_bom_lines vÃ  door_bom_summary (BOM cá»­a)
        try {
            await connection.query(`
                DELETE FROM door_bom_lines 
                WHERE door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
            `, [id]);
            await connection.query(`
                DELETE FROM door_bom_summary 
                WHERE door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
            `, [id]);
            console.log('  âœ“ Deleted door BOM lines and summary');
        } catch (e) {
            console.log('  - No door_bom_lines/summary table');
        }

        // 2. XÃ³a door structure items vÃ  calculations
        try {
            await connection.query(`
                DELETE FROM door_structure_items 
                WHERE door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
            `, [id]);
            await connection.query(`
                DELETE FROM door_aluminum_calculations 
                WHERE door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
            `, [id]);
            await connection.query(`
                DELETE FROM door_glass_calculations 
                WHERE door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
            `, [id]);
            console.log('  âœ“ Deleted door structure and calculations');
        } catch (e) {
            console.log('  - No door structure/calculations tables');
        }

        // 3. XÃ³a cutting details vÃ  optimizations
        try {
            await connection.query(`
                DELETE FROM cutting_details 
                WHERE project_id = ?
            `, [id]);
            await connection.query(`
                DELETE FROM cutting_optimizations 
                WHERE project_id = ?
            `, [id]);
            await connection.query(`
                DELETE FROM door_cutting_plan 
                WHERE door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
            `, [id]);
            console.log('  âœ“ Deleted cutting details and optimizations');
        } catch (e) {
            console.log('  - No cutting tables');
        }

        // 4. XÃ³a BOM items cá»§a táº¥t cáº£ door_designs trong project
        try {

            await connection.query(`
            DELETE FROM bom_items 
            WHERE design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
        `, [id]);

        } catch(e) { console.log('error bom_items'); }
        console.log('  âœ“ Deleted BOM items');

        // 5. XÃ³a item_bom_lines vÃ  item_bom_versions
        try {
            await connection.query(`
                DELETE FROM item_bom_lines 
                WHERE project_id = ?
            `, [id]);
            await connection.query(`
                DELETE FROM item_bom_versions 
                WHERE project_id = ?
            `, [id]);
            console.log('  âœ“ Deleted item BOM lines and versions');
        } catch (e) {
            console.log('  - No item_bom tables');
        }

        // 6. XÃ³a door_drawings cá»§a táº¥t cáº£ door_designs trong project
        try {

            await connection.query(`
            DELETE FROM door_drawings 
            WHERE door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
        `, [id]);

        } catch(e) { console.log('error door_drawings'); }
        console.log('  âœ“ Deleted door drawings');

        // 7. XÃ³a door_designs
        try {

            await connection.query(
            "DELETE FROM door_designs WHERE project_id = ?",
            [id]
        );

        } catch(e) { console.log('error door_designs'); }
        console.log('  âœ“ Deleted door designs');

        // 8. XÃ³a quotation_items cá»§a táº¥t cáº£ quotations trong project
        try {

            await connection.query(`
            DELETE FROM quotation_items 
            WHERE quotation_id IN (SELECT id FROM quotations WHERE project_id = ?)
        `, [id]);

        } catch(e) { console.log('error quotation_items'); }
        console.log('  âœ“ Deleted quotation items');

        // 9. XÃ³a quotations
        try {

            await connection.query(
            "DELETE FROM quotations WHERE project_id = ?",
            [id]
        );

        } catch(e) { console.log('error quotations'); }
        console.log('  âœ“ Deleted quotations');

        // 10. XÃ³a production_order_bom vÃ  production_order_doors
        try {
            await connection.query(`
                DELETE FROM production_order_bom 
                WHERE production_order_id IN (SELECT id FROM production_orders WHERE project_id = ?)
            `, [id]);
            await connection.query(`
                DELETE FROM production_order_doors 
                WHERE production_order_id IN (SELECT id FROM production_orders WHERE project_id = ?)
            `, [id]);
            console.log('  âœ“ Deleted production order BOM and doors');
        } catch (e) {
            console.log('  - No production_order_bom/doors tables');
        }

        // 11. XÃ³a production_order_items cá»§a táº¥t cáº£ production_orders trong project
        try {
            await connection.query(`
                DELETE FROM production_order_items 
                WHERE production_order_id IN (SELECT id FROM production_orders WHERE project_id = ?)
            `, [id]);
            console.log('  âœ“ Deleted production order items');
        } catch (e) {
            console.log('  - No production_order_items table or no items');
        }

        // 12. XÃ³a production_progress
        try {
            await connection.query(`
                DELETE FROM production_progress 
                WHERE production_order_id IN (SELECT id FROM production_orders WHERE project_id = ?)
            `, [id]);
            console.log('  âœ“ Deleted production progress');
        } catch (e) {
            console.log('  - No production_progress table');
        }

        // 13. XÃ³a production_orders
        try {

            await connection.query(
            "DELETE FROM production_orders WHERE project_id = ?",
            [id]
        );

        } catch(e) { console.log('error production_orders'); }
        console.log('  âœ“ Deleted production orders');

        // 14. XÃ³a project_items (háº¡ng má»¥c dá»± Ã¡n)
        try {
            await connection.query(
                "DELETE FROM project_items WHERE project_id = ?",
                [id]
            );
            await connection.query(
                "DELETE FROM project_items_v2 WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted project items');
        } catch (e) {
            console.log('  - No project_items tables');
        }

        // 15. XÃ³a project_materials (váº­t tÆ° dá»± Ã¡n)
        try {
            await connection.query(
                "DELETE FROM project_materials WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted project materials');
        } catch (e) {
            console.log('  - No project_materials table');
        }

        // 16. Kho, Stock Documents
        try {
            await connection.query(`
                DELETE FROM stock_document_lines 
                WHERE project_id = ? OR document_id IN (SELECT id FROM stock_documents WHERE project_id = ?)
            `, [id, id]);
            await connection.query(
                "DELETE FROM stock_documents WHERE project_id = ?",
                [id]
            );
            console.log('  ✓ Deleted stock documents');

            await connection.query(`
                DELETE FROM warehouse_export_items 
                WHERE export_id IN (SELECT id FROM warehouse_exports WHERE project_id = ?)
            `, [id]);
            await connection.query(
                "DELETE FROM warehouse_exports WHERE project_id = ?",
                [id]
            );
            console.log('  ✓ Deleted warehouse exports');
        } catch (e) {
            console.log('  - No warehouse_exports or stock_documents tables');
        }

        // 17. XÃ³a project cutting vÃ  bÃ³c tÃ¡ch
        try {
            await connection.query(
                "DELETE FROM project_cutting_details WHERE project_id = ?",
                [id]
            );
            await connection.query(
                "DELETE FROM project_cutting_optimization WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted project cutting details');
        } catch (e) {
            console.log('  - No project_cutting tables');
        }

        // 18. XÃ³a project summaries (aluminum, glass, gaskets, accessories)
        try {
            await connection.query(
                "DELETE FROM project_aluminum_summary WHERE project_id = ?",
                [id]
            );
            await connection.query(
                "DELETE FROM project_glass_summary WHERE project_id = ?",
                [id]
            );
            await connection.query(
                "DELETE FROM project_gaskets_summary WHERE project_id = ?",
                [id]
            );
            await connection.query(
                "DELETE FROM project_accessories_summary WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted project material summaries');
        } catch (e) {
            console.log('  - No project summary tables');
        }

        // 19. XÃ³a project finances vÃ  pricing
        try {
            await connection.query(
                "DELETE FROM project_finances WHERE project_id = ?",
                [id]
            );
            await connection.query(
                "DELETE FROM project_pricing WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted project finances and pricing');
        } catch (e) {
            console.log('  - No project finances/pricing tables');
        }

        // 20. XÃ³a debts liÃªn quan Ä‘áº¿n project
        try {
            await connection.query(
                "DELETE FROM debts WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted debts');
        } catch (e) {
            console.log('  - No debts table or error:', e.message);
        }

        // 21. XÃ³a commissions liÃªn quan Ä‘áº¿n project
        try {
            await connection.query(
                "DELETE FROM commissions WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted commissions');
        } catch (e) {
            console.log('  - No commissions table or error:', e.message);
        }

        // 22. XÃ³a financial_transactions
        try {
            await connection.query(
                "DELETE FROM financial_transactions WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted financial transactions');
        } catch (e) {
            console.log('  - No financial_transactions table');
        }

        // 23. XÃ³a inventory_out vÃ  inventory_transactions liÃªn quan Ä‘áº¿n project
        try {
            await connection.query(
                "DELETE FROM inventory_out WHERE project_id = ?",
                [id]
            );
            await connection.query(
                "DELETE FROM inventory_transactions WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted inventory records');
        } catch (e) {
            console.log('  - No inventory tables or error:', e.message);
        }

        // 24. XÃ³a project logs
        try {
            await connection.query(
                "DELETE FROM project_logs WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted project logs');
        } catch (e) {
            console.log('  - No project_logs table or error:', e.message);
        }

        // 25. XÃ³a projects_material_summary
        try {
            await connection.query(
                "DELETE FROM projects_material_summary WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted material summary');
        } catch (e) {
            console.log('  - No projects_material_summary table or error:', e.message);
        }

        // 26. XÃ³a design files
        try {
            await connection.query(
                "DELETE FROM design_files WHERE project_id = ?",
                [id]
            );
            console.log('  âœ“ Deleted design files');
        } catch (e) {
            console.log('  - No design_files table or error:', e.message);
        }

        // 26.5. Xóa triệt để các bảng phụ trách khác để chống dọn rác (zombie data)
        try { await connection.query("DELETE FROM purchase_request_items WHERE request_id IN (SELECT id FROM purchase_requests WHERE project_id = ?)", [id]); } catch(e) {}
        try { await connection.query("DELETE FROM material_request_items WHERE request_id IN (SELECT id FROM material_requests WHERE project_id = ?)", [id]); } catch(e) {}
        try { await connection.query("DELETE FROM export_slip_items WHERE slip_id IN (SELECT id FROM export_slips WHERE project_id = ?)", [id]); } catch(e) {}
        
        try {
            const extraTables = [
                'purchase_requests', 'material_requests', 'export_slips', 
                'project_activity_logs', 'product_completion', 'product_manufacturing', 
                'installation_progress', 'project_material_status', 'product_materials', 
                'handover_info', 'design_purchase_requests', 'design_inventory_reservations', 
                'aluminum_scraps', 'design_revisions', 'production_orders', 'production_order_doors', 'production_progress', 'decals', 'door_drawings', 'cutting_optimizations', 'customer_interactions'
            ];
            for (const t of extraTables) {
                try {
                    await connection.query(`DELETE FROM ${t} WHERE project_id = ?`, [id]);
                } catch(err) {}
            }
            console.log('  ✓ Deleted all extra system tracking tables (zombie prevention)');
        } catch (e) {
            console.log('  - Error cleaning up extra tables', e);
        }

        // 26.7. Xóa order_material_status (bảng này sử dụng order_id chứ không phải project_id)
        try {
            await connection.query("DELETE FROM order_material_status WHERE order_id = ?", [id]);
            console.log('  ✓ Deleted order_material_status tracking (Theo dõi dự án)');
        } catch(e) {
            console.log('  - Error cleaning order_material_status', e.message);
        }

        // 27. Cuá»‘i cÃ¹ng, xÃ³a project
        const [result] = await connection.query(
            "DELETE FROM projects WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        // Báº­t láº¡i foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        await connection.commit();
        console.log(`âœ… Project ${project.project_code} and all related data deleted successfully`);

        // Gửi thông báo xóa dự án
        try {
            await SystemNotifier.notify('project.deleted', {
                entityName: project.project_name,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
                afterData: { project_code: project.project_code }
            });
        } catch (e) { }

        res.json({
            success: true,
            message: `ÄÃ£ xÃ³a dá»± Ã¡n "${project.project_name}" vÃ  táº¥t cáº£ dá»¯ liá»‡u liÃªn quan (bÃ¡o giÃ¡, thiáº¿t káº¿, lá»‡nh sáº£n xuáº¥t, v.v.)`
        });
    } catch (err) {
        // Äáº£m báº£o báº­t láº¡i foreign key checks trÆ°á»›c khi rollback
        try {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (e) {
            console.error('Error re-enabling foreign key checks:', e);
        }
        await connection.rollback();
        console.error('Error cascade deleting project:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi xÃ³a dá»± Ã¡n: " + err.message,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        connection.release();
    }
};

// GET statistics
exports.getStatistics = async (req, res) => {
    try {
        // Tá»± Ä‘á»™ng cáº­p nháº­t progress_percent dá»±a trÃªn status náº¿u progress_percent = 0 hoáº·c NULL
        await db.query(`
            UPDATE projects 
            SET progress_percent = CASE
                WHEN status = 'quotation_pending' OR status = 'waiting_quotation' THEN 10
                WHEN status = 'designing' THEN 25
                WHEN status = 'bom_extraction' OR status LIKE '%bom%' THEN 40
                WHEN status = 'in_production' OR status IN ('cutting', 'welding', 'gluing', 'accessories', 'finishing', 'packaging') THEN 60
                WHEN status = 'installation' THEN 85
                WHEN status = 'handover' THEN 95
                WHEN status = 'completed' THEN 100
                ELSE COALESCE(progress_percent, 0)
            END
            WHERE (progress_percent IS NULL OR progress_percent = 0)
              AND status IS NOT NULL
              AND status != ''
        `);

        // Get project statistics
        const [projectRows] = await db.query(`
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE WHEN status = 'quotation_pending' THEN 1 ELSE 0 END) as pending_quotations,
                SUM(CASE WHEN status IN ('in_production', 'cutting', 'welding', 'gluing', 'accessories', 'finishing', 'packaging', 'installation') THEN 1 ELSE 0 END) as in_production,
                SUM(CASE WHEN status = 'completed' OR progress_percent >= 100 THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status NOT IN ('completed') AND (progress_percent IS NULL OR progress_percent < 100) THEN 1 ELSE 0 END) as running_projects
            FROM projects
        `);

        // Get production orders count - bao gá»“m cáº£ cÃ¡c dá»± Ã¡n Ä‘Ã£ Ä‘áº¿n giai Ä‘oáº¡n sáº£n xuáº¥t
        const [orderRows] = await db.query(`
            SELECT COUNT(*) as total_orders
            FROM production_orders
            WHERE status IS NULL OR status = '' OR status NOT IN ('completed', 'cancelled', 'closed')
        `);

        // Äáº¿m cÃ¡c dá»± Ã¡n Ä‘Ã£ Ä‘áº¿n giai Ä‘oáº¡n sáº£n xuáº¥t (cÃ³ thá»ƒ chÆ°a cÃ³ production order)
        const [projectsInProduction] = await db.query(`
            SELECT COUNT(*) as count
            FROM projects
            WHERE status IN ('in_production', 'cutting', 'welding', 'gluing', 'accessories', 'finishing', 'packaging')
               OR (status = 'designing' AND progress_percent >= 40)
        `);

        const productionOrdersCount = Math.max(orderRows[0]?.total_orders || 0, projectsInProduction[0]?.count || 0);

        // Get pending quotations count (from quotations table)
        const [quotationRows] = await db.query(`
            SELECT COUNT(*) as pending_quotations_count
            FROM quotations
            WHERE status IN ('pending', 'sent')
        `);

        const stats = {
            ...projectRows[0],
            production_orders: productionOrdersCount,
            pending_quotations: quotationRows[0].pending_quotations_count || projectRows[0].pending_quotations || 0
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server"
        });
    }
};

// GET door by ID
exports.getDoorById = async (req, res) => {
    try {
        const { id, doorId } = req.params;

        console.log('getDoorById called with projectId:', id, 'doorId:', doorId);

        const [rows] = await db.query(`
            SELECT 
                dd.*,
                dt.code AS template_code,
                dt.name AS template_name,
                dt.family AS template_family,
                dt.structure_json,
                a.brand,
                a.name AS aluminum_system_name,
                a.code AS aluminum_system_code
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.id = ? AND dd.project_id = ?
        `, [doorId, id]);

        console.log('Query result:', rows.length, 'rows found');

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `KhÃ´ng tÃ¬m tháº¥y cá»­a vá»›i ID ${doorId} trong dá»± Ã¡n ${id}`
            });
        }

        // Get door drawing if exists
        const [drawingRows] = await db.query(`
            SELECT * FROM door_drawings 
            WHERE door_design_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [doorId]);

        const door = rows[0];

        // Parse params_json
        if (door.params_json) {
            try {
                door.params_json = typeof door.params_json === 'string' ? JSON.parse(door.params_json) : door.params_json;
            } catch (e) {
                console.error('Error parsing params_json:', e);
                door.params_json = {};
            }
        } else {
            door.params_json = {};
        }

        // Parse structure_json from template
        if (door.structure_json) {
            try {
                door.structure_json = typeof door.structure_json === 'string' ? JSON.parse(door.structure_json) : door.structure_json;
            } catch (e) {
                console.error('Error parsing structure_json:', e);
            }
        }

        if (drawingRows.length > 0) {
            try {
                door.drawing_data = drawingRows[0].drawing_data ?
                    (typeof drawingRows[0].drawing_data === 'string' ? JSON.parse(drawingRows[0].drawing_data) : drawingRows[0].drawing_data) : null;
                door.calculated_dimensions = drawingRows[0].calculated_dimensions ?
                    (typeof drawingRows[0].calculated_dimensions === 'string' ? JSON.parse(drawingRows[0].calculated_dimensions) : drawingRows[0].calculated_dimensions) : null;
                door.image_data = drawingRows[0].image_data;
            } catch (e) {
                console.error('Error parsing drawing data:', e);
                door.drawing_data = null;
                door.calculated_dimensions = null;
            }
        }

        res.json({
            success: true,
            data: door
        });
    } catch (err) {
        console.error('Error getting door by ID:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// GET project doors
exports.getProjectDoors = async (req, res) => {
    try {
        const { id } = req.params;
        const { family } = req.query;

        let query = `
            SELECT 
                dd.*,
                dt.code AS template_code,
                dt.name AS template_name,
                dt.family AS template_family,
                a.brand,
                a.name AS aluminum_system_name,
                a.code AS aluminum_system_code
            FROM door_designs dd
            LEFT JOIN door_templates dt ON dd.template_id = dt.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.project_id = ?
        `;
        const params = [id];

        if (family) {
            query += ` AND dt.family = ?`;
            params.push(family);
        }

        query += ` ORDER BY dd.created_at DESC`;

        const [rows] = await db.query(query, params);

        // Parse JSON fields
        const doors = rows.map(row => ({
            ...row,
            params_json: typeof row.params_json === 'string'
                ? JSON.parse(row.params_json)
                : row.params_json
        }));

        res.json({
            success: true,
            data: doors,
            count: doors.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server"
        });
    }
};

// POST create door
exports.createDoor = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            template_id,
            template_code,
            aluminum_system_id,
            door_type,
            color,
            width_mm,
            height_mm,
            params_json,
            number_of_panels,
            has_horizontal_mullion,
            formula_id
        } = req.body;

        // Validate required fields
        if (!aluminum_system_id || aluminum_system_id === '' || aluminum_system_id === '0') {
            return res.status(400).json({
                success: false,
                message: "Vui lÃ²ng chá»n há»‡ nhÃ´m"
            });
        }
        if (!width_mm || width_mm < 300 || width_mm > 5000) {
            return res.status(400).json({
                success: false,
                message: "Chiá»u rá»™ng pháº£i tá»« 300 Ä‘áº¿n 5000mm"
            });
        }
        if (!height_mm || height_mm < 300 || height_mm > 5000) {
            return res.status(400).json({
                success: false,
                message: "Chiá»u cao pháº£i tá»« 300 Ä‘áº¿n 5000mm"
            });
        }

        // Generate design code
        const [projectRows] = await db.query(
            "SELECT project_code FROM projects WHERE id = ?",
            [id]
        );
        const projectCode = projectRows[0]?.project_code || 'CT';
        const [doorCount] = await db.query(
            "SELECT COUNT(*) as count FROM door_designs WHERE project_id = ?",
            [id]
        );
        const designCode = `${projectCode}-C${String(doorCount[0].count + 1).padStart(3, '0')}`;

        const [result] = await db.query(
            `INSERT INTO door_designs 
            (project_id, template_id, template_code, design_code, door_type, aluminum_system_id, 
             color, width_mm, height_mm, params_json, number_of_panels, has_horizontal_mullion, formula_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                template_id || null,
                template_code || null,
                designCode,
                door_type || 'swing',
                aluminum_system_id,
                color || null,
                width_mm,
                height_mm,
                params_json ? JSON.stringify(params_json) : null,
                number_of_panels || 1,
                has_horizontal_mullion || false,
                formula_id || null
            ]
        );

        // Create log entry
        try {
            await db.query(
                `INSERT INTO project_logs (project_id, action_type, action_description, related_door_id)
                VALUES (?, 'door_added', ?, ?)`,
                [id, `ÄÃ£ thÃªm cá»­a ${designCode} vÃ o cÃ´ng trÃ¬nh`, result.insertId]
            );
        } catch (logErr) {
            console.error("Error creating log:", logErr);
        }

        // Tá»± Ä‘á»™ng tÃ­nh vÃ  lÆ°u BOM (náº¿u cÃ³ báº£n váº½)
        try {
            const bomAutoSave = require("../services/bomAutoSave");
            // TÃ¬m door_drawing_id náº¿u cÃ³
            const [drawingRows] = await db.query(
                "SELECT id FROM door_drawings WHERE door_design_id = ? ORDER BY created_at DESC LIMIT 1",
                [result.insertId]
            );
            if (drawingRows.length > 0) {
                await bomAutoSave.autoCalculateAndSaveBOM(result.insertId, id, drawingRows[0].id);
            }
        } catch (bomErr) {
            console.error("Error auto-calculating BOM:", bomErr);
            // KhÃ´ng throw Ä‘á»ƒ khÃ´ng lÃ m giÃ¡n Ä‘oáº¡n viá»‡c táº¡o cá»­a
        }

        // Cáº­p nháº­t giÃ¡ trá»‹ cÃ´ng trÃ¬nh vÃ  báº£ng bÃ¡o giÃ¡
        try {
            await updateProjectTotalValue(id);
        } catch (updateErr) {
            console.error("Error updating project total value:", updateErr);
            // KhÃ´ng throw Ä‘á»ƒ khÃ´ng lÃ m giÃ¡n Ä‘oáº¡n viá»‡c táº¡o cá»­a
        }

        res.status(201).json({
            success: true,
            message: "ThÃªm cá»­a thÃ nh cÃ´ng",
            data: { id: result.insertId, design_code: designCode }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi thÃªm cá»­a"
        });
    }
};

// PUT update door
exports.updateDoor = async (req, res) => {
    try {
        const { id, doorId } = req.params;
        const {
            aluminum_system_id,
            door_type,
            color,
            width_mm,
            height_mm,
            params_json,
            number_of_panels,
            has_horizontal_mullion,
            selling_price,
            unit_price_per_m2
        } = req.body;

        const updateFields = [];
        const params = [];

        if (aluminum_system_id !== undefined) {
            updateFields.push("aluminum_system_id = ?");
            params.push(aluminum_system_id);
        }
        if (door_type !== undefined) {
            updateFields.push("door_type = ?");
            params.push(door_type);
        }
        if (color !== undefined) {
            updateFields.push("color = ?");
            params.push(color);
        }
        if (width_mm !== undefined) {
            updateFields.push("width_mm = ?");
            params.push(width_mm);
        }
        if (height_mm !== undefined) {
            updateFields.push("height_mm = ?");
            params.push(height_mm);
        }
        if (params_json !== undefined) {
            updateFields.push("params_json = ?");
            params.push(JSON.stringify(params_json));
        }
        if (number_of_panels !== undefined) {
            updateFields.push("number_of_panels = ?");
            params.push(number_of_panels);
        }
        if (has_horizontal_mullion !== undefined) {
            updateFields.push("has_horizontal_mullion = ?");
            params.push(has_horizontal_mullion);
        }
        if (selling_price !== undefined) {
            updateFields.push("selling_price = ?");
            params.push(selling_price);
        }
        if (unit_price_per_m2 !== undefined) {
            updateFields.push("unit_price_per_m2 = ?");
            params.push(unit_price_per_m2);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        params.push(doorId, id);

        const [result] = await db.query(
            `UPDATE door_designs SET ${updateFields.join(", ")} 
            WHERE id = ? AND project_id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y cá»­a"
            });
        }

        // Tá»± Ä‘á»™ng tÃ­nh láº¡i BOM khi cá»­a Ä‘Æ°á»£c cáº­p nháº­t
        try {
            const bomAutoSave = require("../services/bomAutoSave");
            // TÃ¬m door_drawing_id náº¿u cÃ³
            const [drawingRows] = await db.query(
                "SELECT id FROM door_drawings WHERE door_design_id = ? ORDER BY created_at DESC LIMIT 1",
                [doorId]
            );
            if (drawingRows.length > 0) {
                await bomAutoSave.autoCalculateAndSaveBOM(doorId, id, drawingRows[0].id);
            }
        } catch (bomErr) {
            console.error("Error auto-calculating BOM:", bomErr);
            // KhÃ´ng throw Ä‘á»ƒ khÃ´ng lÃ m giÃ¡n Ä‘oáº¡n viá»‡c cáº­p nháº­t cá»­a
        }

        // Cáº­p nháº­t giÃ¡ trá»‹ cÃ´ng trÃ¬nh sau khi cáº­p nháº­t cá»­a
        try {
            await updateProjectTotalValue(id);
        } catch (updateErr) {
            console.error("Error updating project total value:", updateErr);
            // KhÃ´ng throw Ä‘á»ƒ khÃ´ng lÃ m giÃ¡n Ä‘oáº¡n viá»‡c cáº­p nháº­t cá»­a
        }

        res.json({
            success: true,
            message: "Cáº­p nháº­t cá»­a thÃ nh cÃ´ng"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi cáº­p nháº­t cá»­a"
        });
    }
};

// DELETE door
exports.deleteDoor = async (req, res) => {
    try {
        const { id, doorId } = req.params;

        const [result] = await db.query(
            "DELETE FROM door_designs WHERE id = ? AND project_id = ?",
            [doorId, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y cá»­a"
            });
        }

        // Cáº­p nháº­t giÃ¡ trá»‹ cÃ´ng trÃ¬nh sau khi xÃ³a cá»­a
        try {
            await updateProjectTotalValue(id);
        } catch (updateErr) {
            console.error("Error updating project total value:", updateErr);
            // KhÃ´ng throw Ä‘á»ƒ khÃ´ng lÃ m giÃ¡n Ä‘oáº¡n viá»‡c xÃ³a cá»­a
        }

        res.json({
            success: true,
            message: "XÃ³a cá»­a thÃ nh cÃ´ng"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi xÃ³a cá»­a"
        });
    }
};

// GET project logs (legacy - chá»‰ tá»« báº£ng project_logs)
exports.getProjectLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT 
                pl.*,
                u.full_name AS created_by_name
            FROM project_logs pl
            LEFT JOIN users u ON pl.created_by = u.id
            WHERE pl.project_id = ?
            ORDER BY pl.created_at DESC
            LIMIT 100`,
            [id]
        );

        // If no logs found, return empty array (not an error)
        res.json({
            success: true,
            data: rows || [],
            count: rows ? rows.length : 0
        });
    } catch (err) {
        // If table doesn't exist, return empty array
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server"
        });
    }
};

// GET project logs full - Thu tháº­p táº¥t cáº£ sá»± kiá»‡n tá»« cÃ¡c báº£ng liÃªn quan
exports.getProjectLogsFull = async (req, res) => {
    try {
        const { id } = req.params;
        const allLogs = [];

        // 1. Láº¥y thÃ´ng tin dá»± Ã¡n (created_at, start_date, deadline, status changes)
        const [projectRows] = await db.query(
            `SELECT created_at, start_date, deadline, status, updated_at
             FROM projects WHERE id = ?`,
            [id]
        );
        if (projectRows.length > 0) {
            const project = projectRows[0];
            if (project.created_at) {
                allLogs.push({
                    event_type: 'project_created',
                    timestamp: project.created_at,
                    description: 'Dá»± Ã¡n Ä‘Æ°á»£c táº¡o',
                    details: {
                        'ID dá»± Ã¡n': id,
                        'NgÃ y táº¡o': new Date(project.created_at).toLocaleDateString('vi-VN'),
                        'Tráº¡ng thÃ¡i ban Ä‘áº§u': project.status || 'N/A'
                    }
                });
            }
            if (project.start_date) {
                let timestamp = project.start_date;
                if (typeof timestamp === 'string' && !timestamp.includes(' ')) {
                    timestamp = timestamp + ' 00:00:00';
                }
                allLogs.push({
                    event_type: 'project_started',
                    timestamp: timestamp,
                    description: 'Dá»± Ã¡n báº¯t Ä‘áº§u thá»±c hiá»‡n',
                    details: {
                        'NgÃ y báº¯t Ä‘áº§u': new Date(project.start_date).toLocaleDateString('vi-VN'),
                        'Háº¡n hoÃ n thÃ nh dá»± kiáº¿n': project.deadline ? new Date(project.deadline).toLocaleDateString('vi-VN') : 'ChÆ°a cÃ³'
                    }
                });
            }
        }

        // 2. Láº¥y bÃ¡o giÃ¡ (quotations)
        try {
            const [quotations] = await db.query(
                `SELECT id, quotation_code, created_at, updated_at, status
                 FROM quotations WHERE project_id = ? ORDER BY created_at`,
                [id]
            );
            quotations.forEach(q => {
                if (q.created_at) {
                    allLogs.push({
                        event_type: 'quotation_created',
                        timestamp: q.created_at,
                        description: `Táº¡o bÃ¡o giÃ¡ ${q.quotation_code || ''}`,
                        details: {
                            quotation_code: q.quotation_code,
                            status: q.status,
                            'MÃ£ bÃ¡o giÃ¡': q.quotation_code || 'N/A',
                            'Tráº¡ng thÃ¡i': q.status === 'approved' ? 'ÄÃ£ duyá»‡t' :
                                q.status === 'pending' ? 'Chá» duyá»‡t' :
                                    q.status === 'rejected' ? 'ÄÃ£ tá»« chá»‘i' :
                                        q.status === 'expired' ? 'Háº¿t háº¡n' : q.status
                        }
                    });
                }
                // Náº¿u status = 'approved', dÃ¹ng updated_at lÃ m ngÃ y duyá»‡t
                if (q.status === 'approved' && q.updated_at) {
                    allLogs.push({
                        event_type: 'quotation_approved',
                        timestamp: q.updated_at,
                        description: `Duyá»‡t bÃ¡o giÃ¡ ${q.quotation_code || ''}`,
                        details: {
                            quotation_code: q.quotation_code,
                            'MÃ£ bÃ¡o giÃ¡': q.quotation_code || 'N/A',
                            'NgÃ y duyá»‡t': new Date(q.updated_at).toLocaleDateString('vi-VN')
                        }
                    });
                }
            });
        } catch (e) {
            console.log('Error getting quotations:', e.message);
        }

        // 3. Láº¥y thiáº¿t káº¿ (door_designs, door_drawings)
        try {
            const [designs] = await db.query(
                `SELECT id, design_code, created_at, updated_at
                 FROM door_designs WHERE project_id = ? ORDER BY created_at`,
                [id]
            );
            designs.forEach(d => {
                if (d.created_at) {
                    allLogs.push({
                        event_type: 'design_created',
                        timestamp: d.created_at,
                        description: `Táº¡o thiáº¿t káº¿ ${d.design_code || ''}`,
                        details: {
                            'MÃ£ thiáº¿t káº¿': d.design_code || 'N/A',
                            'NgÃ y táº¡o': new Date(d.created_at).toLocaleDateString('vi-VN')
                        }
                    });
                }
            });

            // Láº¥y báº£n váº½ (door_drawings)
            const [drawings] = await db.query(
                `SELECT id, created_at, door_design_id
                 FROM door_drawings 
                 WHERE project_id = ? OR door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
                 ORDER BY created_at`,
                [id, id]
            );
            drawings.forEach(dr => {
                if (dr.created_at) {
                    allLogs.push({
                        event_type: 'design_completed',
                        timestamp: dr.created_at,
                        description: 'HoÃ n thÃ nh báº£n váº½ thiáº¿t káº¿',
                        details: {
                            'ID báº£n váº½': dr.id,
                            'NgÃ y hoÃ n thÃ nh': new Date(dr.created_at).toLocaleDateString('vi-VN')
                        }
                    });
                }
            });
        } catch (e) {
            console.log('Error getting designs:', e.message);
        }

        // 4. Láº¥y BOM (bom_items, project_items vá»›i status BOM_EXTRACTED)
        try {
            const [bomItems] = await db.query(
                `SELECT MIN(created_at) as bom_date
                 FROM bom_items 
                 WHERE design_id IN (SELECT id FROM door_designs WHERE project_id = ?)`,
                [id]
            );
            if (bomItems[0]?.bom_date) {
                allLogs.push({
                    event_type: 'bom_extracted',
                    timestamp: bomItems[0].bom_date,
                    description: 'BÃ³c tÃ¡ch váº­t tÆ° (BOM)',
                    details: {
                        'NgÃ y bÃ³c tÃ¡ch': new Date(bomItems[0].bom_date).toLocaleDateString('vi-VN'),
                        'MÃ´ táº£': 'ÄÃ£ tÃ­nh toÃ¡n vÃ  láº­p danh sÃ¡ch váº­t tÆ° cáº§n thiáº¿t'
                    }
                });
            }

            // Tá»« project_items
            const [projectItems] = await db.query(
                `SELECT MIN(updated_at) as bom_date
                 FROM project_items 
                 WHERE project_id = ? AND status = 'BOM_EXTRACTED'`,
                [id]
            );
            if (projectItems[0]?.bom_date && (!bomItems[0]?.bom_date || new Date(projectItems[0].bom_date) < new Date(bomItems[0].bom_date))) {
                allLogs.push({
                    event_type: 'bom_extracted',
                    timestamp: projectItems[0].bom_date,
                    description: 'BÃ³c tÃ¡ch váº­t tÆ° tá»« project items',
                    details: {
                        'NgÃ y bÃ³c tÃ¡ch': new Date(projectItems[0].bom_date).toLocaleDateString('vi-VN'),
                        'MÃ´ táº£': 'ÄÃ£ tÃ­nh toÃ¡n vÃ  láº­p danh sÃ¡ch váº­t tÆ° tá»« project items'
                    }
                });
            }

            // Tá»« door_bom_lines (fallback)
            try {
                const [bomLines] = await db.query(
                    `SELECT MIN(created_at) as bom_date
                     FROM door_bom_lines 
                     WHERE door_drawing_id IN (
                         SELECT id FROM door_drawings 
                         WHERE project_id = ? OR door_design_id IN (SELECT id FROM door_designs WHERE project_id = ?)
                     )`,
                    [id, id]
                );
                if (bomLines[0]?.bom_date) {
                    // Check if we already have a bom event
                    const existingBom = allLogs.find(l => l.event_type === 'bom_extracted');
                    if (!existingBom || new Date(bomLines[0].bom_date) < new Date(existingBom.timestamp)) {
                        allLogs.push({
                            event_type: 'bom_extracted',
                            timestamp: bomLines[0].bom_date,
                            description: 'BÃ³c tÃ¡ch váº­t tÆ° (tá»« báº£n váº½)',
                            details: {
                                'NgÃ y bÃ³c tÃ¡ch': new Date(bomLines[0].bom_date).toLocaleDateString('vi-VN'),
                                'MÃ´ táº£': 'ÄÃ£ tÃ­nh toÃ¡n váº­t tÆ° tá»« báº£n váº½ ká»¹ thuáº­t'
                            }
                        });
                    }
                }
            } catch (err) {
                // Table might not exist
            }
        } catch (e) {
            console.log('Error getting BOM:', e.message);
        }

        // 5. Láº¥y sáº£n xuáº¥t (production_orders)
        try {
            const [orders] = await db.query(
                `SELECT id, order_code, created_at, order_date, actual_start_date, actual_completion_date, status
                 FROM production_orders WHERE project_id = ? ORDER BY created_at`,
                [id]
            );
            orders.forEach(order => {
                if (order.created_at) {
                    allLogs.push({
                        event_type: 'production_ordered',
                        timestamp: order.created_at,
                        description: `Táº¡o lá»‡nh sáº£n xuáº¥t ${order.order_code || ''}`,
                        details: {
                            'MÃ£ lá»‡nh sáº£n xuáº¥t': order.order_code || 'N/A',
                            'Tráº¡ng thÃ¡i': order.status === 'completed' ? 'HoÃ n thÃ nh' :
                                order.status === 'pending' ? 'Chá» xá»­ lÃ½' :
                                    order.status || 'N/A',
                            'NgÃ y táº¡o': new Date(order.created_at).toLocaleDateString('vi-VN')
                        }
                    });
                }
                if (order.actual_start_date) {
                    let timestamp = order.actual_start_date;
                    if (typeof timestamp === 'string' && !timestamp.includes(' ')) {
                        timestamp = timestamp + ' 00:00:00';
                    }
                    allLogs.push({
                        event_type: 'production_started',
                        timestamp: timestamp,
                        description: `Báº¯t Ä‘áº§u sáº£n xuáº¥t ${order.order_code || ''}`,
                        details: {
                            'MÃ£ lá»‡nh sáº£n xuáº¥t': order.order_code || 'N/A',
                            'NgÃ y báº¯t Ä‘áº§u': new Date(order.actual_start_date).toLocaleDateString('vi-VN')
                        }
                    });
                }
                if (order.actual_completion_date) {
                    let timestamp = order.actual_completion_date;
                    if (typeof timestamp === 'string' && !timestamp.includes(' ')) {
                        timestamp = timestamp + ' 00:00:00';
                    }
                    allLogs.push({
                        event_type: 'production_completed',
                        timestamp: timestamp,
                        description: `HoÃ n thÃ nh sáº£n xuáº¥t ${order.order_code || ''}`,
                        details: {
                            'MÃ£ lá»‡nh sáº£n xuáº¥t': order.order_code || 'N/A',
                            'NgÃ y hoÃ n thÃ nh': new Date(order.actual_completion_date).toLocaleDateString('vi-VN')
                        }
                    });
                }
            });
        } catch (e) {
            console.log('Error getting production orders:', e.message);
        }

        // 6. Láº¥y láº¯p Ä‘áº·t (installation_progress)
        try {
            const [installations] = await db.query(
                `SELECT id, created_at, installation_date, status, installer_name, notes
                 FROM installation_progress WHERE project_id = ? ORDER BY created_at`,
                [id]
            );
            installations.forEach(inst => {
                if (inst.created_at) {
                    allLogs.push({
                        event_type: 'installation_started',
                        timestamp: inst.created_at,
                        description: 'Báº¯t Ä‘áº§u láº¯p Ä‘áº·t',
                        details: {
                            'NgÆ°á»i láº¯p Ä‘áº·t': inst.installer_name || 'ChÆ°a xÃ¡c Ä‘á»‹nh',
                            'Tráº¡ng thÃ¡i': inst.status === 'completed' ? 'HoÃ n thÃ nh' :
                                inst.status === 'in_progress' ? 'Äang thá»±c hiá»‡n' :
                                    inst.status === 'pending' ? 'Chá» xá»­ lÃ½' : inst.status || 'N/A'
                        },
                        user_name: inst.installer_name,
                        notes: inst.notes
                    });
                }
                if (inst.installation_date) {
                    // Äáº£m báº£o timestamp há»£p lá»‡
                    let timestamp = inst.installation_date;
                    if (typeof timestamp === 'string' && !timestamp.includes(' ')) {
                        timestamp = timestamp + ' 00:00:00';
                    }
                    allLogs.push({
                        event_type: 'installation_completed',
                        timestamp: timestamp,
                        description: 'HoÃ n thÃ nh láº¯p Ä‘áº·t',
                        details: {
                            'NgÆ°á»i láº¯p Ä‘áº·t': inst.installer_name || 'ChÆ°a xÃ¡c Ä‘á»‹nh',
                            'NgÃ y láº¯p Ä‘áº·t': new Date(inst.installation_date).toLocaleDateString('vi-VN')
                        },
                        user_name: inst.installer_name,
                        notes: inst.notes
                    });
                }
            });
        } catch (e) {
            console.log('Error getting installations:', e.message);
        }

        // 7. Láº¥y bÃ n giao (projects.handover_date)
        try {
            const [handoverRows] = await db.query(
                `SELECT handover_date, handover_notes FROM projects WHERE id = ? AND handover_date IS NOT NULL`,
                [id]
            );
            if (handoverRows.length > 0 && handoverRows[0].handover_date) {
                // Äáº£m báº£o timestamp há»£p lá»‡
                let timestamp = handoverRows[0].handover_date;
                if (typeof timestamp === 'string' && !timestamp.includes(' ')) {
                    timestamp = timestamp + ' 00:00:00';
                }
                allLogs.push({
                    event_type: 'handover',
                    timestamp: timestamp,
                    description: 'BÃ n giao dá»± Ã¡n cho khÃ¡ch hÃ ng',
                    details: {
                        'NgÃ y bÃ n giao': new Date(handoverRows[0].handover_date).toLocaleDateString('vi-VN'),
                        'Ghi chÃº': handoverRows[0].handover_notes || 'KhÃ´ng cÃ³ ghi chÃº'
                    },
                    notes: handoverRows[0].handover_notes
                });
            }
        } catch (e) {
            console.log('Error getting handover:', e.message);
        }

        // 8. Láº¥y project_logs (náº¿u cÃ³)
        try {
            const [projectLogs] = await db.query(
                `SELECT pl.*, u.full_name AS created_by_name
                 FROM project_logs pl
                 LEFT JOIN users u ON pl.created_by = u.id
                 WHERE pl.project_id = ?
                 ORDER BY pl.created_at`,
                [id]
            );
            projectLogs.forEach(log => {
                allLogs.push({
                    event_type: log.log_type || 'other',
                    timestamp: log.created_at,
                    description: log.title || log.content || 'Ghi chÃº',
                    content: log.content,
                    user_name: log.created_by_name
                });
            });
        } catch (e) {
            console.log('Error getting project_logs:', e.message);
        }

        // 9. Kiá»ƒm tra tráº¡ng thÃ¡i completed
        const [projectStatus] = await db.query(
            `SELECT status, updated_at FROM projects WHERE id = ?`,
            [id]
        );
        if (projectStatus.length > 0 && projectStatus[0].status === 'completed') {
            // TÃ¬m ngÃ y hoÃ n thÃ nh gáº§n nháº¥t tá»« handover hoáº·c updated_at
            const completedLogs = allLogs.filter(l => l.event_type === 'handover' || l.event_type === 'installation_completed');
            let completionTimestamp = projectStatus[0].updated_at;

            if (completedLogs.length > 0) {
                const latestCompleted = completedLogs.sort((a, b) => {
                    try {
                        return new Date(b.timestamp) - new Date(a.timestamp);
                    } catch {
                        return 0;
                    }
                })[0];
                if (latestCompleted && latestCompleted.timestamp) {
                    completionTimestamp = latestCompleted.timestamp;
                }
            }

            // Äáº£m báº£o timestamp há»£p lá»‡
            if (completionTimestamp) {
                allLogs.push({
                    event_type: 'project_completed',
                    timestamp: completionTimestamp,
                    description: 'Dá»± Ã¡n hoÃ n thÃ nh',
                    details: {
                        'Tráº¡ng thÃ¡i': 'HoÃ n thÃ nh',
                        'NgÃ y hoÃ n thÃ nh': new Date(completionTimestamp).toLocaleDateString('vi-VN')
                    }
                });
            }
        }

        // Sáº¯p xáº¿p theo thá»i gian (cÅ© nháº¥t trÆ°á»›c) vÃ  validate timestamp
        allLogs.forEach(log => {
            // Äáº£m báº£o timestamp lÃ  string há»£p lá»‡
            if (log.timestamp) {
                try {
                    const date = new Date(log.timestamp);
                    if (isNaN(date.getTime())) {
                        // Náº¿u timestamp khÃ´ng há»£p lá»‡, thá»­ format láº¡i
                        console.warn('Invalid timestamp:', log.timestamp, 'for event:', log.event_type);
                        log.timestamp = new Date().toISOString(); // Fallback to now
                    } else {
                        // Format láº¡i timestamp thÃ nh ISO string Ä‘á»ƒ Ä‘áº£m báº£o consistency
                        log.timestamp = date.toISOString();
                    }
                } catch (e) {
                    console.warn('Error parsing timestamp:', log.timestamp, e);
                    log.timestamp = new Date().toISOString();
                }
            }
        });

        allLogs.sort((a, b) => {
            try {
                return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
            } catch {
                return 0;
            }
        });

        // ===== BUILD TIMELINE SUMMARY =====
        const timeline = {
            start_date: null,
            deadline: null,
            quotation_date: null,
            design_date: null,
            bom_date: null,
            production_date: null,
            installation_date: null,
            handover_date: null
        };

        // Láº¥y thÃ´ng tin chi tiáº¿t cho timeline
        try {
            const [projectInfo] = await db.query(`
                SELECT p.*, c.full_name as customer_name, c.phone as customer_phone,
                       a.name as branch_name
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                LEFT JOIN agencies a ON c.agency_id = a.id
                WHERE p.id = ?
            `, [id]);

            if (projectInfo.length > 0) {
                const proj = projectInfo[0];
                timeline.start_date = proj.created_at || proj.start_date;
                timeline.deadline = proj.deadline;

                // TÃ¬m ngÃ y bÃ¡o giÃ¡
                const quotationLog = allLogs.find(l => l.event_type === 'quotation_created');
                timeline.quotation_date = quotationLog ? quotationLog.timestamp : null;

                // TÃ¬m ngÃ y thiáº¿t káº¿ (Æ°u tiÃªn created, fallback completed)
                const designLog = allLogs.find(l => l.event_type === 'design_created') || allLogs.find(l => l.event_type === 'design_completed');
                timeline.design_date = designLog ? designLog.timestamp : null;

                // TÃ¬m ngÃ y bÃ³c tÃ¡ch
                const bomLog = allLogs.find(l => l.event_type === 'bom_extracted');
                timeline.bom_date = bomLog ? bomLog.timestamp : proj.production_started_at;

                // TÃ¬m ngÃ y sáº£n xuáº¥t (Æ°u tiÃªn started, fallback ordered)
                const prodLog = allLogs.find(l => l.event_type === 'production_started') || allLogs.find(l => l.event_type === 'production_ordered');
                timeline.production_date = prodLog ? prodLog.timestamp : proj.production_started_at;

                // TÃ¬m ngÃ y láº¯p Ä‘áº·t (Æ°u tiÃªn started, fallback completed hoáº·c moved_to_installation)
                const installLog = allLogs.find(l => l.event_type === 'installation_started') || allLogs.find(l => l.event_type === 'installation_completed');
                timeline.installation_date = installLog ? installLog.timestamp : proj.moved_to_installation_at;

                // TÃ¬m ngÃ y bÃ n giao
                const handoverLog = allLogs.find(l => l.event_type === 'handover');
                timeline.handover_date = handoverLog ? handoverLog.timestamp : proj.handover_date;
            }
        } catch (e) {
            console.log('Error building timeline:', e.message);
        }

        // ===== BUILD TRACKING INFO =====
        let trackingInfo = null;
        try {
            const [projectDetail] = await db.query(`
                SELECT p.*, p.project_code, p.project_name, p.notes,
                       c.full_name as customer_name, a.name as branch_name,
                       p.manual_weight, p.created_at, p.deadline
                FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                LEFT JOIN agencies a ON c.agency_id = a.id
                WHERE p.id = ?
            `, [id]);

            if (projectDetail.length > 0) {
                const proj = projectDetail[0];

                // Láº¥y sáº£n pháº©m Ä‘áº·c trÆ°ng tá»« quotation_items
                let featuredProducts = '';
                try {
                    const [quotationItems] = await db.query(`
                        SELECT qi.item_name, qi.spec
                        FROM quotation_items qi
                        JOIN quotations q ON qi.quotation_id = q.id
                        WHERE q.project_id = ?
                        LIMIT 3
                    `, [id]);
                    featuredProducts = quotationItems.map(item => item.item_name || item.spec).filter(Boolean).join(', ');
                } catch (e) { }

                // Láº¥y khá»‘i lÆ°á»£ng tá»« order_material_status hoáº·c tÃ­nh toÃ¡n
                let weightKg = proj.manual_weight || 0;
                if (!weightKg) {
                    try {
                        const [weightResult] = await db.query(`
                            SELECT SUM(oms.quantity) as total_weight
                            FROM order_material_status oms
                            JOIN production_orders po ON oms.order_id = po.id
                            WHERE po.project_id = ?
                        `, [id]);
                        weightKg = weightResult[0]?.total_weight || 0;
                    } catch (e) { }
                }

                // Láº¥y tÃ¬nh tráº¡ng váº­t tÆ°
                let materialStatus = { nhom: 'ChÆ°a cÃ³', kinh: 'ChÆ°a cÃ³', phukien: 'ChÆ°a cÃ³', vattu: 'ChÆ°a cÃ³' };
                try {
                    const [matStatus] = await db.query(`
                        SELECT material_group, status
                        FROM order_material_status oms
                        JOIN production_orders po ON oms.order_id = po.id
                        WHERE po.project_id = ?
                    `, [id]);
                    matStatus.forEach(m => {
                        const group = m.material_group?.toLowerCase();
                        const statusText = m.status === 'exported' ? 'ÄÃ£ xuáº¥t' :
                            m.status === 'pending' ? 'Chá» xuáº¥t' :
                                m.status === 'partial' ? 'Xuáº¥t 1 pháº§n' : 'ChÆ°a cÃ³';
                        if (group === 'nhom' || group === 'aluminum') materialStatus.nhom = statusText;
                        else if (group === 'kinh' || group === 'glass') materialStatus.kinh = statusText;
                        else if (group === 'phukien' || group === 'accessory') materialStatus.phukien = statusText;
                        else if (group === 'vattu' || group === 'auxiliary') materialStatus.vattu = statusText;
                    });
                } catch (e) { }

                trackingInfo = {
                    project_code: proj.project_code,
                    project_name: proj.project_name,
                    featured_products: featuredProducts,
                    branch_customer: `${proj.branch_name || ''} - ${proj.customer_name || ''}`.trim().replace(/^- /, '').replace(/ -$/, ''),
                    weight_kg: parseFloat(weightKg) || 0,
                    production_unit: proj.branch_name || 'VIRALWINDOW',
                    created_at: proj.created_at,
                    delivery_plan: proj.deadline,
                    material_status: materialStatus,
                    material_delivery_date: null,
                    fix_compatible: '',
                    notes: proj.notes || ''
                };
            }
        } catch (e) {
            console.log('Error building trackingInfo:', e.message);
        }

        res.json({
            success: true,
            data: allLogs,
            timeline: timeline,
            trackingInfo: trackingInfo,
            count: allLogs.length
        });
    } catch (err) {
        console.error('Error getting project logs full:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server: " + err.message
        });
    }
};

/**
 * Helper function: Cáº­p nháº­t giÃ¡ trá»‹ cÃ´ng trÃ¬nh (total_value) 
 * GiÃ¡ trá»‹ = Tá»•ng giÃ¡ trá»‹ tá»« bÃ¡o giÃ¡ (quotation)
 */
exports.updateProjectTotalValue = async function (projectId) {
    try {
        let totalValue = 0;

        // Lấy quotation của project (nếu có) - ưu tiên báo giá mới nhất hoặc approved
        const [quotationRows] = await db.query(
            `SELECT id, total_amount, subtotal
             FROM quotations 
             WHERE project_id = ? 
             ORDER BY 
                CASE WHEN status IN ('approved', 'contract', 'signed', 'completed') THEN 0 ELSE 1 END,
                created_at DESC 
             LIMIT 1`,
            [projectId]
        );

        if (quotationRows.length > 0) {
            const quotation = quotationRows[0];

            // [Senior Architect] Ưu tiên lấy total_amount (giá trị cuối cùng sau chiết khấu/VAT)
            if (quotation.total_amount !== null && quotation.total_amount > 0) {
                totalValue = parseFloat(quotation.total_amount) || 0;
                console.log(`Project ${projectId} total value from quotation total_amount (Final): ${totalValue}`);
            } else {
                // Fallback: Tính tổng từ quotation_items nếu total_amount chưa có hoặc = 0
                const [quotationItems] = await db.query(
                    `SELECT SUM(total_price) as total 
                     FROM quotation_items 
                     WHERE quotation_id = ?`,
                    [quotation.id]
                );

                if (quotationItems[0] && quotationItems[0].total !== null && quotationItems[0].total > 0) {
                    totalValue = parseFloat(quotationItems[0].total) || 0;
                    console.log(`Project ${projectId} total value from quotation_items (Fallback): ${totalValue}`);
                } else if (quotation.subtotal && quotation.subtotal > 0) {
                    totalValue = parseFloat(quotation.subtotal) || 0;
                    console.log(`Project ${projectId} total value from quotation subtotal (Fallback): ${totalValue}`);
                }
            }
        }

        // Cập nhật total_value của project
        await db.query(
            `UPDATE projects 
             SET total_value = ? 
             WHERE id = ?`,
            [totalValue, projectId]
        );

        console.log(`Project ${projectId} total_value updated to: ${totalValue}`);

        return totalValue;
    } catch (err) {
        console.error('Error updating project total value:', err);
        throw err;
    }
}

/**
 * Tá»± Ä‘á»™ng import door_designs tá»« bÃ¡o giÃ¡ cá»§a dá»± Ã¡n
 * POST /api/projects/:id/auto-import-from-quotation
 * Khi chá»n dá»± Ã¡n, náº¿u chÆ°a cÃ³ door_designs, tá»± Ä‘á»™ng táº¡o tá»« quotation_items
 */
exports.autoImportFromQuotation = async (req, res) => {
    try {
        const projectId = req.params.id;

        // 1. Kiá»ƒm tra xem project Ä‘Ã£ cÃ³ door_designs chÆ°a
        const [existingDesigns] = await db.query(
            `SELECT COUNT(*) as count FROM door_designs WHERE project_id = ?`,
            [projectId]
        );

        if (existingDesigns[0].count > 0) {
            // ÄÃ£ cÃ³ door_designs, khÃ´ng cáº§n import
            return res.json({
                success: true,
                message: `Dá»± Ã¡n Ä‘Ã£ cÃ³ ${existingDesigns[0].count} háº¡ng má»¥c thiáº¿t káº¿`,
                data: {
                    already_imported: true,
                    count: existingDesigns[0].count
                }
            });
        }

        // 2. Láº¥y bÃ¡o giÃ¡ cá»§a dá»± Ã¡n (Æ°u tiÃªn bÃ¡o giÃ¡ approved, sau Ä‘Ã³ má»›i nháº¥t)
        const [quotations] = await db.query(
            `SELECT id, quotation_code, status, total_amount, created_at
             FROM quotations 
             WHERE project_id = ? 
             ORDER BY 
                CASE WHEN status = 'approved' THEN 0 ELSE 1 END,
                created_at DESC 
             LIMIT 1`,
            [projectId]
        );

        if (quotations.length === 0) {
            return res.json({
                success: true,
                message: "Dá»± Ã¡n chÆ°a cÃ³ bÃ¡o giÃ¡. Vui lÃ²ng táº¡o bÃ¡o giÃ¡ trÆ°á»›c.",
                data: { no_quotation: true }
            });
        }

        const quotation = quotations[0];

        // 3. Láº¥y quotation_items
        const [quotationItems] = await db.query(
            `SELECT * FROM quotation_items WHERE quotation_id = ?`,
            [quotation.id]
        );

        if (quotationItems.length === 0) {
            return res.json({
                success: true,
                message: "BÃ¡o giÃ¡ khÃ´ng cÃ³ sáº£n pháº©m nÃ o",
                data: { no_items: true }
            });
        }

        // 4. Láº¥y project_code
        const [projectRows] = await db.query(
            `SELECT project_code FROM projects WHERE id = ?`,
            [projectId]
        );
        const projectCode = projectRows[0]?.project_code || `CT2025-${projectId}`;

        // 5. Táº¡o door_designs tá»« quotation_items
        let createdCount = 0;

        for (const item of quotationItems) {
            // Parse kÃ­ch thÆ°á»›c tá»« item_name (vÃ­ dá»¥: "Cá»­a Ä‘i 1 cÃ¡nh má»Ÿ ngoÃ i (1200Ã—2200mm)")
            const sizeMatch = item.item_name.match(/\((\d+)[Ã—x](\d+)mm?\)/i);
            let width = 1200, height = 2200;
            if (sizeMatch) {
                width = parseInt(sizeMatch[1]) || 1200;
                height = parseInt(sizeMatch[2]) || 2200;
            }

            // XÃ¡c Ä‘á»‹nh loáº¡i cá»­a tá»« tÃªn
            let doorType = 'swing';
            const itemNameLower = item.item_name.toLowerCase();
            if (itemNameLower.includes('trÆ°á»£t') || itemNameLower.includes('lÃ¹a')) {
                doorType = 'sliding';
            } else if (itemNameLower.includes('fix') || itemNameLower.includes('cá»‘ Ä‘á»‹nh')) {
                doorType = 'fixed';
            } else if (itemNameLower.includes('xáº¿p')) {
                doorType = 'folding';
            }

            // XÃ¡c Ä‘á»‹nh template_code tá»« tÃªn
            let templateCode = 'door_swing';
            if (itemNameLower.includes('sá»•') || itemNameLower.includes('cá»­a sá»•')) {
                templateCode = itemNameLower.includes('lÃ¹a') ? 'window_sliding' : 'window_swing';
            } else if (itemNameLower.includes('lÃ¹a') || itemNameLower.includes('trÆ°á»£t')) {
                templateCode = 'door_sliding';
            } else if (itemNameLower.includes('vÃ¡ch') || itemNameLower.includes('kÃ­nh')) {
                templateCode = 'glass_wall';
            } else if (itemNameLower.includes('cáº§u thang') || itemNameLower.includes('tay vá»‹n') || itemNameLower.includes('lan can')) {
                templateCode = 'railing';
            }

            // Táº¡o sá»‘ lÆ°á»£ng door_designs theo quantity trong bÃ¡o giÃ¡
            const quantity = parseInt(item.quantity) || 1;
            for (let q = 0; q < quantity; q++) {
                const designIndex = createdCount + 1;
                const designCode = `${projectCode}-C${String(designIndex).padStart(3, '0')}`;

                await db.query(`
                    INSERT INTO door_designs 
                    (project_id, design_code, door_type, aluminum_system_id, 
                     width_mm, height_mm, number_of_panels, template_code)
                    VALUES (?, ?, ?, 1, ?, ?, 1, ?)
                `, [
                    projectId,
                    designCode,
                    doorType,
                    width,
                    height,
                    templateCode
                ]);

                createdCount++;
            }
        }

        console.log(`âœ… Auto-imported ${createdCount} door_designs tá»« bÃ¡o giÃ¡ ${quotation.quotation_code} cho project ${projectId}`);

        res.json({
            success: true,
            message: `ÄÃ£ tá»± Ä‘á»™ng import ${createdCount} háº¡ng má»¥c tá»« bÃ¡o giÃ¡ ${quotation.quotation_code || 'BG-' + quotation.id}`,
            data: {
                quotation_id: quotation.id,
                quotation_code: quotation.quotation_code,
                items_created: createdCount
            }
        });

    } catch (err) {
        console.error('Error auto-importing from quotation:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi import tá»« bÃ¡o giÃ¡: " + err.message
        });
    }
};

/**
 * Import door_designs tá»« má»™t bÃ¡o giÃ¡ cá»¥ thá»ƒ (do user chá»n)
 * POST /api/projects/:id/doors/from-quotation
 * Body: { quotation_id: number }
 */
exports.importDoorsFromQuotation = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { quotation_id } = req.body;

        if (!quotation_id) {
            return res.status(400).json({
                success: false,
                message: "Vui lÃ²ng cung cáº¥p quotation_id"
            });
        }

        // 1. Kiá»ƒm tra bÃ¡o giÃ¡ tá»“n táº¡i
        const [quotations] = await db.query(
            `SELECT id, quotation_code, project_id, status FROM quotations WHERE id = ?`,
            [quotation_id]
        );

        if (quotations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y bÃ¡o giÃ¡"
            });
        }

        const quotation = quotations[0];

        // Kiá»ƒm tra quotation thuá»™c project nÃ y (náº¿u cÃ³ project_id)
        if (quotation.project_id && quotation.project_id != projectId) {
            return res.status(400).json({
                success: false,
                message: "BÃ¡o giÃ¡ nÃ y khÃ´ng thuá»™c dá»± Ã¡n nÃ y"
            });
        }

        // 2. Láº¥y quotation_items
        const [quotationItems] = await db.query(
            `SELECT * FROM quotation_items WHERE quotation_id = ?`,
            [quotation_id]
        );

        if (quotationItems.length === 0) {
            return res.json({
                success: true,
                message: "BÃ¡o giÃ¡ khÃ´ng cÃ³ sáº£n pháº©m nÃ o",
                data: { items_created: 0 }
            });
        }

        // 3. Äáº¿m door_designs hiá»‡n cÃ³ Ä‘á»ƒ táº¡o design_code
        const [existingDesigns] = await db.query(
            `SELECT COUNT(*) as count FROM door_designs WHERE project_id = ?`,
            [projectId]
        );
        let existingCount = existingDesigns[0].count || 0;

        // 4. Láº¥y project_code
        const [projectRows] = await db.query(
            `SELECT project_code FROM projects WHERE id = ?`,
            [projectId]
        );
        const projectCode = projectRows[0]?.project_code || `CT2025-${projectId}`;

        // 5. Táº¡o door_designs tá»« quotation_items
        let createdCount = 0;

        for (const item of quotationItems) {
            // Parse kÃ­ch thÆ°á»›c tá»« item_name (vÃ­ dá»¥: "Cá»­a Ä‘i 1 cÃ¡nh má»Ÿ ngoÃ i (1200Ã—2200mm)")
            const sizeMatch = item.item_name.match(/\((\d+)[Ã—x](\d+)mm?\)/i);
            let width = 1200, height = 2200;
            if (sizeMatch) {
                width = parseInt(sizeMatch[1]) || 1200;
                height = parseInt(sizeMatch[2]) || 2200;
            }

            // XÃ¡c Ä‘á»‹nh loáº¡i cá»­a tá»« tÃªn
            let doorType = 'swing';
            const itemNameLower = item.item_name.toLowerCase();
            if (itemNameLower.includes('trÆ°á»£t') || itemNameLower.includes('lÃ¹a')) {
                doorType = 'sliding';
            } else if (itemNameLower.includes('fix') || itemNameLower.includes('cá»‘ Ä‘á»‹nh')) {
                doorType = 'fixed';
            } else if (itemNameLower.includes('xáº¿p')) {
                doorType = 'folding';
            }

            // XÃ¡c Ä‘á»‹nh template_code tá»« tÃªn
            let templateCode = 'door_swing';
            if (itemNameLower.includes('sá»•') || itemNameLower.includes('cá»­a sá»•')) {
                templateCode = itemNameLower.includes('lÃ¹a') ? 'window_sliding' : 'window_swing';
            } else if (itemNameLower.includes('lÃ¹a') || itemNameLower.includes('trÆ°á»£t')) {
                templateCode = 'door_sliding';
            } else if (itemNameLower.includes('vÃ¡ch') || itemNameLower.includes('kÃ­nh')) {
                templateCode = 'glass_wall';
            } else if (itemNameLower.includes('cáº§u thang') || itemNameLower.includes('tay vá»‹n') || itemNameLower.includes('lan can')) {
                templateCode = 'railing';
            }

            // Táº¡o sá»‘ lÆ°á»£ng door_designs theo quantity trong bÃ¡o giÃ¡
            const quantity = parseInt(item.quantity) || 1;
            for (let q = 0; q < quantity; q++) {
                existingCount++;
                const designCode = `${projectCode}-C${String(existingCount).padStart(3, '0')}`;

                await db.query(`
                    INSERT INTO door_designs 
                    (project_id, design_code, door_type, aluminum_system_id, 
                     width_mm, height_mm, number_of_panels, template_code)
                    VALUES (?, ?, ?, 1, ?, ?, 1, ?)
                `, [
                    projectId,
                    designCode,
                    doorType,
                    width,
                    height,
                    templateCode
                ]);

                createdCount++;
            }
        }

        console.log(`âœ… Imported ${createdCount} door_designs tá»« bÃ¡o giÃ¡ ${quotation.quotation_code} cho project ${projectId}`);

        res.json({
            success: true,
            message: `ÄÃ£ import ${createdCount} háº¡ng má»¥c tá»« bÃ¡o giÃ¡`,
            data: {
                quotation_id: quotation_id,
                quotation_code: quotation.quotation_code,
                items_created: createdCount
            }
        });

    } catch (err) {
        console.error('Error importing doors from quotation:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi import tá»« bÃ¡o giÃ¡: " + err.message
        });
    }
};

/**
 * Láº¥y danh sÃ¡ch sáº£n pháº©m tá»« bÃ¡o giÃ¡ Ä‘á»ƒ hiá»ƒn thá»‹ á»Ÿ BÆ°á»›c 2
 * GET /api/projects/:id/quotation-items-for-design
 * Tráº£ vá»: quotation_items + tráº¡ng thÃ¡i thiáº¿t káº¿ (chÆ°a TK / Ä‘Ã£ TK / Ä‘Ã£ bÃ³c tÃ¡ch)
 */
exports.getQuotationItemsForDesign = async (req, res) => {
    try {
        const projectId = req.params.id;

        // 1. Láº¥y bÃ¡o giÃ¡ Ä‘Ã£ approved cá»§a project (hoáº·c má»›i nháº¥t)
        const [quotations] = await db.query(
            `SELECT id, quotation_code, status, total_amount, created_at
             FROM quotations 
             WHERE project_id = ? 
             ORDER BY 
                CASE WHEN status = 'approved' THEN 0 ELSE 1 END,
                created_at DESC 
             LIMIT 1`,
            [projectId]
        );

        if (quotations.length === 0) {
            return res.json({
                success: true,
                message: "Dá»± Ã¡n chÆ°a cÃ³ bÃ¡o giÃ¡",
                data: { items: [], quotation: null }
            });
        }

        const quotation = quotations[0];

        // 2. Láº¥y quotation_items - columns thá»±c táº¿ trong DB
        // LÆ¯U Ã: Äá»c Ä‘Ãºng cÃ¡c cá»™t color, aluminum_system, location tá»« DB
        const [quotationItems] = await db.query(
            `SELECT 
                qi.id,
                qi.id as quotation_item_id,
                qi.quotation_id,
                qi.item_name,
                qi.code as product_code,
                qi.quantity,
                qi.unit,
                qi.unit_price,
                qi.total_price,
                qi.item_type,
                qi.color,
                qi.glass as glass_type,
                qi.accessories,
                qi.aluminum_system,
                qi.width,
                qi.height,
                qi.area,
                qi.location,
                '' as notes
             FROM quotation_items qi
             WHERE qi.quotation_id = ?
             ORDER BY qi.id`,
            [quotation.id]
        );

        // 3. Láº¥y project_items Ä‘Ã£ táº¡o tá»« quotation_items nÃ y
        const [projectItems] = await db.query(
            `SELECT 
                id, 
                source_quotation_item_id, 
                status
             FROM project_items 
             WHERE project_id = ? AND source_quotation_id = ?`,
            [projectId, quotation.id]
        );

        // Map Ä‘á»ƒ tra cá»©u nhanh
        const projectItemMap = {};
        projectItems.forEach(pi => {
            projectItemMap[pi.source_quotation_item_id] = pi;
        });

        // 4. Gáº¯n thÃªm thÃ´ng tin thiáº¿t káº¿ vÃ o quotation_items
        const itemsWithDesignStatus = quotationItems.map(qi => {
            const pi = projectItemMap[qi.id];

            // Parse kÃ­ch thÆ°á»›c tá»« item_name náº¿u khÃ´ng cÃ³ trong columns
            let width = qi.width;
            let height = qi.height;
            if (!width || !height) {
                const sizeMatch = (qi.item_name || '').match(/\((\d+)[Ã—x](\d+)mm?\)/i);
                if (sizeMatch) {
                    width = parseInt(sizeMatch[1]);
                    height = parseInt(sizeMatch[2]);
                }
            }

            // XÃ¡c Ä‘á»‹nh loáº¡i sáº£n pháº©m
            let productType = 'door';
            const nameLower = (qi.item_name || '').toLowerCase();
            if (nameLower.includes('vÃ¡ch') || nameLower.includes('kÃ­nh cá»‘ Ä‘á»‹nh')) {
                productType = 'glass_wall';
            } else if (nameLower.includes('lan can') || nameLower.includes('cáº§u thang') || nameLower.includes('tay vá»‹n')) {
                productType = 'railing';
            } else if (nameLower.includes('cá»­a sá»•') || nameLower.includes('sá»•')) {
                productType = 'window';
            } else if (nameLower.includes('mÃ¡i') || nameLower.includes('giáº¿ng trá»i')) {
                productType = 'roof';
            }

            return {
                ...qi,
                width: width,
                height: height,
                color: qi.spec || null,
                glass_type: qi.glass || null,
                aluminum_system: qi.accessories || null,
                product_type: productType,
                project_item_id: pi ? pi.id : null,
                design_status: pi ? pi.status : 'NOT_STARTED',
                design_status_label: pi
                    ? (pi.status === 'DESIGNING' ? 'Äang thiáº¿t káº¿'
                        : pi.status === 'DESIGN_CONFIRMED' ? 'ÄÃ£ thiáº¿t káº¿'
                            : pi.status === 'BOM_EXTRACTED' ? 'ÄÃ£ bÃ³c tÃ¡ch'
                                : pi.status)
                    : 'ChÆ°a thiáº¿t káº¿'
            };
        });

        res.json({
            success: true,
            data: {
                quotation: {
                    id: quotation.id,
                    code: quotation.quotation_code,
                    status: quotation.status,
                    total_amount: quotation.total_amount
                },
                items: itemsWithDesignStatus,
                summary: {
                    total_items: itemsWithDesignStatus.length,
                    total_quantity: itemsWithDesignStatus.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0),
                    not_started: itemsWithDesignStatus.filter(i => i.design_status === 'NOT_STARTED').length,
                    designing: itemsWithDesignStatus.filter(i => i.design_status === 'DESIGNING').length,
                    confirmed: itemsWithDesignStatus.filter(i => i.design_status === 'DESIGN_CONFIRMED').length,
                    bom_extracted: itemsWithDesignStatus.filter(i => i.design_status === 'BOM_EXTRACTED').length
                }
            }
        });

    } catch (err) {
        console.error('Error getting quotation items for design:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i: " + err.message
        });
    }
};

/**
 * Táº¡o project_item + snapshot tá»« quotation_item khi user click vÃ o card
 * POST /api/projects/:id/design-items
 * Body: { quotation_item_id: number }
 */
exports.createDesignItemFromQuotation = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { quotation_item_id } = req.body;

        if (!quotation_item_id) {
            return res.status(400).json({
                success: false,
                message: "Vui lÃ²ng cung cáº¥p quotation_item_id"
            });
        }

        // 1. Kiá»ƒm tra Ä‘Ã£ cÃ³ project_item chÆ°a
        const [existing] = await db.query(
            `SELECT id, status FROM project_items 
             WHERE project_id = ? AND source_quotation_item_id = ?`,
            [projectId, quotation_item_id]
        );

        if (existing.length > 0) {
            // ÄÃ£ cÃ³, tráº£ vá» project_item_id hiá»‡n táº¡i
            return res.json({
                success: true,
                message: "Háº¡ng má»¥c Ä‘Ã£ Ä‘Æ°á»£c khá»Ÿi táº¡o trÆ°á»›c Ä‘Ã³",
                data: {
                    project_item_id: existing[0].id,
                    status: existing[0].status,
                    already_exists: true
                }
            });
        }

        // 2. Láº¥y thÃ´ng tin quotation_item
        const [qItems] = await db.query(
            `SELECT qi.*, q.id as quotation_id, q.created_at as quotation_date
             FROM quotation_items qi
             JOIN quotations q ON qi.quotation_id = q.id
             WHERE qi.id = ?`,
            [quotation_item_id]
        );

        if (qItems.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m trong bÃ¡o giÃ¡"
            });
        }

        const qItem = qItems[0];

        // 3. Parse kÃ­ch thÆ°á»›c tá»« item_name
        const sizeMatch = qItem.item_name.match(/\((\d+)[Ã—x](\d+)mm?\)/i);
        let width = 1200, height = 2200;
        if (sizeMatch) {
            width = parseInt(sizeMatch[1]) || 1200;
            height = parseInt(sizeMatch[2]) || 2200;
        }

        // 4. Táº¡o snapshot_config (Ä‘Ã³ng bÄƒng dá»¯ liá»‡u tá»« bÃ¡o giÃ¡)
        const snapshotConfig = {
            source: 'quotation',
            quotation_date: qItem.quotation_date,
            original_item_name: qItem.item_name,
            original_description: qItem.description,
            original_unit_price: qItem.unit_price,
            original_total_price: qItem.total_price,
            original_quantity: qItem.quantity,
            size: {
                w: width,
                h: height,
                unit: 'mm'
            },
            open_direction: 'left',
            open_style: 'swing',
            leaf_count: 1,
            aluminum_system: 'XINGFA_55',
            glass: {
                type: 'tempered',
                thickness_mm: 8
            },
            color: 'white',
            notes: qItem.description || ''
        };

        // 5. TÃ¬m product_template phÃ¹ há»£p hoáº·c dÃ¹ng máº·c Ä‘á»‹nh
        let productTemplateId = 1; // Default template ID
        try {
            // Thá»­ tÃ¬m template phÃ¹ há»£p dá»±a trÃªn tÃªn sáº£n pháº©m
            const itemNameLower = qItem.item_name.toLowerCase();
            let productType = 'door_swing'; // Default

            if (itemNameLower.includes('cá»­a sá»•') || itemNameLower.includes('cua so')) {
                productType = 'window';
            } else if (itemNameLower.includes('lÃ¹a') || itemNameLower.includes('lua') || itemNameLower.includes('trÆ°á»£t')) {
                productType = 'door_sliding';
            }

            const [templates] = await db.query(
                `SELECT id FROM product_templates WHERE product_type = ? AND is_active = 1 LIMIT 1`,
                [productType]
            );

            if (templates.length > 0) {
                productTemplateId = templates[0].id;
            }
        } catch (err) {
            console.log('Using default product_template_id:', productTemplateId);
        }

        // 6. Táº¡o project_item
        const [result] = await db.query(`
            INSERT INTO project_items 
            (project_id, product_template_id, quantity, snapshot_config, 
             source_quotation_id, source_quotation_item_id, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, 'DESIGNING', ?)
        `, [
            projectId,
            productTemplateId,
            qItem.quantity || 1,
            JSON.stringify(snapshotConfig),
            qItem.quotation_id,
            quotation_item_id,
            qItem.description || qItem.item_name
        ]);

        console.log(`âœ… Created project_item ${result.insertId} from quotation_item ${quotation_item_id}`);

        res.status(201).json({
            success: true,
            message: "ÄÃ£ khá»Ÿi táº¡o háº¡ng má»¥c thiáº¿t káº¿",
            data: {
                project_item_id: result.insertId,
                status: 'DESIGNING',
                snapshot_config: snapshotConfig
            }
        });

    } catch (err) {
        console.error('Error creating design item:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i: " + err.message
        });
    }
};

/**
 * =====================================================
 * GET /api/projects/:projectId/items/:itemId/bom-detail
 * Láº¥y chi tiáº¿t BOM cho Modal chi tiáº¿t sáº£n pháº©m (6 tabs)
 * =====================================================
 */
exports.getProjectItemBOMDetail = async (req, res) => {
    try {
        const { projectId, itemId } = req.params;

        // 1. Láº¥y thÃ´ng tin project_item vÃ  snapshot_config
        const [itemRows] = await db.query(`
            SELECT 
                pi.*,
                pt.code AS template_code,
                pt.name AS template_name,
                pt.product_type,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name
            FROM project_items pi
            LEFT JOIN product_templates pt ON pi.product_template_id = pt.id
            LEFT JOIN projects p ON pi.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE pi.id = ? AND pi.project_id = ?
        `, [itemId, projectId]);

        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y háº¡ng má»¥c"
            });
        }

        const item = itemRows[0];
        let snapshotConfig = {};
        try {
            snapshotConfig = typeof item.snapshot_config === 'string'
                ? JSON.parse(item.snapshot_config)
                : (item.snapshot_config || {});
        } catch (e) {
            snapshotConfig = {};
        }

        // Láº¥y kÃ­ch thÆ°á»›c tá»« snapshot
        const width = snapshotConfig.size?.w || 1200;
        const height = snapshotConfig.size?.h || 2200;
        const leafCount = snapshotConfig.leaf_count || 1;
        const quantity = item.quantity || 1;


        // 2. Láº¥y BOM Profiles tá»« atc_product_bom_profiles
        const [bomProfiles] = await db.query(`
            SELECT 
                pbp.*,
                ap.code AS profile_code,
                ap.name AS profile_name,
                ap.price_per_m,
                ap.role AS profile_role
            FROM atc_product_bom_profiles pbp
            JOIN atc_aluminum_profiles ap ON pbp.profile_id = ap.id
            WHERE pbp.product_template_id = ?
            ORDER BY pbp.sort_order
        `, [item.product_template_id]);

        // 3. TÃ­nh KT Cáº¯t (NhÃ´m) dá»±a trÃªn formulas
        const aluminumCuts = [];
        let totalAluminumLength = 0;
        let totalAluminumWeight = 0;

        for (const bom of bomProfiles) {
            // Parse formula: H, W, W/2, H-50, etc.
            let cutLength = 0;
            const formula = bom.formula || 'H';

            if (formula === 'H') cutLength = height;
            else if (formula === 'W') cutLength = width;
            else if (formula === 'W/2') cutLength = Math.round(width / 2);
            else if (formula === 'H-50') cutLength = height - 50;
            else if (formula === 'W-50') cutLength = width - 50;
            else if (formula === 'H-100') cutLength = height - 100;
            else if (formula === 'W-100') cutLength = width - 100;
            else {
                // Thá»­ parse formula phá»©c táº¡p hÆ¡n
                try {
                    cutLength = eval(formula.replace(/H/g, height).replace(/W/g, width));
                } catch (e) {
                    cutLength = height;
                }
            }

            const qty = bom.quantity || 1;
            const wasteFactor = 1 + (bom.waste_percent || 2) / 100;
            const finalLength = Math.round(cutLength * wasteFactor);
            const lengthM = finalLength / 1000;
            const weightKg = lengthM * (bom.weight_per_m || 0.5) * qty;

            totalAluminumLength += lengthM * qty;
            totalAluminumWeight += weightKg;

            // XÃ¡c Ä‘á»‹nh vá»‹ trÃ­ vÃ  gÃ³c cáº¯t
            let position = 'Ngang';
            let cutAngle = '90-90';
            if (bom.profile_role?.includes('dung') || formula === 'H' || formula.includes('H-')) {
                position = 'Äá»©ng';
                cutAngle = '90-45-90';
            } else if (formula === 'W' || formula.includes('W')) {
                position = 'Ngang';
                cutAngle = '45-45';
            }

            aluminumCuts.push({
                name: bom.profile_name || 'Thanh nhÃ´m',
                position: position,
                code: bom.profile_code || 'AL',
                cut_angle: cutAngle,
                qty: qty,
                length: finalLength,
                weight_kg: parseFloat(weightKg.toFixed(3)),
                price_per_m: bom.price_per_m || 0
            });
        }

        // Náº¿u khÃ´ng cÃ³ BOM profiles, táº¡o máº·c Ä‘á»‹nh
        if (aluminumCuts.length === 0) {
            aluminumCuts.push(
                { name: 'Khung bao Ä‘á»©ng', position: 'Äá»©ng', code: 'XF55_KB', cut_angle: '90-45-90', qty: 2, length: height, weight_kg: (height / 1000) * 0.5 * 2, price_per_m: 45000 },
                { name: 'Khung bao ngang', position: 'Ngang', code: 'XF55_KB', cut_angle: '45-45', qty: 2, length: width, weight_kg: (width / 1000) * 0.5 * 2, price_per_m: 45000 },
                { name: 'CÃ¡nh Ä‘á»©ng', position: 'Äá»©ng', code: 'XF55_CD', cut_angle: '45-45', qty: 2 * leafCount, length: height - 100, weight_kg: ((height - 100) / 1000) * 0.5 * 2 * leafCount, price_per_m: 50000 },
                { name: 'CÃ¡nh ngang', position: 'Ngang', code: 'XF55_CD', cut_angle: '45-45', qty: 2 * leafCount, length: Math.round((width - 50) / leafCount), weight_kg: (((width - 50) / leafCount) / 1000) * 0.5 * 2 * leafCount, price_per_m: 50000 }
            );
            totalAluminumWeight = aluminumCuts.reduce((sum, a) => sum + a.weight_kg, 0);
        }

        // 4. TÃ­nh KT KÃ­nh
        const glassWidth = Math.round((width - 100) / leafCount);
        const glassHeight1 = Math.round(height * 0.5);
        const glassHeight2 = Math.round(height * 0.35);
        const glassHeight3 = 328;

        const glassPanels = [
            { name: snapshotConfig.glass?.type || 'KÃ­nh cÆ°á»ng lá»±c 8mm', width: glassWidth, height: glassHeight1, qty: 2 * leafCount, position: 'CÃ¡nh trÃªn' },
            { name: snapshotConfig.glass?.type || 'KÃ­nh cÆ°á»ng lá»±c 8mm', width: glassWidth, height: glassHeight2, qty: 2 * leafCount, position: 'CÃ¡nh dÆ°á»›i' }
        ];

        if (height > 2500) {
            glassPanels.push({ name: snapshotConfig.glass?.type || 'KÃ­nh cÆ°á»ng lá»±c 8mm', width: width - 100, height: glassHeight3, qty: 2, position: 'VÃ¡ch' });
        }

        let totalGlassArea = 0;
        glassPanels.forEach(g => {
            g.area = parseFloat(((g.width * g.height * g.qty) / 1000000).toFixed(6));
            totalGlassArea += g.area;
        });

        // 5. Láº¥y Phá»¥ kiá»‡n tá»« atc_product_accessory_rules
        const productType = item.product_type || 'door';
        const [accessoryRules] = await db.query(`
            SELECT 
                par.*,
                a.code AS accessory_code,
                a.name AS accessory_name,
                a.unit
            FROM atc_product_accessory_rules par
            JOIN accessories a ON par.accessory_id = a.id
            WHERE par.product_type = ? OR par.product_type = 'all'
        `, [productType]);

        const hardware = [];
        let totalHardwareCost = 0;

        for (const rule of accessoryRules) {
            let qty = rule.default_qty || 1;

            // Parse quantity_rule
            if (rule.quantity_rule === '3_per_leaf') qty = 3 * leafCount;
            else if (rule.quantity_rule === '2_per_leaf') qty = 2 * leafCount;
            else if (rule.quantity_rule === '1_per_leaf') qty = leafCount;
            else if (rule.quantity_rule === '1_per_door') qty = 1;
            else if (rule.quantity_rule?.includes('per_meter')) {
                const perimeter = 2 * (width + height) / 1000;
                qty = Math.ceil(perimeter);
            }

            const price = rule.unit_price || 0;
            const total = price * qty;
            totalHardwareCost += total;

            hardware.push({
                name: rule.accessory_name,
                code: rule.accessory_code,
                unit: rule.unit || 'CÃ¡i',
                qty: qty,
                price: price,
                total: total
            });
        }

        // Náº¿u khÃ´ng cÃ³ rules, dÃ¹ng máº·c Ä‘á»‹nh
        if (hardware.length === 0) {
            hardware.push(
                { name: 'Báº£n lá» 3D', code: 'BANLE3D', unit: 'Bá»™', qty: 3 * leafCount, price: 150000, total: 150000 * 3 * leafCount },
                { name: 'KhÃ³a Ä‘a Ä‘iá»ƒm', code: 'KHOA_DD', unit: 'Bá»™', qty: 1, price: 850000, total: 850000 },
                { name: 'Tay náº¯m cá»­a', code: 'TAY_NAM', unit: 'CÃ¡i', qty: leafCount, price: 250000, total: 250000 * leafCount }
            );
            totalHardwareCost = hardware.reduce((sum, h) => sum + h.total, 0);
        }

        // 6. GioÄƒng, Keo (consumables)
        const perimeter = 2 * (width + height) / 1000;
        const consumables = [
            { name: 'GioÄƒng kÃ­nh máº·t trong', code: 'GKMT', unit: 'm', qty: parseFloat((perimeter * 2).toFixed(2)), price: 5000 },
            { name: 'Keo kÃ­nh máº·t ngoÃ i', code: 'KKMN', unit: 'm', qty: parseFloat((perimeter * 2).toFixed(2)), price: 8000 },
            { name: 'Keo tÆ°á»ng - 2 máº·t', code: 'KT2M', unit: 'm', qty: parseFloat(perimeter.toFixed(2)), price: 12000 },
            { name: 'GioÄƒng khung - cÃ¡nh', code: 'GKK', unit: 'm', qty: parseFloat((perimeter * 1.5).toFixed(2)), price: 6000 },
            { name: 'VÃ­t ná»Ÿ láº¯p Ä‘áº·t', code: 'VNLD', unit: 'CÃ¡i', qty: Math.ceil(perimeter * 2), price: 2000 }
        ];
        const totalConsumablesCost = consumables.reduce((sum, c) => sum + c.qty * c.price, 0);


        // 7. Láº¥y giÃ¡ tá»« database (náº¿u cÃ³)
        let aluminumPricePerKg = 90000;
        let glassPricePerM2 = 245000;

        try {
            const [priceSettings] = await db.query(`
                SELECT * FROM price_settings WHERE is_active = 1 LIMIT 1
            `);
            if (priceSettings && priceSettings.length > 0) {
                aluminumPricePerKg = priceSettings[0].aluminum_price_per_kg || 90000;
                glassPricePerM2 = priceSettings[0].glass_price_per_m2 || 245000;
            }
        } catch (e) {
            // Báº£ng price_settings khÃ´ng tá»“n táº¡i, dÃ¹ng giÃ¡ máº·c Ä‘á»‹nh
            console.log('Using default prices (price_settings table not found)');
        }

        // 8. TÃ­nh giÃ¡ thÃ nh
        const costAluminum = Math.round(totalAluminumWeight * aluminumPricePerKg);
        const costGlass = Math.round(totalGlassArea * glassPricePerM2);
        const totalCost = costAluminum + costGlass + totalHardwareCost + totalConsumablesCost;

        // 9. Tráº£ vá» response
        res.json({
            success: true,
            data: {
                // ThÃ´ng tin chung
                item_id: item.id,
                item_name: snapshotConfig.original_item_name || item.notes || item.template_name || 'Sáº£n pháº©m',
                project_name: item.project_name,
                customer_name: item.customer_name,
                door_code: `D${item.id}`,

                // Tab 1: KÃ­ch thÆ°á»›c
                dimensions: {
                    width: width,
                    height: height,
                    h1: snapshotConfig.h1 || Math.round(height * 0.85),
                    gap_sash: snapshotConfig.gap_sash || 7,
                    glass_type: snapshotConfig.glass?.type || 'KÃ­nh cÆ°á»ng lá»±c 8mm',
                    glass_thickness: snapshotConfig.glass?.thickness_mm || 8,
                    quantity: quantity,
                    leaf_count: leafCount,
                    aluminum_system: snapshotConfig.aluminum_system || 'XINGFA_55',
                    aluminum_price_per_kg: aluminumPricePerKg,
                    glass_price_per_m2: glassPricePerM2
                },

                // Tab 2: KT Cáº¯t (NhÃ´m)
                aluminum: aluminumCuts,

                // Tab 3: KT KÃ­nh
                glass: {
                    panels: glassPanels,
                    total_area_m2: parseFloat(totalGlassArea.toFixed(3))
                },

                // Tab 4: Phá»¥ kiá»‡n
                hardware: hardware,

                // Tab 5: GioÄƒng, Keo
                consumables: consumables,

                // Tab 6: GiÃ¡ thÃ nh
                cost: {
                    aluminum_kg: parseFloat(totalAluminumWeight.toFixed(2)),
                    aluminum_cost: costAluminum,
                    glass_m2: parseFloat(totalGlassArea.toFixed(2)),
                    glass_cost: costGlass,
                    hardware_count: hardware.reduce((sum, h) => sum + h.qty, 0),
                    hardware_cost: totalHardwareCost,
                    consumables_cost: totalConsumablesCost,
                    total_cost: totalCost,
                    cost_per_unit: Math.round(totalCost / quantity)
                }
            }
        });

    } catch (err) {
        console.error('Error getting BOM detail:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i: " + err.message
        });
    }
};

// ========== OPERATION STATUS MANAGEMENT ==========

// GET operation status for a project
exports.getOperationStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT id, project_code, project_name, operation_status, operation_notes, operation_updated_at
             FROM projects WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n" });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lá»—i server" });
    }
};

// UPDATE operation status
exports.updateOperationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { operation_status, operation_notes } = req.body;

        // Validate operation_status (1-4)
        if (!operation_status || ![1, 2, 3, 4].includes(parseInt(operation_status))) {
            return res.status(400).json({
                success: false,
                message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡ (1-4)"
            });
        }

        // Get current status
        const [current] = await db.query(
            "SELECT operation_status, operation_notes FROM projects WHERE id = ?",
            [id]
        );

        if (current.length === 0) {
            return res.status(404).json({ success: false, message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n" });
        }

        // Update
        await db.query(
            `UPDATE projects 
             SET operation_status = ?, operation_notes = ?, operation_updated_at = NOW()
             WHERE id = ?`,
            [parseInt(operation_status), operation_notes || null, id]
        );

        // Log activity
        try {
            await db.query(
                `INSERT INTO project_activity_logs (project_id, action_type, old_value, new_value, description, user_name)
                 VALUES (?, 'operation_status_change', ?, ?, ?, ?)`,
                [
                    id,
                    current[0].operation_status?.toString() || 'null',
                    operation_status.toString(),
                    `Thay Ä‘á»•i tráº¡ng thÃ¡i Ä‘iá»u hÃ nh: ${getOpStatusLabel(current[0].operation_status)} â†’ ${getOpStatusLabel(operation_status)}`,
                    req.user?.name || 'System'
                ]
            );
        } catch (logErr) {
            console.log('Could not log activity:', logErr.message);
        }

        res.json({ success: true, message: "Cáº­p nháº­t tráº¡ng thÃ¡i thÃ nh cÃ´ng" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lá»—i server" });
    }
};

function getOpStatusLabel(status) {
    const labels = { 1: 'Äang SX', 2: 'ÄÃ£ giao', 3: 'VÆ°á»›ng máº¯c', 4: 'Thay Ä‘á»•i TK' };
    return labels[status] || 'N/A';
}

// ========== MATERIAL STATUS MANAGEMENT ==========

// GET material status for a project
exports.getMaterialStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Check project exists
        const [project] = await db.query("SELECT id FROM projects WHERE id = ?", [id]);
        if (project.length === 0) {
            return res.status(404).json({ success: false, message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n" });
        }

        const [materials] = await db.query(
            `SELECT * FROM project_material_status WHERE project_id = ? ORDER BY material_type`,
            [id]
        );

        // If no materials, create default entries
        if (materials.length === 0) {
            const types = ['glass', 'aluminum', 'accessory', 'auxiliary'];
            for (const type of types) {
                await db.query(
                    `INSERT IGNORE INTO project_material_status (project_id, material_type, status) VALUES (?, ?, 'missing')`,
                    [id, type]
                );
            }
            const [newMaterials] = await db.query(
                `SELECT * FROM project_material_status WHERE project_id = ? ORDER BY material_type`,
                [id]
            );
            return res.json({ success: true, data: newMaterials });
        }

        res.json({ success: true, data: materials });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lá»—i server" });
    }
};

// UPDATE material status
exports.updateMaterialStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { material_type, status, order_date, expected_date, actual_date, quantity, supplier, notes } = req.body;

        // Validate material_type
        const validTypes = ['glass', 'aluminum', 'accessory', 'auxiliary'];
        if (!validTypes.includes(material_type)) {
            return res.status(400).json({
                success: false,
                message: "Loáº¡i váº­t tÆ° khÃ´ng há»£p lá»‡"
            });
        }

        // Validate status
        const validStatuses = ['ok', 'waiting', 'missing', 'ordered', 'arrived'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡"
            });
        }

        // Get current status
        const [current] = await db.query(
            "SELECT * FROM project_material_status WHERE project_id = ? AND material_type = ?",
            [id, material_type]
        );

        if (current.length === 0) {
            // Insert new
            await db.query(
                `INSERT INTO project_material_status 
                 (project_id, material_type, status, order_date, expected_date, actual_date, quantity, supplier, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, material_type, status || 'missing', order_date, expected_date, actual_date, quantity, supplier, notes]
            );
        } else {
            // Update existing
            await db.query(
                `UPDATE project_material_status 
                 SET status = ?, order_date = ?, expected_date = ?, actual_date = ?, 
                     quantity = ?, supplier = ?, notes = ?
                 WHERE project_id = ? AND material_type = ?`,
                [
                    status || current[0].status,
                    order_date || current[0].order_date,
                    expected_date || current[0].expected_date,
                    actual_date || current[0].actual_date,
                    quantity || current[0].quantity,
                    supplier || current[0].supplier,
                    notes !== undefined ? notes : current[0].notes,
                    id,
                    material_type
                ]
            );
        }

        // Log activity
        try {
            const typeLabels = { glass: 'KÃ­nh', aluminum: 'NhÃ´m', accessory: 'Phá»¥ kiá»‡n', auxiliary: 'VT phá»¥' };
            const statusLabels = { ok: 'OK', waiting: 'Chá»', missing: 'Thiáº¿u', ordered: 'ÄÃ£ Ä‘áº·t', arrived: 'ÄÃ£ vá»' };

            await db.query(
                `INSERT INTO project_activity_logs (project_id, action_type, old_value, new_value, description, user_name)
                 VALUES (?, 'material_status_change', ?, ?, ?, ?)`,
                [
                    id,
                    current[0]?.status || 'null',
                    status || current[0]?.status,
                    `${typeLabels[material_type]}: ${statusLabels[current[0]?.status] || 'N/A'} â†’ ${statusLabels[status] || 'N/A'}`,
                    req.user?.name || 'System'
                ]
            );
        } catch (logErr) {
            console.log('Could not log activity:', logErr.message);
        }

        res.json({ success: true, message: "Cáº­p nháº­t váº­t tÆ° thÃ nh cÃ´ng" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lá»—i server" });
    }
};

// Confirm material arrival
exports.confirmMaterialArrival = async (req, res) => {
    try {
        const { id } = req.params;
        const { material_type, quantity_arrived } = req.body;

        await db.query(
            `UPDATE project_material_status 
             SET status = 'arrived', actual_date = CURDATE(), quantity_arrived = ?,
                 confirmed_by = ?, confirmed_at = NOW()
             WHERE project_id = ? AND material_type = ?`,
            [quantity_arrived, req.user?.id, id, material_type]
        );

        // Log
        try {
            const typeLabels = { glass: 'KÃ­nh', aluminum: 'NhÃ´m', accessory: 'Phá»¥ kiá»‡n', auxiliary: 'VT phá»¥' };
            await db.query(
                `INSERT INTO project_activity_logs (project_id, action_type, description, user_name)
                 VALUES (?, 'material_arrived', ?, ?)`,
                [id, `${typeLabels[material_type]} Ä‘Ã£ vá» kho (SL: ${quantity_arrived || 'N/A'})`, req.user?.name || 'System']
            );
        } catch (logErr) {
            console.log('Could not log activity:', logErr.message);
        }

        res.json({ success: true, message: "XÃ¡c nháº­n váº­t tÆ° Ä‘Ã£ vá» thÃ nh cÃ´ng" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lá»—i server" });
    }
};

// ========== ACTIVITY LOGS ==========

// GET activity logs for a project
exports.getActivityLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50 } = req.query;

        const [logs] = await db.query(
            `SELECT * FROM project_activity_logs 
             WHERE project_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [id, parseInt(limit)]
        );

        res.json({ success: true, data: logs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lá»—i server" });
    }
};

// Add activity log
exports.addActivityLog = async (req, res) => {
    try {
        const { id } = req.params;
        const { action_type, description } = req.body;

        await db.query(
            `INSERT INTO project_activity_logs (project_id, action_type, description, user_name)
             VALUES (?, ?, ?, ?)`,
            [id, action_type || 'manual_note', description, req.user?.name || 'User']
        );

        res.json({ success: true, message: "ThÃªm ghi chÃº thÃ nh cÃ´ng" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lá»—i server" });
    }
};

// ========== CANCEL/RESTORE PROJECT (SOFT DELETE) ==========

// PATCH /api/projects/:id/cancel - Há»§y dá»± Ã¡n (soft delete)
exports.cancelProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Kiá»ƒm tra dá»± Ã¡n tá»“n táº¡i
        const [projectRows] = await db.query(
            "SELECT id, project_code, project_name, status FROM projects WHERE id = ?",
            [id]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        const project = projectRows[0];

        // Kiá»ƒm tra dá»± Ã¡n Ä‘Ã£ bá»‹ há»§y chÆ°a
        if (project.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Dá»± Ã¡n nÃ y Ä‘Ã£ bá»‹ há»§y trÆ°á»›c Ä‘Ã³"
            });
        }

        // LÆ°u tráº¡ng thÃ¡i trÆ°á»›c khi há»§y Ä‘á»ƒ cÃ³ thá»ƒ khÃ´i phá»¥c
        const previousStatus = project.status || 'new';

        // Cáº­p nháº­t tráº¡ng thÃ¡i dá»± Ã¡n
        await db.query(
            `UPDATE projects 
             SET status = 'cancelled', 
                 cancelled_at = NOW(), 
                 cancel_reason = ?,
                 previous_status = ?
             WHERE id = ?`,
            [reason || null, previousStatus, id]
        );

        // Ghi log hoáº¡t Ä‘á»™ng
        try {
            await db.query(
                `INSERT INTO project_activity_logs (project_id, action_type, description, user_name)
                 VALUES (?, 'project_cancelled', ?, ?)`,
                [id, `Dá»± Ã¡n Ä‘Ã£ bá»‹ há»§y. LÃ½ do: ${reason || 'KhÃ´ng cÃ³ lÃ½ do'}`, req.user?.name || 'System']
            );
        } catch (logErr) {
            console.log('Could not log activity:', logErr.message);
        }

        // Gửi thông báo hủy dự án
        try {
            await SystemNotifier.notify('project.cancelled', {
                entityName: project.project_name,
                entityId: parseInt(id),
                actor: SystemNotifier.getActor(req),
                afterData: {
                    project_code: project.project_code,
                    reason: reason || 'KhÃ´ng cÃ³ lÃ½ do'
                }
            });
        } catch (e) { }

        res.json({
            success: true,
            message: "ÄÃ£ há»§y dá»± Ã¡n thÃ nh cÃ´ng"
        });
    } catch (err) {
        console.error('Error cancelling project:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi há»§y dá»± Ã¡n"
        });
    }
};

// PATCH /api/projects/:id/restore - KhÃ´i phá»¥c dá»± Ã¡n Ä‘Ã£ há»§y
exports.restoreProject = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiá»ƒm tra dá»± Ã¡n tá»“n táº¡i vÃ  Ä‘Ã£ bá»‹ há»§y
        const [projectRows] = await db.query(
            "SELECT id, project_code, project_name, status, previous_status FROM projects WHERE id = ?",
            [id]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n"
            });
        }

        const project = projectRows[0];

        if (project.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Dá»± Ã¡n nÃ y chÆ°a bá»‹ há»§y, khÃ´ng cáº§n khÃ´i phá»¥c"
            });
        }

        // KhÃ´i phá»¥c vá» tráº¡ng thÃ¡i trÆ°á»›c khi há»§y hoáº·c 'new' náº¿u khÃ´ng cÃ³
        const restoreStatus = project.previous_status || 'new';

        await db.query(
            `UPDATE projects 
             SET status = ?, 
                 cancelled_at = NULL, 
                 cancel_reason = NULL,
                 previous_status = NULL
             WHERE id = ?`,
            [restoreStatus, id]
        );

        // Ghi log hoáº¡t Ä‘á»™ng
        try {
            await db.query(
                `INSERT INTO project_activity_logs (project_id, action_type, description, user_name)
                 VALUES (?, 'project_restored', ?, ?)`,
                [id, `Dá»± Ã¡n Ä‘Ã£ Ä‘Æ°á»£c khÃ´i phá»¥c vá» tráº¡ng thÃ¡i: ${restoreStatus}`, req.user?.name || 'System']
            );
        } catch (logErr) {
            console.log('Could not log activity:', logErr.message);
        }

        res.json({
            success: true,
            message: "ÄÃ£ khÃ´i phá»¥c dá»± Ã¡n thÃ nh cÃ´ng",
            data: { restored_status: restoreStatus }
        });
    } catch (err) {
        console.error('Error restoring project:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i khi khÃ´i phá»¥c dá»± Ã¡n"
        });
    }
};

// GET /api/projects/cancelled - Láº¥y danh sÃ¡ch dá»± Ã¡n Ä‘Ã£ há»§y
exports.getCancelledProjects = async (req, res) => {
    try {
        const { search } = req.query;

        let query = `
            SELECT 
                p.*,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                a.name AS agency_name,
                a.code AS agency_code
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN agencies a ON c.agency_id = a.id
            WHERE p.status = 'cancelled'
        `;
        let params = [];

        if (search) {
            query += " AND (p.project_name LIKE ? OR p.project_code LIKE ? OR c.full_name LIKE ?)";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += " ORDER BY p.cancelled_at DESC";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error getting cancelled projects:', err);
        res.status(500).json({
            success: false,
            message: "Lá»—i server"
        });
    }
};

// EXPORT REPORT - Xuất báo cáo dự án ra file Excel (.xlsx)
exports.exportReport = async (req, res) => {
    try {
        const { id } = req.params;
        const ExcelJS = require('exceljs');

        // 1. Thông tin dự án
        const [projects] = await db.query(
            'SELECT p.*, c.full_name AS customer_name, c.phone AS customer_phone, a.name AS agency_name FROM projects p LEFT JOIN customers c ON p.customer_id = c.id LEFT JOIN agencies a ON c.agency_id = a.id WHERE p.id = ?',
            [id]
        );
        if (!projects.length) return res.status(404).json({ success: false, message: 'Khong tim thay du an' });
        const project = projects[0];

        // 2. Báo giá mới nhất
        const [quotations] = await db.query(
            'SELECT * FROM quotations WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
            [id]
        );
        const quotation = quotations[0] || null;

        // 3. Sản phẩm
        let items = [];
        if (quotation) {
            const [qItems] = await db.query('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id', [quotation.id]);
            items = qItems;
        }

        // 4. Vật tư
        const [materials] = await db.query(
            'SELECT * FROM project_materials WHERE project_id = ? ORDER BY material_type, material_name',
            [id]
        );

        // 5. Tài chính
        const totalValue = parseFloat(project.total_value) || (quotation ? parseFloat(quotation.total_amount) || 0 : 0);
        const [payments] = await db.query(
            "SELECT COALESCE(SUM(amount),0) as paid FROM financial_transactions WHERE project_id = ? AND transaction_type = 'income' AND status = 'posted'",
            [id]
        );
        const paid = parseFloat(payments[0] && payments[0].paid) || 0;
        const remaining = totalValue - paid;

        // Helpers
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';
        const statusMap = { new: 'Moi', in_progress: 'Dang thuc hien', completed: 'Hoan thanh', cancelled: 'Da huy', closed: 'Da dong' };

        // ===== TẠO WORKBOOK =====
        const wb = new ExcelJS.Workbook();
        wb.creator = 'ViralWindow';
        wb.created = new Date();

        // Style chung
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        const sectionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
        const sectionFont = { bold: true, color: { argb: 'FF1E3A5F' }, size: 12 };
        const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const numFmt = '#,##0';

        // ===== SHEET 1: THÔNG TIN DỰ ÁN =====
        const ws1 = wb.addWorksheet('Thong tin du an', { properties: { tabColor: { argb: 'FF1E3A5F' } } });
        ws1.columns = [
            { width: 25 },
            { width: 35 },
            { width: 25 },
            { width: 35 }
        ];

        // Tiêu đề
        ws1.mergeCells('A1:D1');
        const titleCell = ws1.getCell('A1');
        titleCell.value = 'BAO CAO DU AN - ' + (project.project_code || '');
        titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws1.getRow(1).height = 36;

        ws1.mergeCells('A2:D2');
        const subTitle = ws1.getCell('A2');
        subTitle.value = 'Ngay xuat: ' + fmtDate(new Date()) + '  |  He thong quan ly ViralWindow';
        subTitle.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
        subTitle.alignment = { horizontal: 'center' };
        ws1.getRow(2).height = 20;

        ws1.addRow([]);

        // Section header
        ws1.mergeCells('A4:D4');
        const infoHeader = ws1.getCell('A4');
        infoHeader.value = '1. THONG TIN DU AN';
        infoHeader.font = sectionFont;
        infoHeader.fill = sectionFill;
        infoHeader.alignment = { horizontal: 'left', indent: 1 };
        ws1.getRow(4).height = 22;

        const infoRows = [
            ['Ma du an', project.project_code || '-', 'Trang thai', statusMap[project.status] || project.status || '-'],
            ['Ten du an', project.project_name || '-', 'Tien do', (project.progress_percent || 0) + '%'],
            ['Khach hang', project.customer_name || '-', 'Dien thoai', project.customer_phone || '-'],
            ['Chi nhanh', project.agency_name || '-', 'Dia chi thi cong', project.construction_address || '-'],
            ['Ngay bat dau', fmtDate(project.start_date || project.created_at), 'Han hoan thanh', fmtDate(project.deadline || project.end_date)],
        ];

        infoRows.forEach((row, i) => {
            const r = ws1.addRow(row);
            r.getCell(1).font = { bold: true, color: { argb: 'FF555555' } };
            r.getCell(3).font = { bold: true, color: { argb: 'FF555555' } };
            r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB' } };
            r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB' } };
            [1, 2, 3, 4].forEach(c => r.getCell(c).border = thinBorder);
            r.getCell(1).alignment = { indent: 1 };
            r.getCell(2).alignment = { indent: 1 };
            r.getCell(3).alignment = { indent: 1 };
            r.getCell(4).alignment = { indent: 1 };
        });

        if (project.notes) {
            ws1.addRow([]);
            const noteRow = ws1.addRow(['Ghi chu', project.notes, '', '']);
            ws1.mergeCells('B' + noteRow.number + ':D' + noteRow.number);
            noteRow.getCell(1).font = { bold: true, color: { argb: 'FF555555' } };
            noteRow.getCell(1).alignment = { indent: 1 };
        }

        ws1.addRow([]);

        // Section tài chính
        ws1.mergeCells('A' + (ws1.rowCount + 1) + ':D' + (ws1.rowCount + 1));
        const finHeader = ws1.getCell('A' + ws1.rowCount);
        finHeader.value = '2. TONG KET TAI CHINH';
        finHeader.font = sectionFont;
        finHeader.fill = sectionFill;
        finHeader.alignment = { horizontal: 'left', indent: 1 };
        ws1.getRow(ws1.rowCount).height = 22;

        const finData = [
            ['Gia tri hop dong', totalValue, 'Da thanh toan', paid],
            ['Con phai thu', remaining, '', '']
        ];
        finData.forEach((row, i) => {
            const r = ws1.addRow(row);
            r.getCell(1).font = { bold: true, color: { argb: 'FF555555' } };
            r.getCell(3).font = { bold: true, color: { argb: 'FF555555' } };
            r.getCell(2).numFmt = numFmt;
            r.getCell(4).numFmt = numFmt;
            r.getCell(2).font = { bold: true, color: { argb: i === 0 ? 'FF2563EB' : (remaining > 0 ? 'FFDC2626' : 'FF16A34A') } };
            r.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
            [1, 2, 3, 4].forEach(c => { r.getCell(c).border = thinBorder; r.getCell(c).alignment = { indent: 1 }; });
        });

        // ===== SHEET 2: SẢN PHẨM =====
        const ws2 = wb.addWorksheet('Danh sach san pham', { properties: { tabColor: { argb: 'FF0EA5E9' } } });
        ws2.columns = [
            { header: '#', key: 'stt', width: 6 },
            { header: 'Ma SP', key: 'code', width: 15 },
            { header: 'Ten san pham', key: 'name', width: 35 },
            { header: 'Rong (mm)', key: 'width', width: 12 },
            { header: 'Cao (mm)', key: 'height', width: 12 },
            { header: 'So luong', key: 'qty', width: 10 },
            { header: 'Don gia (d)', key: 'price', width: 18 },
            { header: 'Thanh tien (d)', key: 'total', width: 20 }
        ];

        ws2.mergeCells('A1:H1');
        const ws2Title = ws2.getCell('A1');
        ws2Title.value = 'DANH SACH SAN PHAM' + (quotation ? ' - Bao gia: ' + quotation.quotation_code : '');
        ws2Title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        ws2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
        ws2Title.alignment = { horizontal: 'center', vertical: 'middle' };
        ws2.getRow(1).height = 30;

        const ws2HeaderRow = ws2.getRow(2);
        ws2HeaderRow.values = ['#', 'Ma SP', 'Ten san pham', 'Rong (mm)', 'Cao (mm)', 'So luong', 'Don gia (d)', 'Thanh tien (d)'];
        ws2HeaderRow.eachCell(cell => {
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.border = thinBorder;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
        ws2.getRow(2).height = 24;

        let itemTotal = 0;
        items.forEach((item, i) => {
            const total = parseFloat(item.total_price) || (parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 1));
            itemTotal += total;
            const r = ws2.addRow([
                i + 1,
                item.code || item.item_code || '-',
                item.item_name || item.name || '-',
                item.width || 0,
                item.height || 0,
                item.quantity || 1,
                parseFloat(item.unit_price) || 0,
                total
            ]);
            r.getCell(6).numFmt = '#,##0';
            r.getCell(7).numFmt = numFmt;
            r.getCell(8).numFmt = numFmt;
            r.eachCell(cell => {
                cell.border = thinBorder;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFF0F9FF' } };
            });
            r.getCell(1).alignment = { horizontal: 'center' };
            r.getCell(6).alignment = { horizontal: 'center' };
        });

        // Tổng
        const totalRow2 = ws2.addRow(['', '', 'TONG CONG', '', '', '', '', itemTotal]);
        totalRow2.getCell(3).font = { bold: true };
        totalRow2.getCell(8).font = { bold: true, color: { argb: 'FF2563EB' } };
        totalRow2.getCell(8).numFmt = numFmt;
        totalRow2.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        [1, 2, 3, 4, 5, 6, 7, 8].forEach(c => totalRow2.getCell(c).border = thinBorder);

        // ===== SHEET 3: VẬT TƯ =====
        const ws3 = wb.addWorksheet('Vat tu du an', { properties: { tabColor: { argb: 'FF10B981' } } });
        ws3.mergeCells('A1:F1');
        const ws3Title = ws3.getCell('A1');
        ws3Title.value = 'VAT TU DU AN - ' + (project.project_code || '');
        ws3Title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        ws3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        ws3Title.alignment = { horizontal: 'center', vertical: 'middle' };
        ws3.getRow(1).height = 30;
        ws3.columns = [
            { width: 6 }, { width: 18 }, { width: 35 }, { width: 16 }, { width: 18 }, { width: 18 }
        ];

        const ws3HeaderRow = ws3.getRow(2);
        ws3HeaderRow.values = ['#', 'Loai vat tu', 'Ten vat tu', 'So luong', 'Don gia (d)', 'Thanh tien (d)'];
        ws3HeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.border = thinBorder;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        ws3.getRow(2).height = 24;

        let matTotal = 0;
        materials.forEach((m, i) => {
            const qty = parseFloat(m.quantity || m.quantity_used || 0);
            const unitPrice = parseFloat(m.unit_price || 0);
            const total = parseFloat(m.total_cost || (qty * unitPrice)) || 0;
            matTotal += total;
            const r = ws3.addRow([
                i + 1,
                m.material_type || '-',
                m.material_name || m.item_name || '-',
                qty + ' ' + (m.unit || m.item_unit || ''),
                unitPrice,
                total
            ]);
            r.getCell(5).numFmt = numFmt;
            r.getCell(6).numFmt = numFmt;
            r.eachCell(cell => {
                cell.border = thinBorder;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFF0FDF4' } };
            });
            r.getCell(1).alignment = { horizontal: 'center' };
        });

        const totalRow3 = ws3.addRow(['', '', 'TONG CONG', '', '', matTotal]);
        totalRow3.getCell(3).font = { bold: true };
        totalRow3.getCell(6).font = { bold: true, color: { argb: 'FF10B981' } };
        totalRow3.getCell(6).numFmt = numFmt;
        totalRow3.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        [1, 2, 3, 4, 5, 6].forEach(c => totalRow3.getCell(c).border = thinBorder);

        // ===== GỬI FILE =====
        const filename = 'BaoCao_' + (project.project_code || 'DuAn') + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        await wb.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('exportReport error:', err);
        res.status(500).json({ success: false, message: 'Loi server khi xuat bao cao: ' + err.message });
    }
};
