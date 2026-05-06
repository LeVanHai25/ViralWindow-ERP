const db = require("../config/db");
const fs = require('fs');
const path = require('path');
const productBomService = require("../services/productBomService");

// Lấy tất cả templates, có thể filter theo family
exports.getAllTemplates = async (req, res) => {
    try {
        const { family, brand, search, category, code } = req.query;
        let query = `
            SELECT 
                dt.*,
                a.brand,
                a.name AS aluminum_system_name,
                a.code AS aluminum_system_code
            FROM door_templates dt
            LEFT JOIN aluminum_systems a ON dt.aluminum_system_id = a.id
            WHERE dt.is_active = 1
        `;
        const params = [];

        if (family) {
            query += ` AND dt.family = ?`;
            params.push(family);
        }

        if (category) {
            // Map category to family enum
            const categoryToFamily = {
                'door_out_swing': 'door_out',
                'door_in_swing': 'door_in',
                'window_swing': 'window_swing',
                'window_sliding': 'window_sliding',
                'door_sliding': 'door_sliding',
                'window_fixed': 'fixed',
                'partition_door': 'wall_window'
            };
            const family = categoryToFamily[category] || category;
            query += ` AND dt.family = ?`;
            params.push(family);
        }

        if (brand) {
            query += ` AND a.brand = ?`;
            params.push(brand);
        }

        if (search) {
            query += ` AND (dt.code LIKE ? OR dt.name LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (code) {
            query += ` AND dt.code = ?`;
            params.push(code);
        }

        query += ` ORDER BY dt.display_order ASC, dt.family ASC, dt.code ASC`;

        const [rows] = await db.query(query, params);

        // Parse JSON fields
        const templates = rows.map(row => ({
            ...row,
            param_schema: typeof row.param_schema === 'string' 
                ? JSON.parse(row.param_schema) 
                : row.param_schema,
            structure_json: typeof row.structure_json === 'string' 
                ? JSON.parse(row.structure_json) 
                : row.structure_json
        }));

        res.json({ success: true, data: templates });
    } catch (err) {
        console.error("Error getting door templates:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Lấy danh sách categories/families
exports.getCategories = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT family, COUNT(*) as count
            FROM door_templates
            WHERE is_active = 1
            GROUP BY family
            ORDER BY family
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error("Error getting categories:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Lấy template theo ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT 
                dt.*,
                a.brand,
                a.name AS aluminum_system_name,
                a.code AS aluminum_system_code
            FROM door_templates dt
            LEFT JOIN aluminum_systems a ON dt.aluminum_system_id = a.id
            WHERE dt.id = ? AND dt.is_active = 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        const template = rows[0];
        template.param_schema = typeof template.param_schema === 'string' 
            ? JSON.parse(template.param_schema) 
            : template.param_schema;
        template.structure_json = typeof template.structure_json === 'string' 
            ? JSON.parse(template.structure_json) 
            : template.structure_json;

        res.json({ success: true, data: template });
    } catch (err) {
        console.error("Error getting door template:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Tạo template mới
exports.create = async (req, res) => {
    try {
        const {
            code,
            name,
            family,
            category,
            preview_image,
            param_schema,
            structure_json,
            aluminum_system_id,
            default_width,
            default_height,
            description
        } = req.body;

        // Kiểm tra code đã tồn tại chưa
        const [existing] = await db.query(
            "SELECT id FROM door_templates WHERE code = ?",
            [code]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Mã template đã tồn tại"
            });
        }

        // Lưu kích thước vào param_schema
        const finalParamSchema = param_schema || {};
        if (default_width) finalParamSchema.defaultWidth = default_width;
        if (default_height) finalParamSchema.defaultHeight = default_height;

        const [result] = await db.query(
            `INSERT INTO door_templates 
            (code, name, family, preview_image, param_schema, structure_json, 
             aluminum_system_id, description, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 
                    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM door_templates AS dt2))`,
            [
                code,
                name,
                family || 'other',
                preview_image || null,
                JSON.stringify(finalParamSchema),
                JSON.stringify(structure_json || {}),
                aluminum_system_id || null,
                description || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Tạo template thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error("Error creating door template:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// Import templates từ file JSON
exports.importTemplates = async (req, res) => {
    try {
        const { templates } = req.body;

        if (!templates || !Array.isArray(templates)) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu templates không hợp lệ"
            });
        }

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        const errors = [];

        for (const template of templates) {
            try {
                // Kiểm tra code đã tồn tại chưa
                const [existing] = await db.query(
                    'SELECT id FROM door_templates WHERE code = ?',
                    [template.code]
                );

                if (existing.length > 0) {
                    skippedCount++;
                    continue;
                }

                // Tìm aluminum_system_id từ system code
                let aluminumSystemId = null;
                if (template.system) {
                    const [systemRows] = await db.query(
                        'SELECT id FROM aluminum_systems WHERE code = ? OR name LIKE ? LIMIT 1',
                        [template.system, `%${template.system}%`]
                    );
                    
                    if (systemRows.length > 0) {
                        aluminumSystemId = systemRows[0].id;
                    }
                }

                // Insert template
                // Map category to family enum
                const categoryToFamily = {
                    'door_out_swing': 'door_out',
                    'door_in_swing': 'door_in',
                    'window_swing': 'window_swing',
                    'window_tilt': 'window_swing',
                    'window_tilt_turn': 'window_swing',
                    'window_sliding': 'window_sliding',
                    'door_sliding': 'door_sliding',
                    'window_fixed': 'fixed',
                    'partition_door': 'wall_window'
                };
                const family = categoryToFamily[template.category] || template.family || 'other';

                // Lưu kích thước vào param_schema
                const defaultWidth = template.defaultWidth || template.default_width || 1200;
                const defaultHeight = template.defaultHeight || template.default_height || 2200;
                const paramSchema = template.paramSchema || template.param_schema || {};
                paramSchema.defaultWidth = defaultWidth;
                paramSchema.defaultHeight = defaultHeight;

                await db.query(`
                    INSERT INTO door_templates 
                    (code, name, family, aluminum_system_id, 
                     structure_json, param_schema, description, is_active, display_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 
                            (SELECT COALESCE(MAX(display_order), 0) + 1 FROM door_templates AS dt2))
                `, [
                    template.code,
                    template.name,
                    family,
                    aluminumSystemId,
                    JSON.stringify(template.panelTree || {}),
                    JSON.stringify(paramSchema),
                    template.description || ''
                ]);
                
                successCount++;
            } catch (err) {
                errorCount++;
                errors.push({
                    code: template.code,
                    error: err.message
                });
            }
        }

        res.json({
            success: true,
            message: `Import thành công ${successCount} mẫu`,
            data: {
                success: successCount,
                skipped: skippedCount,
                errors: errorCount,
                errorDetails: errors
            }
        });
    } catch (err) {
        console.error("Error importing templates:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// Import từ file mặc định
exports.importDefaultTemplates = async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../data/door-templates-base.json');
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "File templates không tồn tại"
            });
        }

        const templates = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Gọi hàm import
        req.body = { templates };
        return exports.importTemplates(req, res);
    } catch (err) {
        console.error("Error importing default templates:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// Cập nhật template
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            name,
            family,
            category,
            preview_image,
            param_schema,
            structure_json,
            aluminum_system_id,
            default_width,
            default_height,
            description,
            is_active
        } = req.body;

        // Kiểm tra template có tồn tại không
        const [existing] = await db.query(
            "SELECT id FROM door_templates WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Template không tồn tại"
            });
        }

        // Kiểm tra code trùng (nếu đổi code)
        if (code) {
            const [codeCheck] = await db.query(
                "SELECT id FROM door_templates WHERE code = ? AND id != ?",
                [code, id]
            );

            if (codeCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Mã template đã tồn tại"
                });
            }
        }

        await db.query(
            `UPDATE door_templates 
            SET                 code = COALESCE(?, code),
                name = COALESCE(?, name),
                family = COALESCE(?, family),
                preview_image = ?,
                param_schema = COALESCE(?, param_schema),
                structure_json = COALESCE(?, structure_json),
                aluminum_system_id = ?,
                description = ?,
                is_active = COALESCE(?, is_active)
            WHERE id = ?`,
            [
                code,
                name,
                family,
                category,
                preview_image || null,
                param_schema ? JSON.stringify(param_schema) : null,
                structure_json ? JSON.stringify(structure_json) : null,
                aluminum_system_id || null,
                default_width,
                default_height,
                description || null,
                is_active !== undefined ? is_active : 1,
                id
            ]
        );

        res.json({
            success: true,
            message: "Cập nhật template thành công"
        });
    } catch (err) {
        console.error("Error updating door template:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// Xóa template (soft delete - chuyển sang inactive)
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra xem cửa có đang được sử dụng trong dự án nào không
        const [usedInProjects] = await db.query(
            "SELECT COUNT(*) as count FROM project_door_items WHERE door_template_id = ?",
            [id]
        );

        if (usedInProjects[0].count > 0) {
            // Soft delete - chuyển sang inactive
            await db.query(
                "UPDATE door_templates SET status = 'inactive', is_active = 0 WHERE id = ?",
                [id]
            );
            return res.json({
                success: true,
                message: "Cửa đã được ngừng sử dụng (vẫn giữ lại vì đang được dùng trong dự án)"
            });
        }

        // Hard delete nếu chưa dùng
        await db.query(
            "UPDATE door_templates SET is_active = 0 WHERE id = ?",
            [id]
        );

        res.json({
            success: true,
            message: "Xóa template thành công"
        });
    } catch (err) {
        console.error("Error deleting door template:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// Upload ảnh preview cho cửa
exports.uploadImage = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn file ảnh"
            });
        }

        // Đường dẫn tương đối để lưu vào DB
        const relativePath = `/uploads/doors/${req.file.filename}`;

        await db.query(
            "UPDATE door_templates SET preview_image = ? WHERE id = ?",
            [relativePath, id]
        );

        res.json({
            success: true,
            message: "Upload ảnh thành công",
            data: { preview_image: relativePath }
        });
    } catch (err) {
        console.error("Error uploading door image:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// Lấy danh sách hệ nhôm có sẵn cho cửa
exports.getAvailableSystems = async (req, res) => {
    try {
        const [systems] = await db.query(`
            SELECT DISTINCT code, name, brand 
            FROM aluminum_systems 
            WHERE is_active = 1
            ORDER BY brand, name
        `);

        res.json({ success: true, data: systems });
    } catch (err) {
        console.error("Error getting aluminum systems:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Preview BOM cho một cửa template
exports.getBomPreview = async (req, res) => {
    try {
        const { id } = req.params;
        const { system, width_mm, height_mm } = req.query;

        // Lấy template
        const [templates] = await db.query(
            "SELECT * FROM door_templates WHERE id = ? AND is_active = 1",
            [id]
        );

        if (templates.length === 0) {
            return res.status(404).json({ success: false, message: "Template không tồn tại" });
        }

        const template = templates[0];
        
        // Parse template_json hoặc structure_json
        let templateJson = null;
        let structureJson = null;
        if (template.template_json) {
            templateJson = typeof template.template_json === 'string'
                ? JSON.parse(template.template_json)
                : template.template_json;
        }
        if (template.structure_json) {
            structureJson = typeof template.structure_json === 'string'
                ? JSON.parse(template.structure_json)
                : template.structure_json;
        }

        // Lấy kích thước
        const paramSchema = typeof template.param_schema === 'string'
            ? JSON.parse(template.param_schema)
            : template.param_schema || {};
        
        const doorWidth = parseInt(width_mm) || template.default_width_mm || paramSchema.defaultWidth || 1200;
        const doorHeight = parseInt(height_mm) || template.default_height_mm || paramSchema.defaultHeight || 2200;
        const aluminumSystem = system || template.aluminum_system || 'XINGFA_55';

        let bom = null;
        try {
            bom = await productBomService.generateDoorBomFromTemplate({
                templateJson,
                structureJson,
                widthMm: doorWidth,
                heightMm: doorHeight,
                aluminumSystemIdOrCode: template.aluminum_system_id || aluminumSystem
            });
        } catch (e) {
            bom = null;
        }

        if (!bom) {
            const templateData = templateJson || structureJson || {};
            bom = calculateBasicBom(templateData, doorWidth, doorHeight, aluminumSystem);
        }

        res.json({
            success: true,
            data: {
                door_template_id: id,
                door_name: template.name,
                aluminum_system: aluminumSystem,
                width_mm: doorWidth,
                height_mm: doorHeight,
                bom: bom
            }
        });
    } catch (err) {
        console.error("Error getting BOM preview:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// Helper: Tính BOM cơ bản cho preview
function calculateBasicBom(templateData, widthMm, heightMm, system) {
    const FRAME_WIDTH = 70; // mm
    const SASH_WIDTH = 60; // mm
    const GLASS_CLEARANCE = 8; // mm

    const items = {
        profiles: [],
        glass: [],
        accessories: []
    };

    // Khung bao - 2 đứng + 2 ngang
    items.profiles.push({
        code: `${system}_KHUNG_DUNG`,
        name: 'Khung bao đứng',
        qty: 2,
        length_mm: heightMm,
        unit: 'm'
    });
    items.profiles.push({
        code: `${system}_KHUNG_NGANG`,
        name: 'Khung bao ngang',
        qty: 2,
        length_mm: widthMm - 2 * FRAME_WIDTH,
        unit: 'm'
    });

    // Tính kính
    const glassWidth = widthMm - 2 * (FRAME_WIDTH + GLASS_CLEARANCE);
    const glassHeight = heightMm - 2 * (FRAME_WIDTH + GLASS_CLEARANCE);
    const glassArea = (glassWidth * glassHeight) / 1000000; // m2

    items.glass.push({
        code: 'KINH_8MM',
        name: 'Kính cường lực 8mm',
        qty: 1,
        width_mm: glassWidth,
        height_mm: glassHeight,
        area_m2: Math.round(glassArea * 100) / 100,
        unit: 'm2'
    });

    // Phụ kiện cơ bản
    items.accessories.push(
        { code: 'BAN_LE', name: 'Bản lề', qty: 3, unit: 'bộ' },
        { code: 'TAY_NAM', name: 'Tay nắm', qty: 1, unit: 'bộ' },
        { code: 'KHOA', name: 'Khóa', qty: 1, unit: 'bộ' },
        { code: 'GIOANG', name: 'Gioăng', qty: Math.round((widthMm + heightMm) * 2 / 1000 * 10) / 10, unit: 'm' }
    );

    return items;
}
