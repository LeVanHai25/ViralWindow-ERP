// ViralWindow - Centralized API Configuration
// Production: same-origin architecture (relative /api paths)
// Local Dev: Live Server (5500/5501) → Backend (3001)
(function () {
    'use strict';
    const port = window.location.port;
    const isLocalDev = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                       && (port === '5500' || port === '5501' || port === '5502');

    if (isLocalDev) {
        window.API_BASE    = 'http://localhost:3001/api';
        window.SERVER_BASE = 'http://localhost:3001';
        window.SOCKET_URL  = 'http://localhost:3001'; // Fix P2: WebSocket → backend port, not Live Server
    } else {
        window.API_BASE    = '/api';
        window.SERVER_BASE = '';
        window.SOCKET_URL  = '';  // Production: same-origin (Socket.IO auto-detects)
    }
    console.log('[Config] API_BASE:', window.API_BASE, isLocalDev ? '(Local Dev)' : '(Production)');
})();
