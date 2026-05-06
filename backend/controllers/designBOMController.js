/**
 * =====================================================
 * DESIGN BOM CONTROLLER
 * =====================================================
 * 
 * BOM Generation, Validation, Override, Freeze
 * 
 * @author ViralWindow Development Team
 */

const db = require('../config/db');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const {
    DESIGN_STATES,
    DesignStateMachine,
    BusinessRules,
    AuditLogger
} = require('../services/designStateMachine');

// =====================================================
// GENERATE BOM FROM UNITS
// =====================================================
exports.generate = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { revisionId } = req.params;
        const user = req.user;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get revision
        const [revisions] = await connection.query(
            'SELECT * FROM design_revisions WHERE id = ?',
            [revisionId]
        );

        if (revisions.length === 0) {
            throw new Error('Không tìm thấy revision');
        }

        const revision = revisions[0];

        // ✅ BACKEND ENFORCE: Chỉ generate BOM khi đã LOCKED
        if (revision.status !== 'locked') {
            throw new Error(`Chỉ có thể tạo BOM khi thiết kế đã chốt. Trạng thái hiện tại: ${revision.status}`);
        }

        // Check if BOM already exists
        const [existingBOM] = await connection.query(
            'SELECT * FROM design_bom WHERE design_revision_id = ? ORDER BY bom_version DESC LIMIT 1',
            [revisionId]
        );

        let bomId;
        let bomVersion = 1;

        if (existingBOM.length > 0) {
            // Create new version
            bomVersion = existingBOM[0].bom_version + 1;
        }

        // Create BOM
        const [bomResult] = await connection.query(`
            INSERT INTO design_bom 
            (design_revision_id, bom_version, status, generated_by, generated_at, generation_method)
            VALUES (?, ?, 'created', ?, NOW(), 'auto')
        `, [revisionId, bomVersion, user.id]);

        bomId = bomResult.insertId;

        // Get all units
        const [units] = await connection.query(
            'SELECT * FROM design_units WHERE design_revision_id = ?',
            [revisionId]
        );

        let totalLines = 0;

        // Generate BOM lines for each unit
        for (const unit of units) {
            const bomLines = await generateBOMForUnit(unit, connection);

            for (const line of bomLines) {
                await connection.query(`
                    INSERT INTO design_bom_lines 
                    (bom_id, source_unit_id, material_type, material_id, 
                     material_code_snapshot, material_name_snapshot, uom_snapshot,
                     qty, waste_factor, vendor_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    bomId,
                    unit.id,
                    line.material_type,
                    line.material_id,
                    line.material_code,
                    line.material_name,
                    line.uom,
                    line.qty,
                    line.waste_factor || 0,
                    line.vendor_id
                ]);

                totalLines++;
            }
        }

        // Update revision status
        await connection.query(
            'UPDATE design_revisions SET status = "bom_created", row_version = row_version + 1 WHERE id = ?',
            [revisionId]
        );

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, new_values, user_id, user_name, created_at)
            VALUES (?, 'bom', ?, 'generated', ?, ?, ?, NOW())
        `, [
            requestId, bomId,
            JSON.stringify({ bom_version: bomVersion, total_lines: totalLines, unit_count: units.length }),
            user.id, user.full_name
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: `Đã tạo BOM V${bomVersion} với ${totalLines} dòng từ ${units.length} units`,
            data: {
                bom_id: bomId,
                bom_version: bomVersion,
                total_lines: totalLines,
                unit_count: units.length
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error generating BOM:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Generate BOM lines for a single unit
 * Tính toán dựa trên kích thước và thông số kỹ thuật
 */
async function generateBOMForUnit(unit, connection) {
    const bomLines = [];

    const width = unit.width || 0;
    const height = unit.height || 0;
    const qty = unit.qty || 1;

    // 1. ALUMINUM PROFILES
    // Thanh ngang (2 thanh trên + dưới)
    const horizontalLength = (width * 2 * qty) / 1000; // Convert to meters
    bomLines.push({
        material_type: 'aluminum',
        material_code: `AL-${unit.profile_system || 'STD'}-H`,
        material_name: `Thanh ngang ${unit.profile_system || 'Tiêu chuẩn'}`,
        uom: 'm',
        qty: parseFloat(horizontalLength.toFixed(3)),
        waste_factor: 5
    });

    // Thanh đứng (2 thanh trái + phải)
    const verticalLength = (height * 2 * qty) / 1000;
    bomLines.push({
        material_type: 'aluminum',
        material_code: `AL-${unit.profile_system || 'STD'}-V`,
        material_name: `Thanh đứng ${unit.profile_system || 'Tiêu chuẩn'}`,
        uom: 'm',
        qty: parseFloat(verticalLength.toFixed(3)),
        waste_factor: 5
    });

    // Thanh chia (nếu có nhiều cánh)
    if (unit.num_panels && unit.num_panels > 1) {
        const dividerLength = (height * (unit.num_panels - 1) * qty) / 1000;
        bomLines.push({
            material_type: 'aluminum',
            material_code: `AL-${unit.profile_system || 'STD'}-D`,
            material_name: `Thanh chia ${unit.profile_system || 'Tiêu chuẩn'}`,
            uom: 'm',
            qty: parseFloat(dividerLength.toFixed(3)),
            waste_factor: 5
        });
    }

    // 2. GLASS
    // Kính (tính theo diện tích)
    const glassArea = (width * height * qty) / 1000000; // m²
    // Trừ phần khung nhôm (ước tính 10%)
    const netGlassArea = glassArea * 0.9;

    bomLines.push({
        material_type: 'glass',
        material_code: `GL-${unit.glass_thickness || 5}mm`,
        material_name: `Kính ${unit.glass_type || 'trong'} ${unit.glass_thickness || 5}mm`,
        uom: 'm2',
        qty: parseFloat(netGlassArea.toFixed(3)),
        waste_factor: 3
    });

    // 3. GASKET (Gioăng)
    // Gioăng chạy quanh khung và kính
    const gasketLength = ((width + height) * 4 * qty) / 1000; // 4 cạnh x 2 (trong + ngoài)
    bomLines.push({
        material_type: 'gasket',
        material_code: 'GK-STD',
        material_name: 'Gioăng cao su EPDM',
        uom: 'm',
        qty: parseFloat(gasketLength.toFixed(3)),
        waste_factor: 5
    });

    // 4. HARDWARE (Phụ kiện)
    // Bản lề (2 cái/cánh)
    if (unit.opening_direction !== 'fixed' && unit.opening_direction !== 'sliding') {
        bomLines.push({
            material_type: 'hardware',
            material_code: `HW-HINGE-${unit.hardware_set || 'STD'}`,
            material_name: `Bản lề ${unit.hardware_set || 'tiêu chuẩn'}`,
            uom: 'cái',
            qty: (unit.num_panels || 1) * 2 * qty,
            waste_factor: 0
        });

        // Tay nắm (1 cái/unit)
        bomLines.push({
            material_type: 'hardware',
            material_code: `HW-HANDLE-${unit.hardware_set || 'STD'}`,
            material_name: `Tay nắm ${unit.hardware_set || 'tiêu chuẩn'}`,
            uom: 'cái',
            qty: qty,
            waste_factor: 0
        });

        // Khóa (1 cái/unit)
        bomLines.push({
            material_type: 'hardware',
            material_code: `HW-LOCK-${unit.hardware_set || 'STD'}`,
            material_name: `Khóa ${unit.hardware_set || 'tiêu chuẩn'}`,
            uom: 'cái',
            qty: qty,
            waste_factor: 0
        });
    }

    // Ray trượt (nếu cửa trượt)
    if (unit.opening_direction === 'sliding') {
        bomLines.push({
            material_type: 'hardware',
            material_code: 'HW-RAIL',
            material_name: 'Ray trượt nhôm',
            uom: 'm',
            qty: parseFloat(((width * 2 * qty) / 1000).toFixed(3)),
            waste_factor: 5
        });

        bomLines.push({
            material_type: 'hardware',
            material_code: 'HW-WHEEL',
            material_name: 'Bánh xe ray',
            uom: 'bộ',
            qty: (unit.num_panels || 2) * qty,
            waste_factor: 0
        });
    }

    // 5. ACCESSORIES (Vật tư phụ)
    // Ke góc (4 cái/khung)
    bomLines.push({
        material_type: 'accessory',
        material_code: 'AC-CORNER',
        material_name: 'Ke góc nhôm',
        uom: 'cái',
        qty: 4 * qty,
        waste_factor: 0
    });

    // Vít (ước tính 20 cái/unit)
    bomLines.push({
        material_type: 'accessory',
        material_code: 'AC-SCREW',
        material_name: 'Vít inox 4x25',
        uom: 'cái',
        qty: 20 * qty,
        waste_factor: 10
    });

    // Silicone (ước tính 0.5 tuýp/m²)
    bomLines.push({
        material_type: 'accessory',
        material_code: 'AC-SILICONE',
        material_name: 'Keo silicone',
        uom: 'tuýp',
        qty: Math.ceil(netGlassArea * 0.5),
        waste_factor: 0
    });

    return bomLines;
}

// =====================================================
// GET BOM BY ID
// =====================================================
exports.getById = async (req, res) => {
    try {
        const { bomId } = req.params;

        const [boms] = await db.query(`
            SELECT b.*, 
                   u.full_name AS generated_by_name,
                   u2.full_name AS validated_by_name,
                   u3.full_name AS frozen_by_name
            FROM design_bom b
            LEFT JOIN users u ON b.generated_by = u.id
            LEFT JOIN users u2 ON b.validated_by = u2.id
            LEFT JOIN users u3 ON b.frozen_by = u3.id
            WHERE b.id = ?
        `, [bomId]);

        if (boms.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy BOM' });
        }

        const bom = boms[0];

        // Get BOM lines
        const [lines] = await db.query(`
            SELECT bl.*, du.unit_code AS source_unit_code
            FROM design_bom_lines bl
            LEFT JOIN design_units du ON bl.source_unit_id = du.id
            WHERE bl.bom_id = ?
            ORDER BY bl.material_type, bl.material_code_snapshot
        `, [bomId]);

        // Summary by material type
        const summary = {};
        for (const line of lines) {
            if (!summary[line.material_type]) {
                summary[line.material_type] = { count: 0, total_qty: 0 };
            }
            summary[line.material_type].count++;
            summary[line.material_type].total_qty += parseFloat(line.qty);
        }

        res.json({
            success: true,
            data: {
                ...bom,
                lines,
                summary,
                total_lines: lines.length
            }
        });
    } catch (error) {
        console.error('Error getting BOM:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// VALIDATE BOM
// =====================================================
exports.validate = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { bomId } = req.params;
        const user = req.user;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get BOM
        const [boms] = await connection.query('SELECT * FROM design_bom WHERE id = ?', [bomId]);

        if (boms.length === 0) {
            throw new Error('Không tìm thấy BOM');
        }

        const bom = boms[0];

        // Get BOM lines
        const [lines] = await connection.query(
            'SELECT * FROM design_bom_lines WHERE bom_id = ?',
            [bomId]
        );

        const errors = [];
        const warnings = [];

        // Validation rules
        for (const line of lines) {
            // Check qty > 0
            if (!line.qty || line.qty <= 0) {
                errors.push({
                    line_id: line.id,
                    error_code: 'INVALID_QTY',
                    message: `Dòng ${line.material_code_snapshot}: Số lượng phải > 0`
                });
            }

            // Check material code
            if (!line.material_code_snapshot) {
                errors.push({
                    line_id: line.id,
                    error_code: 'MISSING_CODE',
                    message: `Dòng ${line.id}: Thiếu mã vật tư`
                });
            }

            // Check UOM
            if (!line.uom_snapshot) {
                errors.push({
                    line_id: line.id,
                    error_code: 'MISSING_UOM',
                    message: `Dòng ${line.material_code_snapshot}: Thiếu đơn vị tính`
                });
            }

            // Warning: High waste factor
            if (line.waste_factor > 10) {
                warnings.push({
                    line_id: line.id,
                    warning_code: 'HIGH_WASTE',
                    message: `Dòng ${line.material_code_snapshot}: Hệ số hao hụt cao (${line.waste_factor}%)`
                });
            }
        }

        // Check duplicates
        const materialCodes = lines.map(l => l.material_code_snapshot);
        const duplicates = materialCodes.filter((code, index) => materialCodes.indexOf(code) !== index);

        if (duplicates.length > 0) {
            warnings.push({
                warning_code: 'DUPLICATE_MATERIALS',
                message: `Có vật tư trùng: ${[...new Set(duplicates)].join(', ')}`
            });
        }

        const isValid = errors.length === 0;
        const newStatus = isValid ? 'validated' : 'created';

        // Update BOM
        await connection.query(`
            UPDATE design_bom 
            SET status = ?, 
                validated_by = ?, 
                validated_at = NOW(), 
                validation_errors = ?,
                validation_warnings = ?,
                row_version = row_version + 1
            WHERE id = ?
        `, [
            newStatus,
            user.id,
            JSON.stringify(errors),
            JSON.stringify(warnings),
            bomId
        ]);

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, new_values, user_id, user_name, created_at)
            VALUES (?, 'bom', ?, 'validated', ?, ?, ?, NOW())
        `, [
            requestId, bomId,
            JSON.stringify({ is_valid: isValid, error_count: errors.length, warning_count: warnings.length }),
            user.id, user.full_name
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: isValid ? 'BOM hợp lệ!' : `BOM có ${errors.length} lỗi`,
            data: {
                is_valid: isValid,
                status: newStatus,
                errors,
                warnings
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error validating BOM:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// UPDATE BOM LINE (Override)
// =====================================================
exports.updateLine = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { lineId } = req.params;
        const { qty, waste_factor, vendor_id, reason } = req.body;
        const user = req.user;

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập lý do chỉnh sửa (tối thiểu 10 ký tự)'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get line with BOM
        const [lines] = await connection.query(`
            SELECT bl.*, b.status AS bom_status
            FROM design_bom_lines bl
            JOIN design_bom b ON bl.bom_id = b.id
            WHERE bl.id = ?
        `, [lineId]);

        if (lines.length === 0) {
            throw new Error('Không tìm thấy BOM line');
        }

        const line = lines[0];

        // ✅ BACKEND ENFORCE: Không cho sửa BOM đã frozen
        if (line.bom_status === 'frozen') {
            throw new Error('BOM đã được đóng băng, không thể chỉnh sửa');
        }

        // Store original values if first override
        const originalValues = {
            original_qty: line.is_manual_override ? line.original_qty : line.qty,
            original_uom: line.is_manual_override ? line.original_uom : line.uom_snapshot,
            original_vendor_id: line.is_manual_override ? line.original_vendor_id : line.vendor_id,
            original_waste_factor: line.is_manual_override ? line.original_waste_factor : line.waste_factor
        };

        const oldValues = {
            qty: line.qty,
            waste_factor: line.waste_factor,
            vendor_id: line.vendor_id
        };

        // Update line
        await connection.query(`
            UPDATE design_bom_lines 
            SET qty = COALESCE(?, qty),
                waste_factor = COALESCE(?, waste_factor),
                vendor_id = COALESCE(?, vendor_id),
                is_manual_override = TRUE,
                override_reason = ?,
                override_by = ?,
                override_at = NOW(),
                original_qty = ?,
                original_uom = ?,
                original_vendor_id = ?,
                original_waste_factor = ?,
                row_version = row_version + 1
            WHERE id = ?
        `, [
            qty, waste_factor, vendor_id, reason, user.id,
            originalValues.original_qty,
            originalValues.original_uom,
            originalValues.original_vendor_id,
            originalValues.original_waste_factor,
            lineId
        ]);

        // Reset BOM status to 'created' (needs re-validation)
        await connection.query(
            'UPDATE design_bom SET status = "created", row_version = row_version + 1 WHERE id = ?',
            [line.bom_id]
        );

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, old_values, new_values, reason, user_id, user_name, created_at)
            VALUES (?, 'bom_line', ?, 'overridden', ?, ?, ?, ?, ?, NOW())
        `, [
            requestId, lineId,
            JSON.stringify(oldValues),
            JSON.stringify({ qty, waste_factor, vendor_id }),
            reason,
            user.id, user.full_name
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã cập nhật BOM line. BOM cần được validate lại.'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error updating BOM line:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// FREEZE BOM
// =====================================================
exports.freeze = async (req, res) => {
    const requestId = uuidv4();
    let connection;

    try {
        const { bomId } = req.params;
        const user = req.user;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get BOM
        const [boms] = await connection.query('SELECT * FROM design_bom WHERE id = ?', [bomId]);

        if (boms.length === 0) {
            throw new Error('Không tìm thấy BOM');
        }

        const bom = boms[0];

        // ✅ BACKEND ENFORCE: Chỉ freeze BOM đã validated
        if (bom.status !== 'validated') {
            throw new Error('Chỉ có thể đóng băng BOM đã được validate');
        }

        // Update BOM
        await connection.query(`
            UPDATE design_bom 
            SET status = 'frozen', frozen_by = ?, frozen_at = NOW(), row_version = row_version + 1
            WHERE id = ?
        `, [user.id, bomId]);

        // Audit log
        await connection.query(`
            INSERT INTO design_audit_logs 
            (request_id, entity_type, entity_id, action, user_id, user_name, created_at)
            VALUES (?, 'bom', ?, 'frozen', ?, ?, NOW())
        `, [requestId, bomId, user.id, user.full_name]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã đóng băng BOM. Không thể chỉnh sửa nữa.'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error freezing BOM:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};
