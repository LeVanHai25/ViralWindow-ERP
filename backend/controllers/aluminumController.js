const db = require("../config/db");

const { emitDataChange } = require('../services/socketService');
// GET all aluminum systems
exports.getAllSystems = async (req, res) => {
    try {
        const { search } = req.query;
        let query = "SELECT * FROM aluminum_systems WHERE is_active = 1";
        let params = [];

        if (search) {
            query += " AND (code LIKE ? OR name LIKE ? OR brand LIKE ? OR name LIKE ?)";
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        }

        query += " ORDER BY code ASC";

        const [rows] = await db.query(query, params);

        // Group stocks by aluminum_system_id
        const stocksBySystem = {};

        // Load stock per warehouse for each system - Wrap in try-catch for robustness
        try {
            const [stockRows] = await db.query(
                `SELECT aws.*, iw.warehouse_name 
                 FROM aluminum_warehouse_stock aws
                 JOIN inventory_warehouses iw ON aws.warehouse_id = iw.id
                 WHERE iw.inventory_type = 'aluminum'`
            );

            stockRows.forEach(s => {
                if (!stocksBySystem[s.aluminum_system_id]) {
                    stocksBySystem[s.aluminum_system_id] = {};
                }
                stocksBySystem[s.aluminum_system_id][s.warehouse_name] = s.quantity;
                stocksBySystem[s.aluminum_system_id][`wh_id_${s.warehouse_id}`] = s.quantity;
            });
        } catch (stockTableErr) {
            console.warn('⚠️ Aluminum warehouse tables missing or query failed. Stock data will be empty.', stockTableErr.message);
            // Non-blocking error, we still want to return the system list
        }

        // Đảm bảo cross_section_image, density và aluminum_system được map đúng
        const processedRows = rows.map(row => {
            const systemStocks = stocksBySystem[row.id] || {};
            
            // Calculate total quantity across ALL warehouses
            let total_quantity = 0;
            Object.keys(systemStocks).forEach(key => {
                if (key.startsWith('wh_id_')) {
                    total_quantity += parseFloat(systemStocks[key]) || 0;
                }
            });

            return {
                ...row,
                cross_section_image: row.cross_section_image || null,
                density: row.density || null,
                aluminum_system: row.aluminum_system ? row.aluminum_system.trim() : null,
                stocks: systemStocks,
                total_quantity: total_quantity,
                // Overwrite legacy quantity for backward compatibility in "Total" view
                quantity: total_quantity 
            };
        });

        res.json({
            success: true,
            data: processedRows,
            count: processedRows.length
        });
    } catch (err) {
        console.error('Error in getAllSystems:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy dữ liệu kho nhôm"
        });
    }
};

