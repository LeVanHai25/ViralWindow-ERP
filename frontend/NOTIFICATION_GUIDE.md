# 📢 HỆ THỐNG THÔNG BÁO - NOTIFICATION SYSTEM

## 🎯 TỔNG QUAN

Hệ thống thông báo tự động cho ViralWindow - theo dõi mọi hoạt động quan trọng trong phần mềm.

## 📁 CẤU TRÚC FILES

```
FontEnd/
├── notifications.html          ✅ Trang xem tất cả thông báo
├── notification-manager.js     ✅ JavaScript library quản lý thông báo

backend/
├── controllers/
│   └── notificationController.js  ✅ API Controller
├── routes/
│   └── notifications.js           ✅ API Routes
└── services/
    └── notificationService.js     ✅ Service tạo thông báo tự động
```

## 🔔 CÁC LOẠI THÔNG BÁO

### 1. **🏗️ DỰ ÁN (Project)**
- ✅ Dự án mới được tạo
- ✅ Thiết kế hoàn thành
- ✅ BOM được tính toán
- ⏰ Dự án gần deadline
- 📊 Tiến độ cập nhật

### 2. **📄 BÁO GIÁ (Quotation)**
- ✅ Báo giá mới được tạo
- 📧 Báo giá đã gửi
- 🎉 Báo giá được chốt
- ❌ Báo giá bị từ chối
- ⏰ Báo giá hết hạn

### 3. **🏭 SẢN XUẤT (Production)**
- 🏭 Lệnh sản xuất mới
- ⚙️ Bắt đầu sản xuất
- ✅ Sản xuất hoàn thành
- ⚠️ Sản xuất trễ tiến độ

### 4. **📦 KHO HÀNG (Inventory)**
- 📤 Xuất kho thành công
- 📥 Nhập kho thành công
- ⚠️ Vật tư sắp hết
- 🚨 Vật tư hết hàng
- 📊 Kiểm kê kho

### 5. **💰 TÀI CHÍNH (Finance)**
- 💵 Phiếu thu mới
- 💸 Phiếu chi mới
- ⚠️ Công nợ quá hạn
- 💰 Công nợ sắp đến hạn
- 📊 Báo cáo tài chính

### 6. **⚙️ HỆ THỐNG (System)**
- 👤 Người dùng đăng nhập
- 📁 File được tải lên
- 🔄 Cập nhật hệ thống
- ⚠️ Lỗi hệ thống

## 🎨 MỨC ĐỘ ƯU TIÊN

| Mức độ | Icon | Màu sắc | Ý nghĩa |
|--------|------|---------|---------|
| `urgent` | 🚨 | Đỏ | Khẩn cấp - Cần xử lý ngay |
| `high` | ⚡ | Cam | Quan trọng - Ưu tiên cao |
| `normal` | 📢 | Xanh | Bình thường - Thông tin |

## 📊 TRANG NOTIFICATIONS.HTML

### **Tính năng:**

#### 1. **Thanh thống kê**
- 📊 Tổng thông báo
- 📬 Chưa đọc
- 📅 Hôm nay
- ⚡ Quan trọng

#### 2. **Bộ lọc**
- 🔵 Tất cả
- 📬 Chưa đọc
- 🏗️ Dự án
- 📄 Báo giá
- 🏭 Sản xuất
- 📦 Kho hàng
- 💰 Tài chính
- ⚙️ Hệ thống

#### 3. **Thao tác**
- ✓ Đánh dấu đã đọc tất cả
- 🗑️ Xóa đã đọc
- ❌ Xóa từng thông báo
- 👁️ Xem chi tiết (link)

#### 4. **Phân trang**
- 20 thông báo/trang
- Nút chuyển trang

## 🔧 API ENDPOINTS

```javascript
// Get all notifications
GET /api/notifications
Response: { success: true, data: [...], count: 10 }

// Get unread count
GET /api/notifications/unread
Response: { success: true, data: { count: 5 } }

// Mark as read
PUT /api/notifications/:id/read

// Mark all as read
PUT /api/notifications/mark-all-read

// Delete notification
DELETE /api/notifications/:id

// Delete all read
DELETE /api/notifications/delete-read

// Create notification
POST /api/notifications
Body: {
    type: 'project',
    title: 'Dự án mới',
    message: 'Chi tiết...',
    link: 'projects.html',
    icon: '🏗️',
    color: 'blue',
    priority: 'normal'
}
```

