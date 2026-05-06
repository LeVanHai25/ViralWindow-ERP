# Migration: Thêm cột project_id vào bảng inventory_transactions

## Mục đích
Thêm cột `project_id` vào bảng `inventory_transactions` để lưu thông tin dự án khi xuất kho vật tư.

## Cách chạy migration

### Cách 1: Sử dụng script an toàn (Khuyến nghị)
```bash
mysql -u your_username -p your_database_name < backend/sql/add_project_id_to_inventory_transactions_safe.sql
```

Hoặc chạy trực tiếp trong MySQL:
```sql
SOURCE backend/sql/add_project_id_to_inventory_transactions_safe.sql;
```

### Cách 2: Sử dụng script đơn giản
```bash
mysql -u your_username -p your_database_name < backend/sql/add_project_id_to_inventory_transactions.sql
```

**Lưu ý:** Script đơn giản có thể báo lỗi nếu cột/index/foreign key đã tồn tại. Script an toàn sẽ tự động kiểm tra và bỏ qua nếu đã tồn tại.

## Kiểm tra kết quả

Sau khi chạy migration, kiểm tra bằng lệnh:
```sql
DESCRIBE inventory_transactions;
```

Bạn sẽ thấy cột `project_id` trong danh sách các cột.

## Rollback (nếu cần)

Nếu muốn xóa cột `project_id`:
```sql
ALTER TABLE inventory_transactions DROP FOREIGN KEY fk_inventory_transactions_project;
ALTER TABLE inventory_transactions DROP INDEX idx_project_id;
ALTER TABLE inventory_transactions DROP COLUMN project_id;
```

## Lưu ý
- Migration này không ảnh hưởng đến dữ liệu hiện có
- Cột `project_id` là NULLABLE, nên các transaction cũ vẫn hoạt động bình thường
- Nếu chưa chạy migration, hệ thống vẫn hoạt động nhưng sẽ không lưu được `project_id` (sẽ fallback về INSERT không có project_id)



















