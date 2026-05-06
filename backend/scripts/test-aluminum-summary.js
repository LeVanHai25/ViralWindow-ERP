const db = require('../config/db');

/**
 * Script test tổng hợp nhôm nguyên cây
 * Sử dụng: node backend/scripts/test-aluminum-summary.js [projectId] [barLengthMm]
 */

async function testAluminumSummary(projectId, barLengthMm = 6000) {
    try {
        console.log(`\n🧪 Test tổng hợp nhôm cho project ${projectId} với cây nhôm ${barLengthMm}mm\n`);

        // 1. Kiểm tra project có tồn tại không
        const [projectRows] = await db.query(
            'SELECT id, project_name FROM projects WHERE id = ?',
            [projectId]
        );

        if (projectRows.length === 0) {
            console.error(`❌ Không tìm thấy project ID: ${projectId}`);
            process.exit(1);
        }

        console.log(`✅ Project: ${projectRows[0].project_name}\n`);

        // 2. Kiểm tra BOM nhôm
        const [bomRows] = await db.query(`
            SELECT 
                COUNT(*) as count,
                SUM(bi.length_mm * bi.quantity) as total_length_mm
            FROM bom_items bi
            INNER JOIN door_designs dd ON bi.design_id = dd.id
            WHERE dd.project_id = ? 
                AND bi.item_type IN ('frame', 'mullion', 'sash', 'bead')
                AND bi.length_mm IS NOT NULL
                AND bi.length_mm > 0
        `, [projectId]);

        console.log(`📊 BOM nhôm:`);
        console.log(`   - Số dòng BOM: ${bomRows[0].count}`);
        console.log(`   - Tổng chiều dài: ${(bomRows[0].total_length_mm / 1000).toFixed(2)} m\n`);

        if (bomRows[0].count === 0) {
            console.log(`⚠️  Project này chưa có BOM nhôm. Vui lòng tính BOM trước.`);
            process.exit(0);
        }

        // 3. Test generate summary
        const aluminumBarSummaryCtrl = require('../controllers/aluminumBarSummaryController');
        
        const reqMock = {
            params: { projectId },
            body: { barLengthMm }
        };

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

        await aluminumBarSummaryCtrl.generateSummary(reqMock, resMock);

        if (resultData && resultData.success) {
            const { summary, totals } = resultData.data;
            
            console.log(`✅ Tổng hợp nhôm thành công!\n`);
            console.log(`📋 Tổng quan:`);
            console.log(`   - Tổng chiều dài: ${totals.total_length_m.toFixed(3)} m`);
            console.log(`   - Tổng trọng lượng: ${totals.total_weight_kg.toFixed(3)} kg`);
            console.log(`   - Số cây cần mua: ${totals.total_bars} cây (${barLengthMm}mm)`);
            console.log(`   - Tổng chi phí: ${totals.total_cost_vnd.toLocaleString('vi-VN')} VND\n`);

            console.log(`📊 Chi tiết từng profile:\n`);
            summary.forEach((item, index) => {
                console.log(`${index + 1}. ${item.profile_name} (${item.profile_code})`);
                console.log(`   - Chiều dài: ${item.total_length_m.toFixed(3)} m`);
                console.log(`   - Trọng lượng: ${item.total_weight_kg.toFixed(3)} kg (${item.weight_percentage.toFixed(2)}%)`);
                console.log(`   - Số cây: ${item.required_bars} cây`);
                console.log(`   - Thành tiền: ${item.total_cost_vnd.toLocaleString('vi-VN')} VND\n`);
            });

            // 4. Kiểm tra đã lưu vào database chưa
            const [savedRows] = await db.query(
                'SELECT COUNT(*) as count FROM aluminum_bar_summary WHERE project_id = ?',
                [projectId]
            );

            console.log(`💾 Đã lưu vào database: ${savedRows[0].count} dòng\n`);
        } else {
            console.error(`❌ Lỗi: ${resultData?.message || 'Unknown error'}`);
            process.exit(1);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
}

// Main
const projectId = process.argv[2];
const barLengthMm = parseInt(process.argv[3]) || 6000;

if (!projectId) {
    console.error('❌ Vui lòng cung cấp project ID');
    console.log('Sử dụng: node backend/scripts/test-aluminum-summary.js [projectId] [barLengthMm]');
    process.exit(1);
}

testAluminumSummary(projectId, barLengthMm);














































































