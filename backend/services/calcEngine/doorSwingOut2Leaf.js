/**
 * CALC - Cửa đi mở quay 2 cánh
 * ATC Style: tính từ kích thước W × H
 */

/**
 * @param {Object} snapshot - snapshot_config từ project_item
 * @param {number} snapshot.size.w - Chiều rộng mm
 * @param {number} snapshot.size.h - Chiều cao mm
 * @param {number} snapshot.leaf_count - Số cánh (mặc định 2)
 * @param {number} snapshot.technical_params.waste_percent - % hao hụt
 */
function calcDoorSwingOut2Leaf(snapshot) {
    const W = (snapshot.size?.w || snapshot.width || 1400) / 1000; // mm -> m
    const H = (snapshot.size?.h || snapshot.height || 2200) / 1000;
    const leafCount = snapshot.leaf_count || 2;
    const wastePercent = snapshot.technical_params?.waste_percent || 2;
    const wasteFactor = 1 + wastePercent / 100;

    // Khung bao (frame)
    const frame_vertical = 2 * H;     // 2 thanh đứng
    const frame_horizontal = 2 * W;   // 2 thanh ngang

    // Cánh (leaf)
    const leaf_vertical = 2 * leafCount * H;           // 2 cánh × 2 thanh đứng = 4 × H
    const leaf_horizontal = 2 * leafCount * (W / leafCount); // 2 cánh × 2 thanh ngang = 4 × (W/2)

    // Tổng nhôm
    const totalAluminum = frame_vertical + frame_horizontal + leaf_vertical + leaf_horizontal;
    const totalWithWaste = totalAluminum * wasteFactor;

    // Kính
    const glassWidth = (W - 0.1) / leafCount; // trừ gap ~100mm cho cả cửa
    const glassHeight = H - 0.15; // trừ gap ~150mm
    const glassArea = leafCount * glassWidth * glassHeight;

    return {
        aluminum: {
            profiles: [
                { role: 'frame_vertical', name: 'Khung bao đứng', length_m: H, quantity: 2, total_length_m: 2 * H * wasteFactor },
                { role: 'frame_horizontal', name: 'Khung bao ngang', length_m: W, quantity: 2, total_length_m: 2 * W * wasteFactor },
                { role: 'leaf_vertical', name: 'Cánh đứng', length_m: H, quantity: 2 * leafCount, total_length_m: 2 * leafCount * H * wasteFactor },
                { role: 'leaf_horizontal', name: 'Cánh ngang', length_m: W / leafCount, quantity: 2 * leafCount, total_length_m: 2 * leafCount * (W / leafCount) * wasteFactor }
            ],
            frame_vertical_m: frame_vertical * wasteFactor,
            frame_horizontal_m: frame_horizontal * wasteFactor,
            leaf_vertical_m: leaf_vertical * wasteFactor,
            leaf_horizontal_m: leaf_horizontal * wasteFactor,
            total_m: totalWithWaste
        },
        glass: {
            area_m2: parseFloat(glassArea.toFixed(3)),
            panels: leafCount,
            panel_size_m: { w: glassWidth, h: glassHeight }
        },
        accessories: [
            { name: 'Bản lề', qty: 3 * leafCount, unit: 'piece' },
            { name: 'Tay nắm', qty: leafCount, unit: 'piece' },
            { name: 'Khóa', qty: 1, unit: 'piece' },
            { name: 'Gioăng cao su', qty: Math.ceil(2 * (W + H) / 6), unit: 'm' },
            { name: 'Ron kính', qty: Math.ceil(2 * (W + H * leafCount)), unit: 'm' }
        ]
    };
}

module.exports = { calcDoorSwingOut2Leaf };