## 💻 CÁCH SỬ DỤNG

### **1. Include notification-manager.js**

```html
<script src="notification-manager.js"></script>
```

### **2. Tạo thông báo khi có sự kiện**

```javascript
// Khi tạo dự án mới
async function createProject() {
    const project = await saveProject();
    
    // Tạo thông báo
    await NotificationManager.projectCreated({
        id: project.id,
        name: project.name,
        customer_name: project.customer_name
    });
}

// Khi chốt báo giá
async function approveQuotation() {
    const quotation = await approveQuote();
    
    // Tạo thông báo
    await NotificationManager.quotationApproved({
        id: quotation.id,
        code: quotation.code
    });
}

// Khi vật tư sắp hết
async function checkInventory() {
    const lowStock = await getLowStockItems();
    
    lowStock.forEach(item => {
        NotificationManager.inventoryLowStock(
            item,
            item.current_stock,
            item.min_stock
        );
    });
}
```

### **3. Cập nhật badge số lượng**

```javascript
// Tự động cập nhật badge khi load trang
document.addEventListener('DOMContentLoaded', () => {
    if (window.NotificationManager) {
        NotificationManager.updateBadge();
    }
});

// Cập nhật sau khi tạo thông báo
await NotificationManager.projectCreated(project);
await NotificationManager.updateBadge(); // Cập nhật badge ngay
```

### **4. Link đến trang thông báo**

Trong dropdown notifications:

```html
<div class="p-2 border-t border-gray-200 text-center">
    <a href="notifications.html" class="text-sm text-blue-600 hover:text-blue-800">
        Xem tất cả thông báo
    </a>
</div>
```

## 🔌 TÍCH HỢP VÀO CÁC TRANG

### **projects.html - Tạo dự án**
```javascript
async function createProject(projectData) {
    const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
    });

    const result = await response.json();
    if (result.success) {
        // Tạo thông báo
        await NotificationManager.projectCreated({
            id: result.data.id,
            name: projectData.project_name,
            customer_name: projectData.customer_name
        });
        
        alert('Tạo dự án thành công!');
    }
}
```

### **design-new.html - Hoàn thành thiết kế**
```javascript
async function saveAndFinish() {
    const response = await fetch(`${API_BASE}/projects/${currentProject.id}/complete-design`, {
        method: 'POST'
    });

    if (response.ok) {
        // Tạo thông báo
        await NotificationManager.designCompleted({
            id: currentProject.id,
            name: currentProject.name
        });
        
        window.location.href = 'projects.html';
    }
}
```

### **sales.html - Chốt báo giá**
```javascript
async function approveQuotation(quotationId) {
    const response = await fetch(`${API_BASE}/quotations/${quotationId}/approve`, {
        method: 'PUT'
    });

    if (response.ok) {
        const result = await response.json();
        
        // Tạo thông báo
        await NotificationManager.quotationApproved({
            id: quotationId,
            code: result.data.code
        });
        
        alert('Chốt báo giá thành công!');
    }
}
```

### **warehouse-export.html - Xuất kho**
```javascript
async function createExport(exportData) {
    const response = await fetch(`${API_BASE}/warehouse-export`, {
        method: 'POST',
        body: JSON.stringify(exportData)
    });

    if (response.ok) {
        const result = await response.json();
        
        // Tạo thông báo
        await NotificationManager.warehouseExported({
            id: result.data.id,
            code: result.data.code,
            project_name: exportData.project_name
        });
    }
}
```

## 🎨 UI/UX

### **Dropdown Thông báo (Có sẵn trong header)**
- Icon chuông với badge đỏ hiển thị số lượng chưa đọc
- Click để xem 5 thông báo gần nhất
- Link "Xem tất cả" → `notifications.html`

### **Trang Notifications**
- Thanh thống kê 4 chỉ số
- Bộ lọc theo loại & trạng thái
- Danh sách thông báo với:
  - Icon màu sắc theo loại
  - Badge "Khẩn cấp" / "Quan trọng"
  - Chấm xanh nếu chưa đọc
  - Nút xóa từng thông báo
  - Link xem chi tiết
  - Thời gian (vừa xong, 5 phút trước, hôm qua...)

