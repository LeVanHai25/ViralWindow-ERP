const db = require("../config/db");

/**
 * Generate tổng hợp nhôm nguyên cây từ BOM của project
 * POST /api/projects/:projectId/aluminum-summary/generate
 */
exports.generateSummary = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { barLengthMm = 6000 } = req.body; // Mặc định 6m

        // Bước 1: Lấy BOM nhôm của project (chỉ lấy frame, mullion, sash, bead)
        const [bomRows] = await db.query(`
            SELECT 
                bi.item_code,
                bi.item_name,
                bi.length_mm,
                bi.quantity,
                bi.weight_kg,
                bi.aluminum_system_id,
                ap.id as profile_id,
                ap.profile_code,
                ap.profile_name,
                ap.weight_per_meter,
                ap.unit_price as profile_unit_price,
                a.code as system_code,
                a.name as system_name,
                a.unit_price as system_unit_price
            FROM bom_items bi
            INNER JOIN door_designs dd ON bi.design_id = dd.id
            LEFT JOIN aluminum_profiles ap ON bi.item_code = ap.profile_code 
                AND bi.aluminum_system_id = ap.system_id
            LEFT JOIN aluminum_systems a ON bi.aluminum_system_id = a.id
            WHERE dd.project_id = ? 
                AND bi.item_type IN ('frame', 'mullion', 'sash', 'bead')
                AND bi.length_mm IS NOT NULL
                AND bi.length_mm > 0
        `, [projectId]);

        if (bomRows.length === 0) {
            return res.json({
                success: true,
                message: "Chưa có BOM nhôm cho dự án này",
                data: {
                    summary: [],
                    totals: {
                        total_length_mm: 0,
                        total_length_m: 0,
                        total_weight_kg: 0,
                        total_bars: 0,
                        total_cost_vnd: 0
                    }
                }
            });
        }

        // Bước 2: Nhóm theo profile và tính tổng
        const profileMap = new Map();

        for (const row of bomRows) {
            const profileKey = row.profile_id || row.item_code || row.item_name;
            
            if (!profileMap.has(profileKey)) {
                profileMap.set(profileKey, {
                    profile_id: row.profile_id,
                    profile_code: row.profile_code || row.item_code,
                    profile_name: row.profile_name || row.item_name,
                    system_id: row.aluminum_system_id,
                    system_code: row.system_code,
                    system_name: row.system_name,
                    weight_per_meter: row.weight_per_meter || row.system_unit_price || 0,
                    unit_price_per_kg: row.profile_unit_price || row.system_unit_price || 0,
                    total_length_mm: 0,
                    total_weight_kg: 0,
                    total_cost_vnd: 0,
                    required_bars: 0
                });
            }

            const profile = profileMap.get(profileKey);
            const lengthMm = parseFloat(row.length_mm) || 0;
            const quantity = parseFloat(row.quantity) || 1;
            
            // Nếu đã có weight_kg từ BOM, dùng luôn, nếu không thì tính
            if (row.weight_kg) {
                profile.total_weight_kg += parseFloat(row.weight_kg) * quantity;
            } else {
                // Tính từ length và weight_per_meter
                const lengthM = (lengthMm * quantity) / 1000;
                const weightPerMeter = profile.weight_per_meter || 0;
                profile.total_weight_kg += lengthM * weightPerMeter;
            }
            
            profile.total_length_mm += lengthMm * quantity;
        }

        // Bước 3: Tính toán cho từng profile
        const summary = [];
        let totalLengthMm = 0;
        let totalLengthM = 0;
        let totalWeightKg = 0;
        let totalBars = 0;
        let totalCostVnd = 0;

        for (const [key, profile] of profileMap) {
            // Tính số cây cần mua
            const requiredBars = Math.ceil(profile.total_length_mm / barLengthMm);
            
            // Đổi chiều dài sang mét
            const totalLengthM = profile.total_length_mm / 1000;
            
            // Tính lại trọng lượng nếu chưa có (fallback)
            if (profile.total_weight_kg === 0 && profile.weight_per_meter > 0) {
                profile.total_weight_kg = totalLengthM * profile.weight_per_meter;
            }
            
            // Tính thành tiền
            const totalCostVnd = profile.total_weight_kg * profile.unit_price_per_kg;

            profile.required_bars = requiredBars;
            profile.total_length_m = parseFloat(totalLengthM.toFixed(3));
            profile.total_weight_kg = parseFloat(profile.total_weight_kg.toFixed(3));
            profile.total_cost_vnd = parseFloat(totalCostVnd.toFixed(2));

            // Cộng vào tổng
            totalLengthMm += profile.total_length_mm;
            totalLengthM += profile.total_length_m;
            totalWeightKg += profile.total_weight_kg;
            totalBars += requiredBars;
            totalCostVnd += profile.total_cost_vnd;

            summary.push(profile);
        }

        // Tính tỷ trọng (%)
        summary.forEach(profile => {
            profile.weight_percentage = totalWeightKg > 0 
                ? parseFloat(((profile.total_weight_kg / totalWeightKg) * 100).toFixed(2))
                : 0;
        });

        // Sắp xếp theo trọng lượng giảm dần
        summary.sort((a, b) => b.total_weight_kg - a.total_weight_kg);

        // Bước 4: Lưu vào bảng aluminum_bar_summary (nếu có)
        try {
            // Xóa dữ liệu cũ
            await db.query(
                'DELETE FROM aluminum_bar_summary WHERE project_id = ?',
                [projectId]
            );

            // Insert dữ liệu mới
            for (const item of summary) {
                await db.query(`
                    INSERT INTO aluminum_bar_summary 
                    (project_id, profile_id, profile_code, profile_name, 
                     total_length_mm, total_length_m, required_bars, bar_length_mm,
                     total_weight_kg, weight_percentage, unit_price_per_kg, total_cost_vnd,
                     system_id, system_code, last_generated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    projectId,
                    item.profile_id,
                    item.profile_code,
                    item.profile_name,
                    item.total_length_mm,
                    item.total_length_m,
                    item.required_bars,
                    barLengthMm,
                    item.total_weight_kg,
                    item.weight_percentage,
                    item.unit_price_per_kg,
                    item.total_cost_vnd,
                    item.system_id,
                    item.system_code
                ]);
            }
        } catch (err) {
            // Nếu bảng chưa tồn tại, chỉ log warning, không fail request
            console.warn('Could not save to aluminum_bar_summary table:', err.message);
        }

        res.json({
            success: true,
            message: "Tổng hợp nhôm thành công",
            data: {
                summary: summary,
                totals: {
                    total_length_mm: parseFloat(totalLengthMm.toFixed(2)),
                    total_length_m: parseFloat(totalLengthM.toFixed(3)),
                    total_weight_kg: parseFloat(totalWeightKg.toFixed(3)),
                    total_bars: totalBars,
                    total_cost_vnd: parseFloat(totalCostVnd.toFixed(2)),
                    bar_length_mm: barLengthMm
                },
                bar_length_mm: barLengthMm
            }
        });
    } catch (err) {
        console.error('Error generating aluminum summary:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tổng hợp nhôm: " + err.message
        });
    }
};

/**
 * Lấy tổng hợp nhôm đã tính
 * GET /api/projects/:projectId/aluminum-summary
 */
exports.getSummary = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Thử lấy từ bảng aluminum_bar_summary trước
        try {
            const [rows] = await db.query(`
                SELECT * FROM aluminum_bar_summary 
                WHERE project_id = ?
                ORDER BY total_weight_kg DESC
            `, [projectId]);

            if (rows.length > 0) {
                const summary = rows.map(row => ({
                    profile_id: row.profile_id,
                    profile_code: row.profile_code,
                    profile_name: row.profile_name,
                    system_id: row.system_id,
                    system_code: row.system_code,
                    total_length_mm: parseFloat(row.total_length_mm),
                    total_length_m: parseFloat(row.total_length_m),
                    required_bars: row.required_bars,
                    bar_length_mm: row.bar_length_mm,
                    total_weight_kg: parseFloat(row.total_weight_kg),
                    weight_percentage: parseFloat(row.weight_percentage),
                    unit_price_per_kg: parseFloat(row.unit_price_per_kg),
                    total_cost_vnd: parseFloat(row.total_cost_vnd)
                }));

                const totals = {
                    total_length_mm: summary.reduce((sum, item) => sum + item.total_length_mm, 0),
                    total_length_m: summary.reduce((sum, item) => sum + item.total_length_m, 0),
                    total_weight_kg: summary.reduce((sum, item) => sum + item.total_weight_kg, 0),
                    total_bars: summary.reduce((sum, item) => sum + item.required_bars, 0),
                    total_cost_vnd: summary.reduce((sum, item) => sum + item.total_cost_vnd, 0),
                    bar_length_mm: rows[0]?.bar_length_mm || 6000
                };

                return res.json({
                    success: true,
                    data: {
                        summary: summary,
                        totals: totals,
                        bar_length_mm: totals.bar_length_mm
                    }
                });
            }
        } catch (err) {
            // Bảng chưa tồn tại, tính toán trực tiếp từ BOM
            console.log('aluminum_bar_summary table not found, calculating from BOM...');
        }

        // Nếu không có trong bảng, tính toán trực tiếp từ BOM
        // Gọi lại hàm generate nhưng không lưu
        const reqMock = {
            params: { projectId },
            body: { barLengthMm: 6000 }
        };
        
        // Tạo response mock để lấy data
        let resultData = null;
        const resMock = {
            json: (data) => {
                resultData = data;
            },
            status: (code) => ({
                json: (data) => {
                    resultData = data;
                }
            })
        };

        await exports.generateSummary(reqMock, resMock);

        if (resultData && resultData.success) {
            res.json(resultData);
        } else {
            res.json({
                success: true,
                message: "Chưa có dữ liệu tổng hợp nhôm",
                data: {
                    summary: [],
                    totals: {
                        total_length_mm: 0,
                        total_length_m: 0,
                        total_weight_kg: 0,
                        total_bars: 0,
                        total_cost_vnd: 0,
                        bar_length_mm: 6000
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error getting aluminum summary:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy tổng hợp nhôm: " + err.message
        });
    }
};

/**
 * Lưu vào bảng tài chính
 * POST /api/projects/:projectId/aluminum-summary/save-to-finance
 */
exports.saveToFinance = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { transaction_date, description } = req.body;

        // Lấy tổng hợp nhôm
        const [summaryRows] = await db.query(`
            SELECT * FROM aluminum_bar_summary 
            WHERE project_id = ?
        `, [projectId]);

        if (summaryRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Chưa có dữ liệu tổng hợp nhôm. Vui lòng tính toán trước."
            });
        }

        const totalCost = summaryRows.reduce((sum, row) => sum + parseFloat(row.total_cost_vnd || 0), 0);

        if (totalCost <= 0) {
            return res.status(400).json({
                success: false,
                message: "Tổng chi phí nhôm bằng 0, không thể lưu vào tài chính."
            });
        }

        // Lấy thông tin project
        const [projectRows] = await db.query(
            'SELECT id, project_name, customer_id FROM projects WHERE id = ?',
            [projectId]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dự án"
            });
        }

        const project = projectRows[0];

        // Tạo giao dịch tài chính (chi phí)
        const transactionDate = transaction_date || new Date().toISOString().split('T')[0];
        const year = new Date(transactionDate).getFullYear();
        
        // Generate unique transaction code
        let transaction_code;
        let maxAttempts = 10;
        let attempt = 0;
        
        while (attempt < maxAttempts) {
            const [maxCodeRows] = await db.query(`
                SELECT transaction_code 
                FROM financial_transactions 
                WHERE transaction_code LIKE ? AND transaction_type = 'expense'
                ORDER BY CAST(SUBSTRING(transaction_code, 9) AS UNSIGNED) DESC
                LIMIT 1
            `, [`CHI-${year}-%`]);
            
            let nextNumber = 1;
            if (maxCodeRows.length > 0 && maxCodeRows[0].transaction_code) {
                const match = maxCodeRows[0].transaction_code.match(/CHI-\d+-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }
            
            transaction_code = `CHI-${year}-${String(nextNumber).padStart(4, '0')}`;
            
            // Kiểm tra xem code đã tồn tại chưa
            const [checkExisting] = await db.query(
                "SELECT id FROM financial_transactions WHERE transaction_code = ?",
                [transaction_code]
            );
            
            if (checkExisting.length === 0) {
                // Code chưa tồn tại, có thể sử dụng
                break;
            }
            
            // Code đã tồn tại, thử số tiếp theo
            nextNumber++;
            attempt++;
        }
        
        if (attempt >= maxAttempts) {
            // Fallback: sử dụng timestamp để đảm bảo unique
            const timestamp = Date.now().toString().slice(-6);
            transaction_code = `CHI-${year}-${timestamp}`;
        }

        // Tạo mô tả chi tiết
        const detailDescription = description || `Chi phí nhôm nguyên cây cho dự án ${project.project_name || projectId}`;
        const fullDescription = `${detailDescription}\n\nChi tiết:\n` + 
            summaryRows.map(row => 
                `- ${row.profile_name} (${row.profile_code}): ${row.total_weight_kg}kg x ${row.unit_price_per_kg.toLocaleString('vi-VN')} = ${row.total_cost_vnd.toLocaleString('vi-VN')} VND`
            ).join('\n');

        // Insert vào financial_transactions
        const [result] = await db.query(`
            INSERT INTO financial_transactions
            (transaction_code, transaction_date, transaction_type, category, expense_type, supplier,
             amount, description, project_id, customer_id, production_order_id, payment_method, reference_number)
            VALUES (?, ?, 'expense', 'material', 'aluminum', NULL, ?, ?, ?, ?, NULL, NULL, ?)
        `, [
            transaction_code,
            transactionDate,
            totalCost,
            fullDescription,
            projectId,
            project.customer_id || null,
            `ALUMINUM-SUMMARY-${projectId}`
        ]);

        res.json({
            success: true,
            message: "Đã lưu vào bảng tài chính thành công",
            data: {
                transaction_id: result.insertId,
                transaction_code: transaction_code,
                total_cost: totalCost,
                items_count: summaryRows.length,
                transaction_date: transactionDate
            }
        });
    } catch (err) {
        console.error('Error saving to finance:', err);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lưu vào tài chính: " + err.message
        });
    }
};

