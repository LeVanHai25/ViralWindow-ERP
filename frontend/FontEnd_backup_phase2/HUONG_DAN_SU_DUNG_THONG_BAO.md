# 📢 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG THÔNG BÁO

## 🎯 MỤC ĐÍCH

Hệ thống thông báo giúp bạn:
- ✅ Theo dõi tất cả hoạt động trong phần mềm
- ✅ Không bỏ lỡ công việc quan trọng
- ✅ Nhận cảnh báo khi có vấn đề (vật tư hết, công nợ quá hạn...)
- ✅ Quản lý workflow hiệu quả

---

## 📱 CÁCH XEM THÔNG BÁO

### **Cách 1: Dropdown nhanh (Ở tất cả các trang)**

1. Nhìn lên góc phải màn hình
2. Thấy icon chuông 🔔
3. Click vào icon chuông
4. Dropdown hiện ra với:
   - 📬 **Badge đỏ**: Số thông báo chưa đọc (vd: 5)
   - 📋 **Danh sách**: 10 thông báo gần nhất
   - 🔗 **Link**: "📋 Xem tất cả thông báo"

**Ví dụ:**
```
🔔 [5]  ← Click vào đây
  ↓
┌────────────────────────────┐
│ Thông báo                  │
├────────────────────────────┤
│ 🏗️ Dự án mới được tạo     │
│ Dự án "Nhà S10"...         │
│ Vừa xong                   │
├────────────────────────────┤
│ ⚠️ Vật tư sắp hết          │
│ Y6501 còn 5 cây...         │
│ 2 giờ trước                │
├────────────────────────────┤
│ 📋 Xem tất cả thông báo    │
└────────────────────────────┘
```

### **Cách 2: Trang xem tất cả (Chi tiết)**

1. Click "📋 Xem tất cả thông báo" trong dropdown
2. Hoặc mở trực tiếp: `http://localhost:5500/notifications.html`
3. Xem tất cả thông báo với đầy đủ chức năng

---

## 🎨 GIAO DIỆN TRANG THÔNG BÁO

### **Phần 1: HEADER**
```
← Quay lại | Thông báo | ✓ Đánh dấu đã đọc tất cả | 🗑️ Xóa đã đọc
```

### **Phần 2: THỐNG KÊ**
```
┌─────────┬─────────┬─────────┬─────────┐
│ Tổng    │ Chưa    │ Hôm nay │ Quan    │
│ 15      │ đọc: 5  │ 3       │ trọng: 2│
└─────────┴─────────┴─────────┴─────────┘
```

### **Phần 3: BỘ LỌC**
```
[Tất cả] [Chưa đọc] [Dự án] [Báo giá] [Sản xuất] [Kho] [Tài chính] [Hệ thống]
```

### **Phần 4: DANH SÁCH THÔNG BÁO**
```
┌──────────────────────────────────────────┐
│ 🏗️ [●] Dự án mới được tạo          [X]  │
│ Dự án "Nhà S10-Anh Triệu" vừa được tạo  │
│ Vừa xong                    Xem chi tiết →│
├──────────────────────────────────────────┤
│ ⚠️ 🚨 Vật tư sắp hết              [X]    │
│ Y6501 còn 5 cây, dưới mức tối thiểu     │
│ 2 giờ trước                 Xem chi tiết →│
└──────────────────────────────────────────┘
```

**Giải thích:**
- 🏗️ = Icon loại thông báo
- [●] = Chấm xanh (chưa đọc)
- 🚨 = Badge ưu tiên (Khẩn cấp/Quan trọng)
- [X] = Nút xóa
- Xem chi tiết → = Link đến trang liên quan

---

## 🔔 CÁC LOẠI THÔNG BÁO

### **1. 🏗️ DỰ ÁN (Màu xanh dương)**

#### **Khi nào xuất hiện:**
- ✅ Tạo dự án mới (ở trang `projects.html`)
- ✅ Hoàn thành thiết kế (ở trang `design-new.html`)
- ✅ Bóc tách BOM (ở trang `design-new.html`)
- ⏰ Dự án gần deadline (tự động kiểm tra)

#### **Ví dụ:**
```
🏗️ Dự án mới được tạo
Dự án "Nhà S10-Anh Triệu" vừa được tạo cho khách hàng "Anh Triệu"
Vừa xong | Xem chi tiết →
```

### **2. 📄 BÁO GIÁ (Màu vàng)**

#### **Khi nào xuất hiện:**
- 📄 Tạo báo giá mới (ở trang `sales.html`)
- 📧 Gửi báo giá cho khách (ở trang `quotation-new.html`)
- 🎉 Khách chốt báo giá (ở trang `quotation-new.html`)

