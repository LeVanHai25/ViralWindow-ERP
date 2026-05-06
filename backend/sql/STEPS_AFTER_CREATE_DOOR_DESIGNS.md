# Các Bước Tiếp Theo Sau Khi Tạo door_designs

## ✅ Bước 1: Kiểm Tra Dữ Liệu

Chạy script **`verify_data_before_bom_extraction.sql`** để kiểm tra tình trạng dữ liệu:

```sql
-- Mở file: backend/sql/verify_data_before_bom_extraction.sql
-- Thay đổi @project_id = 14 nếu cần
-- Chạy toàn bộ script
```

Script này sẽ hiển thị:
- ✅ Tổng số `project_items` và `door_designs`
- ✅ Các `project_items` thiếu kích thước hoặc `aluminum_system`
- ✅ Các `door_designs` thiếu dữ liệu
- ✅ Các `door_designs` chưa có BOM
- ✅ Hướng dẫn các bước tiếp theo

## 🔧 Bước 2: Sửa Các Vấn Đề Còn Lại (Nếu Có)

### 2.1. Nếu có `project_items` thiếu kích thước:
- Chạy lại script `fix_extract_dimensions_from_snapshot.sql` để extract từ `snapshot_config`
- Hoặc cập nhật thủ công trong database hoặc frontend

### 2.2. Nếu có `project_items` thiếu `aluminum_system`:
- Chạy script `fix_missing_aluminum_system_id.sql` để kiểm tra và sửa
- Hoặc cập nhật thủ công trong database hoặc frontend

### 2.3. Nếu có `project_items` chưa có `door_designs`:
- Chạy lại script `auto_create_door_designs_from_project_items.sql`
- Đảm bảo các `project_items` đã có đủ kích thước và `aluminum_system` trước

### 2.4. Nếu có `door_designs` thiếu dữ liệu:
- Kiểm tra phần 2.4 trong `verify_data_before_bom_extraction.sql`
- Cập nhật thủ công hoặc xóa và tạo lại từ `project_items`

## ✅ Bước 3: Kiểm Tra Lại

Chạy lại script `verify_data_before_bom_extraction.sql` để đảm bảo:
- ✅ Tất cả `project_items` đã có kích thước và `aluminum_system`
- ✅ Tất cả `project_items` đã có `door_designs` tương ứng
- ✅ Tất cả `door_designs` đã có đủ dữ liệu (kích thước, `aluminum_system_id`)

## 🚀 Bước 4: Bắt Đầu Bóc Tách BOM

Sau khi đã đảm bảo dữ liệu đúng, bạn có thể:

1. **Mở frontend**: `FontEnd/design-new.html`
2. **Chọn dự án**: Chọn project có `project_id = 14` (hoặc project_id của bạn)
3. **Đi đến Bước 4**: "Bóc tách Vật tư"
4. **Bóc tách BOM**:
   - Click "Bóc tách BOM tất cả" để bóc tách cho tất cả sản phẩm
   - Hoặc click "Bóc tách" cho từng sản phẩm riêng lẻ

## 📊 Bước 5: Kiểm Tra Kết Quả

Sau khi bóc tách BOM, kiểm tra:

1. **Trong frontend**: Xem BOM đã hiển thị đúng chưa
2. **Trong database**: Chạy query sau để xem BOM đã được lưu:

```sql
SELECT 
    dd.id as door_design_id,
    dd.design_code,
    COUNT(bi.id) as bom_items_count,
    SUM(CASE WHEN bi.item_type = 'frame' THEN 1 ELSE 0 END) as aluminum_items,
    SUM(CASE WHEN bi.item_type = 'glass' THEN 1 ELSE 0 END) as glass_items,
    SUM(CASE WHEN bi.item_type = 'accessory' THEN 1 ELSE 0 END) as accessory_items
FROM door_designs dd
LEFT JOIN bom_items bi ON bi.design_id = dd.id
WHERE dd.project_id = 14
GROUP BY dd.id, dd.design_code
ORDER BY dd.id;
```

## ⚠️ Xử Lý Lỗi

### Lỗi: "Không có dữ liệu" khi bóc tách BOM
**Nguyên nhân có thể:**
- `door_designs` thiếu kích thước hoặc `aluminum_system_id`
- API không tìm thấy `door_designs` từ `project_item_id`

**Giải pháp:**
1. Chạy `verify_data_before_bom_extraction.sql` để kiểm tra
2. Đảm bảo `door_designs` có `project_item_id` đúng
3. Kiểm tra console log trong browser để xem lỗi cụ thể

### Lỗi: "Failed to load resource: 500 Internal Server Error"
**Nguyên nhân có thể:**
- Backend không tìm thấy `door_designs`
- Lỗi trong quá trình tính toán BOM

**Giải pháp:**
1. Kiểm tra backend console log
2. Kiểm tra API endpoint `/api/bom/projects/:projectId/doors/:doorId/calculate`
3. Đảm bảo `door_designs` có đủ dữ liệu

## 📝 Checklist Cuối Cùng

Trước khi bóc tách BOM, đảm bảo:

- [ ] Tất cả `project_items` đã có `custom_width_mm` và `custom_height_mm`
- [ ] Tất cả `project_items` đã có `aluminum_system`
- [ ] Tất cả `project_items` đã có `door_designs` tương ứng
- [ ] Tất cả `door_designs` đã có `width_mm`, `height_mm`, và `aluminum_system_id`
- [ ] Tất cả `door_designs` đã có `project_item_id` để liên kết với `project_items`

## 🎉 Hoàn Thành

Sau khi hoàn thành tất cả các bước trên, bạn có thể:
- ✅ Bóc tách BOM cho từng sản phẩm
- ✅ Xem chi tiết cấu tạo của từng sản phẩm
- ✅ Xuất báo cáo BOM
- ✅ Tiếp tục các bước tiếp theo trong quy trình thiết kế











