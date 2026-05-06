const db = require('../config/db');

/**
 * Controller for managing Aluminum Systems catalog
 */
const aluminumSystemController = {
    /**
     * Get all active systems
     */
    getAllSystems: async (req, res) => {
        console.log('GET /api/catalog/aluminum-systems - Fetching all systems');
        try {
            const [rows] = await db.query(
                'SELECT * FROM aluminum_warehouse_catalog_systems WHERE is_active = 1 ORDER BY display_order ASC, system_name ASC'
            );
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching aluminum systems:', error);
            res.status(500).json({ success: false, message: 'Lỗi lấy danh sách hệ nhôm: ' + error.message });
        }
    },

    /**
     * Create a new system
     */
    createSystem: async (req, res) => {
        try {
            const { system_name, display_order } = req.body;
            if (!system_name) {
                return res.status(400).json({ success: false, message: 'Tên hệ nhôm là bắt buộc' });
            }

            const [result] = await db.query(
                'INSERT INTO aluminum_warehouse_catalog_systems (system_name, display_order) VALUES (?, ?)',
                [system_name, display_order || 0]
            );

            res.json({
                success: true,
                message: 'Thêm hệ nhôm thành công',
                data: { id: result.insertId, system_name, display_order: display_order || 0 }
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Hệ nhôm này đã tồn tại' });
            }
            res.status(500).json({ success: false, message: 'Lỗi thêm hệ nhôm: ' + error.message });
        }
    },

    /**
     * Update an existing system
     */
    updateSystem: async (req, res) => {
        const connection = await db.getConnection();
        try {
            const { id } = req.params;
            const { system_name, display_order, is_active } = req.body;

            await connection.beginTransaction();

            // 1. Get old name first to update related records if name changed
            const [oldSystem] = await connection.query(
                'SELECT system_name FROM aluminum_warehouse_catalog_systems WHERE id = ?',
                [id]
            );

            // 2. Update the catalog entry
            const [result] = await connection.query(
                'UPDATE aluminum_warehouse_catalog_systems SET system_name = ?, display_order = ?, is_active = ? WHERE id = ?',
                [system_name, display_order, is_active !== undefined ? is_active : 1, id]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Không tìm thấy hệ nhôm' });
            }

            // 3. If name changed, update all aluminum_systems records using the old name
            if (oldSystem.length > 0 && oldSystem[0].system_name !== system_name) {
                console.log(`Cascading name update: "${oldSystem[0].system_name}" -> "${system_name}"`);
                await connection.query(
                    'UPDATE aluminum_systems SET aluminum_system = ? WHERE aluminum_system = ?',
                    [system_name, oldSystem[0].system_name]
                );
            }

            await connection.commit();
            res.json({ success: true, message: 'Cập nhật hệ nhôm và đồng bộ dữ liệu thành công' });
        } catch (error) {
            await connection.rollback();
            console.error('Error updating aluminum system:', error);
            res.status(500).json({ success: false, message: 'Lỗi cập nhật hệ nhôm: ' + error.message });
        } finally {
            connection.release();
        }
    },

    /**
     * Delete a system (soft delete encouraged, but here we do hard delete if not in use)
     */
    deleteSystem: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if system is in use
            const [used] = await db.query(
                'SELECT id FROM aluminum_systems WHERE aluminum_system = (SELECT system_name FROM aluminum_warehouse_catalog_systems WHERE id = ?) LIMIT 1',
                [id]
            );

            if (used.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể xóa hệ nhôm này vì đang được sử dụng trong danh mục vật tư. Hãy chuyển vật tư sang hệ khác trước.'
                });
            }

            const [result] = await db.query('DELETE FROM aluminum_warehouse_catalog_systems WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hệ nhôm' });
            }

            res.json({ success: true, message: 'Xóa hệ nhôm thành công' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Lỗi xóa hệ nhôm: ' + error.message });
        }
    }
};

module.exports = aluminumSystemController;