#### **Ví dụ:**
```
🎉 Báo giá được chốt
⚡ Quan trọng
Báo giá "BG2025-001" đã được khách hàng "Công ty ABC" chấp nhận
5 phút trước | Xem chi tiết →
```

### **3. 🏭 SẢN XUẤT (Màu tím)**

#### **Khi nào xuất hiện:**
- 🏭 Tạo lệnh sản xuất mới (ở trang `production.html`)
- ⚙️ Bắt đầu sản xuất
- ✅ Hoàn thành sản xuất

#### **Ví dụ:**
```
✅ Sản xuất hoàn thành
LSX "LSX-2025-001" đã hoàn thành 100%, sẵn sàng lắp đặt
1 giờ trước | Xem chi tiết →
```

### **4. 📦 KHO HÀNG (Màu cam/đỏ)**

#### **Khi nào xuất hiện:**
- ⚠️ Vật tư < mức tối thiểu (tự động kiểm tra)
- 🚨 Vật tư hết hàng (tự động kiểm tra)
- 📤 Xuất kho thành công (ở trang `warehouse-export-form.html`)
- 📥 Nhập kho thành công

#### **Ví dụ:**
```
⚠️ Vật tư sắp hết
🚨 Khẩn cấp
Thanh nhôm Y6501 còn 5 cây, dưới mức tối thiểu (20 cây)
2 giờ trước | Xem chi tiết →
```

### **5. 💰 TÀI CHÍNH (Màu xanh lá/đỏ)**

#### **Khi nào xuất hiện:**
- 💵 Thu tiền (ở trang `finance-receipts.html`)
- 💸 Chi tiền (ở trang `finance-payments.html`)
- 💰 Công nợ quá hạn (tự động kiểm tra)

#### **Ví dụ:**
```
💰 Công nợ quá hạn
🚨 Khẩn cấp
Khách hàng "Công ty ABC" có khoản nợ 50.000.000đ quá hạn 7 ngày
Hôm qua | Xem chi tiết →
```

### **6. ⚙️ HỆ THỐNG (Màu xám)**

#### **Khi nào xuất hiện:**
- 📁 Upload file thành công (ở trang `design-new.html`)
- 👤 Người dùng đăng nhập
- 🔄 Cập nhật hệ thống

---

## 🎬 WORKFLOW SỬ DỤNG

### **Kịch bản 1: Tạo dự án mới**

```
Bước 1: Vào trang projects.html
Bước 2: Click "Tạo dự án mới"
Bước 3: Điền thông tin, click "Lưu"
Bước 4: Hệ thống tự động tạo thông báo
   ↓
🔔 Badge chuyển từ [0] → [1]
   ↓
Click icon chuông
   ↓
Thấy: "🏗️ Dự án mới được tạo"
```

### **Kịch bản 2: Vật tư sắp hết**

```
Hệ thống tự động check (mỗi giờ)
   ↓
Phát hiện: Y6501 còn 5 cây (min: 20)
   ↓
Tự động tạo thông báo "⚠️ Vật tư sắp hết"
   ↓
🔔 Badge [5] → [6]
   ↓
User thấy thông báo
   ↓
Click "Xem chi tiết" → Đến trang inventory.html
   ↓
Nhập kho thêm vật tư
```

### **Kịch bản 3: Quản lý thông báo**

```
Vào notifications.html
   ↓
Thấy 15 thông báo (5 chưa đọc)
   ↓
Click lọc "Chưa đọc" → Chỉ thấy 5
   ↓
Click vào thông báo → Tự động đánh dấu đã đọc
   ↓
Click "🗑️ Xóa đã đọc" → Xóa 10 thông báo đã đọc
   ↓
Còn lại 5 thông báo chưa đọc
```

---

## 🎯 CÁC THAO TÁC

### **1. Xem thông báo**
- **Click vào thông báo** → Tự động đánh dấu đã đọc + Chuyển đến trang liên quan
- Thông báo chưa đọc: Nền xanh nhạt, có chấm xanh
- Thông báo đã đọc: Nền trắng, mờ hơn

### **2. Đánh dấu đã đọc**
- **Tự động**: Click vào thông báo
- **Thủ công**: Click nút "✓ Đánh dấu đã đọc tất cả"
- Badge số sẽ giảm xuống

### **3. Xóa thông báo**
- **Xóa 1**: Click nút [X] bên phải thông báo
- **Xóa nhiều**: Click "🗑️ Xóa đã đọc" (xóa tất cả thông báo đã đọc)
- Confirm trước khi xóa

