const db = require("../config/db");

// GET all formulas
exports.getAllFormulas = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM deduction_formulas WHERE is_active = 1 ORDER BY formula_type ASC"
        );

        // Transform data to match frontend format
        const transformed = rows.map(row => ({
            id: row.id,
            door_type: row.formula_type,
            description: row.description || row.formula_name,
            glass_formula: row.glass_deduction_width > 0 || row.glass_deduction_height > 0 
                ? `W - ${row.glass_deduction_width}, H - ${row.glass_deduction_height}` 
                : null,
            frame_formula: row.frame_deduction_width > 0 || row.frame_deduction_height > 0
                ? `W - ${row.frame_deduction_width}, H - ${row.frame_deduction_height}`
                : null,
            overlap_formula: row.overlap_addition > 0 ? `+ ${row.overlap_addition}` : null
        }));

        res.json({
            success: true,
            data: transformed,
            count: transformed.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// GET by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            "SELECT * FROM deduction_formulas WHERE id = ? AND is_active = 1",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy công thức"
            });
        }

        const row = rows[0];
        // Transform to match frontend format
        const transformed = {
            id: row.id,
            door_type: row.formula_type,
            description: row.description || row.formula_name,
            glass_formula: row.glass_deduction_width > 0 || row.glass_deduction_height > 0 
                ? `W - ${row.glass_deduction_width}, H - ${row.glass_deduction_height}` 
                : null,
            frame_formula: row.frame_deduction_width > 0 || row.frame_deduction_height > 0
                ? `W - ${row.frame_deduction_width}, H - ${row.frame_deduction_height}`
                : null,
            overlap_formula: row.overlap_addition > 0 ? `+ ${row.overlap_addition}` : null
        };

        res.json({
            success: true,
            data: transformed
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// POST create
exports.create = async (req, res) => {
    try {
        const { door_type, description, glass_formula, frame_formula, overlap_formula } = req.body;
        
        // Parse formulas to extract numeric values
        const glassMatch = glass_formula ? glass_formula.match(/W\s*-\s*(\d+).*H\s*-\s*(\d+)/i) : null;
        const frameMatch = frame_formula ? frame_formula.match(/W\s*-\s*(\d+).*H\s*-\s*(\d+)/i) : null;
        const overlapMatch = overlap_formula ? overlap_formula.match(/(\d+)/) : null;

        const [result] = await db.query(
            `INSERT INTO deduction_formulas 
             (formula_name, formula_type, description, glass_deduction_width, glass_deduction_height, 
              frame_deduction_width, frame_deduction_height, overlap_addition) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                description || `Công thức ${door_type}`,
                door_type,
                description || null,
                glassMatch ? parseInt(glassMatch[1]) : 0,
                glassMatch ? parseInt(glassMatch[2]) : 0,
                frameMatch ? parseInt(frameMatch[1]) : 0,
                frameMatch ? parseInt(frameMatch[2]) : 0,
                overlapMatch ? parseInt(overlapMatch[1]) : 0
            ]
        );

        res.status(201).json({
            success: true,
            message: "Thêm công thức thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi thêm công thức"
        });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { door_type, description, glass_formula, frame_formula, overlap_formula } = req.body;
        
        // Parse formulas to extract numeric values
        const glassMatch = glass_formula ? glass_formula.match(/W\s*-\s*(\d+).*H\s*-\s*(\d+)/i) : null;
        const frameMatch = frame_formula ? frame_formula.match(/W\s*-\s*(\d+).*H\s*-\s*(\d+)/i) : null;
        const overlapMatch = overlap_formula ? overlap_formula.match(/(\d+)/) : null;

        const [result] = await db.query(
            `UPDATE deduction_formulas 
             SET formula_name = ?, formula_type = ?, description = ?, 
                 glass_deduction_width = ?, glass_deduction_height = ?,
                 frame_deduction_width = ?, frame_deduction_height = ?,
                 overlap_addition = ?
             WHERE id = ?`,
            [
                description || `Công thức ${door_type}`,
                door_type,
                description || null,
                glassMatch ? parseInt(glassMatch[1]) : 0,
                glassMatch ? parseInt(glassMatch[2]) : 0,
                frameMatch ? parseInt(frameMatch[1]) : 0,
                frameMatch ? parseInt(frameMatch[2]) : 0,
                overlapMatch ? parseInt(overlapMatch[1]) : 0,
                id
            ]
        );

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
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật công thức"
        });
    }
};

// DELETE (soft delete)
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "UPDATE deduction_formulas SET is_active = 0 WHERE id = ?",
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
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa công thức"
        });
    }
};

