const db = require("../config/db");
const fs = require('fs');
const path = require('path');

/**
 * Tạo template cửa hoàn chỉnh (với đầy đủ BOM nhôm, kính, phụ kiện)
 * POST /api/door-templates/full
 */
exports.createFullTemplate = async (req, res) => {
    try {
        const {
            meta,
            panel_tree,
            bom_profiles,
            bom_glass,
            bom_hardware,
            preview_image,
            cutting_formulas
        } = req.body;

        // Validate required fields
        if (!meta || !meta.template_code || !meta.template_name) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin meta (template_code, template_name)"
            });
        }

        // Kiểm tra code đã tồn tại chưa
        const [existing] = await db.query(
            "SELECT id FROM door_templates WHERE code = ?",
            [meta.template_code]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Mã template đã tồn tại"
            });
        }

        // Tìm aluminum_system_id
        let aluminumSystemId = null;
        if (meta.aluminum_system_code) {
            const [systemRows] = await db.query(
                'SELECT id FROM aluminum_systems WHERE code = ? OR name LIKE ? LIMIT 1',
                [meta.aluminum_system_code, `%${meta.aluminum_system_code}%`]
            );
            if (systemRows.length > 0) {
                aluminumSystemId = systemRows[0].id;
            }
        }

        // Tạo template JSON hoàn chỉnh
        const templateJson = {
            meta,
            panel_tree: panel_tree || {},
            bom_profiles: bom_profiles || [],
            bom_glass: bom_glass || [],
            bom_hardware: bom_hardware || [],
            cutting_formulas: cutting_formulas || {},
            preview_image: preview_image || null,
            created_at: new Date().toISOString(),
            version: "1.0"
        };

        // Lưu structure_json từ panel_tree (để tương thích với code cũ)
        const structureJson = panel_tree || {};

        // Lưu param_schema với default dimensions
        const paramSchema = {
            defaultWidth: meta.default_width || 1800,
            defaultHeight: meta.default_height || 2600,
            defaultH1: meta.default_h1 || null,
            defaultClearance: meta.default_clearance || 7,
            defaultGlassType: meta.default_glass_type || "6"
        };

        // Insert vào database
        const [result] = await db.query(
            `INSERT INTO door_templates 
            (code, name, family, preview_image, param_schema, structure_json, template_json,
             aluminum_system_id, description, is_active, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 
                    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM door_templates AS dt2))`,
            [
                meta.template_code,
                meta.template_name,
                meta.family || 'other',
                preview_image || null,
                JSON.stringify(paramSchema),
                JSON.stringify(structureJson),
                JSON.stringify(templateJson),
                aluminumSystemId,
                meta.description || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Tạo template hoàn chỉnh thành công",
            data: { 
                id: result.insertId,
                template_code: meta.template_code
            }
        });
    } catch (err) {
        console.error("Error creating full template:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error: " + err.message 
        });
    }
};

/**
 * Lấy template hoàn chỉnh theo ID hoặc code
 * GET /api/door-templates/full/:id
 */
exports.getFullTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { code } = req.query;

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
        let params = [];

        if (code) {
            query += ` AND dt.code = ?`;
            params.push(code);
        } else {
            query += ` AND dt.id = ?`;
            params.push(id);
        }

        const [rows] = await db.query(query, params);

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Template not found" 
            });
        }

        const template = rows[0];

        // Parse JSON fields
        let templateJson = null;
        if (template.template_json) {
            try {
                templateJson = typeof template.template_json === 'string' 
                    ? JSON.parse(template.template_json) 
                    : template.template_json;
            } catch (e) {
                console.error("Error parsing template_json:", e);
            }
        }

        // Nếu không có template_json, tạo từ các field cũ
        if (!templateJson) {
            templateJson = {
                meta: {
                    template_code: template.code,
                    template_name: template.name,
                    category: template.family,
                    aluminum_system_code: template.aluminum_system_code,
                    default_width: template.param_schema?.defaultWidth || 1800,
                    default_height: template.param_schema?.defaultHeight || 2600
                },
                panel_tree: typeof template.structure_json === 'string' 
                    ? JSON.parse(template.structure_json) 
                    : template.structure_json,
                bom_profiles: [],
                bom_glass: [],
                bom_hardware: []
            };
        }

        // Parse các field khác
        template.param_schema = typeof template.param_schema === 'string' 
            ? JSON.parse(template.param_schema) 
            : template.param_schema;
        template.structure_json = typeof template.structure_json === 'string' 
            ? JSON.parse(template.structure_json) 
            : template.structure_json;

        res.json({ 
            success: true, 
            data: {
                ...template,
                template_json: templateJson
            }
        });
    } catch (err) {
        console.error("Error getting full template:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error: " + err.message 
        });
    }
};

