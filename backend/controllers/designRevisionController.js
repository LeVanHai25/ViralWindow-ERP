/**
 * =====================================================
 * DESIGN REVISION CONTROLLER
 * =====================================================
 * 
 * API Controller cho Design Workflow với State Machine
 * 
 * Endpoints:
 * - GET    /api/design-revisions
 * - GET    /api/design-revisions/:id
 * - POST   /api/design-revisions
 * - POST   /api/design-revisions/:id/receive
 * - POST   /api/design-revisions/:id/assign
 * - POST   /api/design-revisions/:id/start-editing
 * - POST   /api/design-revisions/:id/lock
 * - POST   /api/design-revisions/:id/create-revision
 * 
 * @author ViralWindow Development Team
 * @version 2.0 (Senior Reviewed)
 */

const db = require('../config/db');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const {
    DESIGN_STATES,
    STATE_LABELS,
    DesignStateMachine,
    BusinessRules,
    ConcurrencyControl,
    AuditLogger
} = require('../services/designStateMachine');

// =====================================================
// GET ALL REVISIONS
// =====================================================
exports.getAll = async (req, res) => {
    try {
        const { project_id, status, is_active } = req.query;

        let sql = `
            SELECT 
                dr.*,
                p.project_code,
                p.project_name,
                u1.full_name AS assigned_to_name,
                u2.full_name AS locked_by_name,
                u3.full_name AS created_by_name,
                (SELECT COUNT(*) FROM design_units WHERE design_revision_id = dr.id) AS unit_count,
                (SELECT COUNT(*) FROM design_files WHERE revision_id = dr.id) AS file_count
            FROM design_revisions dr
            LEFT JOIN projects p ON dr.project_id = p.id
            LEFT JOIN users u1 ON dr.assigned_to = u1.id
            LEFT JOIN users u2 ON dr.locked_by = u2.id
            LEFT JOIN users u3 ON dr.created_by = u3.id
            WHERE 1=1
        `;
        const params = [];

        if (project_id) {
            sql += ' AND dr.project_id = ?';
            params.push(project_id);
        }
        if (status) {
            sql += ' AND dr.status = ?';
            params.push(status);
        }
        if (is_active !== undefined) {
            sql += ' AND dr.is_active = ?';
            params.push(is_active === 'true' || is_active === '1');
        }

        sql += ' ORDER BY dr.created_at DESC';

        const [rows] = await db.query(sql, params);

        res.json({
            success: true,
            data: rows.map(row => ({
                ...row,
                status_label: STATE_LABELS[row.status]
            }))
        });
    } catch (error) {
        console.error('Error getting design revisions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// GET BY ID (with units, files, bom)
// =====================================================
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        // Get revision
        const [revisions] = await db.query(`
            SELECT 
                dr.*,
                p.project_code,
                p.project_name,
                c.full_name AS customer_name,
                u1.full_name AS assigned_to_name,
                u2.full_name AS locked_by_name,
                u3.full_name AS created_by_name,
                u4.full_name AS approved_by_name
            FROM design_revisions dr
            LEFT JOIN projects p ON dr.project_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN users u1 ON dr.assigned_to = u1.id
            LEFT JOIN users u2 ON dr.locked_by = u2.id
            LEFT JOIN users u3 ON dr.created_by = u3.id
            LEFT JOIN users u4 ON dr.approved_by = u4.id
            WHERE dr.id = ?
        `, [id]);

        if (revisions.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy revision' });
        }

        const revision = revisions[0];

        // Get units
        const [units] = await db.query(`
            SELECT * FROM design_units 
            WHERE design_revision_id = ? 
            ORDER BY unit_code
        `, [id]);

        // Get files
        const [files] = await db.query(`
            SELECT * FROM design_files 
            WHERE revision_id = ? 
            ORDER BY uploaded_at DESC
        `, [id]);

        // Get BOM if exists
        const [boms] = await db.query(`
            SELECT * FROM design_bom 
            WHERE design_revision_id = ? 
            ORDER BY bom_version DESC
            LIMIT 1
        `, [id]);

        let bomLines = [];
        if (boms.length > 0) {
            const [lines] = await db.query(`
                SELECT 
                    bl.*,
                    du.unit_code AS source_unit_code
                FROM design_bom_lines bl
                LEFT JOIN design_units du ON bl.source_unit_id = du.id
                WHERE bl.bom_id = ?
                ORDER BY bl.material_type, bl.material_code_snapshot
            `, [boms[0].id]);
            bomLines = lines;
        }

        // Get PRs
        const [prs] = await db.query(`
            SELECT * FROM design_purchase_requests 
            WHERE design_revision_id = ? 
            ORDER BY created_at DESC
        `, [id]);

        // Get audit logs
        const [logs] = await db.query(`
            SELECT * FROM design_audit_logs 
            WHERE entity_type = 'revision' AND entity_id = ? 
            ORDER BY created_at DESC
            LIMIT 20
        `, [id]);

        // Get checklist validation
        const checklistResult = await DesignStateMachine.validateLockChecklist(id);

        res.json({
            success: true,
            data: {
                ...revision,
                status_label: STATE_LABELS[revision.status],
                can_edit: DesignStateMachine.canEditRevision(revision),
                units,
                files,
                bom: boms[0] || null,
                bom_lines: bomLines,
                purchase_requests: prs,
                audit_logs: logs,
                lock_checklist: checklistResult
            }
        });
    } catch (error) {
        console.error('Error getting design revision:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// CREATE NEW REVISION
// =====================================================
exports.create = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { project_id, notes } = req.body;
        const user = req.user;

        if (!project_id) {
            return res.status(400).json({ success: false, message: 'project_id là bắt buộc' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Deactivate existing active revisions
        await connection.query(
            'UPDATE design_revisions SET is_active = FALSE WHERE project_id = ? AND is_active = TRUE',
            [project_id]
        );

        // Get next revision number
        const [maxRev] = await connection.query(
            'SELECT MAX(revision_no) AS max_rev FROM design_revisions WHERE project_id = ?',
            [project_id]
        );
        const revisionNo = (maxRev[0].max_rev || 0) + 1;

        // Create new revision
        const [result] = await connection.query(`
            INSERT INTO design_revisions 
            (project_id, revision_no, status, is_active, notes, created_by, created_at)
            VALUES (?, ?, 'received', TRUE, ?, ?, NOW())
        `, [project_id, revisionNo, notes, user.id]);

        const revisionId = result.insertId;

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, new_values, user_id, user_name, created_at)
            VALUES (?, 'revision', ?, 'created', ?, ?, ?, NOW())
        `, [requestId, revisionId, JSON.stringify({ project_id, revision_no: revisionNo }), user.id, user.full_name]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Tạo revision thành công',
            data: { id: revisionId, revision_no: revisionNo }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creating design revision:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// RECEIVE FILES (RECEIVED state)
// =====================================================
exports.receive = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { id } = req.params;
        const { received_channel, received_notes, input_checklist } = req.body;
        const user = req.user;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get current revision
        const [revisions] = await connection.query(
            'SELECT * FROM design_revisions WHERE id = ? FOR UPDATE',
            [id]
        );

        if (revisions.length === 0) {
            throw new Error('Không tìm thấy revision');
        }

        const revision = revisions[0];

        // Update revision
        await connection.query(`
            UPDATE design_revisions 
            SET received_by = ?, received_at = NOW(), received_channel = ?, 
                received_notes = ?, input_checklist = ?, row_version = row_version + 1
            WHERE id = ? AND row_version = ?
        `, [user.id, received_channel, received_notes, JSON.stringify(input_checklist), id, revision.row_version]);

        // Audit log
        await AuditLogger.log('revision', id, 'received', null, {
            received_channel,
            received_notes
        }, user, null, requestId);

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã nhận thiết kế từ khách hàng'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error receiving design:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// ASSIGN DESIGNER
// =====================================================
exports.assign = async (req, res) => {
    const requestId = uuidv4();

    try {
        const { id } = req.params;
        const { assigned_to, deadline_at } = req.body;
        const user = req.user;

        if (!DesignStateMachine.hasPermission('assign', user.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền phân công' });
        }

        const [result] = await db.query(`
            UPDATE design_revisions 
            SET assigned_to = ?, deadline_at = ?, row_version = row_version + 1
            WHERE id = ?
        `, [assigned_to, deadline_at, id]);

        // Audit log
        await AuditLogger.log('revision', id, 'assigned', null, {
            assigned_to,
            deadline_at
        }, user, null, requestId);

        res.json({
            success: true,
            message: 'Đã phân công designer'
        });
    } catch (error) {
        console.error('Error assigning designer:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// START EDITING (RECEIVED → EDITING)
// =====================================================
exports.startEditing = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { id } = req.params;
        const user = req.user;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get current revision with lock
        const [revisions] = await connection.query(
            'SELECT * FROM design_revisions WHERE id = ? FOR UPDATE',
            [id]
        );

        if (revisions.length === 0) {
            throw new Error('Không tìm thấy revision');
        }

        const revision = revisions[0];

        // Validate business rules
        await BusinessRules.validateStartEditing(revision, user);

        // Check state transition
        if (!DesignStateMachine.canTransition(revision.status, DESIGN_STATES.EDITING)) {
            throw new Error(`Không thể chuyển từ "${STATE_LABELS[revision.status]}" sang "Đang chỉnh sửa"`);
        }

        // Update status
        await connection.query(`
            UPDATE design_revisions 
            SET status = 'editing', started_editing_at = NOW(), row_version = row_version + 1
            WHERE id = ? AND row_version = ?
        `, [id, revision.row_version]);

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, old_values, new_values, user_id, user_name, created_at)
            VALUES (?, 'revision', ?, 'status_changed', ?, ?, ?, ?, NOW())
        `, [
            requestId, id,
            JSON.stringify({ status: revision.status }),
            JSON.stringify({ status: 'editing' }),
            user.id, user.full_name
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã bắt đầu chỉnh sửa thiết kế'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error starting editing:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// LOCK DESIGN (EDITING → LOCKED)
// =====================================================
exports.lock = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { id } = req.params;
        const { locked_file_id } = req.body;
        const user = req.user;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get current revision with lock
        const [revisions] = await connection.query(
            'SELECT * FROM design_revisions WHERE id = ? FOR UPDATE',
            [id]
        );

        if (revisions.length === 0) {
            throw new Error('Không tìm thấy revision');
        }

        const revision = revisions[0];

        // Validate business rules & checklist
        const checklistResult = await BusinessRules.validateLock(revision, user, locked_file_id);

        // Check state transition
        if (!DesignStateMachine.canTransition(revision.status, DESIGN_STATES.LOCKED)) {
            throw new Error(`Không thể chuyển từ "${STATE_LABELS[revision.status]}" sang "Đã chốt"`);
        }

        // Generate hash
        const lockedHash = await DesignStateMachine.generateLockedHash(id);

        // Update status
        await connection.query(`
            UPDATE design_revisions 
            SET status = 'locked', 
                locked_by = ?, 
                locked_at = NOW(), 
                locked_checklist = ?,
                locked_file_id = ?,
                locked_hash = ?,
                row_version = row_version + 1
            WHERE id = ? AND row_version = ?
        `, [user.id, JSON.stringify(checklistResult.checklist), locked_file_id, lockedHash, id, revision.row_version]);

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, old_values, new_values, reason, user_id, user_name, created_at)
            VALUES (?, 'revision', ?, 'locked', ?, ?, ?, ?, ?, NOW())
        `, [
            requestId, id,
            JSON.stringify({ status: revision.status }),
            JSON.stringify({ status: 'locked', checklist: checklistResult.checklist }),
            'Chốt thiết kế',
            user.id, user.full_name
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã chốt thiết kế thành công',
            data: {
                locked_at: new Date(),
                locked_by: user.full_name,
                locked_hash: lockedHash,
                checklist: checklistResult.checklist
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error locking design:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// CREATE NEW REVISION FROM LOCKED (Rollback via Revision)
// =====================================================
exports.createRevision = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { id } = req.params; // Parent revision ID
        const { reason } = req.body;
        const user = req.user;

        if (!DesignStateMachine.hasPermission('create_revision', user.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo revision mới' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get parent revision
        const [parents] = await connection.query(
            'SELECT * FROM design_revisions WHERE id = ?',
            [id]
        );

        if (parents.length === 0) {
            throw new Error('Không tìm thấy revision gốc');
        }

        const parent = parents[0];

        // Parent must be LOCKED or beyond
        if (parent.status === DESIGN_STATES.RECEIVED || parent.status === DESIGN_STATES.EDITING) {
            throw new Error('Chỉ có thể tạo revision mới từ bản đã chốt (LOCKED) trở lên');
        }

        // Deactivate parent
        await connection.query(
            'UPDATE design_revisions SET is_active = FALSE WHERE id = ?',
            [id]
        );

        // Get next revision number
        const [maxRev] = await connection.query(
            'SELECT MAX(revision_no) AS max_rev FROM design_revisions WHERE project_id = ?',
            [parent.project_id]
        );
        const newRevisionNo = (maxRev[0].max_rev || 0) + 1;

        // Create new revision
        const [result] = await connection.query(`
            INSERT INTO design_revisions 
            (project_id, revision_no, status, is_active, parent_revision_id, 
             assigned_to, notes, created_by, created_at)
            VALUES (?, ?, 'editing', TRUE, ?, ?, ?, ?, NOW())
        `, [parent.project_id, newRevisionNo, id, parent.assigned_to, reason, user.id]);

        const newRevisionId = result.insertId;

        // Clone units from parent
        const [parentUnits] = await connection.query(
            'SELECT * FROM design_units WHERE design_revision_id = ?',
            [id]
        );

        for (const unit of parentUnits) {
            await connection.query(`
                INSERT INTO design_units 
                (design_revision_id, unit_code, unit_type, width, height, depth, qty,
                 profile_system_id, profile_system, profile_color,
                 glass_type_id, glass_type, glass_thickness,
                 hardware_set_id, hardware_set, num_panels, opening_direction,
                 position_note, install_note, spec_json, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                newRevisionId, unit.unit_code, unit.unit_type, unit.width, unit.height, unit.depth, unit.qty,
                unit.profile_system_id, unit.profile_system, unit.profile_color,
                unit.glass_type_id, unit.glass_type, unit.glass_thickness,
                unit.hardware_set_id, unit.hardware_set, unit.num_panels, unit.opening_direction,
                unit.position_note, unit.install_note, unit.spec_json, user.id
            ]);
        }

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, new_values, reason, user_id, user_name, created_at)
            VALUES (?, 'revision', ?, 'revision_created', ?, ?, ?, ?, NOW())
        `, [
            requestId, newRevisionId,
            JSON.stringify({ parent_revision_id: id, revision_no: newRevisionNo, units_cloned: parentUnits.length }),
            reason,
            user.id, user.full_name
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: `Đã tạo revision mới V${newRevisionNo}`,
            data: {
                id: newRevisionId,
                revision_no: newRevisionNo,
                parent_revision_id: id,
                units_cloned: parentUnits.length
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creating new revision:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// GET LOCK CHECKLIST STATUS
// =====================================================
exports.getLockChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await DesignStateMachine.validateLockChecklist(id);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error getting lock checklist:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// GET TIMELINE/AUDIT LOGS
// =====================================================
exports.getTimeline = async (req, res) => {
    try {
        const { id } = req.params;

        const [logs] = await db.query(`
            SELECT * FROM design_audit_logs 
            WHERE entity_type = 'revision' AND entity_id = ?
            ORDER BY created_at DESC
        `, [id]);

        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error getting timeline:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
