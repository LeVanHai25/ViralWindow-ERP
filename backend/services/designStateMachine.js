/**
 * =====================================================
 * DESIGN STATE MACHINE SERVICE
 * =====================================================
 * 
 * State Machine chuẩn nghiệp vụ cho Design Workflow
 * 
 * States: RECEIVED → EDITING → LOCKED → BOM_CREATED → PR_CREATED
 * 
 * Rules:
 * - Backend ENFORCE luật (không chỉ UI)
 * - Revision là immutable snapshot
 * - Rollback chỉ bằng "Create new revision"
 * - Traceability không được đứt
 * 
 * @author ViralWindow Development Team
 * @version 2.0 (Senior Reviewed)
 */

const db = require('../config/db');
const crypto = require('crypto');

// =====================================================
// STATE DEFINITIONS
// =====================================================
const DESIGN_STATES = {
    RECEIVED: 'received',
    EDITING: 'editing',
    LOCKED: 'locked',
    BOM_CREATED: 'bom_created',
    PR_CREATED: 'pr_created'
};

const STATE_LABELS = {
    received: 'Đã nhận từ khách',
    editing: 'Đang chỉnh sửa',
    locked: 'Đã chốt thiết kế',
    bom_created: 'Đã bóc tách BOM',
    pr_created: 'Đã tạo PR'
};

// =====================================================
// STATE TRANSITIONS (Tuyến tính + Rollback bằng revision)
// =====================================================
const STATE_TRANSITIONS = {
    received: ['editing'],           // Chỉ được chuyển sang editing
    editing: ['locked'],             // Chỉ được chốt
    locked: ['bom_created'],         // Chỉ được tạo BOM
    bom_created: ['pr_created'],     // Chỉ được tạo PR
    pr_created: []                   // Final state
};

// =====================================================
// LOCK CHECKLIST
// =====================================================
const LOCK_CHECKLIST_ITEMS = [
    { key: 'has_all_dimensions', label: 'Tất cả units có W/H', required: true },
    { key: 'has_profile_system', label: 'Hệ nhôm xác định', required: true },
    { key: 'has_profile_color', label: 'Màu sơn xác định', required: true },
    { key: 'has_glass_spec', label: 'Kính xác định (dày/loại)', required: true },
    { key: 'has_hardware', label: 'Phụ kiện chính xác định', required: false },
    { key: 'has_locked_file', label: 'Có file bản vẽ chốt (PDF)', required: true }
];

// =====================================================
// PERMISSION MATRIX
// =====================================================
const PERMISSIONS = {
    receive: ['designer', 'lead', 'manager', 'admin'],
    assign: ['lead', 'manager', 'admin'],
    start_editing: ['designer', 'lead', 'manager', 'admin'],
    edit_unit: ['designer', 'lead', 'manager'],
    lock: ['lead', 'manager', 'admin'],
    generate_bom: ['designer', 'lead', 'manager'],
    override_bom: ['lead', 'manager'],
    validate_bom: ['lead', 'manager', 'admin'],
    create_pr: ['purchasing', 'lead', 'manager', 'admin'],
    approve_pr: ['manager', 'admin'],
    create_revision: ['designer', 'lead', 'manager', 'admin']
};

// =====================================================
// STATE MACHINE CLASS
// =====================================================
class DesignStateMachine {

    /**
     * Kiểm tra transition có hợp lệ không
     */
    static canTransition(currentState, targetState) {
        const allowedTransitions = STATE_TRANSITIONS[currentState] || [];
        return allowedTransitions.includes(targetState);
    }

    /**
     * Kiểm tra user có quyền thực hiện action không
     */
    static hasPermission(action, userRole) {
        const allowedRoles = PERMISSIONS[action] || [];
        return allowedRoles.includes(userRole);
    }

    /**
     * Kiểm tra revision có thể edit không
     * CHỈ EDIT KHI ĐANG EDITING
     */
    static canEditRevision(revision) {
        return revision.status === DESIGN_STATES.EDITING;
    }

    /**
     * Kiểm tra có thể edit unit không
     */
    static canEditUnit(revision) {
        if (revision.status !== DESIGN_STATES.EDITING) {
            return {
                allowed: false,
                reason: `Không thể chỉnh sửa unit khi thiết kế đang ở trạng thái "${STATE_LABELS[revision.status]}". Vui lòng tạo revision mới để thay đổi.`
            };
        }
        return { allowed: true };
    }

    /**
     * Kiểm tra có thể generate BOM không
     * CHỈ KHI ĐÃ LOCKED
     */
    static canGenerateBOM(revision) {
        if (revision.status !== DESIGN_STATES.LOCKED) {
            return {
                allowed: false,
                reason: `Chỉ có thể bóc tách BOM khi thiết kế đã được chốt. Trạng thái hiện tại: "${STATE_LABELS[revision.status]}"`
            };
        }
        return { allowed: true };
    }

