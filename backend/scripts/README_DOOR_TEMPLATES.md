# 📚 Hướng dẫn sử dụng Kho Mẫu Cửa

## 🎯 Tổng quan

Hệ thống kho mẫu cửa cho phép bạn:
- Import 100+ mẫu cửa chuẩn Việt Nam
- Tự thiết kế và lưu mẫu cửa mới
- Chọn mẫu từ kho khi thiết kế dự án
- Quản lý và phân loại mẫu theo category/family

## 📁 Cấu trúc Files

```
backend/
├── data/
│   ├── door-templates-base.json      # 30+ mẫu cơ bản
│   └── door-templates-expanded.json  # 100+ mẫu (sau khi generate)
├── scripts/
│   ├── generate-door-templates.js    # Script generate 100+ mẫu
│   └── import-door-templates.js      # Script import vào DB
└── controllers/
    └── doorTemplateController.js     # API quản lý templates
```

## 🚀 Cách sử dụng

### 1. Import mẫu cửa cơ bản (30+ mẫu)

```bash
cd backend
node scripts/import-door-templates.js data/door-templates-base.json
```

### 2. Generate và import 100+ mẫu

```bash
cd backend
node scripts/generate-door-templates.js
```

Script này sẽ:
- Đọc `door-templates-base.json`
- Generate các biến thể theo hệ nhôm, kích thước
- Export ra `door-templates-expanded.json`
- Tự động import vào database

### 3. Import qua API

```javascript
// Import từ file JSON
POST /api/door-templates/import
Body: {
  "templates": [
    {
      "code": "DOOR_OUT_1L_01",
      "name": "Cửa đi 1 cánh mở ngoài trái",
      "category": "door_out_swing",
      "family": "door_out_1l",
      "system": "XINGFA_55",
      "defaultWidth": 900,
      "defaultHeight": 2200,
      "panelTree": { ... },
      "description": "..."
    }
  ]
}

// Import mẫu mặc định
POST /api/door-templates/import-default
```

## 📋 Cấu trúc JSON Template

```json
{
  "code": "DOOR_OUT_1L_01",           // Mã duy nhất
  "name": "Cửa đi 1 cánh mở ngoài trái",
  "category": "door_out_swing",       // Nhóm lớn
  "family": "door_out_1l",            // Nhóm nhỏ
  "system": "XINGFA_55",              // Hệ nhôm
  "defaultWidth": 900,                // mm
  "defaultHeight": 2200,              // mm
  "panelTree": {                      // Cấu trúc Panel Tree
    "type": "leaf",
    "id": "K1",
    "role": "door",
    "openType": "turn-left",
    "glass": "CLEAR_8"
  },
  "description": "Mô tả mẫu cửa"
}
```

## 🏷️ Categories & Families

### Categories (Nhóm lớn):
- `door_out_swing` - Cửa đi mở quay ngoài
- `door_in_swing` - Cửa đi mở quay trong
- `window_swing` - Cửa sổ mở quay
- `window_tilt` - Cửa sổ mở hất
- `window_tilt_turn` - Cửa sổ mở hất-quay
- `window_sliding` - Cửa sổ lùa
- `door_sliding` - Cửa đi lùa
- `window_fixed` - Cửa sổ fix
- `partition_door` - Vách + cửa

### Families (Nhóm nhỏ):
- `door_out_1l`, `door_out_1r` - Cửa đi 1 cánh
- `door_out_2lr` - Cửa đi 2 cánh
- `door_out_4l` - Cửa đi 4 cánh
- `win_swing_1l`, `win_swing_2lr`, `win_swing_3`, `win_swing_4`
- `slid_win_2`, `slid_win_3`, `slid_win_4`
- `slid_door_2`, `slid_door_4`
- `partition_door_1l`, `partition_door_2lr`

## 🔧 Panel Tree Structure

### Leaf Panel (Panel lá):
```json
{
  "type": "leaf",
  "id": "K1",
  "role": "door",           // door / window / fixed
  "openType": "turn-left",  // turn-left/right, tilt, tilt-turn, sliding, fixed
  "glass": "CLEAR_8"
}
```

### Split Panel (Panel chia):
```json
{
  "direction": "vertical",  // vertical / horizontal
  "split": true,
  "ratio": [1, 1],          // Tỷ lệ chia
  "children": [
    { "type": "leaf", ... },
    { "type": "leaf", ... }
  ]
}
```

## 📊 API Endpoints

### Lấy danh sách templates
```
GET /api/door-templates
Query params:
  - family: Lọc theo family
  - category: Lọc theo category
  - brand: Lọc theo brand hệ nhôm
  - search: Tìm kiếm theo code/name
```

### Lấy categories
```
GET /api/door-templates/categories/list
```

### Lấy template theo ID
```
GET /api/door-templates/:id
```

### Tạo template mới
```
POST /api/door-templates
Body: { code, name, category, family, panelTree, ... }
```

### Import templates
```
POST /api/door-templates/import
Body: { templates: [...] }
```

### Import mẫu mặc định
```
POST /api/door-templates/import-default
```

### Cập nhật template
```
PUT /api/door-templates/:id
```

### Xóa template
```
DELETE /api/door-templates/:id
```

## 💡 Tips

1. **Kích thước chuẩn VN:**
   - Cửa đi 1 cánh: 800-900mm x 2100-2300mm
   - Cửa đi 2 cánh: 1200-1800mm x 2100-2400mm
   - Cửa sổ: 800-1200mm x 900-1500mm
   - Fix trên: cao 300-450mm
   - Fix bên: rộng 300-450mm

2. **Hệ nhôm:**
   - Cửa mở quay: XINGFA_55, XINGFA_63, VIVA_55, VIRAL_55
   - Cửa lùa: XINGFA_93

3. **Loại kính:**
   - CLEAR_8, CLEAR_10 - Kính trong
   - LOWE_8, LOWE_10 - Kính Low-E

## 🎨 Sử dụng trong Frontend

Khi thiết kế cửa, người dùng có thể:
1. Chọn từ kho mẫu có sẵn
2. Chỉnh sửa kích thước
3. Thay đổi hệ nhôm
4. Lưu thành mẫu mới (nếu cần)














































































