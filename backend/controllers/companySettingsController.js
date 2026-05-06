const db = require("../config/db");

// GET settings
exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM company_config ORDER BY id DESC LIMIT 1"
        );

        if (rows.length === 0) {
            return res.json({
                success: true,
                data: null
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

// POST create settings
exports.createSettings = async (req, res) => {
    try {
        const {
            company_name, tax_code, address, phone, email, website,
            logo_path, logo_base64, signature_footer, signer_name, default_profit_margin,
            quote_validity_days, terms_conditions,
            office_lat, office_lng, office_radius, allowed_ips, office_address
        } = req.body;

        console.log('Create settings - logo_base64:', logo_base64 ? 'Có (length: ' + logo_base64.length + ')' : 'Không có');
        console.log('Create settings - logo_path:', logo_path || 'Không có');

        // Xử lý logo: ưu tiên logo_base64 từ frontend, nếu không có thì dùng logo_path
        const finalLogoPath = (logo_base64 && typeof logo_base64 === 'string' && logo_base64.trim() !== '')
            ? logo_base64
            : (logo_path || null);

        console.log('Final logo_path sẽ được lưu:', finalLogoPath ? 'Có (length: ' + finalLogoPath.length + ')' : 'null');

        const [result] = await db.query(
            `INSERT INTO company_config 
             (company_name, tax_code, address, phone, email, website, logo_path, 
              signature_footer, signer_name, default_profit_margin, quote_validity_days, terms_conditions,
              office_lat, office_lng, office_radius, allowed_ips, office_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                company_name || null,
                tax_code || null,
                address || null,
                phone || null,
                email || null,
                website || null,
                finalLogoPath,
                signature_footer || null,
                signer_name || null,
                default_profit_margin || 20,
                quote_validity_days || 30,
                terms_conditions || null,
                office_lat || null,
                office_lng || null,
                office_radius || 200,
                allowed_ips || null,
                office_address || null
            ]
        );

        console.log('Đã lưu logo_path vào database, ID:', result.insertId);

        res.status(201).json({
            success: true,
            message: "Tạo cấu hình thành công",
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error creating settings:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo cấu hình: " + (err.message || 'Unknown error')
        });
    }
};

// PUT update settings
exports.updateSettings = async (req, res) => {
    try {
        const {
            company_name, tax_code, address, phone, email, website,
            logo_path, logo_base64, signature_footer, signer_name, default_profit_margin,
            quote_validity_days, terms_conditions
        } = req.body;

        console.log('=== UPDATE COMPANY SETTINGS ===');
        console.log('Request body keys:', Object.keys(req.body));
        console.log('logo_base64 received:', logo_base64 ? `Yes (length: ${logo_base64.length}, starts with: ${logo_base64.substring(0, 30)}...)` : 'No');
        console.log('logo_path received:', logo_path ? `Yes (length: ${logo_path.length})` : 'No');

        // Check if settings exist
        const [existing] = await db.query(
            "SELECT id, logo_path FROM company_config ORDER BY id DESC LIMIT 1"
        );

        if (existing.length === 0) {
            console.log('No existing config, creating new...');
            return exports.createSettings(req, res);
        }

        const id = existing[0].id;
        const currentLogoPath = existing[0].logo_path;
        console.log('Existing config id:', id, ', has logo:', currentLogoPath ? `Yes (length: ${currentLogoPath.length})` : 'No');

        // Xử lý logo: ưu tiên logo_base64 từ frontend nếu có và hợp lệ
        let finalLogoPath;

        // Kiểm tra logo_base64 trực tiếp (không dùng 'in' operator vì có thể gây issues)
        if (logo_base64 && typeof logo_base64 === 'string' && logo_base64.trim() !== '') {
            // Có logo_base64 hợp lệ, dùng nó
            finalLogoPath = logo_base64;
            console.log('>>> Using NEW logo_base64 (length:', logo_base64.length, ')');
        } else if (logo_path && typeof logo_path === 'string' && logo_path.trim() !== '') {
            // Có logo_path được gửi trực tiếp
            finalLogoPath = logo_path;
            console.log('>>> Using logo_path from request (length:', logo_path.length, ')');
        } else {
            // Không có logo mới, giữ nguyên logo hiện tại từ database
            finalLogoPath = currentLogoPath;
            console.log('>>> Keeping existing logo from database');
        }

        console.log('Final logo_path to save:', finalLogoPath ? `Yes (length: ${finalLogoPath.length})` : 'null');

        // Lấy các trường geofencing từ req.body
        const { office_lat, office_lng, office_radius, allowed_ips, office_address } = req.body;

        const [result] = await db.query(
            `UPDATE company_config 
             SET company_name = ?, tax_code = ?, address = ?, phone = ?, email = ?, website = ?,
                 logo_path = ?, signature_footer = ?, signer_name = ?, default_profit_margin = ?,
                 quote_validity_days = ?, terms_conditions = ?,
                 office_lat = ?, office_lng = ?, office_radius = ?, allowed_ips = ?, office_address = ?
             WHERE id = ?`,
            [
                company_name || null,
                tax_code || null,
                address || null,
                phone || null,
                email || null,
                website || null,
                finalLogoPath,
                signature_footer || null,
                signer_name || null,
                default_profit_margin || 20,
                quote_validity_days || 30,
                terms_conditions || null,
                office_lat || null,
                office_lng || null,
                office_radius || 200,
                allowed_ips || null,
                office_address || null,
                id
            ]
        );

        console.log('UPDATE result - affected rows:', result.affectedRows, ', changed rows:', result.changedRows);

        // Verify logo was saved
        const [verify] = await db.query(
            "SELECT logo_path FROM company_config WHERE id = ?",
            [id]
        );
        if (verify.length > 0) {
            console.log('VERIFY after save - logo exists:', verify[0].logo_path ? `Yes (length: ${verify[0].logo_path.length})` : 'No');
        }
        console.log('=== END UPDATE ===');

        res.json({
            success: true,
            message: "Cập nhật cấu hình thành công"
        });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật cấu hình: " + (err.message || 'Unknown error')
        });
    }
};






