# Hướng Dẫn Sửa Lỗi BOM Extraction

## Tổng Quan

Các script SQL này được tạo để kiểm tra và sửa các vấn đề liên quan đến BOM extraction, đặc biệt là:
- Thiếu kích thước (`custom_width_mm`, `custom_height_mm`) trong `project_items`
- Thiếu `aluminum_system` trong `project_items`
- Thiếu `door_designs` entries cho `project_items`
- Thiếu `bom_items` cho `door_designs`

## Thứ Tự Chạy Script

### Bước 1: Kiểm Tra Tổng Quan
Chạy script **`comprehensive_database_check_and_fix.sql`** để:
- Kiểm tra tất cả các vấn đề trong database
- Tự động extract kích thước từ `snapshot_config`
- Tự động extract `aluminum_system` từ `snapshot_config` (nếu có)
- Xem tổng hợp tình trạng database

```sql
-- Mở file: backend/sql/comprehensive_database_check_and_fix.sql
-- Thay đổi @project_id = 14 thành project_id của bạn
-- Chạy toàn bộ script trong phpMyAdmin
```

### Bước 2: Tạo door_designs Từ project_items
Sau khi đã có đủ kích thước và aluminum_system, chạy script **`auto_create_door_designs_from_project_items.sql`** để:
- Tự động tạo `door_designs` entries cho các `project_items` chưa có
- Liên kết `door_designs` với `project_items` qua `project_item_id`

```sql
-- Mở file: backend/sql/auto_create_door_designs_from_project_items.sql
-- Thay đổi @project_id = 14 thành project_id của bạn
-- Chạy BƯỚC 1 để kiểm tra trước
-- Chạy BƯỚC 2 để tạo door_designs
-- Chạy BƯỚC 3 để kiểm tra kết quả
```

**Lưu ý:** Nếu gặp lỗi "Unknown column 'structure_json'" hoặc "Unknown column 'status'", hãy:
1. Sử dụng PHƯƠNG ÁN 2 trong script (bỏ comment và comment PHƯƠNG ÁN 1)
2. Hoặc chạy script `add_project_item_id_column.sql` trước để đảm bảo cột `project_item_id` tồn tại

### Bước 3: Kiểm Tra Kết Quả
Sau khi chạy các script, kiểm tra lại bằng script **`comprehensive_database_check_and_fix.sql`** để đảm bảo:
- Tất cả `project_items` đã có kích thước
- Tất cả `project_items` đã có `aluminum_system`
- Tất cả `project_items` đã có `door_designs` tương ứng

## Các Script Khác

### `fix_extract_dimensions_from_snapshot.sql`
Script chuyên dụng để extract kích thước từ `snapshot_config`:
- Chỉ extract kích thước, không làm gì khác
- An toàn để chạy nhiều lần

### `check_aluminum_system_in_snapshot.sql`
Script để kiểm tra xem `aluminum_system` có trong `snapshot_config` không:
- Chỉ kiểm tra, không thay đổi dữ liệu
- Hiển thị mẫu 3 dòng đầu để xem cấu trúc JSON

### `add_project_item_id_column.sql`
Script để thêm cột `project_item_id` vào bảng `door_designs`:
- Chạy nếu cột này chưa tồn tại
- An toàn để chạy nhiều lần (có kiểm tra trước khi thêm)

## Xử Lý Lỗi

### Lỗi: "Unknown column 'project_item_id' in 'field list'"
**Giải pháp:** Chạy script `add_project_item_id_column.sql` trước

### Lỗi: "Unknown column 'structure_json' in 'field list'"
**Giải pháp:** Sử dụng PHƯƠNG ÁN 2 trong `auto_create_door_designs_from_project_items.sql` (bỏ comment PHƯƠNG ÁN 2 và comment PHƯƠNG ÁN 1)

### Lỗi: "Unknown column 'status' in 'field list'"
**Giải pháp:** Tương tự như trên, sử dụng PHƯƠNG ÁN 2

### Lỗi: "Cannot add foreign key constraint"
**Giải pháp:** Kiểm tra xem `project_items` có tồn tại không, và `project_id` có đúng không

## Kiểm Tra Sau Khi Sửa

Sau khi chạy tất cả các script, thử lại BOM extraction trong frontend:
1. Mở `design-new.html`
2. Đi đến "Bước 4: Bóc tách Vật tư"
3. Click "Bóc tách BOM tất cả" hoặc "Bóc tách" cho từng sản phẩm
4. Kiểm tra xem có còn lỗi không

## Cấu Trúc Dữ Liệu Mong Đợi

Sau khi sửa, cấu trúc dữ liệu nên như sau:

```
project_items
├── id
├── project_id
├── custom_width_mm ✅ (không NULL)
├── custom_height_mm ✅ (không NULL)
├── aluminum_system ✅ (không NULL)
└── snapshot_config (có thể NULL)

door_designs
├── id
├── project_id
├── project_item_id ✅ (liên kết với project_items.id)
├── design_code
├── door_type
├── width_mm ✅ (không NULL)
├── height_mm ✅ (không NULL)
└── aluminum_system_id ✅ (không NULL)

bom_items
├── id
├── design_id ✅ (liên kết với door_designs.id)
├── item_type
├── item_code
├── item_name
└── ... (các trường khác)
```

## Liên Hệ

Nếu vẫn gặp lỗi sau khi chạy tất cả các script, vui lòng:
1. Chạy lại `comprehensive_database_check_and_fix.sql` và xem kết quả
2. Kiểm tra log trong backend console
3. Kiểm tra Network tab trong browser để xem API response











