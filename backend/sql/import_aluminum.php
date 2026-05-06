<?php
// Script to import aluminum products with correct UTF-8 encoding
$mysqli = new mysqli("localhost", "root", "", "viral_window_db");
$mysqli->set_charset("utf8mb4");

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

echo "Starting aluminum import (INSERT or UPDATE mode)...\n";

// Categories: xingfa, pma, vietphap, viralwindow, inox, khac


$products = [
    // =====================================================
    // I. VRA-Hệ 55 Mở quay
    // =====================================================
    ['C3209', 'Khung vách', 'VRA', 'viralwindow', 1.40, 0.842, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3318', 'Khung bao cửa sổ mở quay', 'VRA', 'viralwindow', 1.40, 0.887, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3208', 'Cây đảo khuôn bao', 'VRA', 'viralwindow', 1.40, 0.798, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3202P', 'Cánh cửa sổ mở ngoài', 'VRA', 'viralwindow', 1.40, 1.127, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3313', 'Đố tĩnh chia Khung cửa sổ', 'VRA', 'viralwindow', 1.40, 1.056, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3203', 'Đố tĩnh chia cánh', 'VRA', 'viralwindow', 1.40, 1.001, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3328', 'Khung bao cửa đi', 'VRA', 'viralwindow', 1.40, 1.286, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3303P', 'Cánh cửa đi mở ngoài', 'VRA', 'viralwindow', 1.40, 1.496, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3332P', 'Cánh cửa đi mở trong', 'VRA', 'viralwindow', 1.40, 1.496, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3304P', 'Đố ngang dưới cánh cửa đi', 'VRA', 'viralwindow', 1.40, 2.107, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3323', 'Đố động cửa đi và cửa sổ nhập Yangly', 'VRA', 'viralwindow', 1.40, 0.828, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3329', 'Ốp chân cánh cửa đi', 'VRA', 'viralwindow', 1.40, 0.448, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3295', 'Nẹp kính đơn >12mm', 'VRA', 'viralwindow', 1.40, 0.238, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3296', 'Nẹp kính khung bao', 'VRA', 'viralwindow', 1.40, 0.246, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3236', 'Nẹp kính hộp >22mm', 'VRA', 'viralwindow', 1.40, 0.238, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3286', 'Nẹp kính hộp >25mm', 'VRA', 'viralwindow', 1.40, 0.238, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3225', 'Sập kính hộp cho khung > 21mm', 'VRA', 'viralwindow', 1.40, 0.233, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3326', 'Thanh chuyển góc 90 độ (góc vát)', 'VRA', 'viralwindow', 1.40, 0.933, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3310', 'Thanh tăng cứng vách và cửa', 'VRA', 'viralwindow', 1.40, 1.371, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C910', 'Cây chuyển góc 135 độ', 'VRA', 'viralwindow', 1.40, 0.962, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3300', 'Thanh ghép 2mm', 'VRA', 'viralwindow', 1.40, 0.364, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['F077', 'Pano', 'VRA', 'viralwindow', 1.40, 0.697, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C3319', 'Ngưỡng cửa đi', 'VRA', 'viralwindow', 1.40, 0.723, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['E1283', 'Khung chớp', 'VRA', 'viralwindow', 1.40, 0.210, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['E192', 'Nan chớp', 'VRA', 'viralwindow', 1.40, 0.340, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['VRA55-02', 'Cánh cửa đi mở trong mới', 'VRA', 'viralwindow', 1.40, 1.515, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['VRA55-03', 'Cánh cửa đi mở ngoài mới', 'VRA', 'viralwindow', 1.40, 1.515, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['VRA55-01', 'Cánh cửa sổ mới', 'VRA', 'viralwindow', 1.40, 1.163, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['VRA55-04', 'Nẹp kính hộp cho VRA55 cánh cửa sổ mới', 'VRA', 'viralwindow', 1.40, 0.233, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['C22900', 'Ốp chân cánh cửa đi (mới)', 'VRA', 'viralwindow', 1.40, 0.405, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['SH6002', 'Sập kính hộp SH6002', 'VRA', 'viralwindow', 1.40, 0.310, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    ['SH6001', 'Sập kính hộp SH6001', 'VRA', 'viralwindow', 1.40, 0.278, 'Xám sần', 'VRA-Hệ 55 Mở quay'],
    
    // =====================================================
    // II. VRA-Hệ 50
    // =====================================================
    ['VRA50-02', 'Cánh cửa sổ', 'VRA', 'viralwindow', 1.40, 0.958, 'Xám sần', 'VRA-Hệ 50'],
    ['VRA50-01', 'Cánh cửa đi', 'VRA', 'viralwindow', 1.40, 1.038, 'Xám sần', 'VRA-Hệ 50'],
    ['Q56A', 'Chia ô nhỏ', 'VRA', 'viralwindow', 1.40, 0.750, 'Xám sần', 'VRA-Hệ 50'],
    
    // =====================================================
    // III. VRA-Hệ 64 Cửa sổ lùa
    // =====================================================
    ['VRA64-01', 'Khung cửa lùa', 'VRA', 'viralwindow', 1.40, 1.041, 'Xám sần', 'VRA-Hệ 64 Cửa sổ lùa'],
    ['VRA64-02', 'Cánh cửa lùa', 'VRA', 'viralwindow', 1.40, 1.155, 'Xám sần', 'VRA-Hệ 64 Cửa sổ lùa'],
    ['VRA64-03', 'Ốp móc cửa lùa', 'VRA', 'viralwindow', 1.40, 0.420, 'Xám sần', 'VRA-Hệ 64 Cửa sổ lùa'],
    
    // =====================================================
    // V. VRE-Hệ 65 Mở quay - Mạnh Quy
    // =====================================================
    ['ALUK-EU-C6517', 'Che chân', 'VRE-MQ', 'viralwindow', 1.60, 0.239, 'Xám sần', 'VRE-Hệ 65 Mở quay (Mạnh Quy)'],
    ['ALUK-EU-C6518', 'Chắn nước', 'VRE-MQ', 'viralwindow', 1.60, 1.079, 'Xám sần', 'VRE-Hệ 65 Mở quay (Mạnh Quy)'],
    
    // =====================================================
    // VI. VRE-Hệ 65 Mở quay - Yangly
    // =====================================================
    ['YL6501', 'Khung bao cửa đi/cửa sổ', 'VRE-YL', 'viralwindow', 1.60, 1.477, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6503', 'Cánh cđ mở ngoài kép', 'VRE-YL', 'viralwindow', 1.60, 1.813, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6504', 'Cánh cđ mở trong kép', 'VRE-YL', 'viralwindow', 1.60, 1.814, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6505M', 'Cánh cửa sổ kép', 'VRE-YL', 'viralwindow', 1.60, 1.402, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6511', 'I nối', 'VRE-YL', 'viralwindow', 1.60, 0.415, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6513', 'Sập kính đơn 20 - 25 mm', 'VRE-YL', 'viralwindow', 1.60, 0.278, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6514', 'Sập kính đơn 5 - 10 mm', 'VRE-YL', 'viralwindow', 1.60, 0.334, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6505M-DK', 'Đảo khung', 'VRE-YL', 'viralwindow', 1.60, 0.917, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6507', 'Đố động dùng chung', 'VRE-YL', 'viralwindow', 1.60, 1.090, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6506', 'Đố T chia fix', 'VRE-YL', 'viralwindow', 1.60, 1.269, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6510', 'Chuyển góc', 'VRE-YL', 'viralwindow', 1.60, 0.952, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    ['YL6509', 'Ốp chân cánh cửa đi', 'VRE-YL', 'viralwindow', 1.60, 0.668, 'Xám sần', 'VRE-Hệ 65 Mở quay (Yangly)'],
    
    // =====================================================
    // VII. VRE-Hệ Xếp trượt 80
    // =====================================================
    ['FD-YL01', 'Khung bao hệ xếp trượt', 'VRE-XT', 'viralwindow', 1.60, 2.125, 'Xám sần', 'VRE-Hệ Xếp trượt 80'],
    ['FD-YL02', 'Cánh hệ xếp trượt', 'VRE-XT', 'viralwindow', 1.60, 2.074, 'Xám sần', 'VRE-Hệ Xếp trượt 80'],
    ['FD-YL03', 'Hèm khóa hệ xếp trượt', 'VRE-XT', 'viralwindow', 1.60, 0.896, 'Xám sần', 'VRE-Hệ Xếp trượt 80'],
    ['FD-YL04', 'Máng ray dưới hệ xếp trượt', 'VRE-XT', 'viralwindow', 1.60, 1.150, 'Xám sần', 'VRE-Hệ Xếp trượt 80'],
    ['FD-YL05', 'Nẹp chặn cánh', 'VRE-XT', 'viralwindow', 1.60, 0.372, 'Xám sần', 'VRE-Hệ Xếp trượt 80'],
    ['FD-YL06', 'Ốp đáy cánh', 'VRE-XT', 'viralwindow', 1.60, 0.300, 'Xám sần', 'VRE-Hệ Xếp trượt 80'],
    ['FD-YL07', 'Ốp khung bao', 'VRE-XT', 'viralwindow', 1.60, 0.192, 'Xám sần', 'VRE-Hệ Xếp trượt 80'],
    ['FD-YL08', 'Ốp cánh chẵn', 'VRE-XT', 'viralwindow', 1.60, 1.460, 'Xám sần', 'VRE-Hệ Xếp trượt 80'],
    
    // =====================================================
    // VII. VRE-Hệ Lùa 120 & 180
    // =====================================================
    ['YL12001', 'Khung bao đứng', 'VRE-L120', 'viralwindow', 1.60, 2.000, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12002', 'Ray dưới cửa đi lùa', 'VRE-L120', 'viralwindow', 1.60, 1.510, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12003', 'Dẫn hướng trên', 'VRE-L120', 'viralwindow', 1.60, 0.860, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12004', 'Ốp khung bao đứng ngoài', 'VRE-L120', 'viralwindow', 1.60, 1.360, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12005', 'Ốp khung bao đứng trong', 'VRE-L120', 'viralwindow', 1.60, 1.300, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12006', 'Cánh lùa', 'VRE-L120', 'viralwindow', 1.60, 2.020, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12007', 'Ốp móc', 'VRE-L120', 'viralwindow', 1.60, 0.470, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12008', 'Đối đầu (Hèm cửa)', 'VRE-L120', 'viralwindow', 1.60, 0.476, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12009', 'Khung bao vách', 'VRE-L120', 'viralwindow', 1.60, 1.480, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL12010', 'Đố T chia vách', 'VRE-L120', 'viralwindow', 1.60, 0.990, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['SH002', 'Sập kính thường kính 16 mm', 'VRE-L120', 'viralwindow', 1.60, 0.310, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['SH001', 'Sập kính hộp kính 25 mm', 'VRE-L120', 'viralwindow', 1.60, 0.278, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['SD6003', 'Sập kính đơn 12 mm', 'VRE-L120', 'viralwindow', 1.60, 0.337, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL18001', 'Khung bao đứng 3 ray', 'VRE-L180', 'viralwindow', 1.60, 2.850, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL18006', 'Khung ngang dưới 3 ray', 'VRE-L180', 'viralwindow', 1.60, 2.210, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL18004', 'Nối dẫn hướng trên 3 ray', 'VRE-L180', 'viralwindow', 1.60, 0.620, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL18002', 'Nối ốp khung bao đứng trong', 'VRE-L180', 'viralwindow', 1.60, 0.650, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL18007', 'Nối ốp khung bao đứng ngoài', 'VRE-L180', 'viralwindow', 1.60, 0.630, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL18005', 'Nối khung bao vách', 'VRE-L180', 'viralwindow', 1.60, 0.630, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL18003', 'Nối ốp khung bao đứng trong (2)', 'VRE-L180', 'viralwindow', 1.60, 0.620, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['YL18008', 'Ốp móc cánh đôi', 'VRE-L180', 'viralwindow', 1.60, 0.770, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['TQ-011', 'Nắp ốp móc cửa lùa', 'VRE-L120', 'viralwindow', 1.60, 0.100, 'Xám sần', 'VRE-Hệ Lùa 120 & 180'],
    ['RAY-14x5', 'Ray inox cửa lùa 14x5', 'VRE-L120', 'inox', 1.60, 0.500, 'Inox', 'VRE-Hệ Lùa 120 & 180'],
    ['RAY-10.8x5', 'Ray inox cửa lùa 10.8x5', 'VRE-L120', 'inox', 1.60, 0.400, 'Inox', 'VRE-Hệ Lùa 120 & 180'],
    
    // =====================================================
    // IX. HỆ LÙA 94 MỚI
    // =====================================================
    ['VRE94-01', 'Khung cửa 94', 'VRE-L94', 'viralwindow', 1.60, 1.425, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['VRE94-01C', 'Khung bao 3 ray 94 cao', 'VRE-L94', 'viralwindow', 1.60, 2.150, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['VRE94-01T', 'Khung bao 3 ray 94 thấp', 'VRE-L94', 'viralwindow', 1.60, 1.525, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['VRE94-02', 'Cánh cửa 94', 'VRE-L94', 'viralwindow', 1.60, 1.235, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['VRE94-03', 'Ray dưới 94', 'VRE-L94', 'viralwindow', 1.60, 1.142, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['VRE94-04', 'Móc 94', 'VRE-L94', 'viralwindow', 1.60, 0.443, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['VRE94-05', 'Fix 94', 'VRE-L94', 'viralwindow', 1.60, 0.920, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['VRE94-06', 'Ốp khung bao 94', 'VRE-L94', 'viralwindow', 1.60, 0.293, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['VRE94-07', 'Hèm 4 cánh 94', 'VRE-L94', 'viralwindow', 1.60, 0.339, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['LIN-H17', 'Bắt phụ kiện 94', 'VRE-L94', 'viralwindow', 1.60, 0.221, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['AL5506', 'Đố T', 'VRE-L94', 'viralwindow', 1.60, 1.219, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['YLCF-S55', 'Sập vát cạnh (dùng cho Fix 94)', 'VRE-L94', 'viralwindow', 1.60, 0.220, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['SK94', 'Sập kính vách 94', 'VRE-L94', 'viralwindow', 1.60, 0.181, 'Xám sần', 'Hệ Lùa 94 Mới'],
    ['LIN-DT21', 'Dẫn hướng trên 94', 'VRE-L94', 'viralwindow', 1.60, 0.210, 'Xám sần', 'Hệ Lùa 94 Mới'],
    
    // =====================================================
    // IX. THỦY LỰC
    // =====================================================
    ['YL55X200', 'Khung bao thủy lực 55X200', 'VRE-TL', 'viralwindow', 1.60, 2.712, 'Xám sần', 'Thủy lực'],
    ['EU-TL002', 'Cánh thủy lực 180', 'VRE-TL', 'viralwindow', 1.60, 2.829, 'Xám sần', 'Thủy lực'],
    ['EU-TL006', 'Ốp đáy cánh', 'VRE-TL', 'viralwindow', 1.60, 0.435, 'Xám sần', 'Thủy lực'],
    ['EU-TL004', 'Đế sập vách (Đế thủy lực)', 'VRE-TL', 'viralwindow', 1.60, 0.528, 'Xám sần', 'Thủy lực'],
    ['C101', 'Sập đế vách kính đơn', 'VRE-TL', 'viralwindow', 1.60, 0.287, 'Xám sần', 'Thủy lực'],
    ['C102', 'Sập đế vách kính hộp', 'VRE-TL', 'viralwindow', 1.60, 0.178, 'Xám sần', 'Thủy lực'],
    ['DA-TL03', 'Sập cánh TL kính hộp', 'VRE-TL', 'viralwindow', 1.60, 0.311, 'Xám sần', 'Thủy lực'],
    ['DA-TL02', 'Sập cánh TL kính đơn', 'VRE-TL', 'viralwindow', 1.60, 0.254, 'Xám sần', 'Thủy lực'],
    ['DAV51', 'Đế vách cố định', 'VRE-TL', 'viralwindow', 1.60, 1.050, 'Xám sần', 'Thủy lực'],
    ['SCTL', 'Sập cánh thủy lực', 'VRE-TL', 'viralwindow', 1.60, 0.300, 'Xám sần', 'Thủy lực'],
    
    // =====================================================
    // IX. MẶT DỰNG
    // =====================================================
    ['MD6590', 'Mặt dựng 65*90', 'VRE-MD', 'viralwindow', 1.60, 2.070, 'Xám sần', 'Mặt dựng'],
    ['YL52X73', 'Mặt dựng 52*73', 'VRE-MD', 'viralwindow', 1.60, 1.400, 'Xám sần', 'Mặt dựng'],
    ['MD-N6502', 'Nắp mặt dựng hệ 65', 'VRE-MD', 'viralwindow', 1.60, 0.401, 'Xám sần', 'Mặt dựng'],
    ['MD-N6502-OP', 'Ốp mặt dựng 65*90', 'VRE-MD', 'viralwindow', 1.60, 0.410, 'Xám sần', 'Mặt dựng'],
    ['MD-CS52', 'Cánh cửa sổ lộ đố', 'VRE-MD', 'viralwindow', 1.60, 0.751, 'Xám sần', 'Mặt dựng'],
];

$stmt = $mysqli->prepare("INSERT IGNORE INTO aluminum_systems (code, name, brand, category, thickness_mm, weight_per_meter, length_m, quantity, quantity_m, color, description, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, 6.00, 0, 0.00, ?, ?, 1, ?)");

$count = 0;
$displayOrder = 1;

foreach ($products as $product) {
    $code = $product[0];
    $name = $product[1];
    $brand = $product[2];
    $category = $product[3];
    $thickness = $product[4];
    $weight = $product[5];
    $color = $product[6];
    $description = $product[7];
    
    $stmt->bind_param("ssssddssi", $code, $name, $brand, $category, $thickness, $weight, $color, $description, $displayOrder);
    
    if ($stmt->execute()) {
        $count++;
        $displayOrder++;
    } else {
        echo "Error inserting {$code}: " . $stmt->error . "\n";
    }
}

$stmt->close();

echo "Imported $count aluminum profiles successfully!\n\n";

// Summary by description (system)
$result = $mysqli->query("SELECT description, COUNT(*) as count FROM aluminum_systems GROUP BY description ORDER BY MIN(display_order)");

echo "=== SUMMARY BY SYSTEM ===\n";
while ($row = $result->fetch_assoc()) {
    echo "{$row['description']}: {$row['count']} profiles\n";
}

echo "\n=== TOTAL ===\n";
$total = $mysqli->query("SELECT COUNT(*) as total FROM aluminum_systems");
$totalRow = $total->fetch_assoc();
echo "Total: {$totalRow['total']} aluminum profiles\n";

$mysqli->close();
?>
