-- =============================================
-- VIRALWINDOW DATABASE - SQL Server Version
-- Converted from MariaDB/MySQL dump
-- Date: 2026-02-22
-- Server: SQL Server 2019+
-- =============================================

-- Tạo cơ sở dữ liệu
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'viralwindowdb')
BEGIN
    CREATE DATABASE viralwindowdb;
END
GO

USE viralwindowdb;
GO

-- =============================================
-- XÓA BẢNG CŨ (nếu tồn tại) - theo thứ tự phụ thuộc
-- =============================================
IF OBJECT_ID('dbo.thong_bao', 'U') IS NOT NULL DROP TABLE dbo.thong_bao;
IF OBJECT_ID('dbo.san_pham_du_an', 'U') IS NOT NULL DROP TABLE dbo.san_pham_du_an;
IF OBJECT_ID('dbo.phien_dang_nhap', 'U') IS NOT NULL DROP TABLE dbo.phien_dang_nhap;
IF OBJECT_ID('dbo.profile_nhom', 'U') IS NOT NULL DROP TABLE dbo.profile_nhom;
IF OBJECT_ID('dbo.chuc_vu_quyen', 'U') IS NOT NULL DROP TABLE dbo.chuc_vu_quyen;
IF OBJECT_ID('dbo.chi_tiet_giao_dich', 'U') IS NOT NULL DROP TABLE dbo.chi_tiet_giao_dich;
IF OBJECT_ID('dbo.giao_dich_tai_chinh', 'U') IS NOT NULL DROP TABLE dbo.giao_dich_tai_chinh;
IF OBJECT_ID('dbo.cong_no', 'U') IS NOT NULL DROP TABLE dbo.cong_no;
IF OBJECT_ID('dbo.chi_tiet_bao_gia', 'U') IS NOT NULL DROP TABLE dbo.chi_tiet_bao_gia;
IF OBJECT_ID('dbo.bao_gia', 'U') IS NOT NULL DROP TABLE dbo.bao_gia;
IF OBJECT_ID('dbo.du_an', 'U') IS NOT NULL DROP TABLE dbo.du_an;
IF OBJECT_ID('dbo.khach_hang', 'U') IS NOT NULL DROP TABLE dbo.khach_hang;
IF OBJECT_ID('dbo.nguoi_dung', 'U') IS NOT NULL DROP TABLE dbo.nguoi_dung;
IF OBJECT_ID('dbo.quyen_han', 'U') IS NOT NULL DROP TABLE dbo.quyen_han;
IF OBJECT_ID('dbo.chuc_vu', 'U') IS NOT NULL DROP TABLE dbo.chuc_vu;
IF OBJECT_ID('dbo.mau_san_pham', 'U') IS NOT NULL DROP TABLE dbo.mau_san_pham;
IF OBJECT_ID('dbo.he_nhom', 'U') IS NOT NULL DROP TABLE dbo.he_nhom;
GO

-- =============================================
-- 1. BẢNG chuc_vu (Chức vụ / Vai trò)
-- =============================================
CREATE TABLE dbo.chuc_vu (
    id              INT IDENTITY(1,1) NOT NULL,
    ten             NVARCHAR(100)     NOT NULL,
    mo_ta           NVARCHAR(MAX)     NULL,
    la_he_thong     BIT               NOT NULL DEFAULT 0,
    ngay_tao        DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_chuc_vu PRIMARY KEY (id),
    CONSTRAINT UQ_chuc_vu_ten UNIQUE (ten)
);
GO

-- =============================================
-- 2. BẢNG quyen_han (Quyền hạn / Permissions)
-- =============================================
CREATE TABLE dbo.quyen_han (
    id              INT IDENTITY(1,1) NOT NULL,
    ma_code         NVARCHAR(100)     NOT NULL,
    ten             NVARCHAR(200)     NOT NULL,
    module          NVARCHAR(100)     NOT NULL,
    thu_tu          INT               NULL DEFAULT 0,

    CONSTRAINT PK_quyen_han PRIMARY KEY (id),
    CONSTRAINT UQ_quyen_han_ma_code UNIQUE (ma_code)
);
GO

