const db = require('../config/db');

exports.getAllTypes = async (req, res, next) => {
    try {
        const [types] = await db.query('SELECT * FROM work_plan_types ORDER BY is_active DESC, created_at ASC');
        res.json({ success: true, data: types });
    } catch (error) {
        next(error);
    }
};

exports.getTypeById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [types] = await db.query('SELECT * FROM work_plan_types WHERE id = ?', [id]);
        if (types.length === 0) return res.status(404).json({ success: false, message: 'Type not found' });
        res.json({ success: true, data: types[0] });
    } catch (error) {
        next(error);
    }
};

exports.createType = async (req, res, next) => {
    try {
        const { type_code, name, icon, color, bg_class, border_class, hex_bg, bg } = req.body;
        const [result] = await db.query(
            'INSERT INTO work_plan_types (type_code, name, icon, color, bg_class, border_class, hex_bg, bg) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [type_code, name, icon || '<i class="fa-solid fa-list-check"></i>', color || 'text-slate-700', bg_class || 'bg-slate-500', border_class || 'border-slate-400', hex_bg || '#f1f5f9', bg || 'bg-slate-200']
        );
        res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Mã nhóm đã tồn tại' });
        next(error);
    }
};

exports.updateType = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type_code, name, icon, color, bg_class, border_class, hex_bg, bg, is_active } = req.body;
        
        await db.query(
            'UPDATE work_plan_types SET type_code=?, name=?, icon=?, color=?, bg_class=?, border_class=?, hex_bg=?, bg=?, is_active=? WHERE id=?',
            [type_code, name, icon, color, bg_class, border_class, hex_bg, bg, is_active !== undefined ? is_active : 1, id]
        );
        res.json({ success: true, message: 'Updated type successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Mã nhóm đã tồn tại' });
        next(error);
    }
};

exports.deleteType = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM work_plan_types WHERE id = ?', [id]);
        res.json({ success: true, message: 'Deleted type successfully' });
    } catch (error) {
        next(error);
    }
};