    /**
     * Kiểm tra có thể tạo PR không
     * CHỈ KHI BOM ĐÃ VALIDATED
     */
    static canCreatePR(bom) {
        if (!bom) {
            return {
                allowed: false,
                reason: 'Chưa có BOM. Vui lòng tạo BOM trước.'
            };
        }
        if (bom.status !== 'validated' && bom.status !== 'frozen') {
            return {
                allowed: false,
                reason: `BOM chưa được validate. Trạng thái BOM hiện tại: "${bom.status}"`
            };
        }
        return { allowed: true };
    }

    /**
     * Kiểm tra điều kiện lock (checklist)
     */
    static async validateLockChecklist(revisionId) {
        const [units] = await db.query(
            'SELECT * FROM design_units WHERE design_revision_id = ?',
            [revisionId]
        );

        const [files] = await db.query(
            'SELECT * FROM design_files WHERE revision_id = ? AND is_locked_file = TRUE',
            [revisionId]
        );

        const checklist = {
            has_all_dimensions: true,
            has_profile_system: true,
            has_profile_color: true,
            has_glass_spec: true,
            has_hardware: true,
            has_locked_file: files.length > 0
        };

        const errors = [];
        const unitsWithIssues = [];

        for (const unit of units) {
            const unitIssues = [];

            if (!unit.width || !unit.height) {
                checklist.has_all_dimensions = false;
                unitIssues.push('Thiếu kích thước W/H');
            }
            if (!unit.profile_system) {
                checklist.has_profile_system = false;
                unitIssues.push('Thiếu hệ nhôm');
            }
            if (!unit.profile_color) {
                checklist.has_profile_color = false;
                unitIssues.push('Thiếu màu sơn');
            }
            if (!unit.glass_type || !unit.glass_thickness) {
                checklist.has_glass_spec = false;
                unitIssues.push('Thiếu thông số kính');
            }
            if (!unit.hardware_set) {
                checklist.has_hardware = false;
                unitIssues.push('Thiếu phụ kiện');
            }

            if (unitIssues.length > 0) {
                unitsWithIssues.push({
                    unit_id: unit.id,
                    unit_code: unit.unit_code,
                    issues: unitIssues
                });
            }
        }

        // Check required items
        for (const item of LOCK_CHECKLIST_ITEMS) {
            if (item.required && !checklist[item.key]) {
                errors.push({
                    key: item.key,
                    label: item.label,
                    units: unitsWithIssues.filter(u =>
                        u.issues.some(i => i.toLowerCase().includes(item.label.toLowerCase().split(' ')[0]))
                    )
                });
            }
        }

        return {
            checklist,
            isValid: errors.length === 0,
            errors,
            unitsWithIssues,
            unitCount: units.length,
            hasLockedFile: checklist.has_locked_file
        };
    }

