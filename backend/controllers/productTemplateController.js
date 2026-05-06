const db = require("../config/db");
const productBomService = require("../services/productBomService");

// ============================================
// PRODUCT TEMPLATE CONTROLLER
// Quản lý tất cả loại sản phẩm (cửa, lan can, mái, cầu thang...)
// ============================================

/**
 * Lấy tất cả templates, có thể filter theo product_type, family, category
 */
exports.getAllTemplates = async (req, res) => {
    try {
        const { product_type, family, category, aluminum_system, search, limit = 100 } = req.query;

        let query = `
            SELECT 
                id, code, name, product_type, category, sub_type, family,
                aluminum_system, aluminum_system_id, preview_image,
                param_schema, default_width_mm, default_height_mm, glass_type,
                description, is_active, display_order, created_at, updated_at
            FROM product_templates 
            WHERE is_active = 1
        `;
        const params = [];

        if (product_type) {
            query += ` AND product_type = ?`;
            params.push(product_type);
        }

        if (family) {
            query += ` AND family = ?`;
            params.push(family);
        }

        if (category) {
            query += ` AND category = ?`;
            params.push(category);
        }

        if (aluminum_system) {
            query += ` AND aluminum_system = ?`;
            params.push(aluminum_system);
        }

        if (search) {
            query += ` AND (name LIKE ? OR code LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY product_type, display_order, name LIMIT ?`;
        params.push(parseInt(limit));

        const [templates] = await db.query(query, params);

        res.json({
            success: true,
            data: templates,
            count: templates.length
        });
    } catch (err) {
        console.error("Error getting templates:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Lấy danh sách product types và categories
 */
exports.getProductTypes = async (req, res) => {
    try {
        const [types] = await db.query(`
            SELECT 
                product_type,
                COUNT(*) as template_count
            FROM product_templates 
            WHERE is_active = 1
            GROUP BY product_type
            ORDER BY 
                FIELD(product_type, 'door', 'window', 'glass_wall', 'railing', 'roof', 'stair', 'other')
        `);

        const [categories] = await db.query(`
            SELECT 
                product_type,
                category,
                COUNT(*) as count
            FROM product_templates 
            WHERE is_active = 1
            GROUP BY product_type, category
            ORDER BY product_type, category
        `);

        // Định nghĩa tên tiếng Việt cho product types
        const typeLabels = {
            door: 'Cửa đi',
            window: 'Cửa sổ',
            glass_wall: 'Vách kính',
            railing: 'Lan can',
            roof: 'Mái kính',
            stair: 'Cầu thang',
            other: 'Khác'
        };

        res.json({
            success: true,
            data: {
                types: types.map(t => ({
                    ...t,
                    label: typeLabels[t.product_type] || t.product_type
                })),
                categories
            }
        });
    } catch (err) {
        console.error("Error getting product types:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Lấy danh sách families cho một product_type
 */
exports.getFamilies = async (req, res) => {
    try {
        const { product_type } = req.query;

        let query = `
            SELECT DISTINCT family, category, COUNT(*) as count
            FROM product_templates 
            WHERE is_active = 1
        `;
        const params = [];

        if (product_type) {
            query += ` AND product_type = ?`;
            params.push(product_type);
        }

        query += ` GROUP BY family, category ORDER BY family`;

        const [families] = await db.query(query, params);

        res.json({
            success: true,
            data: families
        });
    } catch (err) {
        console.error("Error getting families:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Lấy template theo ID
 */
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const [templates] = await db.query(`
            SELECT * FROM product_templates WHERE id = ?
        `, [id]);

        if (templates.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy mẫu sản phẩm"
            });
        }

        const template = templates[0];

        // Parse JSON fields
        if (template.template_json && typeof template.template_json === 'string') {
            try { template.template_json = JSON.parse(template.template_json); } catch (e) { }
        }
        if (template.param_schema && typeof template.param_schema === 'string') {
            try { template.param_schema = JSON.parse(template.param_schema); } catch (e) { }
        }
        if (template.structure_json && typeof template.structure_json === 'string') {
            try { template.structure_json = JSON.parse(template.structure_json); } catch (e) { }
        }
        if (template.bom_rules && typeof template.bom_rules === 'string') {
            try { template.bom_rules = JSON.parse(template.bom_rules); } catch (e) { }
        }

        res.json({
            success: true,
            data: template
        });
    } catch (err) {
        console.error("Error getting template:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Tạo template mới
 */
exports.create = async (req, res) => {
    try {
        const {
            code, name, product_type, category, sub_type, family,
            aluminum_system, aluminum_system_id, preview_image,
            template_json, param_schema, structure_json, bom_rules,
            default_width_mm, default_height_mm, glass_type,
            description, display_order
        } = req.body;

        // Validate required fields
        if (!code || !name || !product_type || !category || !aluminum_system) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng điền đầy đủ: mã, tên, loại sản phẩm, category, hệ nhôm"
            });
        }

        // Check duplicate code
        const [existing] = await db.query(
            "SELECT id FROM product_templates WHERE code = ?",
            [code]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Mã template "${code}" đã tồn tại`
            });
        }

        const [result] = await db.query(`
            INSERT INTO product_templates (
                code, name, product_type, category, sub_type, family,
                aluminum_system, aluminum_system_id, preview_image,
                template_json, param_schema, structure_json, bom_rules,
                default_width_mm, default_height_mm, glass_type,
                description, display_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            code, name, product_type, category, sub_type || null, family || null,
            aluminum_system, aluminum_system_id || null, preview_image || null,
            template_json ? JSON.stringify(template_json) : null,
            param_schema ? JSON.stringify(param_schema) : null,
            structure_json ? JSON.stringify(structure_json) : null,
            bom_rules ? JSON.stringify(bom_rules) : null,
            default_width_mm || 1200, default_height_mm || 2200, glass_type || null,
            description || null, display_order || 0
        ]);

        res.status(201).json({
            success: true,
            message: "Tạo mẫu sản phẩm thành công",
            data: { id: result.insertId, code }
        });
    } catch (err) {
        console.error("Error creating template:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Cập nhật template
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Build dynamic update query
        const allowedFields = [
            'name', 'product_type', 'category', 'sub_type', 'family',
            'aluminum_system', 'aluminum_system_id', 'preview_image',
            'template_json', 'param_schema', 'structure_json', 'bom_rules',
            'default_width_mm', 'default_height_mm', 'glass_type',
            'description', 'display_order', 'is_active'
        ];

        const updates = [];
        const params = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);

                // Stringify JSON fields
                if (['template_json', 'param_schema', 'structure_json', 'bom_rules'].includes(field)) {
                    params.push(updateData[field] ? JSON.stringify(updateData[field]) : null);
                } else {
                    params.push(updateData[field]);
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có dữ liệu để cập nhật"
            });
        }

        params.push(id);

        const [result] = await db.query(
            `UPDATE product_templates SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy mẫu sản phẩm"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật thành công"
        });
    } catch (err) {
        console.error("Error updating template:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Xóa template (soft delete)
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if template is used in any project
        const [usages] = await db.query(
            "SELECT COUNT(*) as count FROM project_items WHERE product_template_id = ?",
            [id]
        );

        if (usages[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Không thể xóa - mẫu này đang được sử dụng trong ${usages[0].count} dự án`
            });
        }

        const [result] = await db.query(
            "UPDATE product_templates SET is_active = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy mẫu sản phẩm"
            });
        }

        res.json({
            success: true,
            message: "Đã xóa mẫu sản phẩm"
        });
    } catch (err) {
        console.error("Error deleting template:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Preview BOM cho một template
 */
exports.getBomPreview = async (req, res) => {
    try {
        const { id } = req.params;
        const { width_mm, height_mm, aluminum_system } = req.query;

        const [templates] = await db.query(
            "SELECT * FROM product_templates WHERE id = ?",
            [id]
        );

        if (templates.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy mẫu sản phẩm"
            });
        }

        const template = templates[0];
        const widthMm = parseInt(width_mm) || template.default_width_mm || 1200;
        const heightMm = parseInt(height_mm) || template.default_height_mm || 2200;
        const system = aluminum_system || template.aluminum_system;

        let bom = null;

        try {
            // Parse JSON fields
            const templateJson = template.template_json
                ? (typeof template.template_json === 'string' ? JSON.parse(template.template_json) : template.template_json)
                : null;
            const structureJson = template.structure_json
                ? (typeof template.structure_json === 'string' ? JSON.parse(template.structure_json) : template.structure_json)
                : null;

            bom = await productBomService.generateDoorBomFromTemplate({
                templateJson,
                structureJson,
                widthMm,
                heightMm,
                aluminumSystemIdOrCode: system
            });
        } catch (e) {
            console.log("Using fallback BOM calculation:", e.message);
            bom = calculateBasicBom(template, widthMm, heightMm, system);
        }

        res.json({
            success: true,
            data: {
                template_id: id,
                template_name: template.name,
                product_type: template.product_type,
                dimensions: { width_mm: widthMm, height_mm: heightMm },
                aluminum_system: system,
                bom
            }
        });
    } catch (err) {
        console.error("Error getting BOM preview:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

/**
 * Lấy danh sách hệ nhôm có sẵn
 */
exports.getAvailableSystems = async (req, res) => {
    try {
        const [systems] = await db.query(`
            SELECT DISTINCT aluminum_system, aluminum_system_id, COUNT(*) as template_count
            FROM product_templates 
            WHERE is_active = 1
            GROUP BY aluminum_system, aluminum_system_id
            ORDER BY aluminum_system
        `);

        res.json({
            success: true,
            data: systems
        });
    } catch (err) {
        console.error("Error getting systems:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateBasicBom(template, widthMm, heightMm, system) {
    const FRAME_WIDTH = 70;
    const GLASS_CLEARANCE = 8;

    const bom = {
        profiles: [],
        glass: [],
        accessories: []
    };

    // Khung bao
    bom.profiles.push({
        code: `${system}_KHUNG_DUNG`,
        name: 'Khung bao đứng',
        qty: 2,
        length_mm: heightMm,
        total_length_m: Math.round(2 * heightMm / 10) / 100
    });
    bom.profiles.push({
        code: `${system}_KHUNG_NGANG`,
        name: 'Khung bao ngang',
        qty: 2,
        length_mm: widthMm - 2 * FRAME_WIDTH,
        total_length_m: Math.round(2 * (widthMm - 2 * FRAME_WIDTH) / 10) / 100
    });

    // Kính
    const glassW = widthMm - 2 * (FRAME_WIDTH + GLASS_CLEARANCE);
    const glassH = heightMm - 2 * (FRAME_WIDTH + GLASS_CLEARANCE);
    bom.glass.push({
        code: 'KINH_8MM',
        name: template.glass_type || 'Kính 8mm',
        qty: 1,
        width_mm: glassW,
        height_mm: glassH,
        area_m2: Math.round(glassW * glassH / 10000) / 100
    });

    // Phụ kiện cơ bản dựa trên product_type
    if (template.product_type === 'door' || template.product_type === 'window') {
        bom.accessories.push(
            { code: 'BAN_LE', name: 'Bản lề', qty: 3 },
            { code: 'TAY_NAM', name: 'Tay nắm', qty: 1 },
            { code: 'KHOA', name: 'Khóa', qty: 1 }
        );
    } else if (template.product_type === 'railing') {
        bom.accessories.push(
            { code: 'KEP_KINH', name: 'Kẹp kính', qty: Math.ceil(widthMm / 333) },
            { code: 'TRU_INOX', name: 'Trụ inox', qty: Math.ceil(widthMm / 1000) }
        );
    }

    // Gioăng
    bom.accessories.push({
        code: 'GIOANG',
        name: 'Gioăng',
        qty: Math.round((widthMm + heightMm) * 2 / 100) / 10,
        unit: 'm'
    });

    return bom;
}

module.exports = exports;
