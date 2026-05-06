/**
 * AUTH SYNC GUARD - Must run before everything else
 * Synchronizes Remember Me token from localStorage to sessionStorage
 * This runs inline (synchronous) to ensure auth state is available
 * before any page script checks authentication.
 */
;(function _authSyncGuard() {
    if (window.__authSyncDone) return;
    window.__authSyncDone = true;
    try {
        var localToken = localStorage.getItem('token');
        var sessionToken = sessionStorage.getItem('token');
        if (localToken && !sessionToken) {
            sessionStorage.setItem('token', localToken);
            var localUser = localStorage.getItem('user');
            if (localUser) sessionStorage.setItem('user', localUser);
        }
    } catch(e) {}
})();

/**
 * RESPONSIVE MOBILE LOADER
 * Injects responsive-mobile.js (sidebar toggle, table wrap, swipe gestures)
 * after DOM is ready. Idempotent — won't load twice.
 */
;(function _responsiveLoader() {
    if (window.__vwResponsiveLoaded) return;
    window.__vwResponsiveLoaded = true;
    function loadResponsive() {
        if (document.getElementById('vw-responsive-script')) return;
        var s = document.createElement('script');
        s.id = 'vw-responsive-script';
        // Resolve relative path based on current page depth
        var pathDepth = (window.location.pathname.match(/\//g) || []).length - 1;
        var prefix = pathDepth > 1 ? '../'.repeat(pathDepth - 1) : '';
        s.src = prefix + 'js/responsive-mobile.js';
        s.async = true;
        document.head.appendChild(s);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadResponsive);
    } else {
        loadResponsive();
    }
})();

/**
 * MODAL SYSTEM - ViralWindow
 * Thay thế alert(), confirm() bằng Modal đẹp
 * 
 * Sử dụng:
 * - VWModal.alert('Thông báo', 'Nội dung thông báo');
 * - VWModal.confirm('Xác nhận', 'Bạn có chắc chắn?').then(result => { if(result) {...} });
 * - VWModal.success('Thành công!');
 * - VWModal.error('Có lỗi xảy ra');
 * - VWModal.warning('Cảnh báo!');
 */

(function () {
    'use strict';

    // Inject CSS
    const modalStyles = `
        /* Modal Overlay */
        .vw-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .vw-modal-overlay.show {
            opacity: 1;
            visibility: visible;
        }

        /* Modal Container */
        .vw-modal {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 420px;
            width: 90%;
            transform: scale(0.9) translateY(20px);
            transition: all 0.3s ease;
            overflow: hidden;
        }

        .vw-modal-overlay.show .vw-modal {
            transform: scale(1) translateY(0);
        }

        /* Modal Header */
        .vw-modal-header {
            padding: 24px 24px 16px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .vw-modal-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .vw-modal-icon svg {
            width: 24px;
            height: 24px;
        }

        .vw-modal-icon.info {
            background: linear-gradient(135deg, #dbeafe, #bfdbfe);
        }
        .vw-modal-icon.info svg {
            color: #2563eb;
        }

        .vw-modal-icon.success {
            background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        }
        .vw-modal-icon.success svg {
            color: #059669;
        }

        .vw-modal-icon.warning {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
        }
        .vw-modal-icon.warning svg {
            color: #d97706;
        }

        .vw-modal-icon.error {
            background: linear-gradient(135deg, #fee2e2, #fecaca);
        }
        .vw-modal-icon.error svg {
            color: #dc2626;
        }

        .vw-modal-icon.confirm {
            background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
        }
        .vw-modal-icon.confirm svg {
            color: #4f46e5;
        }

        .vw-modal-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
        }

        /* Modal Body */
        .vw-modal-body {
            padding: 0 24px 24px;
            color: #4b5563;
            font-size: 15px;
            line-height: 1.6;
        }

        /* Modal Footer */
        .vw-modal-footer {
            padding: 16px 24px;
            background: #f9fafb;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        /* Buttons */
        .vw-modal-btn {
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .vw-modal-btn:hover {
            transform: translateY(-1px);
        }

        .vw-modal-btn:active {
            transform: translateY(0);
        }

        .vw-modal-btn-primary {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .vw-modal-btn-primary:hover {
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        .vw-modal-btn-success {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .vw-modal-btn-danger {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .vw-modal-btn-secondary {
            background: white;
            color: #4b5563;
            border: 1px solid #d1d5db;
        }

        .vw-modal-btn-secondary:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
        }

        /* Input for prompt */
        .vw-modal-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 15px;
            margin-top: 12px;
            transition: all 0.2s ease;
        }

        .vw-modal-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Animation */
        @keyframes vw-modal-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        .vw-modal-shake {
            animation: vw-modal-shake 0.3s ease;
        }
    `;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = modalStyles;
    document.head.appendChild(styleEl);

    // Icons SVG
    const ICONS = {
        info: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`,
        success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`,
        confirm: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`
    };

    // Modal Class
    class VWModal {
        constructor() {
            this.overlay = null;
            this.modal = null;
            this.resolvePromise = null;
        }

        createModal(options) {
            const {
                type = 'info',
                title = 'Thông báo',
                message = '',
                confirmText = 'OK',
                cancelText = 'Huỷ',
                showCancel = false,
                inputPlaceholder = '',
                showInput = false
            } = options;

            // Remove existing modal
            this.close();

            // Create overlay
            this.overlay = document.createElement('div');
            this.overlay.className = 'vw-modal-overlay';
            this.overlay.innerHTML = `
                <div class="vw-modal">
                    <div class="vw-modal-header">
                        <div class="vw-modal-icon ${type}">
                            ${ICONS[type] || ICONS.info}
                        </div>
                        <h3 class="vw-modal-title">${title}</h3>
                    </div>
                    <div class="vw-modal-body">
                        ${message}
                        ${showInput ? `<input type="text" class="vw-modal-input" placeholder="${inputPlaceholder}" autofocus>` : ''}
                    </div>
                    <div class="vw-modal-footer">
                        ${showCancel ? `<button class="vw-modal-btn vw-modal-btn-secondary" data-action="cancel">${cancelText}</button>` : ''}
                        <button class="vw-modal-btn vw-modal-btn-primary" data-action="confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(this.overlay);

            // Focus input if exists
            const input = this.overlay.querySelector('.vw-modal-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }

            // Show with animation
            requestAnimationFrame(() => {
                this.overlay.classList.add('show');
            });

            // Event listeners
            return new Promise((resolve) => {
                this.resolvePromise = resolve;

                const confirmBtn = this.overlay.querySelector('[data-action="confirm"]');
                const cancelBtn = this.overlay.querySelector('[data-action="cancel"]');

                confirmBtn.addEventListener('click', () => {
                    const inputValue = input ? input.value : true;
                    this.close();
                    resolve(inputValue);
                });

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        this.close();
                        resolve(false);
                    });
                }

                // Close on overlay click
                this.overlay.addEventListener('click', (e) => {
                    if (e.target === this.overlay) {
                        this.close();
                        resolve(showCancel ? false : true);
                    }
                });

                // Enter key to confirm, Escape to cancel
                const handleKeydown = (e) => {
                    if (e.key === 'Enter') {
                        const inputValue = input ? input.value : true;
                        this.close();
                        resolve(inputValue);
                        document.removeEventListener('keydown', handleKeydown);
                    } else if (e.key === 'Escape' && showCancel) {
                        this.close();
                        resolve(false);
                        document.removeEventListener('keydown', handleKeydown);
                    }
                };
                document.addEventListener('keydown', handleKeydown);
            });
        }

        close() {
            if (this.overlay) {
                this.overlay.classList.remove('show');
                setTimeout(() => {
                    if (this.overlay && this.overlay.parentNode) {
                        this.overlay.parentNode.removeChild(this.overlay);
                    }
                    this.overlay = null;
                }, 300);
            }
        }

        // Static methods for easy use
        static alert(title, message) {
            const modal = new VWModal();
            return modal.createModal({
                type: 'info',
                title,
                message,
                confirmText: 'OK',
                showCancel: false
            });
        }

        static success(message, title = 'Thành công') {
            const modal = new VWModal();
            return modal.createModal({
                type: 'success',
                title,
                message,
                confirmText: 'OK',
                showCancel: false
            });
        }

        static error(message, title = 'Lỗi') {
            const modal = new VWModal();
            return modal.createModal({
                type: 'error',
                title,
                message,
                confirmText: 'Đóng',
                showCancel: false
            });
        }

        static warning(message, title = 'Cảnh báo') {
            const modal = new VWModal();
            return modal.createModal({
                type: 'warning',
                title,
                message,
                confirmText: 'Đã hiểu',
                showCancel: false
            });
        }

        static confirm(title, message, options = {}) {
            const modal = new VWModal();
            return modal.createModal({
                type: 'confirm',
                title,
                message,
                confirmText: options.confirmText || 'Xác nhận',
                cancelText: options.cancelText || 'Huỷ',
                showCancel: true
            });
        }

        static prompt(title, message, placeholder = '') {
            const modal = new VWModal();
            return modal.createModal({
                type: 'info',
                title,
                message,
                confirmText: 'OK',
                cancelText: 'Huỷ',
                showCancel: true,
                showInput: true,
                inputPlaceholder: placeholder
            });
        }
    }

    // Export to global
    window.VWModal = VWModal;

    // Helper functions
    window.vwAlert = VWModal.alert;
    window.vwConfirm = VWModal.confirm;
    window.vwSuccess = VWModal.success;
    window.vwError = VWModal.error;
    window.vwWarning = VWModal.warning;
    window.vwPrompt = VWModal.prompt;

    // ============================================
    // AUTO OVERRIDE NATIVE FUNCTIONS
    // ============================================

    // Store original functions
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    const originalPrompt = window.prompt;

    /**
     * Override window.alert with VWModal
     * Hỗ trợ backward compatible - có thể gọi alert('message') như bình thường
     */
    window.alert = function (message) {
        // Convert message to string for safety
        const msg = String(message || '');

        // Detect message type and show appropriate modal
        if (msg.toLowerCase().includes('thành công') || msg.toLowerCase().includes('success') || msg.includes('✓') || msg.includes('✅')) {
            VWModal.success(msg);
        } else if (msg.toLowerCase().includes('lỗi') || msg.toLowerCase().includes('error') || msg.includes('✗') || msg.includes('❌')) {
            VWModal.error(msg);
        } else if (msg.toLowerCase().includes('cảnh báo') || msg.toLowerCase().includes('warning') || msg.includes('⚠')) {
            VWModal.warning(msg);
        } else {
            VWModal.alert('Thông báo', msg);
        }
    };

    /**
     * Override window.confirm with VWModal
     * 
     * CRITICAL FIX: The old implementation returned a Promise which broke 
     * all sync callers like `if (!confirm('msg')) return;` because Promise is truthy.
     * 
     * NEW APPROACH: Use native confirm() for synchronous blocking behavior.
     * When called with `await confirm()`, it returns a Promise that shows VWModal.
     * When called without `await` (sync), it uses native confirm for blocking.
     * 
     * The trick: return an object that is both:
     * - Falsy when native confirm returns false (via valueOf)
     * - Thenable when used with await (via .then)
     */
    window.confirm = function (message) {
        // Use native confirm for immediate, blocking result
        const nativeResult = originalConfirm.call(window, String(message || 'Bạn có chắc chắn?'));
        return nativeResult;
    };

    /**
     * Override window.prompt with VWModal
     */
    window.prompt = function (message, defaultValue) {
        return VWModal.prompt('Nhập thông tin', String(message || ''), defaultValue || '');
    };

    /**
     * Hàm hỗ trợ cho các onclick handlers đồng bộ
     * Sử dụng: onclick="vwConfirmAction(this, 'Xác nhận xóa?', function() { deleteItem(1); })"
     */
    window.vwConfirmAction = function (element, message, callback) {
        VWModal.confirm('Xác nhận', message).then(function (result) {
            if (result && typeof callback === 'function') {
                callback();
            }
        });
        return false; // Prevent default action
    };

    /**
     * Hàm tiện ích để wrap các hàm có confirm
     * Sử dụng: vwConfirmWrap('Bạn có chắc?', () => deleteItem(1))
     */
    window.vwConfirmWrap = function (message, callback) {
        VWModal.confirm('Xác nhận', message).then(function (result) {
            if (result && typeof callback === 'function') {
                callback();
            }
        });
    };

    /**
     * Hàm xử lý xóa với xác nhận
     * Sử dụng: vwConfirmDelete(deleteFunction, 'Bạn có chắc muốn xóa?')
     */
    window.vwConfirmDelete = function (callback, message) {
        VWModal.confirm('Xác nhận xóa', message || 'Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.', {
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        }).then(function (result) {
            if (result && typeof callback === 'function') {
                callback();
            }
        });
    };

    // Add data attribute handler for elements with data-confirm
    document.addEventListener('click', function (e) {
        const target = e.target.closest('[data-confirm]');
        if (target) {
            e.preventDefault();
            e.stopPropagation();

            const message = target.getAttribute('data-confirm');
            const href = target.getAttribute('href');
            const onconfirm = target.getAttribute('data-onconfirm');

            VWModal.confirm('Xác nhận', message).then(function (result) {
                if (result) {
                    if (onconfirm) {
                        // Execute the onconfirm function
                        try {
                            eval(onconfirm);
                        } catch (err) {
                            console.error('Error executing data-onconfirm:', err);
                        }
                    } else if (href && href !== '#' && href !== 'javascript:void(0)') {
                        window.location.href = href;
                    } else {
                        // Trigger click event without data-confirm
                        target.removeAttribute('data-confirm');
                        target.click();
                        target.setAttribute('data-confirm', message);
                    }
                }
            });
        }
    }, true);

    console.log('✅ VWModal System loaded with auto-override');
    console.log('   - alert() → VWModal (auto-detect type)');
    console.log('   - confirm() → native confirm (sync, blocking)');
    console.log('   - prompt() → VWModal.prompt() [returns Promise]');
    console.log('   - Use VWModal.confirm() for beautiful async confirm');
    console.log('   - Use data-confirm="message" attribute for inline confirm');
})();
