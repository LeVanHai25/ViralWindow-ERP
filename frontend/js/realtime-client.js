/**
 * =====================================================
 * REALTIME CLIENT — Socket.IO cho toàn hệ thống ViralWindow
 * =====================================================
 * Tối ưu cho Render Free Plan:
 *   - Kết nối êm, không spam console
 *   - Tự dùng API_BASE url cho socket connection
 *   - Keepalive ping mỗi 8 phút
 *   - Graceful degradation (trang vẫn hoạt động khi offline)
 */

(function () {
    'use strict';

    // =====================================================
    // CONFIG — Tự detect Socket URL từ API_BASE
    // =====================================================
    function getSocketUrl() {
        // Same-origin architecture: socket connects to current origin
        if (window.SOCKET_URL) return window.SOCKET_URL;
        return '';
    }

    const KEEPALIVE_INTERVAL = 8 * 60 * 1000; // 8 phút
    const MAX_SILENT_RETRIES = 5;              // Chỉ thử 5 lần rồi dừng

    // =====================================================
    // STATE
    // =====================================================
    let socket = null;
    let isConnected = false;
    let modules = [];
    let onDataChangedCallback = null;
    let keepaliveTimer = null;
    let reconnectAttempts = 0;
    let hasLoggedError = false;
    let statusIndicator = null;

    // =====================================================
    // INIT
    // =====================================================
    function init(options = {}) {
        modules = options.modules || [];
        onDataChangedCallback = options.onDataChanged || null;

        const token = sessionStorage.getItem('token');
        if (!token) return; // Chưa đăng nhập → không kết nối (im lặng)

        if (typeof io === 'undefined') {
            // Log 1 lần duy nhất, không spam
            console.info('[Realtime] Socket.IO chưa sẵn sàng — trang vẫn hoạt động bình thường');
            return;
        }

        connect(token);
        createStatusIndicator();
    }

    // =====================================================
    // CONNECT
    // =====================================================
    function connect(token) {
        if (socket && socket.connected) return;

        const socketUrl = getSocketUrl();

        try {
            socket = io(socketUrl, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: MAX_SILENT_RETRIES,
                reconnectionDelay: 3000,       // 3 giây giữa các lần thử
                reconnectionDelayMax: 30000,    // Max 30 giây
                timeout: 8000                   // 8 giây timeout
            });

            // --- Kết nối thành công ---
            socket.on('connect', () => {
                isConnected = true;
                reconnectAttempts = 0;
                hasLoggedError = false;
                console.log('🟢 [Realtime] Đã kết nối');
                updateStatusIndicator('online');

                modules.forEach(mod => {
                    socket.emit('join_module', { module: mod });
                });

                startKeepalive();
            });

            // --- Mất kết nối ---
            socket.on('disconnect', (reason) => {
                isConnected = false;
                updateStatusIndicator('offline');
                stopKeepalive();
                // Chỉ log nếu trước đó đã connected
                if (!hasLoggedError) {
                    console.info('[Realtime] Mất kết nối:', reason);
                }
            });

            // --- Lỗi kết nối (KHÔNG SPAM) ---
            socket.on('connect_error', () => {
                reconnectAttempts++;
                updateStatusIndicator('reconnecting');

                // Chỉ log 1 lần duy nhất
                if (!hasLoggedError) {
                    hasLoggedError = true;
                    console.info('[Realtime] Không thể kết nối Socket.IO — trang vẫn hoạt động bình thường');
                }

                // Sau MAX_SILENT_RETRIES lần → dừng hẳn
                if (reconnectAttempts >= MAX_SILENT_RETRIES) {
                    socket.disconnect();
                    updateStatusIndicator('offline');
                }
            });

            // --- Reconnect thành công ---
            socket.io.on('reconnect', () => {
                console.log('🟢 [Realtime] Đã kết nối lại');
                updateStatusIndicator('online');
            });

            // --- Data change events ---
            socket.on('data_changed', (payload) => {
                if (onDataChangedCallback) {
                    try {
                        onDataChangedCallback(payload);
                    } catch (e) { }
                }
            });

            socket.on('keepalive_ack', () => { });

        } catch (e) {
            // Im lặng — trang vẫn hoạt động
        }
    }

    // =====================================================
    // KEEPALIVE
    // =====================================================
    function startKeepalive() {
        stopKeepalive();
        keepaliveTimer = setInterval(() => {
            if (socket && socket.connected) {
                socket.emit('keepalive');
            }
        }, KEEPALIVE_INTERVAL);
    }

    function stopKeepalive() {
        if (keepaliveTimer) {
            clearInterval(keepaliveTimer);
            keepaliveTimer = null;
        }
    }

    // =====================================================
    // STATUS INDICATOR
    // =====================================================
    function createStatusIndicator() {
        if (statusIndicator) return;
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'vw-realtime-status';
        statusIndicator.style.cssText = `
            position: fixed; bottom: 12px; right: 12px; z-index: 9999;
            width: 10px; height: 10px; border-radius: 50%;
            background: #9ca3af; transition: background 0.3s;
            cursor: pointer; opacity: 0.7;
        `;
        statusIndicator.title = 'Realtime';
        document.body.appendChild(statusIndicator);
    }

    function updateStatusIndicator(status) {
        if (!statusIndicator) return;
        const colors = { online: '#22c55e', offline: '#ef4444', reconnecting: '#f59e0b' };
        statusIndicator.style.background = colors[status] || '#9ca3af';
        statusIndicator.title = status === 'online' ? 'Realtime ✅' : status === 'reconnecting' ? 'Đang kết nối...' : 'Offline';
    }

    // =====================================================
    // PUBLIC API
    // =====================================================
    window.VWRealtime = {
        init,
        joinModule(mod) {
            if (!modules.includes(mod)) modules.push(mod);
            if (socket && socket.connected) socket.emit('join_module', { module: mod });
        },
        leaveModule(mod) {
            modules = modules.filter(m => m !== mod);
            if (socket && socket.connected) socket.emit('leave_module', { module: mod });
        },
        isOnline() { return isConnected; },
        disconnect() {
            stopKeepalive();
            if (socket) { socket.disconnect(); socket = null; }
            isConnected = false;
        }
    };

})();
