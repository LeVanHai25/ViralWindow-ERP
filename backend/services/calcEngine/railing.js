/**
 * CALC - Lan can kính (glass railing)
 */

function calcRailing(snapshot) {
    const L = (snapshot.size?.w || snapshot.size?.length || snapshot.length || 3000) / 1000; // Chiều dài tổng
    const H = (snapshot.size?.h || snapshot.height || 1100) / 1000; // Chiều cao
    const wastePercent = snapshot.technical_params?.waste_percent || 2;
    const wasteFactor = 1 + wastePercent / 100;

    // Số đoạn (mỗi đoạn ~1m)
    const segments = Math.ceil(L);

    // Cột đứng
    const post_count = segments + 1;
    const post_vertical = post_count * H;

    // Tay vịn trên
    const handrail = L;

    // Đế dưới (nếu có)
    const base_rail = L;

    const totalAluminum = (post_vertical + handrail + base_rail) * wasteFactor;

    // Kính (tấm kính từ đế lên tay vịn)
    const glassHeight = H - 0.05; // trừ tay vịn
    const glassArea = L * glassHeight;

    return {
        aluminum: {
            profiles: [
                { role: 'frame_vertical', name: 'Cột đứng', length_m: H, quantity: post_count, total_length_m: post_vertical * wasteFactor },
                { role: 'rail', name: 'Tay vịn', length_m: L, quantity: 1, total_length_m: L * wasteFactor },
                { role: 'sill', name: 'Đế dưới', length_m: L, quantity: 1, total_length_m: L * wasteFactor }
            ],
            total_m: totalAluminum
        },
        glass: {
            area_m2: parseFloat(glassArea.toFixed(3)),
            panels: segments,
            panel_size_m: { w: 1.0, h: glassHeight }
        },
        accessories: [
            { name: 'Chân cột', qty: post_count, unit: 'piece' },
            { name: 'Bu lông chân', qty: post_count * 4, unit: 'piece' },
            { name: 'Ke kẹp kính', qty: segments * 4, unit: 'piece' },
            { name: 'Silicone', qty: Math.ceil(L / 2), unit: 'tube' }
        ]
    };
}

module.exports = { calcRailing };
