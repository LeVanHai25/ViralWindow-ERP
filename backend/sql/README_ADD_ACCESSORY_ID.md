# Hướng dẫn thêm cột `accessory_id` vào bảng `inventory_transactions`

## Vấn đề
Bảng `inventory_transactions` hiện tại chỉ có cột `inventory_id` (FK tới bảng `inventory`), nhưng khi xuất phụ kiện (accessories), cần lưu `accessory_id` (FK tới bảng `accessories`). Điều này gây ra lỗi foreign key constraint khi cố insert phụ kiện.

## Giải pháp
Thêm cột `accessory_id` vào bảng `inventory_transactions` và sửa logic:
- Nếu là inventory (nhôm, kính) → lưu vào `inventory_id`, `accessory_id = NULL`
- Nếu là accessory (phụ kiện) → lưu vào `accessory_id`, `inventory_id = NULL`

## Cách chạy SQL

### Cách 1: Sử dụng MySQL Command Line
```bash
mysql -u root -p viral_window_db < backend/sql/add_accessory_id_to_inventory_transactions.sql
```

### Cách 2: Sử dụng phpMyAdmin

1. Mở phpMyAdmin: http://localhost/phpmyadmin
2. Chọn database `viral_window_db`
3. Click tab **SQL**
4. Copy toàn bộ nội dung file `backend/sql/add_accessory_id_to_inventory_transactions_phpmyadmin.sql`
5. Paste vào ô SQL và click **Go** (Thực hiện)

**Lưu ý**: 
- Nếu gặp lỗi "Foreign key already exists", có thể bỏ qua hoặc xóa foreign key cũ trước:
  ```sql
  -- Tìm tên foreign key:
  SELECT CONSTRAINT_NAME 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = 'viral_window_db' 
    AND TABLE_NAME = 'inventory_transactions' 
    AND COLUMN_NAME = 'inventory_id' 
    AND REFERENCED_TABLE_NAME IS NOT NULL;
  
  -- Sau đó xóa (thay 'inventory_transactions_ibfk_1' bằng tên thực tế):
  ALTER TABLE inventory_transactions DROP FOREIGN KEY inventory_transactions_ibfk_1;
  ```

## Kiểm tra kết quả

Sau khi chạy SQL, kiểm tra cấu trúc bảng:
```sql
DESCRIBE inventory_transactions;
```

Kết quả mong đợi:
- Cột `inventory_id` phải là `INT NULL`
- Cột `accessory_id` phải tồn tại và là `INT NULL`
- Có foreign key `fk_inventory_transactions_inventory` cho `inventory_id`
- Có foreign key `fk_inventory_transactions_accessory` cho `accessory_id`

## Sau khi chạy SQL

1. Restart backend server (nếu đang chạy)
2. Test lại chức năng "Thêm giao dịch" với cả inventory và accessories
3. Kiểm tra cột "Dự án" trong danh sách giao dịch có hiển thị đúng "Mã - Tên" không



