    /**
     * Tạo hash từ units/specs để chống sửa lén
     */
    static async generateLockedHash(revisionId) {
        const [units] = await db.query(
            `SELECT unit_code, width, height, qty, profile_system, profile_color, 
                    glass_type, glass_thickness, hardware_set, num_panels, opening_direction
             FROM design_units 
             WHERE design_revision_id = ? 
             ORDER BY unit_code`,
            [revisionId]
        );

        const dataString = JSON.stringify(units);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Verify hash (kiểm tra có bị sửa lén không)
     */
    static async verifyLockedHash(revisionId, storedHash) {
        const currentHash = await this.generateLockedHash(revisionId);
        return currentHash === storedHash;
    }
}

// =====================================================
// BUSINESS RULE VALIDATORS
// =====================================================
const BusinessRules = {

    /**
     * Validate trước khi start editing
     */
    async validateStartEditing(revision, user) {
        if (revision.status !== DESIGN_STATES.RECEIVED) {
            throw new Error(`Không thể bắt đầu chỉnh sửa. Trạng thái hiện tại: ${STATE_LABELS[revision.status]}`);
        }

        if (!revision.assigned_to) {
            throw new Error('Chưa phân công designer. Vui lòng phân công trước khi bắt đầu.');
        }

        // Kiểm tra quyền
        if (!DesignStateMachine.hasPermission('start_editing', user.role)) {
            throw new Error('Bạn không có quyền bắt đầu chỉnh sửa thiết kế.');
        }

        return true;
    },

    /**
     * Validate trước khi lock
     */
    async validateLock(revision, user, lockedFileId) {
        if (revision.status !== DESIGN_STATES.EDITING) {
            throw new Error(`Không thể chốt thiết kế. Trạng thái hiện tại: ${STATE_LABELS[revision.status]}`);
        }

        // Kiểm tra quyền
        if (!DesignStateMachine.hasPermission('lock', user.role)) {
            throw new Error('Bạn không có quyền chốt thiết kế. Cần Lead/Manager.');
        }

        // Kiểm tra checklist
        const checklistResult = await DesignStateMachine.validateLockChecklist(revision.id);
        if (!checklistResult.isValid) {
            const errorMessages = checklistResult.errors.map(e => e.label).join(', ');
            throw new Error(`Chưa đủ điều kiện chốt: ${errorMessages}`);
        }

        // Kiểm tra có file chốt
        if (!lockedFileId && !checklistResult.hasLockedFile) {
            throw new Error('Cần upload file bản vẽ chốt (PDF) trước khi chốt thiết kế.');
        }

        return checklistResult;
    },

    /**
     * Validate BOM generation
     */
    async validateBOMGeneration(revision, user) {
        const canGenerate = DesignStateMachine.canGenerateBOM(revision);
        if (!canGenerate.allowed) {
            throw new Error(canGenerate.reason);
        }

        if (!DesignStateMachine.hasPermission('generate_bom', user.role)) {
            throw new Error('Bạn không có quyền tạo BOM.');
        }

        // Kiểm tra có units không
        const [units] = await db.query(
            'SELECT COUNT(*) as count FROM design_units WHERE design_revision_id = ?',
            [revision.id]
        );

        if (units[0].count === 0) {
            throw new Error('Không có units nào trong thiết kế. Không thể tạo BOM.');
        }

        return true;
    },

    /**
     * Validate BOM override
     */
    async validateBOMOverride(bomLine, user, reason) {
        if (!DesignStateMachine.hasPermission('override_bom', user.role)) {
            throw new Error('Bạn không có quyền chỉnh sửa BOM. Cần Lead/Manager.');
        }

        if (!reason || reason.trim().length < 10) {
            throw new Error('Vui lòng nhập lý do chỉnh sửa BOM (tối thiểu 10 ký tự).');
        }

        // Kiểm tra BOM đã frozen chưa
        const [bom] = await db.query('SELECT status FROM design_bom WHERE id = ?', [bomLine.bom_id]);
        if (bom[0]?.status === 'frozen') {
            throw new Error('BOM đã được frozen, không thể chỉnh sửa.');
        }

        return true;
    },

    /**
     * Validate PR creation
     */
    async validatePRCreation(bom, user) {
        const canCreate = DesignStateMachine.canCreatePR(bom);
        if (!canCreate.allowed) {
            throw new Error(canCreate.reason);
        }

        if (!DesignStateMachine.hasPermission('create_pr', user.role)) {
            throw new Error('Bạn không có quyền tạo phiếu yêu cầu vật tư.');
        }

        // Kiểm tra đã có PR draft/submitted chưa
        const [existingPR] = await db.query(
            `SELECT id, pr_code, status FROM design_purchase_requests 
             WHERE bom_id = ? AND status IN ('draft', 'submitted')`,
            [bom.id]
        );

        if (existingPR.length > 0) {
            throw new Error(`Đã có PR ${existingPR[0].pr_code} đang ở trạng thái ${existingPR[0].status}. Vui lòng hoàn thành PR hiện tại trước.`);
        }

        return true;
    }
};

// =====================================================
// CONCURRENCY CONTROL (Optimistic Locking)
// =====================================================
const ConcurrencyControl = {

    /**
     * Check and update with optimistic lock
     */
    async updateWithLock(table, id, updates, currentVersion) {
        const updateFields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), currentVersion, id];

        const [result] = await db.query(
            `UPDATE ${table} 
             SET ${updateFields}, row_version = row_version + 1 
             WHERE id = ? AND row_version = ?`,
            [...Object.values(updates), id, currentVersion]
        );

        if (result.affectedRows === 0) {
            throw new Error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng refresh và thử lại.');
        }

        return result;
    }
};

// =====================================================
// AUDIT LOGGER
// =====================================================
const AuditLogger = {

    async log(entityType, entityId, action, oldValues, newValues, user, reason = null, requestId = null) {
        await db.query(
            `INSERT INTO design_audit_logs 
             (request_id, entity_type, entity_id, action, old_values, new_values, reason, user_id, user_name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                requestId,
                entityType,
                entityId,
                action,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                reason,
                user?.id,
                user?.username || user?.full_name
            ]
        );
    }
};

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
    DESIGN_STATES,
    STATE_LABELS,
    STATE_TRANSITIONS,
    LOCK_CHECKLIST_ITEMS,
    PERMISSIONS,
    DesignStateMachine,
    BusinessRules,
    ConcurrencyControl,
    AuditLogger
};