/**
 * Cập nhật template hoàn chỉnh
 * PUT /api/door-templates/full/:id
 */
exports.updateFullTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            meta,
            panel_tree,
            bom_profiles,
            bom_glass,
            bom_hardware,
            preview_image,
            cutting_formulas
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

        // Tìm aluminum_system_id nếu có
        let aluminumSystemId = null;
        if (meta && meta.aluminum_system_code) {
            const [systemRows] = await db.query(
                'SELECT id FROM aluminum_systems WHERE code = ? OR name LIKE ? LIMIT 1',
                [meta.aluminum_system_code, `%${meta.aluminum_system_code}%`]
            );
            if (systemRows.length > 0) {
                aluminumSystemId = systemRows[0].id;
            }
        }

        // Lấy template hiện tại
        const [currentRows] = await db.query(
            "SELECT template_json, meta FROM door_templates WHERE id = ?",
            [id]
        );
        const currentTemplate = currentRows[0];

        // Merge với dữ liệu cũ nếu chỉ cập nhật một phần
        let templateJson = {};
        if (currentTemplate && currentTemplate.template_json) {
            try {
                templateJson = typeof currentTemplate.template_json === 'string' 
                    ? JSON.parse(currentTemplate.template_json) 
                    : currentTemplate.template_json;
            } catch (e) {
                templateJson = {};
            }
        }

        // Cập nhật các phần được gửi lên
        if (meta) templateJson.meta = { ...templateJson.meta, ...meta };
        if (panel_tree) templateJson.panel_tree = panel_tree;
        if (bom_profiles) templateJson.bom_profiles = bom_profiles;
        if (bom_glass) templateJson.bom_glass = bom_glass;
        if (bom_hardware) templateJson.bom_hardware = bom_hardware;
        if (cutting_formulas) templateJson.cutting_formulas = cutting_formulas;
        if (preview_image !== undefined) templateJson.preview_image = preview_image;
        templateJson.updated_at = new Date().toISOString();

        // Cập nhật structure_json và param_schema
        const structureJson = panel_tree || templateJson.panel_tree || {};
        const finalMeta = templateJson.meta || {};
        const paramSchema = {
            defaultWidth: finalMeta.default_width || 1800,
            defaultHeight: finalMeta.default_height || 2600,
            defaultH1: finalMeta.default_h1 || null,
            defaultClearance: finalMeta.default_clearance || 7,
            defaultGlassType: finalMeta.default_glass_type || "6"
        };

        // Update database
        const updateFields = [];
        const updateValues = [];

        if (meta && meta.template_name) {
            updateFields.push("name = ?");
            updateValues.push(meta.template_name);
        }
        if (meta && meta.family) {
            updateFields.push("family = ?");
            updateValues.push(meta.family);
        }
        if (preview_image !== undefined) {
            updateFields.push("preview_image = ?");
            updateValues.push(preview_image);
        }
        if (aluminumSystemId !== null) {
            updateFields.push("aluminum_system_id = ?");
            updateValues.push(aluminumSystemId);
        }
        if (meta && meta.description !== undefined) {
            updateFields.push("description = ?");
            updateValues.push(meta.description);
        }

        updateFields.push("param_schema = ?");
        updateValues.push(JSON.stringify(paramSchema));
        updateFields.push("structure_json = ?");
        updateValues.push(JSON.stringify(structureJson));
        updateFields.push("template_json = ?");
        updateValues.push(JSON.stringify(templateJson));

        updateValues.push(id);

        await db.query(
            `UPDATE door_templates 
            SET ${updateFields.join(', ')}
            WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: "Cập nhật template thành công",
            data: { id: parseInt(id) }
        });
    } catch (err) {
        console.error("Error updating full template:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error: " + err.message 
        });
    }
};

/**
 * Import template từ file JSON
 * POST /api/door-templates/full/import
 */
exports.importFullTemplate = async (req, res) => {
    try {
        const templateData = req.body;

        // Validate structure
        if (!templateData.meta || !templateData.meta.template_code) {
            return res.status(400).json({
                success: false,
                message: "Template phải có meta.template_code"
            });
        }

        // Gọi createFullTemplate logic
        const createReq = {
            body: templateData
        };
        const createRes = {
            status: (code) => ({
                json: (data) => {
                    if (code === 201) {
                        res.status(201).json(data);
                    } else {
                        res.status(code).json(data);
                    }
                }
            }),
            json: (data) => res.json(data)
        };

        await exports.createFullTemplate(createReq, createRes);
    } catch (err) {
        console.error("Error importing full template:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error: " + err.message 
        });
    }
};














































































