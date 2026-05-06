# Migration: Tạo bảng project_materials và cập nhật projects

## Mục đích
Tạo bảng `project_materials` để lưu vật tư đã sử dụng cho dự án và thêm cột `material_cost` vào bảng `projects`.

## Cách chạy migration

### Bước 1: Chạy SQL migration
```bash
mysql -u your_username -p your_database_name < backend/sql/create_project_materials_table.sql
```

Hoặc chạy trực tiếp trong MySQL:
```sql
SOURCE backend/sql/create_project_materials_table.sql;
```

### Bước 2: Kiểm tra kết quả

Kiểm tra bảng đã được tạo:
```sql
DESCRIBE project_materials;
DESCRIBE projects;
```

Bạn sẽ thấy:
- Bảng `project_materials` với các cột: `id`, `project_id`, `inventory_id`, `accessory_id`, `transaction_id`, `quantity_used`, `unit_price`, `total_cost`, etc.
- Bảng `projects` có thêm cột `material_cost`

## Cách hoạt động

### Khi xuất kho cho dự án:
1. Tạo transaction trong `inventory_transactions`
2. Tự động thêm record vào `project_materials` với:
   - `project_id`: ID dự án
   - `inventory_id` hoặc `accessory_id`: ID vật tư
   - `quantity_used`: Số lượng đã xuất
   - `unit_price`: Giá tại thời điểm xuất
   - `total_cost`: Tổng chi phí = quantity_used × unit_price
3. Tự động cập nhật `material_cost` trong bảng `projects`

### API Endpoints:

**GET /api/projects/:projectId/materials**
- Lấy danh sách vật tư đã sử dụng cho dự án
- Response:
```json
{
  "success": true,
  "data": {
    "project_id": 10,
    "materials": [
      {
        "id": 1,
        "item_name": "Nhôm Xingfa 55",
        "quantity_used": 5,
        "unit_price": 150000,
        "total_cost": 750000,
        "item_unit": "cái",
        "created_at": "2025-12-11T14:33:34.000Z"
      }
    ],
    "total_material_cost": 1350000,
    "material_count": 2
  }
}
```

**DELETE /api/projects/:projectId/materials/:materialId**
- Xóa vật tư khỏi dự án (nếu cần)
- Tự động cập nhật lại `material_cost`

## Lưu ý

- Khi xóa transaction, vật tư vẫn giữ trong `project_materials` (để lưu lịch sử)
- Khi xóa dự án, tất cả vật tư liên quan sẽ bị xóa (CASCADE)
- Khi xóa vật tư, `inventory_id`/`accessory_id` sẽ set NULL (SET NULL) nhưng thông tin vẫn giữ trong `item_name`



















