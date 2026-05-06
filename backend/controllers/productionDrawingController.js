const db = require("../config/db");

/**
 * Lấy bản vẽ sản xuất cho một cửa
 */
exports.getDoorProductionDrawing = async (req, res) => {
    try {
        const { projectId, doorId } = req.params;

        // Lấy thông tin cửa
        const [doorRows] = await db.query(`
            SELECT 
                dd.*,
                p.project_name,
                p.project_code,
                c.full_name AS customer_name,
                a.name AS aluminum_name,
                a.code AS aluminum_code
            FROM door_designs dd
            LEFT JOIN projects p ON dd.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.id = ? AND dd.project_id = ?
        `, [doorId, projectId]);

        if (doorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa"
            });
        }

        const door = doorRows[0];

        // Lấy BOM items
        const [bomItems] = await db.query(`
            SELECT 
                bi.*,
                cf.cutting_angle,
                cf.position AS formula_position
            FROM bom_items bi
            LEFT JOIN cutting_formulas cf ON bi.formula_id = cf.id
            WHERE bi.design_id = ?
            ORDER BY 
                CASE bi.item_type
                    WHEN 'frame' THEN 1
                    WHEN 'mullion' THEN 2
                    WHEN 'sash' THEN 3
                    WHEN 'bead' THEN 4
                    WHEN 'glass' THEN 5
                    ELSE 6
                END,
                bi.item_name,
                bi.position
        `, [doorId]);

        // Phân loại BOM items
        const aluminumItems = bomItems.filter(item => 
            item.item_type === 'frame' || 
            item.item_type === 'mullion' || 
            item.item_type === 'sash' || 
            item.item_type === 'bead' ||
            item.item_type === 'profile'
        );

        const glassItems = bomItems.filter(item => item.item_type === 'glass');

        // Tính toán thông tin
        const width = door.width_mm || 0;
        const height = door.height_mm || 0;
        const h1 = door.height_mm ? door.height_mm - 350 : 0; // Giả sử transom cao 350mm
        const clearance = 7; // Hở chân cánh
        const glassType = door.glass_type || '6';

        // Chuẩn bị dữ liệu bản vẽ
        const drawingData = {
            // Thông tin chung
            customer_name: door.customer_name || '',
            door_code: door.design_code || `D${door.id}`,
            door_width: width,
            door_height: height,
            h1: h1,
            clearance: clearance,
            glass_type: glassType,
            quantity: 1,

            // Bản vẽ (sẽ được render từ drawing_data hoặc structure_json)
            drawing: door.drawing_data || door.structure_json || null,

            // Bảng nhôm
            aluminum_cutting: aluminumItems.map(item => ({
                profile_name: item.item_name || '',
                position: item.position || item.formula_position || '',
                code: item.item_code || '',
                cutting_angle: item.cutting_angle || item.angle || '90-90',
                quantity: item.quantity || 1,
                length_mm: item.length_mm || 0
            })),

            // Bảng kính
            glass_cutting: glassItems.map(item => ({
                glass_type: glassType,
                width_mm: item.width_mm || 0,
                height_mm: item.height_mm || 0,
                quantity: item.quantity || 1,
                area_m2: item.area_m2 || ((item.width_mm || 0) * (item.height_mm || 0) / 1000000),
                position: item.position || 'cánh'
            }))
        };

        res.json({
            success: true,
            data: drawingData
        });
    } catch (err) {
        console.error('Error getting door production drawing:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy bản vẽ sản xuất: " + err.message
        });
    }
};

/**
 * Lấy bản vẽ sản xuất cho toàn bộ dự án
 */
exports.getProjectProductionDrawings = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Lấy thông tin dự án
        const [projectRows] = await db.query(`
            SELECT 
                p.*,
                c.full_name AS customer_name
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.id = ?
        `, [projectId]);

        if (projectRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dự án"
            });
        }

        const project = projectRows[0];

        // Lấy tất cả cửa trong dự án với thông tin đầy đủ
        const [doors] = await db.query(`
            SELECT 
                dd.*,
                a.name AS aluminum_name,
                a.code AS aluminum_code
            FROM door_designs dd
            LEFT JOIN aluminum_systems a ON dd.aluminum_system_id = a.id
            WHERE dd.project_id = ?
            ORDER BY dd.design_code ASC
        `, [projectId]);

        const drawings = [];

        // Lấy bản vẽ sản xuất cho từng cửa
        for (const door of doors) {
            // Lấy BOM items
            const [bomItems] = await db.query(`
                SELECT 
                    bi.*,
                    cf.cutting_angle,
                    cf.position AS formula_position
                FROM bom_items bi
                LEFT JOIN cutting_formulas cf ON bi.formula_id = cf.id
                WHERE bi.design_id = ?
                ORDER BY 
                    CASE bi.item_type
                        WHEN 'frame' THEN 1
                        WHEN 'mullion' THEN 2
                        WHEN 'sash' THEN 3
                        WHEN 'bead' THEN 4
                        WHEN 'glass' THEN 5
                        ELSE 6
                    END,
                    bi.item_name,
                    bi.position
            `, [door.id]);

            // Phân loại BOM items
            const aluminumItems = bomItems.filter(item => 
                item.item_type === 'frame' || 
                item.item_type === 'mullion' || 
                item.item_type === 'sash' || 
                item.item_type === 'bead' ||
                item.item_type === 'profile'
            );

            const glassItems = bomItems.filter(item => item.item_type === 'glass');

            // Tính toán thông tin
            const width = door.width_mm || 0;
            const height = door.height_mm || 0;
            const h1 = door.height_mm ? door.height_mm - 350 : 0;
            const clearance = 7;
            const glassType = door.glass_type || '6';

            // Chuẩn bị dữ liệu bản vẽ
            const drawingData = {
                customer_name: project.customer_name || '',
                door_code: door.design_code || `D${door.id}`,
                door_width: width,
                door_height: height,
                h1: h1,
                clearance: clearance,
                glass_type: glassType,
                quantity: 1,
                drawing: door.drawing_data || door.structure_json || null,
                aluminum_cutting: aluminumItems.map(item => ({
                    profile_name: item.item_name || '',
                    position: item.position || item.formula_position || '',
                    code: item.item_code || '',
                    cutting_angle: item.cutting_angle || item.angle || '90-90',
                    quantity: item.quantity || 1,
                    length_mm: item.length_mm || 0
                })),
                glass_cutting: glassItems.map(item => ({
                    glass_type: glassType,
                    width_mm: item.width_mm || 0,
                    height_mm: item.height_mm || 0,
                    quantity: item.quantity || 1,
                    area_m2: item.area_m2 || ((item.width_mm || 0) * (item.height_mm || 0) / 1000000),
                    position: item.position || 'cánh'
                }))
            };

            drawings.push(drawingData);
        }

        res.json({
            success: true,
            data: {
                project_name: project.project_name,
                project_code: project.project_code,
                customer_name: project.customer_name,
                doors: drawings
            }
        });
    } catch (err) {
        console.error('Error getting project production drawings:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy bản vẽ sản xuất dự án: " + err.message
        });
    }
};

