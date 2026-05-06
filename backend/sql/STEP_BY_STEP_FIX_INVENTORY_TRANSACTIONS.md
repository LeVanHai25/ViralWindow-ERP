# Hướng dẫn sửa lỗi inventory_transactions - Từng bước

## Vấn đề hiện tại:
1. ✅ Cột `accessory_id` đã tồn tại (đã chạy một phần SQL)
2. ❌ Foreign key constraint không thể tạo được

## Giải pháp: Chạy từng bước một

### BƯỚC 1: Tìm và xóa foreign key cũ cho inventory_id

Chạy query này trong phpMyAdmin để tìm tên foreign key:

```sql
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'viral_window_db' 
  AND TABLE_NAME = 'inventory_transactions' 
  AND COLUMN_NAME = 'inventory_id' 
  AND REFERENCED_TABLE_NAME = 'inventory';
```

**Kết quả sẽ hiển thị tên FK**, ví dụ: `inventory_transactions_ibfk_1`

Sau đó **xóa FK cũ** (thay `inventory_transactions_ibfk_1` bằng tên thực tế):

```sql
ALTER TABLE inventory_transactions 
DROP FOREIGN KEY inventory_transactions_ibfk_1;
```

---

### BƯỚC 2: Sửa cột inventory_id để cho phép NULL

```sql
ALTER TABLE inventory_transactions 
MODIFY COLUMN inventory_id INT NULL COMMENT 'ID vật tư từ bảng inventory (nhôm, kính)';
```

---

### BƯỚC 3: Kiểm tra cột accessory_id đã tồn tại chưa

```sql
DESCRIBE inventory_transactions;
```

Nếu cột `accessory_id` **đã tồn tại**, **BỎ QUA BƯỚC 4**.

---

### BƯỚC 4: Thêm cột accessory_id (CHỈ chạy nếu chưa có)

```sql
ALTER TABLE inventory_transactions 
ADD COLUMN accessory_id INT NULL COMMENT 'ID phụ kiện từ bảng accessories (nếu là phụ kiện)' 
AFTER inventory_id;
```

**Nếu gặp lỗi "Duplicate column name"** → Bỏ qua, cột đã tồn tại.

---

### BƯỚC 5: Thêm lại foreign key cho inventory_id

```sql
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_inventory 
FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;
```

---

### BƯỚC 6: Thêm foreign key cho accessory_id

```sql
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_accessory 
FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL;
```

---

### BƯỚC 7: Thêm index cho accessory_id

```sql
CREATE INDEX idx_accessory_id ON inventory_transactions(accessory_id);
```

**Nếu gặp lỗi "Duplicate key name"** → Bỏ qua, index đã tồn tại.

---

### BƯỚC 8: Kiểm tra kết quả

```sql
DESCRIBE inventory_transactions;
```

**Kết quả mong đợi:**
- `inventory_id` phải là `INT NULL`
- `accessory_id` phải tồn tại và là `INT NULL`

Kiểm tra foreign keys:

```sql
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'viral_window_db' 
  AND TABLE_NAME = 'inventory_transactions' 
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

**Kết quả mong đợi:**
- `fk_inventory_transactions_inventory` → `inventory_id` → `inventory.id`
- `fk_inventory_transactions_accessory` → `accessory_id` → `accessories.id`

---

## Sau khi hoàn tất:

1. **Restart backend server**
2. **Test lại chức năng "Thêm giao dịch"** với cả inventory và accessories
3. **Kiểm tra cột "Dự án"** trong danh sách giao dịch có hiển thị đúng "Mã - Tên" không



