### **4. Lọc thông báo**
Click vào các nút lọc:
- **Tất cả**: Hiển thị tất cả (mặc định)
- **Chưa đọc**: Chỉ thông báo chưa đọc
- **Dự án**: Chỉ thông báo về dự án
- **Báo giá**: Chỉ thông báo về báo giá
- ...và các loại khác

### **5. Xem chi tiết**
- Click link "Xem chi tiết →" ở cuối thông báo
- Chuyển đến trang liên quan (vd: projects.html, quotation-new.html...)

---

## 🔔 MỨC ĐỘ ƯU TIÊN

### **🚨 KHẨN CẤP (Urgent)**
- Badge màu đỏ: "🚨 Khẩn cấp"
- Cần xử lý NGAY LẬP TỨC
- Ví dụ:
  - Vật tư hết hàng
  - Công nợ quá hạn
  - Dự án quá deadline

### **⚡ QUAN TRỌNG (High)**
- Badge màu cam: "⚡ Quan trọng"
- Ưu tiên cao, xử lý trong ngày
- Ví dụ:
  - Báo giá được chốt
  - Sản xuất hoàn thành
  - Vật tư sắp hết

### **📢 BÌNH THƯỜNG (Normal)**
- Không có badge
- Thông tin chung
- Ví dụ:
  - Dự án mới tạo
  - File được upload
  - Người dùng đăng nhập

---

## 📊 THANH THỐNG KÊ

### **Tổng thông báo**
- Tổng số thông báo trong hệ thống
- Bao gồm cả đã đọc và chưa đọc

### **Chưa đọc**
- Số thông báo bạn chưa xem
- Màu xanh dương
- **Quan trọng**: Cần check thường xuyên

### **Hôm nay**
- Số thông báo được tạo hôm nay
- Giúp theo dõi hoạt động trong ngày

### **Quan trọng**
- Số thông báo có mức độ "Khẩn cấp" hoặc "Quan trọng"
- Màu đỏ
- **Cần xử lý ưu tiên**

---

## 💡 MẸO SỬ DỤNG

### **Mẹo 1: Check thông báo thường xuyên**
```
Mỗi sáng: Check thông báo "Hôm nay" và "Quan trọng"
Mỗi giờ: Nhìn badge 🔔 [5] để biết có thông báo mới
Mỗi tối: Xóa thông báo đã đọc để giữ gọn
```

### **Mẹo 2: Dùng bộ lọc hiệu quả**
```
Làm việc với dự án? → Lọc "Dự án"
Làm việc với kho? → Lọc "Kho hàng"
Muốn xem urgent? → Lọc "Chưa đọc" + Tìm badge 🚨
```

### **Mẹo 3: Xóa thông báo cũ**
```
1 tuần 1 lần: Click "🗑️ Xóa đã đọc"
→ Giữ hệ thống gọn gàng
```

### **Mẹo 4: Link nhanh**
```
Thay vì vào trang rồi tìm dự án
→ Click "Xem chi tiết" trong thông báo
→ Đến ngay trang đó
```

---

## 🎯 CÁC TÌNH HUỐNG CỤ THỂ

### **Tình huống 1: Nhận thông báo "Vật tư sắp hết"**

**Bước 1:** Thấy badge 🔔 [3]
```
→ Click icon chuông
→ Thấy: "⚠️ Vật tư sắp hết - Y6501 còn 5 cây"
```

**Bước 2:** Click "Xem chi tiết"
```
→ Chuyển đến trang inventory.html
→ Tìm vật tư Y6501
```

**Bước 3:** Xử lý
```
→ Tạo phiếu đặt hàng
→ Hoặc chuyển vật tư từ kho khác
```

**Bước 4:** Quay lại notifications
```
→ Click nút [X] để xóa thông báo
→ Hoặc để đấy, tự động đánh dấu đã đọc
```

### **Tình huống 2: Nhận thông báo "Báo giá được chốt"**

**Bước 1:** Dropdown hiện
```
🎉 Báo giá được chốt
⚡ Quan trọng
Báo giá "BG2025-001" đã được khách hàng chấp nhận
```

**Bước 2:** Click vào thông báo
```
→ Tự động đánh dấu đã đọc
→ Chuyển đến quotation-new.html
→ Xem chi tiết báo giá
```

**Bước 3:** Hành động tiếp theo
```
→ Tạo lệnh sản xuất
→ Hoặc chuyển sang giai đoạn thiết kế
```