// GET by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            "SELECT * FROM aluminum_systems WHERE id = ? AND is_active = 1",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy kho nhôm"
            });
        }

        // Đảm bảo cross_section_image, density và aluminum_system được map đúng
        const system = rows[0];
        system.cross_section_image = system.cross_section_image || null;
        system.density = system.density || null;
        system.aluminum_system = system.aluminum_system || null;

        res.json({
            success: true,
            data: system
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
        // Handle both JSON and FormData
        // Hỗ trợ cả brand/thickness_mm (cũ) và density/cross_section_image (mới)
        let code, name, brand, thickness_mm, density, weight_per_meter, length_m, quantity, quantity_m, color, description, image_url, cross_section_image, unit_price, aluminum_system = null;

        if (req.file) {
            // FormData with file upload
            code = req.body.code;
            aluminum_system = req.body.aluminum_system || null;
            name = req.body.name;
            brand = req.body.brand || null;
            thickness_mm = req.body.thickness_mm ? parseFloat(req.body.thickness_mm) : null;
            density = req.body.density && req.body.density !== '' ? parseFloat(req.body.density) : null;
            weight_per_meter = req.body.weight_per_meter ? parseFloat(req.body.weight_per_meter) : null;
            length_m = req.body.length_m && req.body.length_m !== '' ? parseFloat(req.body.length_m) : null;
            quantity = req.body.quantity ? parseInt(req.body.quantity) : 0;
            quantity_m = req.body.quantity_m ? parseFloat(req.body.quantity_m) : null;
            unit_price = req.body.unit_price ? parseFloat(req.body.unit_price) : 0;
            color = req.body.color && req.body.color !== '' ? req.body.color : null;
            description = req.body.description && req.body.description !== '' ? req.body.description : null;
            // Save image path - multer saves to uploads/aluminum-systems/
            image_url = `/uploads/aluminum-systems/${req.file.filename}`;
            cross_section_image = image_url;
        } else {
            // JSON request
            ({ code, name, brand, thickness_mm, density, weight_per_meter, length_m, quantity, quantity_m, color, description, image_url, cross_section_image, unit_price, aluminum_system } = req.body);
            // Parse density nếu là string
            if (density && typeof density === 'string' && density !== '') {
                density = parseFloat(density);
            } else if (!density || density === '') {
                density = null;
            }
            unit_price = unit_price || 0;
            // Nếu có quantity thì dùng quantity, nếu không thì dùng quantity_m
            if (quantity === undefined && quantity_m !== undefined) {
                quantity = parseInt(quantity_m) || 0;
            }
            // cross_section_image đã được parse từ req.body
        }

        const min_stock_level = req.body ? (parseInt(req.body.min_stock_level) || 5) : 5;
        const max_stock_level = req.body ? (parseInt(req.body.max_stock_level) || 50) : 50;

        const [result] = await db.query(
            `INSERT INTO aluminum_systems 
             (code, name, brand, thickness_mm, density, weight_per_meter, length_m, quantity, quantity_m, color, description, cross_section_image, unit_price, aluminum_system, min_stock_level, max_stock_level) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, name, brand || null, thickness_mm || null, density || null, weight_per_meter || null, length_m || null, quantity || 0, quantity_m || null, color, description || null, cross_section_image || null, unit_price || 0, aluminum_system || null, min_stock_level, max_stock_level]
        );

        res.status(201).json({
            success: true,
            message: "Thêm kho nhôm thành công",
            data: { id: result.insertId }
        });
            // Realtime: Thông báo thay đổi dữ liệu
            try { emitDataChange('inventory', 'created', { id: result.insertId, type: 'aluminum' }); } catch(e) {}
    } catch (err) {
        console.error('Error creating aluminum system:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Mã kho nhôm đã tồn tại"
            });
        }
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                success: false,
                message: "Lỗi database: Cột không tồn tại. Vui lòng chạy migration SQL để thêm cột density và cross_section_image."
            });
        }
        res.status(500).json({
            success: false,
            message: "Lỗi khi thêm kho nhôm: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// PUT update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;

        // Handle both JSON and FormData
        // Hỗ trợ cả brand/thickness_mm (cũ) và density/cross_section_image (mới)
        let code, name, brand, thickness_mm, density, weight_per_meter, length_m, quantity, quantity_m, color, description, image_url, cross_section_image;
        let unit_price, door_type, profiles, matching_rules, aluminum_system;

        // Lấy cross_section_image hiện tại từ database trước khi update
        const [currentRows] = await db.query(
            "SELECT cross_section_image FROM aluminum_systems WHERE id = ?",
            [id]
        );
        const currentCrossSectionImage = currentRows.length > 0 ? currentRows[0].cross_section_image : null;

        if (req.file) {
            // FormData with file upload
            code = req.body.code;
            name = req.body.name;
            aluminum_system = req.body.aluminum_system || null;
            brand = req.body.brand || null;
            thickness_mm = req.body.thickness_mm ? parseFloat(req.body.thickness_mm) : null;
            density = req.body.density && req.body.density !== '' ? parseFloat(req.body.density) : null;
            weight_per_meter = req.body.weight_per_meter ? parseFloat(req.body.weight_per_meter) : null;
            length_m = req.body.length_m && req.body.length_m !== '' ? parseFloat(req.body.length_m) : null;
            quantity = req.body.quantity ? parseInt(req.body.quantity) : (req.body.quantity_m ? parseInt(req.body.quantity_m) : 0);
            quantity_m = req.body.quantity_m ? parseFloat(req.body.quantity_m) : null;
            color = req.body.color && req.body.color !== '' ? req.body.color : null;
            description = req.body.description && req.body.description !== '' ? req.body.description : null;
            // Save image path - multer saves to uploads/aluminum-systems/
            image_url = `/uploads/aluminum-systems/${req.file.filename}`;
            cross_section_image = image_url;
            unit_price = parseFloat(req.body.unit_price) || 0;
            door_type = req.body.door_type || 'door';
            profiles = req.body.profiles ? JSON.parse(req.body.profiles) : null;
            matching_rules = req.body.matching_rules ? JSON.parse(req.body.matching_rules) : null;
        } else {
            // JSON request
            ({
                code, name, brand, thickness_mm, density, weight_per_meter, length_m, quantity, quantity_m, color, description, image_url, cross_section_image,
                unit_price, door_type, profiles, matching_rules, aluminum_system
            } = req.body);

            // Parse density nếu là string
            if (density && typeof density === 'string' && density !== '') {
                density = parseFloat(density);
            } else if (!density || density === '') {
                density = null;
            }

            // Nếu có quantity thì dùng quantity, nếu không thì dùng quantity_m
            if (quantity === undefined && quantity_m !== undefined) {
                quantity = parseInt(quantity_m) || 0;
            }

            // Nếu không có cross_section_image trong request và không có file mới, giữ nguyên cross_section_image cũ
            if (!cross_section_image) {
                cross_section_image = currentCrossSectionImage;
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        
        if (code !== undefined) { updateFields.push('code = ?'); updateValues.push(code); }
        if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
        if (aluminum_system !== undefined) { updateFields.push('aluminum_system = ?'); updateValues.push(aluminum_system); }
        if (brand !== undefined) { updateFields.push('brand = ?'); updateValues.push(brand); }
        if (thickness_mm !== undefined) { updateFields.push('thickness_mm = ?'); updateValues.push(thickness_mm); }
        if (density !== undefined) { updateFields.push('density = ?'); updateValues.push(density); }
        if (weight_per_meter !== undefined) { updateFields.push('weight_per_meter = ?'); updateValues.push(weight_per_meter); }
        if (length_m !== undefined) { updateFields.push('length_m = ?'); updateValues.push(length_m || null); }
        if (quantity !== undefined) { updateFields.push('quantity = ?'); updateValues.push(quantity || 0); }
        if (quantity_m !== undefined) { updateFields.push('quantity_m = ?'); updateValues.push(quantity_m || null); }
        if (color !== undefined) { updateFields.push('color = ?'); updateValues.push(color); }
        if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description || null); }
        if (cross_section_image !== undefined) { updateFields.push('cross_section_image = ?'); updateValues.push(cross_section_image || null); }
        if (unit_price !== undefined) { updateFields.push('unit_price = ?'); updateValues.push(unit_price || 0); }
        if (door_type !== undefined) { updateFields.push('door_type = ?'); updateValues.push(door_type || 'door'); }
        if (profiles !== undefined) { updateFields.push('profiles = ?'); updateValues.push(profiles ? JSON.stringify(profiles) : null); }
        if (matching_rules !== undefined) { updateFields.push('matching_rules = ?'); updateValues.push(matching_rules ? JSON.stringify(matching_rules) : null); }

        // Handle min/max stock levels
        const min_stock_level = req.body.min_stock_level;
        const max_stock_level = req.body.max_stock_level;
        if (min_stock_level !== undefined) { updateFields.push('min_stock_level = ?'); updateValues.push(parseInt(min_stock_level) || 5); }
        if (max_stock_level !== undefined) { updateFields.push('max_stock_level = ?'); updateValues.push(parseInt(max_stock_level) || 50); }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có trường nào để cập nhật"
            });
        }

        updateValues.push(id);

        const [result] = await db.query(
            `UPDATE aluminum_systems 
             SET ${updateFields.join(', ')}
             WHERE id = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hệ nhôm"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật kho nhôm thành công"
        });
            // Realtime: Thông báo thay đổi dữ liệu
            try { emitDataChange('inventory', 'updated', { id: req.params.id, type: 'aluminum' }); } catch(e) {}
    } catch (err) {
        console.error('Error updating aluminum system:', err);
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                success: false,
                message: "Lỗi database: Cột không tồn tại. Vui lòng chạy migration SQL để thêm cột density và cross_section_image."
            });
        }
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật kho nhôm: " + (err.message || 'Lỗi không xác định')
        });
    }
};

