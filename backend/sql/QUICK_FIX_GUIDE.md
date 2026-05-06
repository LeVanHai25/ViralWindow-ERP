# Hướng dẫn nhanh sửa lỗi inventory_transactions

## Tình trạng hiện tại:
- ✅ Cột `accessory_id` đã tồn tại
- ✅ Foreign key cũ không tồn tại (đã bị xóa hoặc không có)

## Giải pháp: Chạy script đơn giản

### Cách 1: Chạy toàn bộ script (khuyến nghị)

Mở phpMyAdmin → Tab SQL → Copy và chạy file:
```
backend/sql/fix_inventory_transactions_final.sql
```

**Lưu ý**: Nếu gặp lỗi "Duplicate key name" ở bất kỳ bước nào, **bỏ qua bước đó** và tiếp tục.

---

### Cách 2: Chạy từng bước một

#### Bước 1: Sửa cột inventory_id
```sql
ALTER TABLE inventory_transactions 
MODIFY COLUMN inventory_id INT NULL COMMENT 'ID vật tư từ bảng inventory (nhôm, kính)';
```

#### Bước 2: Thêm foreign key cho inventory_id
```sql
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_inventory 
FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;
```
**Nếu lỗi "Duplicate key name"** → Bỏ qua, FK đã tồn tại.

#### Bước 3: Thêm foreign key cho accessory_id
```sql
ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_accessory 
FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL;
```
**Nếu lỗi "Duplicate key name"** → Bỏ qua, FK đã tồn tại.

#### Bước 4: Thêm index cho accessory_id
```sql
CREATE INDEX idx_accessory_id ON inventory_transactions(accessory_id);
```
**Nếu lỗi "Duplicate key name"** → Bỏ qua, index đã tồn tại.

---

## Kiểm tra kết quả

Chạy query này để kiểm tra cấu trúc bảng:

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
    REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'viral_window_db' 
  AND TABLE_NAME = 'inventory_transactions' 
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

**Kết quả mong đợi:**
- `fk_inventory_transactions_inventory` → `inventory_id` → `inventory`
- `fk_inventory_transactions_accessory` → `accessory_id` → `accessories`

---

## Sau khi hoàn tất:

1. ✅ **Restart backend server**
2. ✅ **Test lại chức năng "Thêm giao dịch"** với cả inventory và accessories
3. ✅ **Kiểm tra cột "Dự án"** trong danh sách giao dịch có hiển thị đúng "Mã - Tên" không

---

## Nếu vẫn gặp lỗi:

Gửi cho tôi:
1. Thông báo lỗi cụ thể
2. Kết quả của `DESCRIBE inventory_transactions;`
3. Kết quả của query kiểm tra foreign keys ở trên



