-- =============================================
-- 3. BẢNG chuc_vu_quyen (Phân quyền theo chức vụ)
-- =============================================
CREATE TABLE dbo.chuc_vu_quyen (
    ma_chuc_vu      INT NOT NULL,
    ma_quyen        INT NOT NULL,

    CONSTRAINT PK_chuc_vu_quyen PRIMARY KEY (ma_chuc_vu, ma_quyen),
    CONSTRAINT FK_cvq_chuc_vu FOREIGN KEY (ma_chuc_vu) REFERENCES dbo.chuc_vu(id) ON DELETE CASCADE,
    CONSTRAINT FK_cvq_quyen   FOREIGN KEY (ma_quyen)   REFERENCES dbo.quyen_han(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 4. BẢNG nguoi_dung (Người dùng)
-- =============================================
CREATE TABLE dbo.nguoi_dung (
    id              INT IDENTITY(1,1) NOT NULL,
    email           NVARCHAR(100)     NOT NULL,
    mat_khau        NVARCHAR(255)     NOT NULL,
    ho_ten          NVARCHAR(100)     NOT NULL,
    ma_chuc_vu      INT               NULL,
    loai_tai_khoan  NVARCHAR(10)      NOT NULL DEFAULT N'user',
    trang_thai      BIT               NOT NULL DEFAULT 1,
    ngay_tao        DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_nguoi_dung PRIMARY KEY (id),
    CONSTRAINT UQ_nguoi_dung_email UNIQUE (email),
    CONSTRAINT CK_nguoi_dung_loai CHECK (loai_tai_khoan IN (N'admin', N'user')),
    CONSTRAINT FK_nd_chuc_vu FOREIGN KEY (ma_chuc_vu) REFERENCES dbo.chuc_vu(id) ON DELETE SET NULL
);
GO

-- =============================================
-- 5. BẢNG phien_dang_nhap (Phiên đăng nhập / Sessions)
-- =============================================
CREATE TABLE dbo.phien_dang_nhap (
    id                  INT IDENTITY(1,1) NOT NULL,
    ma_nguoi_dung       INT               NOT NULL,
    token_phien         NVARCHAR(MAX)     NOT NULL,
    dang_hoat_dong      BIT               NOT NULL DEFAULT 1,
    thoi_gian_dang_nhap DATETIME2         NOT NULL DEFAULT GETDATE(),
    dia_chi_ip          NVARCHAR(45)      NULL,

    CONSTRAINT PK_phien_dang_nhap PRIMARY KEY (id),
    CONSTRAINT FK_pdn_nguoi_dung FOREIGN KEY (ma_nguoi_dung) REFERENCES dbo.nguoi_dung(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 6. BẢNG khach_hang (Khách hàng)
-- =============================================
CREATE TABLE dbo.khach_hang (
    id              INT IDENTITY(1,1) NOT NULL,
    ma_khach_hang   NVARCHAR(20)      NOT NULL,
    ho_ten          NVARCHAR(100)     NOT NULL,
    dien_thoai      NVARCHAR(15)      NULL,
    email           NVARCHAR(100)     NULL,
    dia_chi         NVARCHAR(MAX)     NULL,
    ma_so_thue      NVARCHAR(20)      NULL,
    trang_thai_kh   NVARCHAR(20)      NULL DEFAULT N'potential',
    nguon_kh        NVARCHAR(100)     NULL,
    ma_dai_ly       INT               NULL,
    ngay_tao        DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_khach_hang PRIMARY KEY (id),
    CONSTRAINT UQ_khach_hang_ma UNIQUE (ma_khach_hang),
    CONSTRAINT CK_khach_hang_tt CHECK (trang_thai_kh IN (N'potential', N'active'))
);
GO

-- =============================================
-- 7. BẢNG du_an (Dự án)
-- =============================================
CREATE TABLE dbo.du_an (
    id                      INT IDENTITY(1,1) NOT NULL,
    ma_du_an                NVARCHAR(20)      NOT NULL,
    ten_du_an               NVARCHAR(200)     NOT NULL,
    ma_khach_hang           INT               NOT NULL,
    trang_thai              NVARCHAR(20)      NOT NULL DEFAULT N'new',
    ngay_bat_dau            DATE              NULL,
    han_hoan_thanh          DATE              NULL,
    ghi_chu                 NVARCHAR(MAX)     NULL,
    ma_dai_ly               INT               NULL,
    tinh_thanh_thi_cong     NVARCHAR(100)     NULL,
    quan_huyen_thi_cong     NVARCHAR(100)     NULL,
    dia_chi_thi_cong        NVARCHAR(MAX)     NULL,
    ngay_tao                DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_du_an PRIMARY KEY (id),
    CONSTRAINT UQ_du_an_ma UNIQUE (ma_du_an),
    CONSTRAINT CK_du_an_tt CHECK (trang_thai IN (N'new', N'designing', N'production', N'installing', N'completed', N'cancelled')),
    CONSTRAINT FK_da_khach_hang FOREIGN KEY (ma_khach_hang) REFERENCES dbo.khach_hang(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 8. BẢNG he_nhom (Hệ nhôm)
-- =============================================
CREATE TABLE dbo.he_nhom (
    id              INT IDENTITY(1,1) NOT NULL,
    ma_code         NVARCHAR(50)      NOT NULL,
    ten_he          NVARCHAR(100)     NOT NULL,
    ty_trong        DECIMAL(6,3)      NULL,
    gia_theo_kg     DECIMAL(12,2)     NULL,
    so_luong_ton    DECIMAL(12,2)     NULL DEFAULT 0.00,
    ma_nha_cung_cap INT               NULL,

    CONSTRAINT PK_he_nhom PRIMARY KEY (id),
    CONSTRAINT UQ_he_nhom_ma UNIQUE (ma_code)
);
GO

-- =============================================
-- 9. BẢNG profile_nhom (Profile nhôm)
-- =============================================
CREATE TABLE dbo.profile_nhom (
    id                  INT IDENTITY(1,1) NOT NULL,
    ma_he_nhom          INT               NOT NULL,
    loai_profile        NVARCHAR(50)      NULL,
    ma_code             NVARCHAR(100)     NOT NULL,
    ten_profile         NVARCHAR(200)     NULL,
    trong_luong_theo_met DECIMAL(8,4)     NULL,
    gia_theo_met        DECIMAL(12,2)     NULL,

    CONSTRAINT PK_profile_nhom PRIMARY KEY (id),
    CONSTRAINT UQ_profile_nhom_ma UNIQUE (ma_code),
    CONSTRAINT FK_pn_he_nhom FOREIGN KEY (ma_he_nhom) REFERENCES dbo.he_nhom(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 10. BẢNG mau_san_pham (Mẫu sản phẩm / Template)
-- =============================================
CREATE TABLE dbo.mau_san_pham (
    id                      INT IDENTITY(1,1) NOT NULL,
    ma_code                 NVARCHAR(50)      NOT NULL,
    ten_san_pham            NVARCHAR(200)     NOT NULL,
    loai_san_pham           NVARCHAR(20)      NOT NULL,
    danh_muc                NVARCHAR(100)     NULL,
    chieu_rong_mac_dinh     INT               NULL,
    chieu_cao_mac_dinh      INT               NULL,
    loai_kinh_mac_dinh      NVARCHAR(100)     NULL,
    cau_truc_json           NVARCHAR(MAX)     NULL,
    anh_dai_dien            NVARCHAR(MAX)     NULL,

    CONSTRAINT PK_mau_san_pham PRIMARY KEY (id),
    CONSTRAINT UQ_mau_san_pham_ma UNIQUE (ma_code),
    CONSTRAINT CK_mau_san_pham_loai CHECK (loai_san_pham IN (N'door', N'window', N'glass_wall', N'railing'))
);
GO

-- =============================================
-- 11. BẢNG bao_gia (Báo giá)
-- =============================================
CREATE TABLE dbo.bao_gia (
    id                      INT IDENTITY(1,1) NOT NULL,
    ma_bao_gia              NVARCHAR(30)      NOT NULL,
    ma_du_an                INT               NULL,
    ma_khach_hang           INT               NOT NULL,
    ngay_bao_gia            DATE              NOT NULL,
    so_ngay_hieu_luc        INT               NULL DEFAULT 30,
    phien_ban               INT               NOT NULL DEFAULT 1,
    ma_bao_gia_goc          INT               NULL,
    trang_thai              NVARCHAR(20)      NOT NULL DEFAULT N'draft',
    tong_phu                DECIMAL(15,2)     NULL DEFAULT 0.00,
    phan_tram_loi_nhuan     DECIMAL(5,2)      NULL DEFAULT 0.00,
    so_tien_loi_nhuan       DECIMAL(15,2)     NULL DEFAULT 0.00,
    phan_tram_vat           DECIMAL(5,2)      NULL DEFAULT 0.00,
    phan_tram_chiet_khau    DECIMAL(5,2)      NULL DEFAULT 0.00,
    phi_van_chuyen          DECIMAL(15,2)     NULL DEFAULT 0.00,
    tong_tien_cuoi          DECIMAL(15,2)     NULL DEFAULT 0.00,
    so_tien_dat_coc         DECIMAL(15,2)     NULL DEFAULT 0.00,
    da_thanh_toan_coc       BIT               NULL DEFAULT 0,
    ten_nguoi_tao           NVARCHAR(100)     NULL,
    ghi_chu                 NVARCHAR(MAX)     NULL,
    ngay_tao                DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_bao_gia PRIMARY KEY (id),
    CONSTRAINT UQ_bao_gia_ma UNIQUE (ma_bao_gia),
    CONSTRAINT CK_bao_gia_tt CHECK (trang_thai IN (N'draft', N'sent', N'approved', N'rejected', N'contract_signed')),
    CONSTRAINT FK_bg_du_an FOREIGN KEY (ma_du_an) REFERENCES dbo.du_an(id) ON DELETE CASCADE,
    CONSTRAINT FK_bg_khach_hang FOREIGN KEY (ma_khach_hang) REFERENCES dbo.khach_hang(id),
    CONSTRAINT FK_bg_bao_gia_goc FOREIGN KEY (ma_bao_gia_goc) REFERENCES dbo.bao_gia(id)
);
GO

-- =============================================
-- 12. BẢNG chi_tiet_bao_gia (Chi tiết báo giá)
-- =============================================
CREATE TABLE dbo.chi_tiet_bao_gia (
    id              INT IDENTITY(1,1) NOT NULL,
    ma_bao_gia      INT               NOT NULL,
    ten_san_pham    NVARCHAR(200)     NOT NULL,
    chieu_rong      DECIMAL(10,2)     NULL,
    chieu_cao       DECIMAL(10,2)     NULL,
    so_luong        INT               NOT NULL DEFAULT 1,
    don_gia         DECIMAL(15,2)     NULL DEFAULT 0.00,
    thanh_tien      DECIMAL(15,2)     NULL DEFAULT 0.00,
    ghi_chu         NVARCHAR(MAX)     NULL,

    CONSTRAINT PK_chi_tiet_bao_gia PRIMARY KEY (id),
    CONSTRAINT FK_ctbg_bao_gia FOREIGN KEY (ma_bao_gia) REFERENCES dbo.bao_gia(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 13. BẢNG giao_dich_tai_chinh (Giao dịch tài chính)
-- =============================================
CREATE TABLE dbo.giao_dich_tai_chinh (
    id                      INT IDENTITY(1,1) NOT NULL,
    ma_giao_dich            NVARCHAR(50)      NOT NULL,
    ngay_giao_dich          DATE              NOT NULL,
    loai_giao_dich          NVARCHAR(10)      NOT NULL,
    danh_muc                NVARCHAR(100)     NULL,
    loai_chi_phi            NVARCHAR(100)     NULL,
    so_tien                 DECIMAL(15,2)     NOT NULL,
    dien_giai               NVARCHAR(MAX)     NULL,
    trang_thai              NVARCHAR(15)      NOT NULL DEFAULT N'draft',
    ma_du_an                INT               NULL,
    ma_khach_hang           INT               NULL,
    nha_cung_cap            NVARCHAR(200)     NULL,
    phuong_thuc_thanh_toan  NVARCHAR(50)      NULL,
    so_tham_chieu           NVARCHAR(100)     NULL,
    ngay_tao                DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_giao_dich_tai_chinh PRIMARY KEY (id),
    CONSTRAINT UQ_gdtc_ma UNIQUE (ma_giao_dich),
    CONSTRAINT CK_gdtc_loai CHECK (loai_giao_dich IN (N'revenue', N'expense')),
    CONSTRAINT CK_gdtc_tt CHECK (trang_thai IN (N'draft', N'posted', N'cancelled')),
    CONSTRAINT FK_gdtc_du_an FOREIGN KEY (ma_du_an) REFERENCES dbo.du_an(id) ON DELETE SET NULL,
    CONSTRAINT FK_gdtc_khach_hang FOREIGN KEY (ma_khach_hang) REFERENCES dbo.khach_hang(id) ON DELETE SET NULL
);
GO

-- =============================================
-- 14. BẢNG chi_tiet_giao_dich (Chi tiết giao dịch tài chính)
-- =============================================
CREATE TABLE dbo.chi_tiet_giao_dich (
    id              INT IDENTITY(1,1) NOT NULL,
    ma_giao_dich    INT               NOT NULL,
    ten_muc         NVARCHAR(200)     NOT NULL,
    so_luong        INT               NULL DEFAULT 1,
    don_gia         DECIMAL(15,2)     NULL DEFAULT 0.00,
    thanh_tien      DECIMAL(15,2)     NOT NULL DEFAULT 0.00,

    CONSTRAINT PK_chi_tiet_giao_dich PRIMARY KEY (id),
    CONSTRAINT FK_ctgd_giao_dich FOREIGN KEY (ma_giao_dich) REFERENCES dbo.giao_dich_tai_chinh(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 15. BẢNG cong_no (Công nợ)
-- =============================================
CREATE TABLE dbo.cong_no (
    id              INT IDENTITY(1,1) NOT NULL,
    loai_cong_no    NVARCHAR(15)      NOT NULL,
    nha_cung_cap    NVARCHAR(200)     NULL,
    ma_khach_hang   INT               NULL,
    ma_du_an        INT               NULL,
    tong_no         DECIMAL(15,2)     NOT NULL DEFAULT 0.00,
    da_thanh_toan   DECIMAL(15,2)     NOT NULL DEFAULT 0.00,
    so_tien_con_lai DECIMAL(15,2)     NOT NULL DEFAULT 0.00,
    trang_thai      NVARCHAR(10)      NOT NULL DEFAULT N'pending',
    ghi_chu         NVARCHAR(MAX)     NULL,
    ngay_tao        DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_cong_no PRIMARY KEY (id),
    CONSTRAINT CK_cong_no_loai CHECK (loai_cong_no IN (N'receivable', N'payable')),
    CONSTRAINT CK_cong_no_tt CHECK (trang_thai IN (N'pending', N'partial', N'paid')),
    CONSTRAINT FK_cn_khach_hang FOREIGN KEY (ma_khach_hang) REFERENCES dbo.khach_hang(id) ON DELETE SET NULL,
    CONSTRAINT FK_cn_du_an FOREIGN KEY (ma_du_an) REFERENCES dbo.du_an(id) ON DELETE SET NULL
);
GO

-- =============================================
-- 16. BẢNG san_pham_du_an (Sản phẩm dự án)
-- =============================================
CREATE TABLE dbo.san_pham_du_an (
    id                      INT IDENTITY(1,1) NOT NULL,
    ma_du_an                INT               NOT NULL,
    ma_mau_san_pham         INT               NOT NULL,
    ten_rieng               NVARCHAR(200)     NULL,
    he_nhom_su_dung         NVARCHAR(50)      NULL,
    so_luong                INT               NOT NULL DEFAULT 1,
    chieu_rong_tuy_chinh    INT               NULL,
    chieu_cao_tuy_chinh     INT               NULL,
    loai_kinh_tuy_chinh     NVARCHAR(100)     NULL,
    cau_hinh_snapshot       NVARCHAR(MAX)     NULL,
    ghi_de_bom              NVARCHAR(MAX)     NULL,
    phu_kien_json           NVARCHAR(MAX)     NULL,
    vi_tri_lap_dat          NVARCHAR(200)     NULL,
    ghi_chu                 NVARCHAR(MAX)     NULL,
    trang_thai              NVARCHAR(50)      NULL,
    ma_bao_gia_goc          INT               NULL,
    ngay_tao                DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_san_pham_du_an PRIMARY KEY (id),
    CONSTRAINT FK_spda_du_an FOREIGN KEY (ma_du_an) REFERENCES dbo.du_an(id) ON DELETE CASCADE,
    CONSTRAINT FK_spda_mau_sp FOREIGN KEY (ma_mau_san_pham) REFERENCES dbo.mau_san_pham(id) ON DELETE CASCADE,
    CONSTRAINT FK_spda_bao_gia FOREIGN KEY (ma_bao_gia_goc) REFERENCES dbo.bao_gia(id) ON DELETE SET NULL
);
GO

-- =============================================
-- 17. BẢNG thong_bao (Thông báo)
-- =============================================
CREATE TABLE dbo.thong_bao (
    id              INT IDENTITY(1,1) NOT NULL,
    ma_nguoi_dung   INT               NOT NULL,
    tieu_de         NVARCHAR(255)     NOT NULL,
    noi_dung        NVARCHAR(MAX)     NULL,
    da_doc          BIT               NOT NULL DEFAULT 0,
    ngay_tao        DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_thong_bao PRIMARY KEY (id),
    CONSTRAINT FK_tb_nguoi_dung FOREIGN KEY (ma_nguoi_dung) REFERENCES dbo.nguoi_dung(id) ON DELETE CASCADE
);
GO

-- =============================================
-- TẠO INDEX BỔ SUNG (tối ưu hiệu suất)
-- =============================================
CREATE INDEX IX_du_an_khach_hang ON dbo.du_an(ma_khach_hang);
CREATE INDEX IX_bao_gia_du_an ON dbo.bao_gia(ma_du_an);
CREATE INDEX IX_bao_gia_khach_hang ON dbo.bao_gia(ma_khach_hang);
CREATE INDEX IX_bao_gia_goc ON dbo.bao_gia(ma_bao_gia_goc);
CREATE INDEX IX_chi_tiet_bao_gia_bg ON dbo.chi_tiet_bao_gia(ma_bao_gia);
CREATE INDEX IX_gdtc_du_an ON dbo.giao_dich_tai_chinh(ma_du_an);
CREATE INDEX IX_gdtc_khach_hang ON dbo.giao_dich_tai_chinh(ma_khach_hang);
CREATE INDEX IX_ctgd_giao_dich ON dbo.chi_tiet_giao_dich(ma_giao_dich);
CREATE INDEX IX_cong_no_khach_hang ON dbo.cong_no(ma_khach_hang);
CREATE INDEX IX_cong_no_du_an ON dbo.cong_no(ma_du_an);
CREATE INDEX IX_nguoi_dung_chuc_vu ON dbo.nguoi_dung(ma_chuc_vu);
CREATE INDEX IX_phien_dn_nguoi_dung ON dbo.phien_dang_nhap(ma_nguoi_dung);
CREATE INDEX IX_profile_nhom_he ON dbo.profile_nhom(ma_he_nhom);
CREATE INDEX IX_spda_du_an ON dbo.san_pham_du_an(ma_du_an);
CREATE INDEX IX_spda_mau_sp ON dbo.san_pham_du_an(ma_mau_san_pham);
CREATE INDEX IX_spda_bao_gia ON dbo.san_pham_du_an(ma_bao_gia_goc);
CREATE INDEX IX_thong_bao_nguoi_dung ON dbo.thong_bao(ma_nguoi_dung);
GO

-- =============================================
-- HOÀN TẤT
-- =============================================
PRINT N'=============================================';
PRINT N'  ✅ Tạo CSDL viralwindowdb thành công!';
PRINT N'  📋 Tổng: 17 bảng, 17 index bổ sung';
PRINT N'  🔗 Ràng buộc: FK, CHECK, UNIQUE đầy đủ';
PRINT N'=============================================';
GO
