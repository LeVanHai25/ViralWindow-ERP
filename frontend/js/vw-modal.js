/**
 * ViralWindow Modal System
 * Override window.confirm() và window.alert() bằng modal đẹp của phần mềm
 * Load file này sớm nhất có thể để override trước khi các trang gọi confirm/alert
 */
(function () {
    'use strict';

    // ============================================================
    // INJECT STYLES
    // ============================================================
    const STYLES = `
        /* VW Modal Overlay */
        #vw-modal-overlay {
            position: fixed; inset: 0; z-index: 999999;
            background: rgba(15,23,42,0.55);
            backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            animation: vwFadeIn .18s ease;
        }
        @keyframes vwFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes vwSlideUp { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }

        /* VW Modal Box */
        .vw-modal-box {
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 32px 80px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.08);
            width: 420px; max-width: calc(100vw - 32px);
            padding: 0;
            overflow: hidden;
            animation: vwSlideUp .22s cubic-bezier(.34,1.56,.64,1);
            font-family: 'Inter','Segoe UI',sans-serif;
        }

        /* Header */
        .vw-modal-header {
            padding: 22px 24px 0;
            display: flex; align-items: flex-start; gap: 14px;
        }
        .vw-modal-icon {
            width: 44px; height: 44px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-size: 22px;
        }
        .vw-modal-icon.confirm { background: #eff6ff; }
        .vw-modal-icon.alert   { background: #fff7ed; }
        .vw-modal-icon.success { background: #f0fdf4; }
        .vw-modal-icon.danger  { background: #fef2f2; }
        .vw-modal-icon.warning { background: #fffbeb; }
        .vw-modal-icon.info    { background: #eff6ff; }

        .vw-modal-header-text { flex: 1; padding-top: 4px; }
        .vw-modal-title {
            font-size: 16px; font-weight: 700; color: #0f172a;
            margin: 0 0 4px; line-height: 1.3;
        }
        .vw-modal-source {
            font-size: 11px; color: #94a3b8; font-weight: 500;
            display: flex; align-items: center; gap: 4px;
        }
        .vw-modal-source svg { width:12px;height:12px; }

        /* Body */
        .vw-modal-body {
            padding: 14px 24px 0 24px;
            font-size: 14px; color: #475569; line-height: 1.65;
        }

        /* Footer */
        .vw-modal-footer {
            padding: 20px 24px 22px;
            display: flex; justify-content: flex-end; gap: 10px;
        }

        /* Buttons */
        .vw-btn {
            padding: 9px 22px; border-radius: 10px; border: none;
            font-size: 14px; font-weight: 600; cursor: pointer;
            transition: all .15s; line-height: 1;
            display: inline-flex; align-items: center; gap: 6px;
        }
        .vw-btn:focus-visible { outline: 3px solid rgba(59,130,246,.4); outline-offset: 2px; }
        .vw-btn-cancel {
            background: #f1f5f9; color: #64748b;
        }
        .vw-btn-cancel:hover { background: #e2e8f0; color: #475569; }
        .vw-btn-confirm {
            background: #2563eb; color: #fff;
        }
        .vw-btn-confirm:hover { background: #1d4ed8; }
        .vw-btn-confirm.danger { background: #dc2626; }
        .vw-btn-confirm.danger:hover { background: #b91c1c; }
        .vw-btn-confirm.warning { background: #d97706; }
        .vw-btn-confirm.warning:hover { background: #b45309; }
        .vw-btn-confirm.success { background: #16a34a; }
        .vw-btn-confirm.success:hover { background: #15803d; }
        .vw-btn-ok { background: #2563eb; color: #fff; min-width: 90px; justify-content: center; }
        .vw-btn-ok:hover { background: #1d4ed8; }

        /* Toast */
        #vw-toast-container {
            position: fixed; bottom: 24px; right: 24px;
            z-index: 999998;
            display: flex; flex-direction: column; gap: 10px;
            pointer-events: none;
        }
        .vw-toast {
            background: #1e293b; color: #f8fafc;
            padding: 12px 18px; border-radius: 12px;
            font-size: 13px; font-weight: 500;
            max-width: 340px;
            box-shadow: 0 8px 32px rgba(0,0,0,.2);
            display: flex; align-items: center; gap: 10px;
            animation: vwToastIn .25s ease;
            pointer-events: auto;
            border-left: 4px solid #3b82f6;
        }
        .vw-toast.success { border-color: #22c55e; }
        .vw-toast.error   { border-color: #ef4444; }
        .vw-toast.warning { border-color: #f59e0b; }
        .vw-toast.fade-out { animation: vwToastOut .3s ease forwards; }
        @keyframes vwToastIn  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes vwToastOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(20px)} }
        .vw-toast-icon { font-size: 16px; flex-shrink: 0; }
    `;

    function injectStyles() {
        if (document.getElementById('vw-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'vw-modal-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    // ============================================================
    // MODAL ENGINE (async — works with await/Promise)
    // ============================================================
    const LOGO_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>`;

    const TYPE_CONFIG = {
        confirm: { icon: '❓', iconClass: 'confirm', btnClass: '' },
        alert: { icon: 'ℹ️', iconClass: 'info', btnClass: '' },
        danger: { icon: '⚠️', iconClass: 'danger', btnClass: 'danger' },
        warning: { icon: '⚠️', iconClass: 'warning', btnClass: 'warning' },
        success: { icon: '✅', iconClass: 'success', btnClass: 'success' },
        info: { icon: 'ℹ️', iconClass: 'info', btnClass: '' },
    };

    /**
     * Hiển thị modal confirm async
     * @returns Promise<boolean>
     */
    window.VWModal = {
        /**
         * @param {string} message - Nội dung
         * @param {object} opts    - { title, type, confirmText, cancelText }
         * @returns Promise<boolean>
         */
        confirm: function (message, opts) {
            opts = opts || {};
            return new Promise(function (resolve) {
                injectStyles();
                const type = opts.type || 'confirm';
                const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.confirm;
                const title = opts.title || (type === 'danger' ? 'Xác nhận thao tác' : 'Xác nhận');
                const confirmText = opts.confirmText || 'Xác nhận';
                const cancelText = opts.cancelText || 'Hủy';

                // Build DOM
                const overlay = document.createElement('div');
                overlay.id = 'vw-modal-overlay';
                overlay.setAttribute('role', 'dialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.innerHTML = `
                    <div class="vw-modal-box" role="document">
                        <div class="vw-modal-header">
                            <div class="vw-modal-icon ${cfg.iconClass}">${cfg.icon}</div>
                            <div class="vw-modal-header-text">
                                <h3 class="vw-modal-title">${title}</h3>
                                <div class="vw-modal-source">${LOGO_SVG} ViralWindow</div>
                            </div>
                        </div>
                        <div class="vw-modal-body">${message}</div>
                        <div class="vw-modal-footer">
                            <button class="vw-btn vw-btn-cancel" id="vw-cancel-btn">${cancelText}</button>
                            <button class="vw-btn vw-btn-confirm ${cfg.btnClass}" id="vw-confirm-btn" autofocus>${confirmText}</button>
                        </div>
                    </div>
                `;

                function cleanup(result) {
                    overlay.style.animation = 'vwFadeIn .15s ease reverse';
                    setTimeout(function () {
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, 150);
                    resolve(result);
                }

                overlay.querySelector('#vw-confirm-btn').addEventListener('click', function () { cleanup(true); });
                overlay.querySelector('#vw-cancel-btn').addEventListener('click', function () { cleanup(false); });
                overlay.addEventListener('click', function (e) { if (e.target === overlay) cleanup(false); });
                document.addEventListener('keydown', function handler(e) {
                    if (e.key === 'Enter') { document.removeEventListener('keydown', handler); cleanup(true); }
                    if (e.key === 'Escape') { document.removeEventListener('keydown', handler); cleanup(false); }
                });
                document.body.appendChild(overlay);
                overlay.querySelector('#vw-confirm-btn').focus();
            });
        },

        /**
         * Alert modal (chỉ có nút OK)
         * @returns Promise<void>
         */
        alert: function (message, opts) {
            opts = opts || {};
            return new Promise(function (resolve) {
                injectStyles();
                const type = opts.type || 'alert';
                const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.alert;
                const title = opts.title || 'Thông báo';
                const okText = opts.okText || 'Đã hiểu';

                const overlay = document.createElement('div');
                overlay.id = 'vw-modal-overlay';
                overlay.setAttribute('role', 'dialog');
                overlay.innerHTML = `
                    <div class="vw-modal-box" role="document">
                        <div class="vw-modal-header">
                            <div class="vw-modal-icon ${cfg.iconClass}">${cfg.icon}</div>
                            <div class="vw-modal-header-text">
                                <h3 class="vw-modal-title">${title}</h3>
                                <div class="vw-modal-source">${LOGO_SVG} ViralWindow</div>
                            </div>
                        </div>
                        <div class="vw-modal-body">${message}</div>
                        <div class="vw-modal-footer">
                            <button class="vw-btn vw-btn-ok" id="vw-ok-btn" autofocus>${okText}</button>
                        </div>
                    </div>
                `;

                function cleanup() {
                    overlay.style.animation = 'vwFadeIn .15s ease reverse';
                    setTimeout(function () {
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, 150);
                    resolve();
                }

                overlay.querySelector('#vw-ok-btn').addEventListener('click', cleanup);
                overlay.addEventListener('click', function (e) { if (e.target === overlay) cleanup(); });
                document.addEventListener('keydown', function handler(e) {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                        document.removeEventListener('keydown', handler);
                        cleanup();
                    }
                });
                document.body.appendChild(overlay);
                overlay.querySelector('#vw-ok-btn').focus();
            });
        },

        /**
         * Toast notification (tự ẩn sau vài giây)
         * @param {string} message
         * @param {'success'|'error'|'warning'|'info'} type
         * @param {number} duration ms
         */
        toast: function (message, type, duration) {
            type = type || 'info';
            duration = duration || 3500;
            injectStyles();

            let container = document.getElementById('vw-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'vw-toast-container';
                document.body.appendChild(container);
            }

            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
            const toast = document.createElement('div');
            toast.className = 'vw-toast ' + type;
            toast.innerHTML = `<span class="vw-toast-icon">${icons[type] || '•'}</span>${message}`;
            container.appendChild(toast);

            setTimeout(function () {
                toast.classList.add('fade-out');
                setTimeout(function () {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 320);
            }, duration);
        },

        /**
         * Shorthand: Error alert
         * @param {string} message
         * @param {object} opts
         * @returns Promise<void>
         */
        error: function (message, opts) {
            if (typeof opts === 'string') {
                opts = { title: opts };
            }
            opts = opts || {};
            opts.type = 'danger';
            opts.title = opts.title || 'Lỗi';
            return window.VWModal.alert(message, opts);
        },

        /**
         * Shorthand: Success alert
         */
        success: function (message, opts) {
            if (typeof opts === 'string') {
                opts = { title: opts };
            }
            opts = opts || {};
            opts.type = 'success';
            opts.title = opts.title || 'Thành công';
            return window.VWModal.alert(message, opts);
        },

        /**
         * Shorthand: Warning alert
         */
        warning: function (message, opts) {
            if (typeof opts === 'string') {
                opts = { title: opts };
            }
            opts = opts || {};
            opts.type = 'warning';
            opts.title = opts.title || 'Cảnh báo';
            return window.VWModal.alert(message, opts);
        },

        /**
         * Shorthand: Info alert
         */
        info: function (message, opts) {
            if (typeof opts === 'string') {
                opts = { title: opts };
            }
            opts = opts || {};
            opts.type = 'info';
            opts.title = opts.title || 'Thông tin';
            return window.VWModal.alert(message, opts);
        },

        /**
         * Prompt: Modal with text input
         * @param {string} title - Modal title
         * @param {string} message - Message / placeholder hint
         * @param {string} defaultValue - Default input value
         * @returns Promise<string|false> - User input or false if cancelled
         */
        prompt: function (title, message, defaultValue) {
            return new Promise(function (resolve) {
                // Create overlay
                var overlay = document.createElement('div');
                overlay.className = 'vw-prompt-overlay';
                overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:99999;opacity:0;visibility:visible;transition:opacity .3s';

                var modalHtml = '<div style="background:#fff;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);max-width:440px;width:90%;transform:scale(.95);transition:transform .3s;overflow:hidden">' +
                    '<div style="padding:20px 24px 12px;display:flex;align-items:center;gap:14px">' +
                    '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#2563eb" stroke-width="2" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>' +
                    '</div>' +
                    '<h3 style="font-size:17px;font-weight:600;color:#1f2937;margin:0">' + (title || 'Nhập thông tin') + '</h3>' +
                    '</div>' +
                    '<div style="padding:0 24px 20px;color:#4b5563;font-size:14px;line-height:1.6">' +
                    '<p style="margin:0 0 12px">' + (message || '') + '</p>' +
                    '<input type="text" id="vwPromptInput" value="' + (defaultValue || '') + '" style="width:100%;padding:11px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;box-sizing:border-box;transition:border-color .2s,box-shadow .2s" placeholder="Nhập tại đây...">' +
                    '</div>' +
                    '<div style="padding:14px 24px;background:#f9fafb;display:flex;justify-content:flex-end;gap:10px">' +
                    '<button id="vwPromptCancel" style="padding:9px 18px;border-radius:10px;font-weight:500;font-size:14px;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#4b5563;transition:background .15s">Huỷ</button>' +
                    '<button id="vwPromptOk" style="padding:9px 18px;border-radius:10px;font-weight:500;font-size:14px;cursor:pointer;border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 4px 12px rgba(59,130,246,.3);transition:box-shadow .15s">OK</button>' +
                    '</div>' +
                    '</div>';

                overlay.innerHTML = modalHtml;
                document.body.appendChild(overlay);

                // Animate in
                requestAnimationFrame(function () {
                    overlay.style.opacity = '1';
                    var m = overlay.querySelector('div');
                    if (m) m.style.transform = 'scale(1)';
                });

                var input = document.getElementById('vwPromptInput');
                if (input) setTimeout(function () { input.focus(); input.select(); }, 120);

                function close() {
                    overlay.style.opacity = '0';
                    setTimeout(function () {
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, 300);
                }

                // OK button
                document.getElementById('vwPromptOk').addEventListener('click', function () {
                    var val = input ? input.value : '';
                    close();
                    resolve(val);
                });

                // Cancel button
                document.getElementById('vwPromptCancel').addEventListener('click', function () {
                    close();
                    resolve(false);
                });

                // Overlay click = cancel
                overlay.addEventListener('click', function (e) {
                    if (e.target === overlay) { close(); resolve(false); }
                });

                // Enter = OK, Escape = Cancel
                function onKey(e) {
                    if (e.key === 'Enter') { var val = input ? input.value : ''; close(); resolve(val); document.removeEventListener('keydown', onKey); }
                    if (e.key === 'Escape') { close(); resolve(false); document.removeEventListener('keydown', onKey); }
                }
                document.addEventListener('keydown', onKey);
            });
        }
    };

    // ============================================================
    // OVERRIDE window.confirm và window.alert
    // Giải pháp: bắt bằng Proxy + lưu callback asynchronous
    // ============================================================

    // Lưu hàm gốc để dùng trong trường hợp cần thiết
    window._nativeConfirm = window.confirm.bind(window);
    window._nativeAlert = window.alert.bind(window);

    /**
     * Ghi đè window.confirm -> sync shim
     * Lý do: confirm() cần trả về true/false ngay lập tức.
     * Giải pháp: dùng custom modal async, nhưng code gọi confirm() cần được viết lại theo async.
     * Để tương thích 100% mà không sửa từng file:
     * - Các chỗ gọi if (confirm(...)) { } sẽ dùng VWConfirmSync
     * - Ta tạo 1 helper VWConfirmSync cho code cũ
     * - Đồng thời override window.confirm để hiện modal (async)
     *   và trả về false ngay, nhưng thực thi action trong callback
     */

    // Cách tiếp cận thực dụng nhất: Override toàn bộ confirm/alert bằng async
    // Tất cả code mới nên dùng: await VWModal.confirm(...) 
    // Đối với code cũ: ta dùng shim tương thích

    window.confirm = function (message) {
        // Trả về Promise<boolean> từ VWModal.confirm
        // Code gọi confirm() PHẢI dùng: await confirm('...')
        // hoặc: const confirmed = await confirm('...'); if (!confirmed) return;
        return window.VWModal.confirm(message);
    };

    window.alert = function (message) {
        window.VWModal.alert(message);
    };

    // ============================================================
    // MONKEY-PATCH: Tự động convert confirm() sang async modal
    // ============================================================
    // Phương pháp chuẩn: thêm hàm vwConfirm() global để các page dùng
    // và từng bước chuyển đổi confirm() -> vwConfirm()
    window.vwConfirm = function (message, opts) {
        return window.VWModal.confirm(message, opts);
    };
    window.vwAlert = function (message, opts) {
        return window.VWModal.alert(message, opts);
    };
    window.vwToast = function (message, type, duration) {
        return window.VWModal.toast(message, type, duration);
    };

    console.log('[VWModal] Custom modal system loaded ✅');
})();
