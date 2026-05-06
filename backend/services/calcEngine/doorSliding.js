/**
 * CALC - Cửa lùa (sliding door)
 */

function calcDoorSliding(snapshot) {
    const W = (snapshot.size?.w || snapshot.width || 2000) / 1000;
    const H = (snapshot.size?.h || snapshot.height || 2200) / 1000;
    const leafCount = snapshot.leaf_count || 2;
    const wastePercent = snapshot.technical_params?.waste_percent || 2;
    const wasteFactor = 1 + wastePercent / 100;

    // Frame
    const frame_vertical = 2 * H;
    const frame_horizontal = 2 * W;

    // Rails (ray trượt)
    const rail_top = W;
    const rail_bottom = W;

    // Cánh
    const leaf_vertical = 2 * leafCount * H;
    const leafWidth = W / leafCount;
    const leaf_horizontal = 2 * leafCount * leafWidth;

    const totalAluminum = (frame_vertical + frame_horizontal + rail_top + rail_bottom + leaf_vertical + leaf_horizontal) * wasteFactor;

    // Kính
    const glassWidth = leafWidth - 0.08;
    const glassHeight = H - 0.12;
    const glassArea = leafCount * glassWidth * glassHeight;

    return {
        aluminum: {
            profiles: [
                { role: 'frame_vertical', name: 'Khung bao đứng', length_m: H, quantity: 2, total_length_m: 2 * H * wasteFactor },
                { role: 'frame_horizontal', name: 'Khung bao ngang', length_m: W, quantity: 2, total_length_m: 2 * W * wasteFactor },
                { role: 'rail', name: 'Ray trượt', length_m: W, quantity: 2, total_length_m: 2 * W * wasteFactor },
                { role: 'leaf_vertical', name: 'Cánh đứng', length_m: H, quantity: 2 * leafCount, total_length_m: 2 * leafCount * H * wasteFactor },
                { role: 'leaf_horizontal', name: 'Cánh ngang', length_m: leafWidth, quantity: 2 * leafCount, total_length_m: 2 * leafCount * leafWidth * wasteFactor }
            ],
            total_m: totalAluminum
        },
        glass: {
            area_m2: parseFloat(glassArea.toFixed(3)),
            panels: leafCount,
            panel_size_m: { w: glassWidth, h: glassHeight }
        },
        accessories: [
            { name: 'Bánh xe trượt', qty: 2 * leafCount, unit: 'piece' },
            { name: 'Tay nắm lùa', qty: leafCount, unit: 'piece' },
            { name: 'Khóa cửa lùa', qty: 1, unit: 'piece' },
            { name: 'Chổi chặn bụi', qty: Math.ceil(2 * W), unit: 'm' },
            { name: 'Gioăng cao su', qty: Math.ceil(4 * H * leafCount), unit: 'm' }
        ]
    };
}

module.exports = { calcDoorSliding };