### **Màu sắc theo loại:**
| Loại | Icon | Màu nền | Ý nghĩa |
|------|------|---------|---------|
| 🏗️ Project | 🏗️ | Xanh dương | Dự án |
| 📄 Quotation | 📄 | Vàng | Báo giá |
| 🏭 Production | 🏭 | Tím | Sản xuất |
| 📦 Inventory | 📦 | Cam/Đỏ | Kho hàng |
| 💰 Finance | 💰 | Xanh lá/Đỏ | Tài chính |
| ⚙️ System | ⚙️ | Xám | Hệ thống |

## 🚀 CÁCH TEST

### **1. Mở trang thông báo**
```
http://localhost:5500/notifications.html
```

### **2. Xem demo notifications**
- Trang sẽ tự động load 7 thông báo mẫu
- Thử lọc theo loại
- Thử xóa thông báo
- Thử đánh dấu đã đọc

### **3. Tích hợp thực tế**
- Tạo dự án mới → Kiểm tra thông báo
- Upload file → Kiểm tra thông báo
- Xuất kho → Kiểm tra thông báo

### **4. Badge cập nhật**
- Badge số ở icon chuông cập nhật real-time
- Auto refresh mỗi 30 giây
- Click "Xem tất cả" để mở trang notifications

## 🔄 AUTO-REFRESH

Trang notifications.html tự động refresh mỗi 30 giây:

```javascript
setInterval(loadNotifications, 30000);
```

## 📝 VÍ DỤ NOTIFICATIONS

### **Dự án mới**
```
🏗️ Dự án mới được tạo
Dự án "Nhà S10-Anh Triệu" vừa được tạo cho khách hàng "Anh Triệu"
Vừa xong
```

### **Vật tư sắp hết**
```
⚠️ Vật tư sắp hết
Thanh nhôm Y6501 còn 5 cây, dưới mức tối thiểu (20 cây)
🚨 Khẩn cấp | 2 giờ trước
```

### **Báo giá được chốt**
```
🎉 Báo giá được chốt
Báo giá "BG2025-001" đã được khách hàng "Công ty ABC" chấp nhận
⚡ Quan trọng | 5 phút trước
```

## 🎯 CÁC SỰ KIỆN TỰ ĐỘNG TẠO THÔNG BÁO

| Sự kiện | Trigger | File |
|---------|---------|------|
| Tạo dự án mới | `POST /api/projects` | projects.html |
| Hoàn thành thiết kế | Click "Hoàn thành" | design-new.html |
| Bóc tách BOM | Click "Bóc tách BOM" | design-new.html |
| Tạo báo giá | `POST /api/quotations` | sales.html |
| Chốt báo giá | Click "Chốt báo giá" | quotation-new.html |
| Tạo LSX | Click "Tạo LSX" | production.html |
| Xuất kho | Click "Lưu phiếu" | warehouse-export-form.html |
| Thu tiền | `POST /api/finance/receipts` | finance-receipts.html |
| Chi tiền | `POST /api/finance/payments` | finance-payments.html |
| Vật tư < min | Auto check | Scheduled job |
| Công nợ quá hạn | Auto check | Scheduled job |
| Upload file | After upload | design-new.html |

## 🔐 BẢO MẬT

- Thông báo có thể gán cho user cụ thể (`user_id`)
- hoặc broadcast cho tất cả (`user_id = NULL`)
- Middleware `authenticateToken` bảo vệ endpoints

## 🐛 TROUBLESHOOTING

### **Badge không hiển thị số**
✅ Kiểm tra `notification-manager.js` đã load
✅ Gọi `NotificationManager.updateBadge()`
✅ Kiểm tra API `/notifications/unread`

### **Thông báo không tạo**
✅ Kiểm tra backend đang chạy
✅ Xem Console có lỗi không
✅ Kiểm tra database table `notifications`

### **Dropdown thông báo trống**
✅ Thêm link đến `notifications.html`
✅ Kiểm tra element ID `notificationsList`

## 📞 HỖ TRỢ

Xem thêm:
- `backend/services/notificationService.js` - Backend service
- `FontEnd/notification-manager.js` - Frontend library
- `backend/controllers/notificationController.js` - API controller

## 🎉 HOÀN THÀNH!

Bây giờ bạn có:
✅ Hệ thống thông báo hoàn chỉnh
✅ Trang xem tất cả thông báo
✅ API đầy đủ
✅ Tự động tạo thông báo cho các sự kiện
✅ Badge real-time
✅ Phân loại và lọc thông báo

**Test ngay tại:** `http://localhost:5500/notifications.html` 🚀