// GET by ID with profiles and colors
exports.getByIdWithDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Get system
        const [systemRows] = await db.query(
            "SELECT * FROM aluminum_systems WHERE id = ? AND is_active = 1",
            [id]
        );

        if (systemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hệ nhôm"
            });
        }

        const system = systemRows[0];

        // Parse JSON fields
        if (system.profiles && typeof system.profiles === 'string') {
            try {
                system.profiles = JSON.parse(system.profiles);
            } catch (e) {
                system.profiles = null;
            }
        }
        if (system.matching_rules && typeof system.matching_rules === 'string') {
            try {
                system.matching_rules = JSON.parse(system.matching_rules);
            } catch (e) {
                system.matching_rules = null;
            }
        }

        // Get profiles
        const [profiles] = await db.query(
            "SELECT * FROM aluminum_profiles WHERE system_id = ? AND is_active = 1 ORDER BY profile_type, profile_code",
            [id]
        );

        // Get colors
        const [colors] = await db.query(
            "SELECT * FROM aluminum_colors WHERE system_id = ? AND is_available = 1",
            [id]
        );

        // Get cutting formulas
        const [formulas] = await db.query(
            "SELECT * FROM cutting_formulas WHERE system_id = ? AND is_active = 1",
            [id]
        );

        system.profiles_list = profiles;
        system.colors_list = colors;
        system.cutting_formulas = formulas;

        res.json({
            success: true,
            data: system
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// DELETE (soft delete)
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "UPDATE aluminum_systems SET is_active = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hệ nhôm"
            });
        }

        res.json({
            success: true,
            message: "Xóa kho nhôm thành công"
        });
            // Realtime: Thông báo thay đổi dữ liệu
            try { emitDataChange('inventory', 'deleted', { id: req.params.id, type: 'aluminum' }); } catch(e) {}
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa hệ nhôm"
        });
    }
};






