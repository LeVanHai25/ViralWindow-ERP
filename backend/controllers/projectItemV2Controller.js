/**
 * =====================================================
 * PROJECT ITEMS V2 CONTROLLER
 * ACT Style Architecture
 * =====================================================
 */

const db = require('../config/db');
const calcEngine = require('../services/calcEngineV2');

/**
 * GET /api/v2/project-items
 * Lấy danh sách project items (filter by project_id, item_type, status)
 */
exports.getAll = async (req, res) => {
    try {
        const { project_id, item_type, status } = req.query;

        let query = `
            SELECT 
                pi.*,
                iv.version_number as current_version_number,
                ic.width_mm, ic.height_mm, ic.length_mm, ic.leaf_count, ic.aluminum_system
            FROM project_items_v2 pi
            LEFT JOIN item_versions iv ON pi.current_version_id = iv.id
            LEFT JOIN item_config ic ON iv.id = ic.item_version_id
            WHERE 1=1
        `;
        const params = [];

        if (project_id) {
            query += ' AND pi.project_id = ?';
            params.push(project_id);
        }
        if (item_type) {
            query += ' AND pi.item_type = ?';
            params.push(item_type);
        }
        if (status) {
            query += ' AND pi.status = ?';
            params.push(status);
        }

        query += ' ORDER BY pi.created_at DESC';

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/v2/project-items/:id
 * Lấy chi tiết 1 project item với tất cả structure
 */
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy item
        const [items] = await db.query(`
            SELECT pi.*, p.project_name, c.full_name as customer_name
            FROM project_items_v2 pi
            LEFT JOIN projects p ON pi.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE pi.id = ?
        `, [id]);

        if (items.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const item = items[0];

        // Lấy current version
        const [versions] = await db.query(`
            SELECT * FROM item_versions 
            WHERE project_item_id = ? 
            ORDER BY version_number DESC LIMIT 1
        `, [id]);
        const version = versions[0];

        let config = null, structures = {};

        if (version) {
            // Lấy config
            const [configs] = await db.query(
                'SELECT * FROM item_config WHERE item_version_id = ?',
                [version.id]
            );
            config = configs[0];

            // Lấy structures
            const [aluminum] = await db.query(
                'SELECT * FROM item_structure_aluminum WHERE item_version_id = ? ORDER BY sort_order',
                [version.id]
            );
            const [glass] = await db.query(
                'SELECT * FROM item_structure_glass WHERE item_version_id = ? ORDER BY sort_order',
                [version.id]
            );
            const [hardware] = await db.query(
                'SELECT * FROM item_structure_hardware WHERE item_version_id = ? ORDER BY sort_order',
                [version.id]
            );
            const [consumables] = await db.query(
                'SELECT * FROM item_structure_consumables WHERE item_version_id = ? ORDER BY sort_order',
                [version.id]
            );

            structures = { aluminum, glass, hardware, consumables };
        }

        res.json({
            success: true,
            data: {
                item,
                version,
                config,
                structures
            }
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/v2/project-items
 * Tạo mới project item
 */
exports.create = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const {
            project_id,
            item_type = 'door',
            item_code,
            item_name,
            quantity = 1,
            source_type = 'manual',
            source_quotation_id,
            source_quotation_item_id,
            notes,
            // Config
            width_mm,
            height_mm,
            length_mm,
            depth_mm,
            slope_deg,
            leaf_count,
            open_direction,
            open_style,
            span_count,
            aluminum_system,
            default_glass_type,
            extra_params
        } = req.body;

        // 1. Tạo project_item
        const [itemResult] = await connection.query(`
            INSERT INTO project_items_v2 
            (project_id, item_type, item_code, item_name, quantity, 
             source_type, source_quotation_id, source_quotation_item_id, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        `, [project_id, item_type, item_code, item_name, quantity,
            source_type, source_quotation_id, source_quotation_item_id, notes]);

        const projectItemId = itemResult.insertId;

        // 2. Tạo version đầu tiên
        const [versionResult] = await connection.query(`
            INSERT INTO item_versions (project_item_id, version_number, status)
            VALUES (?, 1, 'draft')
        `, [projectItemId]);

        const versionId = versionResult.insertId;

        // 3. Tạo config
        await connection.query(`
            INSERT INTO item_config 
            (item_version_id, width_mm, height_mm, length_mm, depth_mm, slope_deg,
             leaf_count, open_direction, open_style, span_count, aluminum_system,
             default_glass_type, extra_params)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [versionId, width_mm, height_mm, length_mm, depth_mm, slope_deg,
            leaf_count, open_direction, open_style, span_count, aluminum_system,
            default_glass_type, JSON.stringify(extra_params)]);

        // 4. Update current_version_id
        await connection.query(`
            UPDATE project_items_v2 SET current_version_id = ?, status = 'configured'
            WHERE id = ?
        `, [versionId, projectItemId]);

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Project item created',
            data: {
                id: projectItemId,
                version_id: versionId
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

/**
 * PUT /api/v2/project-items/:id/config
 * Cập nhật config (tạo version mới)
 */
exports.updateConfig = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { id } = req.params;
        const configData = req.body;
        const createNewVersion = req.query.new_version === 'true';

        // Lấy item
        const [items] = await connection.query(
            'SELECT * FROM project_items_v2 WHERE id = ?',
            [id]
        );
        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        let versionId;

        if (createNewVersion) {
            // Tạo version mới
            const [versionResult] = await connection.query(`
                INSERT INTO item_versions (project_item_id, version_number, status)
                SELECT ?, COALESCE(MAX(version_number), 0) + 1, 'draft'
                FROM item_versions WHERE project_item_id = ?
            `, [id, id]);
            versionId = versionResult.insertId;

            // Copy config từ version cũ
            await connection.query(`
                INSERT INTO item_config (item_version_id, width_mm, height_mm, length_mm,
                    depth_mm, slope_deg, leaf_count, open_direction, open_style, span_count,
                    aluminum_system, default_glass_type, extra_params)
                SELECT ?, width_mm, height_mm, length_mm, depth_mm, slope_deg, leaf_count,
                    open_direction, open_style, span_count, aluminum_system, default_glass_type, extra_params
                FROM item_config WHERE item_version_id = ?
            `, [versionId, items[0].current_version_id]);

            // Update current_version_id
            await connection.query(
                'UPDATE project_items_v2 SET current_version_id = ? WHERE id = ?',
                [versionId, id]
            );
        } else {
            versionId = items[0].current_version_id;
        }

        // Update config
        const updateFields = [];
        const updateParams = [];

        for (const [key, value] of Object.entries(configData)) {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                updateParams.push(key === 'extra_params' ? JSON.stringify(value) : value);
            }
        }

        if (updateFields.length > 0) {
            updateParams.push(versionId);
            await connection.query(`
                UPDATE item_config SET ${updateFields.join(', ')}
                WHERE item_version_id = ?
            `, updateParams);
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Config updated',
            data: { version_id: versionId }
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

/**
 * POST /api/v2/project-items/:id/calculate-bom
 * Tính BOM cho item
 */
exports.calculateBOM = async (req, res) => {
    try {
        const { id } = req.params;
        const { version_id, save = false } = req.body;

        const result = await calcEngine.calculateBOM(parseInt(id), version_id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Lưu nếu được yêu cầu
        if (save) {
            const saveResult = await calcEngine.saveBOM(parseInt(id), result.version.id, result);
            result.saved = saveResult.success;
            result.bom_version_id = saveResult.bom_version_id;
        }

        res.json(result);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/v2/project-items/:id/bom
 * Lấy BOM đã lưu
 */
exports.getBOM = async (req, res) => {
    try {
        const { id } = req.params;
        const { version } = req.query;

        let query = `
            SELECT * FROM item_bom_versions 
            WHERE project_item_id = ?
        `;
        const params = [id];

        if (version) {
            query += ' AND bom_version_number = ?';
            params.push(version);
        } else {
            query += ' ORDER BY bom_version_number DESC LIMIT 1';
        }

        const [bomVersions] = await db.query(query, params);

        if (bomVersions.length === 0) {
            return res.status(404).json({ success: false, message: 'No BOM found' });
        }

        const bomVersion = bomVersions[0];

        // Lấy BOM lines
        const [lines] = await db.query(`
            SELECT * FROM item_bom_lines 
            WHERE bom_version_id = ?
            ORDER BY material_group, sort_order
        `, [bomVersion.id]);

        // Group by material_group
        const grouped = {
            aluminum: lines.filter(l => l.material_group === 'aluminum'),
            glass: lines.filter(l => l.material_group === 'glass'),
            hardware: lines.filter(l => l.material_group === 'hardware'),
            consumables: lines.filter(l => l.material_group === 'consumable')
        };

        res.json({
            success: true,
            data: {
                bom_version: bomVersion,
                lines: grouped
            }
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * DELETE /api/v2/project-items/:id
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM project_items_v2 WHERE id = ?', [id]);
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/v2/rules
 * Lấy rules theo item_type
 */
exports.getRules = async (req, res) => {
    try {
        const { item_type, aluminum_system } = req.query;

        if (!item_type) {
            return res.status(400).json({ success: false, message: 'item_type required' });
        }

        const rules = await calcEngine.loadRules(item_type, aluminum_system);

        res.json({
            success: true,
            data: rules
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/v2/templates
 * Lấy danh sách templates
 */
exports.getTemplates = async (req, res) => {
    try {
        const { item_type, system_code } = req.query;

        let query = `
            SELECT 
                template_code, template_name, item_type, system_code,
                default_width_mm, default_height_mm, thumbnail_url
            FROM item_structure_templates 
            WHERE is_active = 1
        `;
        const params = [];

        if (item_type) {
            query += ` AND item_type = ?`;
            params.push(item_type);
        }
        if (system_code) {
            query += ` AND system_code = ?`;
            params.push(system_code);
        }

        query += ` ORDER BY item_type, template_code`;

        const [templates] = await db.query(query, params);

        res.json({
            success: true,
            count: templates.length,
            data: templates
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
