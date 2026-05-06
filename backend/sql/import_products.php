<?php
// Script to import products with correct UTF-8 encoding
$mysqli = new mysqli("localhost", "root", "", "viral_window_db");
$mysqli->set_charset("utf8mb4");

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Delete all existing accessories
$mysqli->query("DELETE FROM accessories");
echo "Deleted all existing accessories\n";

// Reset auto increment
$mysqli->query("ALTER TABLE accessories AUTO_INCREMENT = 1");

// Categories for reference:
// Phụ kiện: Khóa, Bản lề, Tay nắm, Phụ kiện lùa, Phụ kiện khác
// Vật tư phụ: Ke, Gioăng, Nhựa ốp, Keo, Khác

$products = [
    // =====================================================
    // PHẦN 1: PHỤ KIỆN
    // =====================================================
    
    // 1.1 TAY NẮM
    ['VR001', 'Tay nắm cửa sổ + lưỡi gà', 'Tay nắm', 'Cái'],
    ['VR001-LG', 'Lưỡi gà', 'Tay nắm', 'Cái'],
    ['VR003', 'Tay nắm cửa đi Galaxy', 'Tay nắm', 'Bộ'],
    ['VR013', 'Tay nắm cửa lùa 450', 'Tay nắm', 'Cái'],
    ['PK-TCSL', 'Tay cửa lùa skyline', 'Tay nắm', 'Cặp'],
    ['PK-TNCTN', 'Tay nắm cửa trượt nâng', 'Tay nắm', 'Chiếc'],
    
    // 1.2 KHÓA
    ['VR004', 'Thân khóa đa điểm Xingfa', 'Khóa', 'Cái'],
    ['VR005', 'Thân khóa đơn điểm Xingfa', 'Khóa', 'Cái'],
    ['VR006', 'Lõi khóa mở ngoài XF47/32', 'Khóa', 'Cái'],
    ['VR007', 'Lõi khóa mở trong 1 đầu chìa', 'Khóa', 'Cái'],
    ['VR012', 'Thân khóa móc đôi 120 (bao gồm miệng đón khóa)', 'Khóa', 'Cái'],
    ['VR018', 'Nắp lõi khóa cửa lùa', 'Khóa', 'Bộ'],
    ['VR019', 'Lõi khóa 30/30 (lõi cửa lùa 94)', 'Khóa', 'Cái'],
    ['VR020', 'Lõi khóa 37/37 (Lõi cửa lùa 120)', 'Khóa', 'Cái'],
    ['CM-LK', 'Lõi khóa Cmech (0124)', 'Khóa', 'Chiếc'],
    ['CM-TDD', 'Thân đơn điểm Cmech', 'Khóa', 'Cái'],
    ['CM-TKD', 'Thân khóa đa điểm Cmech', 'Khóa', 'Cái'],
    
    // 1.3 BẢN LỀ
    ['VR008', 'Bản lề chữ A mở hất/ mở quay 12 rãnh 22', 'Bản lề', 'Cặp'],
    ['VR010-L', 'Bản lề cửa đi xingfa bi đũa C-K (L)', 'Bản lề', 'Cái'],
    ['VR010-R', 'Bản lề cửa đi xingfa bi đũa C-K (R)', 'Bản lề', 'Cái'],
    ['VR011-L', 'Bản lề cửa đi xingfa bi đũa C-C (L)', 'Bản lề', 'Cái'],
    ['VR011-R', 'Bản lề cửa đi xingfa bi đũa C-C (R)', 'Bản lề', 'Cái'],
    ['CM-BL4D-B', 'Bản lề 4D Cmech màu bạc (010)', 'Bản lề', 'Chiếc'],
    ['CM-BL4D-D', 'Bản lề 4D Cmech màu đồng (012)', 'Bản lề', 'Chiếc'],
    ['CM-BLA', 'Bản lề A Cmech', 'Bản lề', 'Cái'],
    ['CM-BLC65', 'Bản lề cối Cmech hệ 65', 'Bản lề', 'Chiếc'],
    ['DS-BLCC', 'Bản Lề cửa Đi Daishin C - C', 'Bản lề', 'Cái'],
    ['DS-BLCK', 'Bản Lề cửa Đi Daishin C - K', 'Bản lề', 'Cái'],
    ['DS-BLA', 'Bản lề A quay/ hất daishin', 'Bản lề', 'Cái'],
    
    // 1.4 PHỤ KIỆN LÙA
    ['VR009', 'Thanh chống sao', 'Phụ kiện lùa', 'Cặp'],
    ['VR014', 'Bánh xe 2 bánh hệ 120', 'Phụ kiện lùa', 'Cái'],
    ['VR014-CAO', 'Bánh xe cao 2 bánh - cao 24mm', 'Phụ kiện lùa', 'Cái'],
    ['VR027', 'Bánh xe chống rung (dẫn hướng cửa lùa)', 'Phụ kiện lùa', 'Cái'],
    ['VR027-CD', 'Chống đập cửa Lùa', 'Phụ kiện lùa', 'Chiếc'],
    ['CM-BXD', 'Bánh xe đôi cmech', 'Phụ kiện lùa', 'Chiếc'],
    ['CM-CDCL', 'Chống đập cửa Lùa cmech', 'Phụ kiện lùa', 'Chiếc'],
    ['DS-BXCL', 'Bánh xe cửa lùa Daishin', 'Phụ kiện lùa', 'Cái'],
    ['CM-CS', 'Chống sao Cmech', 'Phụ kiện lùa', 'Cái'],
    
    // 1.5 PHỤ KIỆN KHÁC (Bộ chuyển động, chốt, miệng đón khóa)
    ['VR015', 'Bộ chuyển động 5 thứ xingfa CỬA SỔ', 'Phụ kiện khác', 'Bộ'],
    ['VR016', 'Bộ chuyển động cửa đi 5 thứ châu âu', 'Phụ kiện khác', 'Bộ'],
    ['VR017', 'Bộ chuyển động 5 thứ cửa lùa', 'Phụ kiện khác', 'Bộ'],
    ['VR017-CP', 'Bộ chốt cánh phụ 3 thứ Xingfa', 'Phụ kiện khác', 'Bộ'],
    ['VR021', 'Bộ chốt cánh phụ 5 thứ châu Âu', 'Phụ kiện khác', 'Bộ'],
    ['VR022', 'Bộ chốt cánh phụ 5 thứ xingfa', 'Phụ kiện khác', 'Bộ'],
    ['VR023', 'Chốt âm đa điểm to', 'Phụ kiện khác', 'Cái'],
    ['VR024', 'Chốt âm đa điểm nhỏ', 'Phụ kiện khác', 'Cái'],
    ['VR025', 'Miệng đón khóa cửa đi 1 cánh', 'Phụ kiện khác', 'Cái'],
    ['VR026', 'Miệng đón khóa cửa đi 2 cánh', 'Phụ kiện khác', 'Cái'],
    ['CM-CB', 'Chốt bật Cmech', 'Phụ kiện khác', 'Chiếc'],
    ['CM-VH', 'Vấu hãm thanh chuyển động cửa lùa Cmech', 'Phụ kiện khác', 'Chiếc'],
    ['CM-DCC', 'Đầu chia chuyển động Cmech', 'Phụ kiện khác', 'Chiếc'],
    ['CM-DKB7', 'Đầu khóa biên cao 7mm', 'Phụ kiện khác', 'Chiếc'],
    ['CM-DBCL', 'Đầu biên cửa lùa cmech', 'Phụ kiện khác', 'Chiếc'],
    ['CM-DKBCL', 'Đầu khóa biên cửa lùa', 'Phụ kiện khác', 'Chiếc'],
    ['CM-TCDB', 'T chia chuyển động đầu biên', 'Phụ kiện khác', 'Chiếc'],
    ['CM-V2C', 'Vấu cửa 2 cánh', 'Phụ kiện khác', 'Cái'],
    ['DS-BCD5', 'Bộ chuyển động 5 thứ Daishin (NHÔM) CỬA LÙA', 'Phụ kiện khác', 'Chiếc'],
    
    // =====================================================
    // PHẦN 2: VẬT TƯ PHỤ - KE
    // =====================================================
    
    // Ke tăng cứng
    ['KE-TC8', 'Ke tăng cứng 8', 'Ke', 'Cái'],
    ['KE-TC11', 'Ke tăng cứng 11', 'Ke', 'Cái'],
    ['KE-TC12.5', 'Ke tăng cứng 12,5', 'Ke', 'Cái'],
    ['KE-TC13', 'Ke tăng cứng 13', 'Ke', 'Cái'],
    ['KE-TC14', 'Ke tăng cứng 14', 'Ke', 'Cái'],
    ['KE-TC16', 'Ke tăng cứng viral 16', 'Ke', 'Cái'],
    ['KE-TC22', 'Ke tăng cứng 22', 'Ke', 'Cái'],
    
    // Ke tomahuk
    ['KE-TM14x22', 'Ke tomahuk 14 * 22', 'Ke', 'Cái'],
    ['KE-TM14x42', 'Ke tomahuk khung bao cửa sổ 14 * 42', 'Ke', 'Cái'],
    ['KE-TM14x50', 'Ke tomahuk 14 * 50', 'Ke', 'Cái'],
    ['KE-TM14x52', 'Ke tomahuk 14 * 52', 'Ke', 'Cái'],
    ['KE-TM20x31', 'Ke tomahuk 20 * 31', 'Ke', 'Cái'],
    ['KE-TM20x36', 'Ke tomahuk 20 * 36', 'Ke', 'Cái'],
    ['KE-TM25x14', 'Ke tomahuk 25 * 14', 'Ke', 'Cái'],
    ['KE-TM25x23', 'Ke tomahuk 25 * 23', 'Ke', 'Cái'],
    ['KE-TM25x40', 'Ke tomahuk 25 * 40', 'Ke', 'Cái'],
    ['KE-TM25x42', 'Ke tomahuk 25 * 42', 'Ke', 'Cái'],
    ['KE-TM25x43', 'Ke tomahuk 25 * 43', 'Ke', 'Cái'],
    ['KE-TM25x60', 'Ke tomahuk 25 * 60', 'Ke', 'Cái'],
    ['KE-TM31x42-CD', 'Ke tomahuk 31 * 42 cửa đi', 'Ke', 'Cái'],
    ['KE-TM36x42', 'Ke tomahuk 36 * 42 cánh cửa VRA 55', 'Ke', 'Cái'],
    ['KE-TM31x42-CS', 'Ke tomahuk 31 * 42 (cánh cửa sổ 55)', 'Ke', 'Cái'],
    ['KE-TM31x43', 'Ke tomahuk 31 * 43', 'Ke', 'Cái'],
    ['KE-TM31x60', 'Ke tomahuk 31 * 60', 'Ke', 'Cái'],
    ['KE-TM34x60', 'Ke tomahuk 34 * 60', 'Ke', 'Cái'],
    ['KE-TM36x60', 'Ke tomahuk 36 * 60', 'Ke', 'Cái'],
    ['KE-TM38x60', 'Ke tomahuk 38 * 60', 'Ke', 'Cái'],
    
    // Ke vĩnh cửu
    ['KE-VC14x20', 'Ke vĩnh cửu 14 * 20', 'Ke', 'Cái'],
    ['KE-VC14x23', 'Ke vĩnh cửu 14 * 23', 'Ke', 'Cái'],
    ['KE-VC14x30', 'Ke vĩnh cửu 14 * 30', 'Ke', 'Cái'],
    ['KE-VC14x40', 'Ke vĩnh cửu 14 * 40', 'Ke', 'Cái'],
    ['KE-VC14x43', 'Ke vĩnh cửu 14 * 43', 'Ke', 'Cái'],
    ['KE-VC14x51', 'Ke vĩnh cửu 14 * 51', 'Ke', 'Cái'],
    ['KE-VC17x21', 'Ke vĩnh cửu 17 * 21', 'Ke', 'Cái'],
    ['KE-VC25x23', 'Ke vĩnh cửu 25 * 23', 'Ke', 'Cái'],
    ['KE-VC25x30', 'Ke vĩnh cửu 25 * 30', 'Ke', 'Cái'],
    ['KE-VC25x40', 'Ke vĩnh cửu 25 * 40', 'Ke', 'Cái'],
    ['KE-VC31x40', 'Ke vĩnh cửu 31 * 40', 'Ke', 'Cái'],
    ['KE-VC31x42', 'Ke vĩnh cửu 31 * 42', 'Ke', 'Cái'],
    ['KE-VC32x60', 'Ke vĩnh cửu 32 * 60', 'Ke', 'Cái'],
    
    // Ke khác
    ['KE-CL12006', 'Ke cánh hệ lùa 12006 (31*42.3)', 'Ke', 'Cái'],
    ['KE-LDT', 'Ke L bắt đố T', 'Ke', 'Cái'],
    
    // =====================================================
    // PHẦN 3: VẬT TƯ PHỤ - GIOĂNG
    // =====================================================
    ['GL-5x6', 'Gioăng Lông 5*6 màu ghi', 'Gioăng', 'Cuộn'],
    ['GL-5x9', 'Gioăng Lông 5*9 màu ghi', 'Gioăng', 'Cuộn'],
    ['GL-8x6', 'Gioăng Lông 8*6 màu ghi', 'Gioăng', 'Cuộn'],
    ['GL-5x4-D', 'Gioăng Lông 5*4 màu đen', 'Gioăng', 'Cuộn'],
    ['GL-5x7-D', 'Gioăng Lông 5*7 màu đen', 'Gioăng', 'Cuộn'],
    ['J01', 'Gioăng ống khung cánh XF55 J01', 'Gioăng', 'Cuộn'],
    ['J-CCCS', 'Gioăng chèn chân sập Châu Âu', 'Gioăng', 'Cuộn'],
    ['NG-55C', 'Nối góc gioăng 55 rãnh C', 'Gioăng', 'Cái'],
    ['NG11', 'Gioang nối góc trung gian hệ 65 JJ011', 'Gioăng', 'Cái'],
    ['J02', 'Gioăng khung cánh C65D - PMI', 'Gioăng', 'Cuộn'],
    ['J04', 'Gioăng khung bịt rãnh C', 'Gioăng', 'Cuộn'],
    ['J10', 'Gioăng J10 (gioăng khung cách 65)', 'Gioăng', 'Cuộn'],
    ['J11', 'Gioăng trung gian C65 C55', 'Gioăng', 'Cuộn'],
    ['J12', 'Gioăng chống đập L94', 'Gioăng', 'Cuộn'],
    ['J15', 'Gioăng J15', 'Gioăng', 'Cuộn'],
    ['J-KCL94', 'Gioăng khung cửa lùa 94', 'Gioăng', 'Cuộn'],
    ['J-DCC', 'Gioăng đầu cánh cửa lùa', 'Gioăng', 'Cuộn'],
    ['L6', 'Gioăng chèn kính L6', 'Gioăng', 'Cuộn'],
    ['L7', 'Gioăng chèn kính L7', 'Gioăng', 'Cuộn'],
    ['L8', 'Gioăng chèn kính L8', 'Gioăng', 'Cuộn'],
    ['L9', 'Gioăng chèn kính L9', 'Gioăng', 'Cuộn'],
    ['L12', 'Gioăng L12 (gioăng chèn kính khe hở kính 9)', 'Gioăng', 'Cuộn'],
    
    // =====================================================
    // PHẦN 4: VẬT TƯ PHỤ - KEO
    // =====================================================
    ['KEO-A500D', 'Keo Apolo A500 đen', 'Keo', 'Chai'],
    ['KEO-XAM', 'Keo màu xám', 'Keo', 'Chai'],
    ['KEO-A500TS', 'Keo trắng sữa a500', 'Keo', 'Chai'],
    ['KEO-A500TT', 'Keo trắng trong A500', 'Keo', 'Chai'],
    ['KEO-PU88', 'Keo PU 88', 'Keo', 'Chai'],
    ['KEO-XXKCC', 'Keo xúc xích Kcc', 'Keo', 'Cái'],
    ['KEO-SS621', 'Keo xúc xích SS621', 'Keo', 'Cái'],
    
    // =====================================================
    // PHẦN 5: VẬT TƯ PHỤ - NHỰA ỐP / BỊT
    // =====================================================
    ['NO-DDDXF-T', 'Bịt đầu đố động Xingfa Trái', 'Nhựa ốp', 'Cái'],
    ['NO-DDDXF-P', 'Bịt đầu đố động Xingfa Phải', 'Nhựa ốp', 'Cái'],
    ['NO-DDD65', 'Bịt đố động hệ 65', 'Nhựa ốp', 'Cái'],
    ['NO-DDD65-2V', 'Bịt đố động hệ 65 2 vế', 'Nhựa ốp', 'Cặp'],
    ['NO-TDP', 'Bịt đố động trên dưới phải', 'Nhựa ốp', 'Cái'],
    ['NO-TDT', 'Bịt đố động trên dưới Trái', 'Nhựa ốp', 'Cái'],
    ['NO-HDK94', 'Bịt hèm đón khóa 94 (nhựa)', 'Nhựa ốp', 'Kg'],
    ['NO-OMRC', 'Bịt nhựa ốp móc rãnh C (1 cuộn 300m)', 'Nhựa ốp', 'Cuộn'],
    ['NO-OC-T', 'Bịt ốp chân (bịt đáy cửa đi) vế T', 'Nhựa ốp', 'Cái'],
    ['NO-OC-P', 'Bịt ốp chân (bịt đáy cửa đi) vế P', 'Nhựa ốp', 'Cái'],
    ['NO-OCC-P', 'Bịt ốp chân cánh Phải', 'Nhựa ốp', 'Cái'],
    ['NO-OCC-T', 'Bịt ốp chân cánh trái', 'Nhựa ốp', 'Cái'],
    ['NO-ODC65', 'Bịt ốp đáy cửa 65', 'Nhựa ốp', 'Cặp'],
    ['NO-OM94', 'Bịt ốp móc 94 (cây 3m)', 'Nhựa ốp', 'Cây'],
    ['NO-NCL93', 'Nhựa bịt cửa lùa 93 (trên dưới)', 'Nhựa ốp', 'Cái'],
    ['NO-BDKCL', 'Nhựa bịt đón khóa cửa lùa', 'Nhựa ốp', 'Cây'],
    ['NB-HTN-CN', 'Nắp bịt hố thoát nước chữ nhật', 'Nhựa ốp', 'Cái'],
    ['NB-HTN-T', 'Nắp Hố thoát nước tròn', 'Nhựa ốp', 'Cái'],
    ['NB-LV', 'Nắp bịt lỗ vít', 'Nhựa ốp', 'Cái'],
    ['VT-TDCL93', 'Trên dưới cửa lùa 93', 'Nhựa ốp', 'Cái'],
    
    // =====================================================
    // PHẦN 6: VẬT TƯ PHỤ - KHÁC
    // =====================================================
    
    // Áo / Trang phục
    ['VT-AK', 'Áo khoác công trình', 'Khác', 'Chiếc'],
    ['VT-APL', 'Áo phông size L', 'Khác', 'Chiếc'],
    ['VT-APXL', 'Áo phông size XL', 'Khác', 'Chiếc'],
    ['VT-APXXL', 'Áo phông size XXL', 'Khác', 'Chiếc'],
    
    // Vật tư khác
    ['VT-BBH', 'Bìa bọc hàng', 'Khác', 'Tờ'],
    ['VT-BAC', 'Bộ ấm chén', 'Khác', 'Bộ'],
    ['VT-DHCL93', 'Dẫn hướng cửa lùa 93 Xingfa', 'Khác', 'Cái'],
    ['VT-DH65', 'Dẫn hướng xingfa 65 (nhựa)', 'Khác', 'Chiếc'],
    ['DS-DH', 'Dẫn hướng cửa lùa Daishin', 'Khác', 'Cái'],
    
    // Đầu biên
    ['DB-CCPCM', 'Đầu biên chốt cánh phụ Cmech', 'Khác', 'Cái'],
    ['DB-CMD', 'Đầu biên Cmech đen', 'Khác', 'Cái'],
    ['DB-DS', 'Đầu biên Daishin', 'Khác', 'Cái'],
    ['DB-65B', 'Đầu biên hệ 65 nhôm bạc', 'Khác', 'Cái'],
    ['DB-VR', 'Đầu biên Viral', 'Khác', 'Cái'],
    
    // Đệm chống xệ
    ['DCX-CN', 'Đệm chống xệ chữ nhật', 'Khác', 'Chiếc'],
    ['DCX-CM', 'Đệm chống xệ Cmech (Nhựa)', 'Khác', 'Cái'],
    ['DCX-65CM', 'Đệm chống xệ hệ 65 Cmech nhôm', 'Khác', 'Cái'],
    ['DCX-V', 'Đệm chống xệ vuông', 'Khác', 'Cái'],
    ['DCX-DH93', 'Đệm dẫn hướng trên cửa lùa 93', 'Khác', 'Cái'],
    
    // Lưỡi và Ray
    ['VT-LCM', 'Lưỡi chống muỗi', 'Khác', 'M2'],
    ['VT-RI', 'Ray inox', 'Khác', 'Cây'],
    
    // Nêm
    ['VT-NV', 'Nêm vát', 'Khác', 'Kg'],
    ['VT-NB5', 'Nêm bằng 5mm', 'Khác', 'Kg'],
    ['VT-NB3', 'Nêm bằng 3mm', 'Khác', 'Kg'],
    
    // Thanh chuyển động
    ['VT-TDD', 'T đa điểm (T chuyển động)', 'Khác', 'Cái'],
    ['VT-TCD', 'Thanh chuyển động', 'Khác', 'Cây'],
    
    // Vấu
    ['VAU-1C-CM', 'Vấu 1 cánh Cmech', 'Khác', 'Cái'],
    ['VAU-1C-KL', 'Vấu 1 cánh Kin Long', 'Khác', 'Cái'],
    ['VAU-CD-DS', 'Vấu cửa đi Daishin/ VIRAL', 'Khác', 'Cái'],
    ['VAU-CS-DS', 'Vấu cửa sổ Daishin/ Viral', 'Khác', 'Cái'],
    ['VAU-CS-VR', 'Vấu cửa sổ Viral', 'Khác', 'Cái'],
    ['VAU-2C-CM', 'Vấu hãm cửa 2 cánh Cmech', 'Khác', 'Cái'],
    ['VAU-2C-KL', 'Vấu hãm cửa 2 cánh không logo', 'Khác', 'Cái'],
    ['VAU-2C-KLG', 'Vấu hãm cửa 2 cánh Kinlong', 'Khác', 'Cái'],
    
    // Tem và Băng dính
    ['VT-TD', 'Tem dán', 'Khác', 'Cuộn'],
    ['VT-HC-D', 'Hố chốt đồng', 'Khác', 'Cái'],
    ['VT-BDG', 'Băng dính giấy', 'Khác', 'Cuộn'],
    
    // Chốt
    ['VT-CCPDV', 'Chốt cánh phụ đen vuông', 'Khác', 'Chiếc'],
    ['VT-DCCP', 'Đệm chốt cách phụ', 'Khác', 'Chiếc'],
    
    // Vít
    ['VT-VRTNCL', 'Vít rút tay nắm cửa lùa', 'Khác', 'Cái'],
];

