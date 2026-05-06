const db = require("../config/db");

/**
 * GET all formulas for a system
 */
exports.getBySystem = async (req, res) => {
    try {
        const { systemId } = req.params;
        const { doorType } = req.query;

        let query = "SELECT * FROM cutting_formulas WHERE system_id = ? AND is_active = 1";
        let params = [systemId];

        if (doorType) {
            query += " AND door_type = ?";
            params.push(doorType);
        }

        query += " ORDER BY door_type, profile_type, dimension_type";

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error('Error getting formulas:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message
        });
    }
};

/**
 * POST create formula
 */
exports.create = async (req, res) => {
    try {
        const {
            system_id,
            door_type,
            profile_type,
            dimension_type,
            formula_expression,
            description
        } = req.body;

        if (!system_id || !door_type || !profile_type || !formula_expression) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc"
            });
        }

        const [result] = await db.query(`
            INSERT INTO cutting_formulas
            (system_id, door_type, profile_type, dimension_type, formula_expression, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            system_id,
            door_type,
            profile_type,
            dimension_type || 'height',
            formula_expression,
            description || null
        ]);

        res.status(201).json({
            success: true,
            message: "Tạo công thức thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error creating formula:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Công thức này đã tồn tại"
            });
        }
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo công thức: " + err.message
        });
    }
};

/**
 * PUT update formula
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            door_type,
            profile_type,
            dimension_type,
            formula_expression,
            description
        } = req.body;

        const [result] = await db.query(`
            UPDATE cutting_formulas
            SET door_type = ?, profile_type = ?, dimension_type = ?,
                formula_expression = ?, description = ?
            WHERE id = ?
        `, [
            door_type,
            profile_type,
            dimension_type || 'height',
            formula_expression,
            description || null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy công thức"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật công thức thành công"
        });
    } catch (err) {
        console.error('Error updating formula:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật công thức: " + err.message
        });
    }
};

/**
 * DELETE formula
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "UPDATE cutting_formulas SET is_active = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy công thức"
            });
        }

        res.json({
            success: true,
            message: "Xóa công thức thành công"
        });
    } catch (err) {
        console.error('Error deleting formula:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa công thức: " + err.message
        });
    }
};

/**
 * Calculate cutting dimensions using formula
 */
exports.calculate = async (req, res) => {
    try {
        const { systemId, doorType, width, height } = req.query;

        if (!systemId || !doorType || !width || !height) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin: systemId, doorType, width, height"
            });
        }

        // Get all formulas for this system and door type
        const [formulas] = await db.query(`
            SELECT * FROM cutting_formulas
            WHERE system_id = ? AND door_type = ? AND is_active = 1
        `, [systemId, doorType]);

        const results = {};

        formulas.forEach(formula => {
            const expr = formula.formula_expression
                .replace(/W/g, width)
                .replace(/H/g, height);

            try {
                // Simple evaluation (in production, use a safer evaluator)
                const value = eval(expr);
                results[formula.profile_type] = {
                    dimension_type: formula.dimension_type,
                    formula: formula.formula_expression,
                    calculated_value: Math.round(value * 100) / 100,
                    unit: 'mm'
                };
            } catch (e) {
                results[formula.profile_type] = {
                    error: "Không thể tính toán công thức: " + formula.formula_expression
                };
            }
        });

        res.json({
            success: true,
            data: {
                input: { width: parseFloat(width), height: parseFloat(height) },
                results: results
            }
        });
    } catch (err) {
        console.error('Error calculating:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tính toán: " + err.message
        });
    }
};




