### **Tình huống 3: Công nợ quá hạn**

**Bước 1:** Nhận thông báo khẩn cấp
```
💰 Công nợ quá hạn
🚨 Khẩn cấp
Khách hàng "Công ty ABC" có khoản nợ 50.000.000đ quá hạn 7 ngày
```

**Bước 2:** Click "Xem chi tiết"
```
→ Đến finance-debt.html
→ Xem chi tiết công nợ
```

**Bước 3:** Xử lý
```
→ Gọi điện nhắc nợ
→ Hoặc tạo phiếu thu
```

---

## 🚀 CÁCH TẠO THÔNG BÁO (CHO DEVELOPERS)

### **Bước 1: Include library**
```html
<script src="notification-manager.js"></script>
```

### **Bước 2: Gọi function khi có sự kiện**

#### **Ví dụ 1: Sau khi tạo dự án**
```javascript
async function saveProject() {
    const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
    });

    const result = await response.json();
    
    if (result.success) {
        // ✅ TẠO THÔNG BÁO
        await NotificationManager.projectCreated({
            id: result.data.id,
            name: projectData.project_name,
            customer_name: projectData.customer_name
        });
        
        alert('Tạo dự án thành công!');
    }
}
```

#### **Ví dụ 2: Sau khi upload file**
```javascript
async function openDesignUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        
        // Upload file...
        const uploaded = await uploadFile(file);
        
        if (uploaded.success) {
            // ✅ TẠO THÔNG BÁO
            await NotificationManager.fileUploaded(
                file.name,
                currentProject.name
            );
        }
    };
    input.click();
}
```

#### **Ví dụ 3: Sau khi chốt báo giá**
```javascript
async function approveQuotation(quotationId) {
    const response = await fetch(`${API_BASE}/quotations/${quotationId}/approve`, {
        method: 'PUT'
    });

    if (response.ok) {
        const result = await response.json();
        
        // ✅ TẠO THÔNG BÁO
        await NotificationManager.quotationApproved({
            id: quotationId,
            code: result.data.quotation_code
        });
        
        alert('Chốt báo giá thành công!');
    }
}
```

---

## 🔄 AUTO-REFRESH

### **Dropdown (Header):**
- Không tự động refresh
- Chỉ load khi click vào icon chuông

### **Trang notifications.html:**
- **Auto-refresh mỗi 30 giây**
- Tự động cập nhật danh sách
- Badge cập nhật real-time

---

## 🎨 MÀU SẮC & BIỂU TƯỢNG

### **Màu nền:**
| Loại | Màu nền (chưa đọc) | Màu nền (đã đọc) |
|------|-------------------|------------------|
| Tất cả | Xanh nhạt | Trắng mờ |
| Project | `bg-blue-50` | `bg-white` |
| Quotation | `bg-yellow-50` | `bg-white` |
| Production | `bg-purple-50` | `bg-white` |
| Inventory | `bg-orange-50` | `bg-white` |
| Finance | `bg-green-50` | `bg-white` |

### **Icon:**
| Loại | Icon | Size |
|------|------|------|
| Notification | 🏗️📄🏭📦💰⚙️ | 24px |
| Badge | 🚨⚡ | 16px |
| Badge số | [5] | 20px |

---

## 📝 CHECKLIST HÀNG NGÀY

### **Mỗi sáng (8:00 AM):**
- [ ] Check badge 🔔 [?]
- [ ] Mở notifications.html
- [ ] Lọc "Quan trọng" + "Khẩn cấp"
- [ ] Xử lý các thông báo urgent
- [ ] Lọc "Hôm nay" để xem hoạt động

### **Mỗi trưa (12:00 PM):**
- [ ] Check badge 🔔 [?]
- [ ] Xem thông báo mới
- [ ] Đánh dấu đã đọc

### **Mỗi tối (6:00 PM):**
- [ ] Xem lại "Quan trọng"
- [ ] Đánh dấu tất cả đã đọc
- [ ] Xóa thông báo đã đọc (giữ gọn)

### **Mỗi tuần (Thứ 2):**
- [ ] Xem lại thống kê tuần
- [ ] Xóa hết thông báo cũ (> 7 ngày)

---

## 🐛 XỬ LÝ LỖI

### **Lỗi: Badge không hiển thị**
**Nguyên nhân:** JavaScript chưa load
**Giải pháp:** 
- F5 reload trang
- Check Console (F12) xem lỗi
- Kiểm tra `notification-manager.js` đã load chưa