$stmt = $mysqli->prepare("INSERT INTO accessories (code, name, category, unit, purchase_price, sale_price, stock_quantity, min_stock_level, is_active) VALUES (?, ?, ?, ?, 0.00, 0.00, 0, 10, 1)");

$count = 0;
foreach ($products as $product) {
    $stmt->bind_param("ssss", $product[0], $product[1], $product[2], $product[3]);
    if ($stmt->execute()) {
        $count++;
    } else {
        echo "Error inserting {$product[0]}: " . $stmt->error . "\n";
    }
}

$stmt->close();

echo "Imported $count products successfully!\n\n";

// Summary by category
$result = $mysqli->query("SELECT category, COUNT(*) as count FROM accessories GROUP BY category ORDER BY 
    CASE category
        WHEN 'Khóa' THEN 1
        WHEN 'Bản lề' THEN 2
        WHEN 'Tay nắm' THEN 3
        WHEN 'Phụ kiện lùa' THEN 4
        WHEN 'Phụ kiện khác' THEN 5
        WHEN 'Ke' THEN 6
        WHEN 'Gioăng' THEN 7
        WHEN 'Nhựa ốp' THEN 8
        WHEN 'Keo' THEN 9
        WHEN 'Khác' THEN 10
        ELSE 99
    END");

echo "=== SUMMARY BY CATEGORY ===\n";
echo "--- PHỤ KIỆN ---\n";
while ($row = $result->fetch_assoc()) {
    if (in_array($row['category'], ['Khóa', 'Bản lề', 'Tay nắm', 'Phụ kiện lùa', 'Phụ kiện khác'])) {
        echo "{$row['category']}: {$row['count']}\n";
    }
}

$result->data_seek(0);
echo "\n--- VẬT TƯ PHỤ ---\n";
while ($row = $result->fetch_assoc()) {
    if (in_array($row['category'], ['Ke', 'Gioăng', 'Nhựa ốp', 'Keo', 'Khác'])) {
        echo "{$row['category']}: {$row['count']}\n";
    }
}

$mysqli->close();
?>
