/**
 * Success Notification Component
 * Hiển thị thông báo thành công với dấu tích V xoay tròn màu xanh
 */

function showSuccessNotification(message, description = '', duration = 3000) {
    // Xóa thông báo cũ nếu có
    const existingNotification = document.querySelector('.success-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Tạo container
    const notification = document.createElement('div');
    notification.className = 'success-notification';

    // Tạo nội dung
    notification.innerHTML = `
        <button class="success-close" onclick="this.closest('.success-notification').remove()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <div class="success-notification-content">
            <div class="success-icon-container">
                <div class="success-checkmark-circle">
                    <div class="success-checkmark">
                        <svg viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
            </div>
            <div class="success-message">
                <div class="success-title">${escapeHtml(message)}</div>
                ${description ? `<div class="success-description">${escapeHtml(description)}</div>` : ''}
            </div>
        </div>
    `;

    // Thêm vào body
    document.body.appendChild(notification);

    // Tự động ẩn sau duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('hide');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    return notification;
}

// Helper function để escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export cho các module khác nếu cần
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showSuccessNotification };
}