### **Lỗi: Thông báo trống**
**Nguyên nhân:** Backend chưa chạy hoặc không có data
**Giải pháp:**
- Kiểm tra backend: `node server.js`
- Trang sẽ tự động load demo data nếu API lỗi

### **Lỗi: Không xóa được**
**Nguyên nhân:** API endpoint lỗi
**Giải pháp:**
- Check Console (F12)
- Kiểm tra backend logs
- Thử reload trang

---

## 📞 CÂU HỎI THƯỜNG GẶP

### **Q: Thông báo có bị mất không?**
A: Không. Thông báo lưu trong database, chỉ mất khi bạn xóa.

### **Q: Tối đa bao nhiêu thông báo?**
A: Không giới hạn. Nhưng nên xóa thông báo cũ (> 1 tháng) để giữ performance.

### **Q: Badge có update tự động không?**
A: Có. Update mỗi 30 giây và ngay khi có thông báo mới.

### **Q: Có thể tắt thông báo không?**
A: Hiện tại chưa có. Nhưng bạn có thể "Đánh dấu đã đọc tất cả" để badge = 0.

### **Q: Thông báo cũ lưu bao lâu?**
A: Vĩnh viễn cho đến khi bạn xóa. Nên xóa thông báo > 1 tháng.

### **Q: Có thể search thông báo không?**
A: Hiện tại chưa có. Dùng bộ lọc theo loại để tìm nhanh.

---

## 🎓 VIDEO HƯỚNG DẪN (Text)

### **Video 1: Xem thông báo cơ bản (1 phút)**
```
00:00 - Click icon chuông 🔔
00:05 - Dropdown hiện ra với 10 thông báo
00:10 - Scroll xem các thông báo
00:15 - Click "Xem tất cả" → Mở notifications.html
00:20 - Thấy trang với đầy đủ thông báo
00:25 - Click lọc "Dự án" → Chỉ thấy thông báo dự án
00:35 - Click lọc "Chưa đọc" → Chỉ thấy chưa đọc
00:45 - Click vào thông báo → Đánh dấu đã đọc, chuyển trang
00:55 - Quay lại → Thông báo đã mờ
01:00 - Kết thúc
```

### **Video 2: Quản lý thông báo (2 phút)**
```
00:00 - Mở notifications.html
00:05 - Thống kê: 15 tổng, 5 chưa đọc, 2 quan trọng
00:15 - Click "✓ Đánh dấu đã đọc tất cả"
00:20 - Badge [5] → [0]
00:25 - Click "🗑️ Xóa đã đọc"
00:30 - Confirm "Xóa 10 thông báo?"
00:35 - Click "OK"
00:40 - Còn lại 5 thông báo
00:50 - Click nút [X] xóa từng thông báo
01:00 - Confirm → Thông báo biến mất
01:10 - Lọc theo "Kho hàng"
01:20 - Thấy thông báo "Vật tư sắp hết"
01:30 - Click "Xem chi tiết" → Đến inventory.html
01:40 - Xử lý vấn đề vật tư
01:50 - Quay lại notifications
02:00 - Kết thúc
```

---

## 🎉 KẾT LUẬN

Hệ thống thông báo giúp bạn:

✅ **Không bỏ lỡ công việc quan trọng**
- Dự án mới, báo giá chốt, sản xuất xong...

✅ **Phát hiện vấn đề sớm**
- Vật tư hết, công nợ quá hạn, deadline gần...

✅ **Quản lý workflow hiệu quả**
- Theo dõi tiến độ mọi hoạt động

✅ **Tiết kiệm thời gian**
- Link nhanh đến trang liên quan
- Lọc thông báo dễ dàng

---

## 📚 TÀI LIỆU LIÊN QUAN

- `NOTIFICATION_GUIDE.md` - Hướng dẫn kỹ thuật cho developer
- `NOTIFICATION_SUMMARY.md` - Tổng kết hệ thống
- `notification-manager.js` - Source code library

---

## 🚀 BẮT ĐẦU SỬ DỤNG

**Bước 1:** Mở trang notifications
```
http://localhost:5500/notifications.html
```

**Bước 2:** Xem demo data (7 thông báo mẫu)

**Bước 3:** Thử các tính năng:
- Lọc theo loại
- Click vào thông báo
- Xóa thông báo
- Đánh dấu đã đọc

**Bước 4:** Quay trang chủ → Check badge 🔔

**Bước 5:** Bắt đầu làm việc, hệ thống sẽ tự động tạo thông báo!

---

**Chúc bạn sử dụng hiệu quả! 🎊**

Có thắc mắc? Hỏi tôi bất cứ lúc nào! 😊





