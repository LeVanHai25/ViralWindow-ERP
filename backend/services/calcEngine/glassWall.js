/**
 * CALC - Vách kính fix (glass wall)
 */

function calcGlassWall(snapshot) {
    const W = (snapshot.size?.w || snapshot.width || 2000) / 1000;
    const H = (snapshot.size?.h || snapshot.height || 2500) / 1000;
    const wastePercent = snapshot.technical_params?.waste_percent || 2;
    const wasteFactor = 1 + wastePercent / 100;

    // Số ô kính (nếu có chia ô)
    const cols = snapshot.layout?.cols || 1;
    const rows = snapshot.layout?.rows || 1;

    // Frame
    const frame_vertical = 2 * H;
    const frame_horizontal = 2 * W;

    // Đố giữa (mullion)
    const mullion_vertical = (cols - 1) * H;
    const mullion_horizontal = (rows - 1) * W;

    const totalAluminum = (frame_vertical + frame_horizontal + mullion_vertical + mullion_horizontal) * wasteFactor;

    // Kính
    const cellWidth = W / cols;
    const cellHeight = H / rows;
    const glassArea = W * H; // Tổng diện tích kính

    return {
        aluminum: {
            profiles: [
                { role: 'frame_vertical', name: 'Khung đứng', length_m: H, quantity: 2, total_length_m: 2 * H * wasteFactor },
                { role: 'frame_horizontal', name: 'Khung ngang', length_m: W, quantity: 2, total_length_m: 2 * W * wasteFactor },
                ...(cols > 1 ? [{ role: 'mullion', name: 'Đố đứng', length_m: H, quantity: cols - 1, total_length_m: mullion_vertical * wasteFactor }] : []),
                ...(rows > 1 ? [{ role: 'mullion', name: 'Đố ngang', length_m: W, quantity: rows - 1, total_length_m: mullion_horizontal * wasteFactor }] : [])
            ],
            total_m: totalAluminum
        },
        glass: {
            area_m2: parseFloat(glassArea.toFixed(3)),
            panels: cols * rows,
            panel_size_m: { w: cellWidth, h: cellHeight }
        },
        accessories: [
            { name: 'Ke góc', qty: 4, unit: 'piece' },
            { name: 'Ron kính', qty: Math.ceil(2 * (W + H) + (cols - 1) * H + (rows - 1) * W), unit: 'm' },
            { name: 'Silicone', qty: Math.ceil((W + H) / 3), unit: 'tube' }
        ]
    };
}

module.exports = { calcGlassWall };
