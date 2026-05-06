/**
 * CONTROLLER TEMPLATE - Pattern Chuẩn
 * Sử dụng asyncHandler và custom errors
 * 
 * Copy file này để tạo controller mới
 */

const db = require("../config/db");
const { 
    asyncHandler, 
    NotFoundError, 
    ValidationError,
    ConflictError 
} = require("../middleware/errorHandler");

// ============================================
// PATTERN 1: Sử dụng asyncHandler (Recommended)
// Không cần try-catch, errors tự động được pass tới error handler
// ============================================

/**
 * GET all items
 */
exports.getAll = asyncHandler(async (req, res) => {
    const { status, limit = 100, offset = 0 } = req.query;
    
    let query = `SELECT * FROM my_table WHERE 1=1`;
    const params = [];
    
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await db.query(query, params);
    
    res.json({
        success: true,
        data: rows,
        count: rows.length
    });
});

/**
 * GET by ID
 */
exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const [rows] = await db.query(
        `SELECT * FROM my_table WHERE id = ?`,
        [id]
    );
    
    // Throw NotFoundError nếu không tìm thấy
    if (rows.length === 0) {
        throw new NotFoundError(`Không tìm thấy item với ID: ${id}`);
    }
    
    res.json({
        success: true,
        data: rows[0]
    });
});

/**
 * CREATE new item
 */
exports.create = asyncHandler(async (req, res) => {
    const { name, code, status = 'active' } = req.body;
    
    // Validation
    if (!name || !code) {
        throw new ValidationError('Tên và mã là bắt buộc');
    }
    
    // Check duplicate
    const [existing] = await db.query(
        `SELECT id FROM my_table WHERE code = ?`,
        [code]
    );
    
    if (existing.length > 0) {
        throw new ConflictError(`Mã ${code} đã tồn tại`);
    }
    
    // Insert
    const [result] = await db.query(
        `INSERT INTO my_table (name, code, status) VALUES (?, ?, ?)`,
        [name, code, status]
    );
    
    res.status(201).json({
        success: true,
        message: 'Tạo thành công',
        data: { id: result.insertId }
    });
});

/**
 * UPDATE item
 */
exports.update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, status } = req.body;
    
    // Check exists
    const [existing] = await db.query(
        `SELECT id FROM my_table WHERE id = ?`,
        [id]
    );
    
    if (existing.length === 0) {
        throw new NotFoundError(`Không tìm thấy item với ID: ${id}`);
    }
    
    // Build dynamic update query
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
    }
    
    if (updates.length === 0) {
        throw new ValidationError('Không có dữ liệu để cập nhật');
    }
    
    params.push(id);
    
    await db.query(
        `UPDATE my_table SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
    );
    
    res.json({
        success: true,
        message: 'Cập nhật thành công'
    });
});

/**
 * DELETE item
 */
exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check exists
    const [existing] = await db.query(
        `SELECT id FROM my_table WHERE id = ?`,
        [id]
    );
    
    if (existing.length === 0) {
        throw new NotFoundError(`Không tìm thấy item với ID: ${id}`);
    }
    
    // Soft delete (recommended)
    await db.query(
        `UPDATE my_table SET status = 'deleted', deleted_at = NOW() WHERE id = ?`,
        [id]
    );
    
    // Hard delete (use with caution)
    // await db.query(`DELETE FROM my_table WHERE id = ?`, [id]);
    
    res.json({
        success: true,
        message: 'Xóa thành công'
    });
});

// ============================================
// PATTERN 2: Traditional try-catch (Legacy)
// Vẫn hoạt động nhưng nên migrate sang Pattern 1
// ============================================

exports.legacyPattern = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM my_table`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// ============================================
// MIGRATION GUIDE
// ============================================
/*
CÁCH MIGRATE TỪ PATTERN CŨ SANG MỚI:

TRƯỚC:
exports.getById = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM x WHERE id = ?`, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy" });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

SAU:
exports.getById = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`SELECT * FROM x WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) {
        throw new NotFoundError(`Không tìm thấy item với ID: ${req.params.id}`);
    }
    res.json({ success: true, data: rows[0] });
});

LỢI ÍCH:
- Ít code hơn (không cần try-catch)
- Error messages chuẩn hóa
- Stack trace đầy đủ trong development
- Dễ maintain và test
*/
