/**
 * =====================================================
 * DESIGN UNIT CONTROLLER
 * =====================================================
 * 
 * CRUD cho Design Units với State Machine enforcement
 * 
 * Rules:
 * - Chỉ được edit khi revision ở trạng thái EDITING
 * - Backend enforce, không chỉ UI
 * 
 * @author ViralWindow Development Team
 */

const db = require('../config/db');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const {
    DESIGN_STATES,
    DesignStateMachine,
    ConcurrencyControl,
    AuditLogger
} = require('../services/designStateMachine');

// =====================================================
// GET UNITS BY REVISION
// =====================================================
exports.getByRevision = async (req, res) => {
    try {
        const { revisionId } = req.params;

        const [units] = await db.query(`
            SELECT * FROM design_units 
            WHERE design_revision_id = ? 
            ORDER BY unit_code
        `, [revisionId]);

        res.json({ success: true, data: units });
    } catch (error) {
        console.error('Error getting units:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// GET UNIT BY ID
// =====================================================
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const [units] = await db.query(`
            SELECT u.*, dr.status AS revision_status
            FROM design_units u
            JOIN design_revisions dr ON u.design_revision_id = dr.id
            WHERE u.id = ?
        `, [id]);

        if (units.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy unit' });
        }

        const unit = units[0];
        unit.can_edit = unit.revision_status === DESIGN_STATES.EDITING;

        res.json({ success: true, data: unit });
    } catch (error) {
        console.error('Error getting unit:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// CREATE UNIT
// =====================================================
exports.create = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { revisionId } = req.params;
        const user = req.user;
        const {
            unit_code, unit_type, width, height, depth, qty,
            profile_system_id, profile_system, profile_color,
            glass_type_id, glass_type, glass_thickness,
            hardware_set_id, hardware_set, num_panels, opening_direction,
            position_note, install_note, spec_json
        } = req.body;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get revision and check status
        const [revisions] = await connection.query(
            'SELECT * FROM design_revisions WHERE id = ? FOR UPDATE',
            [revisionId]
        );

        if (revisions.length === 0) {
            throw new Error('Không tìm thấy revision');
        }

        const revision = revisions[0];

        // ✅ BACKEND ENFORCE: Chỉ cho edit khi EDITING
        const canEdit = DesignStateMachine.canEditUnit(revision);
        if (!canEdit.allowed) {
            throw new Error(canEdit.reason);
        }

        // Check duplicate unit_code
        const [existing] = await connection.query(
            'SELECT id FROM design_units WHERE design_revision_id = ? AND unit_code = ?',
            [revisionId, unit_code]
        );

        if (existing.length > 0) {
            throw new Error(`Mã unit "${unit_code}" đã tồn tại trong revision này`);
        }

        // Insert unit
        const [result] = await connection.query(`
            INSERT INTO design_units 
            (design_revision_id, unit_code, unit_type, width, height, depth, qty,
             profile_system_id, profile_system, profile_color,
             glass_type_id, glass_type, glass_thickness,
             hardware_set_id, hardware_set, num_panels, opening_direction,
             position_note, install_note, spec_json, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            revisionId, unit_code, unit_type, width, height, depth, qty || 1,
            profile_system_id, profile_system, profile_color,
            glass_type_id, glass_type, glass_thickness,
            hardware_set_id, hardware_set, num_panels || 1, opening_direction,
            position_note, install_note, spec_json ? JSON.stringify(spec_json) : null, user.id
        ]);

        const unitId = result.insertId;

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, new_values, user_id, user_name, created_at)
            VALUES (?, 'unit', ?, 'created', ?, ?, ?, NOW())
        `, [requestId, unitId, JSON.stringify({ unit_code, unit_type, width, height }), user.id, user.full_name]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Tạo unit thành công',
            data: { id: unitId, unit_code }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creating unit:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// UPDATE UNIT (với Optimistic Locking)
// =====================================================
exports.update = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { id } = req.params;
        const user = req.user;
        const updates = req.body;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get unit with revision
        const [units] = await connection.query(`
            SELECT u.*, dr.status AS revision_status, dr.id AS revision_id
            FROM design_units u
            JOIN design_revisions dr ON u.design_revision_id = dr.id
            WHERE u.id = ?
            FOR UPDATE
        `, [id]);

        if (units.length === 0) {
            throw new Error('Không tìm thấy unit');
        }

        const unit = units[0];

        // ✅ BACKEND ENFORCE: Chỉ cho edit khi EDITING
        if (unit.revision_status !== DESIGN_STATES.EDITING) {
            throw new Error(`Không thể chỉnh sửa unit khi thiết kế đang ở trạng thái "${unit.revision_status}". Vui lòng tạo revision mới.`);
        }

        // ✅ Optimistic Locking
        if (updates.row_version && updates.row_version !== unit.row_version) {
            throw new Error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng refresh và thử lại.');
        }

        // Build update query
        const allowedFields = [
            'unit_code', 'unit_type', 'width', 'height', 'depth', 'qty',
            'profile_system_id', 'profile_system', 'profile_color',
            'glass_type_id', 'glass_type', 'glass_thickness',
            'hardware_set_id', 'hardware_set', 'num_panels', 'opening_direction',
            'position_note', 'install_note', 'spec_json'
        ];

        const updateFields = [];
        const updateValues = [];
        const oldValues = {};
        const newValues = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                updateValues.push(field === 'spec_json' ? JSON.stringify(updates[field]) : updates[field]);
                oldValues[field] = unit[field];
                newValues[field] = updates[field];
            }
        }

        if (updateFields.length === 0) {
            throw new Error('Không có dữ liệu để cập nhật');
        }

        updateFields.push('row_version = row_version + 1');
        updateFields.push('updated_at = NOW()');
        updateValues.push(id, unit.row_version);

        const [result] = await connection.query(
            `UPDATE design_units SET ${updateFields.join(', ')} WHERE id = ? AND row_version = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            throw new Error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng refresh và thử lại.');
        }

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, old_values, new_values, user_id, user_name, created_at)
            VALUES (?, 'unit', ?, 'updated', ?, ?, ?, ?, NOW())
        `, [requestId, id, JSON.stringify(oldValues), JSON.stringify(newValues), user.id, user.full_name]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Cập nhật unit thành công',
            data: { id, new_row_version: unit.row_version + 1 }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error updating unit:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// DELETE UNIT
// =====================================================
exports.delete = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { id } = req.params;
        const user = req.user;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get unit with revision
        const [units] = await connection.query(`
            SELECT u.*, dr.status AS revision_status
            FROM design_units u
            JOIN design_revisions dr ON u.design_revision_id = dr.id
            WHERE u.id = ?
        `, [id]);

        if (units.length === 0) {
            throw new Error('Không tìm thấy unit');
        }

        const unit = units[0];

        // ✅ BACKEND ENFORCE: Chỉ cho xóa khi EDITING
        if (unit.revision_status !== DESIGN_STATES.EDITING) {
            throw new Error(`Không thể xóa unit khi thiết kế đang ở trạng thái "${unit.revision_status}". Vui lòng tạo revision mới.`);
        }

        // Delete unit
        await connection.query('DELETE FROM design_units WHERE id = ?', [id]);

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, old_values, user_id, user_name, created_at)
            VALUES (?, 'unit', ?, 'deleted', ?, ?, ?, NOW())
        `, [requestId, id, JSON.stringify({ unit_code: unit.unit_code }), user.id, user.full_name]);

        await connection.commit();

        res.json({
            success: true,
            message: `Đã xóa unit "${unit.unit_code}"`
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error deleting unit:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// BULK CREATE FROM TEMPLATE
// =====================================================
exports.bulkCreate = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { revisionId } = req.params;
        const { units } = req.body; // Array of units
        const user = req.user;

        if (!units || !Array.isArray(units) || units.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách units rỗng' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get revision and check status
        const [revisions] = await connection.query(
            'SELECT * FROM design_revisions WHERE id = ?',
            [revisionId]
        );

        if (revisions.length === 0) {
            throw new Error('Không tìm thấy revision');
        }

        const revision = revisions[0];

        // ✅ BACKEND ENFORCE
        if (revision.status !== DESIGN_STATES.EDITING) {
            throw new Error(`Không thể thêm units khi thiết kế đang ở trạng thái "${revision.status}"`);
        }

        const createdUnits = [];

        for (const unit of units) {
            const [result] = await connection.query(`
                INSERT INTO design_units 
                (design_revision_id, unit_code, unit_type, width, height, qty,
                 profile_system, profile_color, glass_type, glass_thickness,
                 hardware_set, num_panels, opening_direction, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                revisionId, unit.unit_code, unit.unit_type, unit.width, unit.height, unit.qty || 1,
                unit.profile_system, unit.profile_color, unit.glass_type, unit.glass_thickness,
                unit.hardware_set, unit.num_panels || 1, unit.opening_direction, user.id
            ]);

            createdUnits.push({ id: result.insertId, unit_code: unit.unit_code });
        }

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, new_values, user_id, user_name, created_at)
            VALUES (?, 'revision', ?, 'bulk_units_created', ?, ?, ?, NOW())
        `, [requestId, revisionId, JSON.stringify({ count: createdUnits.length }), user.id, user.full_name]);

        await connection.commit();

        res.json({
            success: true,
            message: `Đã tạo ${createdUnits.length} units`,
            data: createdUnits
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error bulk creating units:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};
