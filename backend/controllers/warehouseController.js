const pool = require("../config/db");

// GET all warehouses for a specific inventory type
exports.getWarehouses = async (req, res) => {
    try {
        const { type } = req.query; // 'aluminum', 'accessory', etc.
        let query = "SELECT * FROM inventory_warehouses WHERE is_active = 1";
        let params = [];

        if (type) {
            query += " AND inventory_type = ?";
            params.push(type);
        }

        query += " ORDER BY id ASC";

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            console.warn('⚠️ inventory_warehouses table missing. Migration required.');
            return res.json({
                success: true,
                data: [] // Return empty list instead of 500 error
            });
        }
        console.error('Error getting warehouses:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách kho"
        });
    }
};

// UPDATE warehouse information (name)
exports.updateWarehouse = async (req, res) => {
    try {
        const { id } = req.params;
        const { warehouse_name, is_active } = req.body;

        if (!warehouse_name) {
            return res.status(400).json({
                success: false,
                message: "Tên kho không được để trống"
            });
        }

        const [result] = await pool.query(
            "UPDATE inventory_warehouses SET warehouse_name = ?, is_active = ? WHERE id = ?",
            [warehouse_name, is_active !== undefined ? is_active : 1, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy kho để cập nhật"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật kho thành công"
        });
    } catch (err) {
        console.error('Error updating warehouse:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật kho"
        });
    }
};
