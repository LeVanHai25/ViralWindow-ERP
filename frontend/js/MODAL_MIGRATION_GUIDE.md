# VWModal System - Hướng dẫn sử dụng

Hệ thống Modal Dialog chuyên nghiệp thay thế các hộp thoại mặc định của trình duyệt.

## ✅ Đã hoàn thành

1. **Tất cả 56 file HTML** đã được thêm `modal-system.js`
2. **Tất cả `if(confirm())` patterns** đã được convert sang async pattern
3. **Native `alert()` và `confirm()`** đã được tự động override

## Cách sử dụng

### 1. Alert - Thông báo

```javascript
// Cách cũ
alert('Hello World');

// Cách mới (tự động detect loại)
alert('Thành công!');     // → VWModal.success()
alert('Lỗi: ...');        // → VWModal.error()
alert('Cảnh báo: ...');   // → VWModal.warning()
alert('Thông báo khác');  // → VWModal.alert()

// Hoặc gọi trực tiếp
VWModal.success('Lưu thành công!');
VWModal.error('Có lỗi xảy ra');
VWModal.warning('Vui lòng kiểm tra lại');
VWModal.alert('Tiêu đề', 'Nội dung thông báo');
```

### 2. Confirm - Xác nhận

```javascript
// Cách mới với async/await
async function deleteItem(id) {
    const confirmed = await VWModal.confirm('Xác nhận xóa', 'Bạn có chắc muốn xóa?');
    if (confirmed) {
        // Xóa item
    }
}

// Cách mới với .then()
function deleteItem(id) {
    VWModal.confirm('Xác nhận xóa', 'Bạn có chắc muốn xóa?').then(confirmed => {
        if (confirmed) {
            // Xóa item
        }
    });
}

// Custom button text
VWModal.confirm('Xóa dự án', 'Bạn chắc chắn?', {
    confirmText: 'Xóa',
    cancelText: 'Hủy bỏ'
});
```

### 3. Prompt - Nhập liệu

```javascript
const reason = await VWModal.prompt('Nhập lý do', 'Vui lòng nhập lý do hủy đơn:');
if (reason) {
    console.log('Lý do:', reason);
}
```

### 4. Data Attribute (cho HTML inline)

```html
<!-- Tự động hiện confirm dialog -->
<button data-confirm="Bạn có chắc muốn xóa?" data-onconfirm="deleteItem(1)">
    Xóa
</button>
```

## API Reference

| Method | Mô tả | Return |
|--------|-------|--------|
| `VWModal.alert(title, message)` | Hiển thị thông báo | Promise |
| `VWModal.success(message, title?)` | Thông báo thành công | Promise |
| `VWModal.error(message, title?)` | Thông báo lỗi | Promise |
| `VWModal.warning(message, title?)` | Cảnh báo | Promise |
| `VWModal.confirm(title, message, options?)` | Xác nhận | Promise<boolean> |
| `VWModal.prompt(title, message, placeholder?)` | Nhập liệu | Promise<string\|false> |

## Helper Functions

```javascript
// Confirm với callback
vwConfirmWrap('Bạn có chắc?', () => deleteItem(1));

// Confirm xóa
vwConfirmDelete(() => deleteItem(1), 'Xóa item này?');

// Confirm action cho onclick
vwConfirmAction(this, 'Xác nhận?', () => doAction());
```

## Lưu ý

1. Native `confirm()` giờ trả về **Promise** thay vì boolean
2. Cần dùng `async/await` hoặc `.then()` để xử lý kết quả
3. Hệ thống tự động detect loại thông báo dựa trên nội dung message
