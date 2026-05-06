# 📘 HƯỚNG DẪN CHẠY SQL TRONG PHPMYADMIN

## 🎯 Mục đích
Chạy migration SQL để tạo bảng `project_materials` và thêm cột `material_cost` vào bảng `projects`.

---

## 📋 BƯỚC 1: Mở phpMyAdmin

1. Mở trình duyệt và truy cập: **http://localhost/phpmyadmin**
2. Đăng nhập với tài khoản MySQL của bạn
3. Chọn database: **Virai_Window_db** (hoặc tên database của bạn)

---

## 📋 BƯỚC 2: Mở tab SQL

1. Click vào tab **"SQL"** ở thanh menu phía trên
2. Bạn sẽ thấy một ô text lớn để nhập SQL

---

## 📋 BƯỚC 3: Copy và chạy SQL

### 🔸 **Option 1: Copy toàn bộ file SQL**

1. Mở file: `backend/sql/create_project_materials_table.sql`
2. **Copy toàn bộ nội dung** (Ctrl+A, Ctrl+C)
3. **Paste vào ô SQL** trong phpMyAdmin (Ctrl+V)
4. Click nút **"Thực hiện"** (hoặc **"Go"**)

### 🔸 **Option 2: Chạy từng phần (nếu Option 1 bị lỗi)**

Nếu MySQL không hỗ trợ `IF NOT EXISTS`, hãy chạy từng câu lệnh:

#### **Phần 1: Tạo bảng project_materials**

```sql
CREATE TABLE IF NOT EXISTS project_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL COMMENT 'ID dự án',
    inventory_id INT NULL COMMENT 'ID vật tư từ bảng inventory (nhôm, kính)',
    accessory_id INT NULL COMMENT 'ID phụ kiện từ bảng accessories',
    transaction_id INT NULL COMMENT 'ID giao dịch xuất kho (để trace lại)',
    quantity_used DECIMAL(10, 2) NOT NULL COMMENT 'Số lượng đã xuất',
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0 COMMENT 'Giá đơn vị tại thời điểm xuất',
    total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0 COMMENT 'Tổng chi phí = quantity_used × unit_price',
    item_name VARCHAR(255) NULL COMMENT 'Tên vật tư (lưu để tránh mất dữ liệu khi vật tư bị xóa)',
    item_unit VARCHAR(50) NULL COMMENT 'Đơn vị tính',
    notes TEXT NULL COMMENT 'Ghi chú',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL,
    FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL,
    FOREIGN KEY (transaction_id) REFERENCES inventory_transactions(id) ON DELETE SET NULL,
    
    INDEX idx_project_id (project_id),
    INDEX idx_inventory_id (inventory_id),
    INDEX idx_accessory_id (accessory_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vật tư đã sử dụng cho dự án';
```

#### **Phần 2: Thêm cột material_cost vào bảng projects**

**Cách 1: Nếu MySQL hỗ trợ IF NOT EXISTS (MySQL 8.0+)**

```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS material_cost DECIMAL(15, 2) DEFAULT 0 COMMENT 'Tổng chi phí vật tư' 
AFTER total_value;
```

**Cách 2: Nếu MySQL không hỗ trợ IF NOT EXISTS (MySQL 5.7 trở xuống)**

Chạy câu lệnh này (nếu cột đã tồn tại sẽ báo lỗi, bỏ qua):

```sql
ALTER TABLE projects 
ADD COLUMN material_cost DECIMAL(15, 2) DEFAULT 0 COMMENT 'Tổng chi phí vật tư' 
AFTER total_value;
```

**Nếu báo lỗi "Duplicate column name 'material_cost'"** → Cột đã tồn tại, bỏ qua bước này.

---

## 📋 BƯỚC 4: Kiểm tra kết quả

### ✅ Kiểm tra bảng project_materials đã được tạo:

1. Click vào tên database ở sidebar bên trái
2. Tìm bảng **`project_materials`** trong danh sách
3. Click vào bảng để xem cấu trúc

### ✅ Kiểm tra cột material_cost đã được thêm:

1. Click vào bảng **`projects`**
2. Click tab **"Cấu trúc"** (Structure)
3. Tìm cột **`material_cost`** trong danh sách các cột

---

## 🔍 KIỂM TRA BẰNG SQL

Bạn cũng có thể chạy các câu lệnh sau để kiểm tra:

### Kiểm tra bảng project_materials:

```sql
DESCRIBE project_materials;
```

### Kiểm tra cột material_cost:

```sql
DESCRIBE projects;
```

Hoặc:

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'projects'
  AND COLUMN_NAME = 'material_cost';
```

---

## ⚠️ XỬ LÝ LỖI

### Lỗi 1: "Table 'project_materials' already exists"
- **Nguyên nhân**: Bảng đã tồn tại
- **Giải pháp**: Bỏ qua, bảng đã được tạo rồi

### Lỗi 2: "Duplicate column name 'material_cost'"
- **Nguyên nhân**: Cột đã tồn tại
- **Giải pháp**: Bỏ qua, cột đã được thêm rồi

### Lỗi 3: "Cannot add foreign key constraint"
- **Nguyên nhân**: Bảng tham chiếu chưa tồn tại hoặc kiểu dữ liệu không khớp
- **Giải pháp**: 
  1. Kiểm tra các bảng `projects`, `inventory`, `accessories`, `inventory_transactions` đã tồn tại chưa
  2. Kiểm tra kiểu dữ liệu của các cột tham chiếu

### Lỗi 4: "Unknown database"
- **Nguyên nhân**: Chưa chọn đúng database
- **Giải pháp**: Click vào tên database ở sidebar bên trái trước khi chạy SQL

---

## ✅ HOÀN TẤT

Sau khi chạy SQL thành công:

1. ✅ Bảng `project_materials` đã được tạo
2. ✅ Cột `material_cost` đã được thêm vào bảng `projects`
3. ✅ Restart backend server
4. ✅ Test tạo giao dịch xuất kho cho dự án

---

## 📞 HỖ TRỢ

Nếu gặp lỗi, hãy:
1. Copy toàn bộ thông báo lỗi
2. Gửi cho tôi để kiểm tra và sửa



















