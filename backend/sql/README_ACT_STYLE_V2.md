# 📖 Hướng dẫn Sử dụng Hệ thống ACT Style V2

## 🎯 Tổng quan

Hệ thống mới sử dụng **kiến trúc ACT Style** với:
- **1 bảng sản phẩm chung** (`project_items_v2`) cho tất cả loại: cửa, cửa sổ, lan can, vách kính, mái kính, cầu thang
- **BOM theo nhóm vật tư**: Nhôm, Kính, Phụ kiện, Gioăng/Keo
- **Rule-based calculation**: Không hardcode, dùng rules từ database

---

## 🚀 Cách sử dụng

### 1. Truy cập Frontend

Mở browser và truy cập:
```
http://localhost:3001/design-new.html
```

### 2. Workflow thiết kế

```
Bước 1: Chọn Dự án
    ↓
Bước 2: Chọn Sản phẩm từ Báo giá
    ↓
Bước 3: Nhập Thông số Kỹ thuật
    ↓
Bước 4: Xem Cấu tạo (tự động)
    ↓
Bước 5: Bóc tách Vật tư (4 tabs: Nhôm, Kính, Phụ kiện, Gioăng)
    ↓
Bước 6: Kiểm tra Kho
    ↓
Bước 7: Tính giá & Tổng hợp
```

---

## 🔧 API Endpoints (V2)

### Quản lý sản phẩm

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v2/project-items` | Danh sách sản phẩm |
| GET | `/api/v2/project-items/:id` | Chi tiết sản phẩm |
| POST | `/api/v2/project-items` | Tạo sản phẩm mới |
| PUT | `/api/v2/project-items/:id/config` | Cập nhật cấu hình |
| DELETE | `/api/v2/project-items/:id` | Xóa sản phẩm |

### Tính BOM

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v2/project-items/:id/calculate-bom` | Tính BOM |
| GET | `/api/v2/project-items/:id/bom` | Lịch sử BOM |

### Rules

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v2/rules?item_type=door&aluminum_system=XINGFA_55` | Lấy rules |

---

## 📊 Loại sản phẩm hỗ trợ

| item_type | Tên | Mô tả |
|-----------|-----|-------|
| `door` | Cửa đi | Cửa mở quay, lùa |
| `window` | Cửa sổ | Cửa sổ các loại |
| `railing` | Lan can | Lan can kính, nhôm |
| `glass_partition` | Vách kính | Vách ngăn kính |
| `glass_roof` | Mái kính | Mái che kính |
| `stair` | Cầu thang | Cầu thang kính |

---

## 🧮 Ví dụ tính BOM

### Request:
```bash
curl -X POST http://localhost:3001/api/v2/project-items/13/calculate-bom \
  -H "Content-Type: application/json" \
  -d '{"save": true}'
```

### Response:
```json
{
  "success": true,
  "item": {
    "id": 13,
    "item_type": "door",
    "item_code": "CT2025-712-C001",
    "quantity": 1
  },
  "config": {
    "width_mm": 1200,
    "height_mm": 2400,
    "leaf_count": 1,
    "aluminum_system": "XINGFA_55"
  },
  "bom": {
    "aluminum": { "lines": [...], "total_weight_kg": 7.056 },
    "glass": { "lines": [...], "total_area_m2": 2.738 },
    "hardware": { "lines": [...], "total_count": 5 },
    "consumables": { "lines": [...] }
  },
  "summary": {
    "aluminum_kg": 7.056,
    "aluminum_cost": 635040,
    "glass_m2": 2.738,
    "glass_cost": 1423760,
    "hardware_count": 5,
    "hardware_cost": 750000,
    "consumables_cost": 216000,
    "total_cost": 3024800
  }
}
```

---

## ⚙️ Thêm Rules mới

### Cấu trúc Rule:

```sql
INSERT INTO item_type_rules (item_type, rule_category, rule_code, rule_name, formula, parameters)
VALUES (
  'door',           -- Loại sản phẩm
  'structure',      -- Loại rule: structure, bom, pricing
  'FRAME_WIDTH',    -- Mã rule
  'Khung bao ngang', -- Tên rule
  'W',              -- Công thức (W=width, H=height, L=length)
  '{"position":"frame_top,frame_bottom","direction":"horizontal"}'
);
```

### Biến có sẵn trong formula:
- `W` - Chiều rộng (mm)
- `H` - Chiều cao (mm)
- `L` - Chiều dài (mm)
- `leaf_count` - Số cánh
- `perimeter` - Chu vi (m)
- `perimeter_mm` - Chu vi (mm)

---

## 📁 Database Schema

### Bảng chính:
- `project_items_v2` - Sản phẩm chung
- `item_versions` - Phiên bản
- `item_config` - Cấu hình kích thước

### Bảng cấu tạo:
- `item_structure_aluminum` - Cấu tạo nhôm
- `item_structure_glass` - Cấu tạo kính
- `item_structure_hardware` - Phụ kiện
- `item_structure_consumables` - Gioăng/Keo

### Bảng BOM:
- `item_bom_versions` - Version BOM
- `item_bom_lines` - Chi tiết BOM

### Bảng Rules:
- `item_type_rules` - Rules theo loại sản phẩm
- `item_type_system_rules` - Override theo hệ nhôm

---

## 🔄 Migration từ hệ thống cũ

Chạy script migration:
```bash
cd backend
node sql/run_migration_data.js
```

---

## 🧪 Test hệ thống

Chạy integration test:
```bash
cd backend
node sql/test_api_v2.js
```

Expected output:
```
✅ Test 1: GET /project-items - PASS
✅ Test 2: GET /project-items/:id - PASS
✅ Test 3: GET /rules - PASS
✅ Test 4: POST /calculate-bom - PASS
✅ Test 5: GET /bom - PASS
🎉 All tests passed!
```
