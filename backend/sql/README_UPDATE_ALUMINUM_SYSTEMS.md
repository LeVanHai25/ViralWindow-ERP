# Migration: Cập nhật bảng aluminum_systems

## Mô tả
Thêm cột `color` và `image_url` vào bảng `aluminum_systems` để thay thế `cutting_formula` và hỗ trợ upload hình ảnh.

## Các thay đổi
1. **Thêm cột `color`**: VARCHAR(50) - Lưu màu sắc hệ nhôm
2. **Thêm cột `image_url`**: VARCHAR(255) - Lưu đường dẫn hình ảnh mặt cắt

## Cách chạy migration

### Cách 1: Sử dụng file đơn giản (Khuyến nghị)
```bash
mysql -u root -p your_database_name < backend/sql/update_aluminum_systems_simple.sql
```

**Lưu ý**: Nếu cột đã tồn tại, MySQL sẽ báo lỗi. Bạn có thể bỏ qua lỗi đó.

### Cách 2: Sử dụng file an toàn (Tự động kiểm tra)
```bash
mysql -u root -p your_database_name < backend/sql/update_aluminum_systems_add_color_image.sql
```

File này sẽ tự động kiểm tra xem cột đã tồn tại chưa trước khi thêm.

### Cách 3: Chạy trực tiếp trong MySQL
```sql
USE your_database_name;

-- Thêm cột color
ALTER TABLE aluminum_systems 
ADD COLUMN color VARCHAR(50) NULL COMMENT "Màu sắc hệ nhôm" 
AFTER weight_per_meter;

-- Thêm cột image_url
ALTER TABLE aluminum_systems 
ADD COLUMN image_url VARCHAR(255) NULL COMMENT "Đường dẫn hình ảnh mặt cắt" 
AFTER description;
```

## Kiểm tra sau khi migration

```sql
-- Xem cấu trúc bảng
DESCRIBE aluminum_systems;

-- Hoặc
SHOW COLUMNS FROM aluminum_systems;

-- Kiểm tra dữ liệu
SELECT id, code, name, color, image_url FROM aluminum_systems LIMIT 5;
```

## Rollback (Nếu cần)

Nếu muốn hoàn tác migration:

```sql
ALTER TABLE aluminum_systems DROP COLUMN color;
ALTER TABLE aluminum_systems DROP COLUMN image_url;
```

## Lưu ý
- Cột `cutting_formula` vẫn được giữ lại để tương thích ngược
- Nếu muốn xóa cột `cutting_formula`, chạy:
  ```sql
  ALTER TABLE aluminum_systems DROP COLUMN cutting_formula;
  ```



















