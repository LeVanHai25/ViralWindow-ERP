/**
 * CALC - Cửa sổ (window)
 */

function calcWindow(snapshot) {
    const W = (snapshot.size?.w || snapshot.width || 600) / 1000;
    const H = (snapshot.size?.h || snapshot.height || 1200) / 1000;
    const leafCount = snapshot.leaf_count || 1;
    const isFixed = snapshot.open_style === 'fixed' || leafCount === 0;
    const wastePercent = snapshot.technical_params?.waste_percent || 2;
    const wasteFactor = 1 + wastePercent / 100;

    // Frame
    const frame_vertical = 2 * H;
    const frame_horizontal = 2 * W;

    // Cánh (nếu có)
    let leaf_vertical = 0;
    let leaf_horizontal = 0;
    if (!isFixed && leafCount > 0) {
        leaf_vertical = 2 * leafCount * H;
        leaf_horizontal = 2 * leafCount * (W / leafCount);
    }

    const totalAluminum = (frame_vertical + frame_horizontal + leaf_vertical + leaf_horizontal) * wasteFactor;

    // Kính
    const glassWidth = isFixed ? (W - 0.06) : ((W / leafCount) - 0.06);
    const glassHeight = H - 0.1;
    const glassArea = (isFixed ? 1 : leafCount) * glassWidth * glassHeight;

    const accessories = [
        { name: 'Gioăng cao su', qty: Math.ceil(2 * (W + H)), unit: 'm' }
    ];

    if (!isFixed) {
        accessories.push(
            { name: 'Bản lề cửa sổ', qty: 2 * leafCount, unit: 'piece' },
            { name: 'Tay chống', qty: leafCount, unit: 'piece' }
        );
    }

    return {
        aluminum: {
            profiles: [
                { role: 'frame_vertical', name: 'Khung đứng', length_m: H, quantity: 2, total_length_m: 2 * H * wasteFactor },
                { role: 'frame_horizontal', name: 'Khung ngang', length_m: W, quantity: 2, total_length_m: 2 * W * wasteFactor },
                ...(isFixed ? [] : [
                    { role: 'leaf_vertical', name: 'Cánh đứng', length_m: H, quantity: 2 * leafCount, total_length_m: leaf_vertical * wasteFactor },
                    { role: 'leaf_horizontal', name: 'Cánh ngang', length_m: W / leafCount, quantity: 2 * leafCount, total_length_m: leaf_horizontal * wasteFactor }
                ])
            ],
            total_m: totalAluminum
        },
        glass: {
            area_m2: parseFloat(glassArea.toFixed(3)),
            panels: isFixed ? 1 : leafCount
        },
        accessories
    };
}

module.exports = { calcWindow };
