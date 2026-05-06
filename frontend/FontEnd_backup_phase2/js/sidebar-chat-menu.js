/**
 * =====================================================
 * SIDEBAR CHAT MENU — Real-time Notifications & Sound
 * =====================================================
 * Features: Socket.IO integration, Badge updates, Sound alerts
 */
(function() {
    'use strict';

    const API_BASE = window.API_BASE || '/api';
    const SERVER_BASE = API_BASE.replace('/api', '');
    let socket = null;

    // Pulse/Notification Sound logic
    function playNotificationSound() {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            
            // Messenger-like "Ting" frequency sequence
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, context.currentTime); // A5
            oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.1); // E6
            
            gain.gain.setValueAtTime(0.1, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(context.currentTime + 0.5);
        } catch (e) {
            console.warn('[ChatBadge] Could not play sound:', e);
        }
    }

    function initApp() {
        injectMenuItems();
        updateUnreadBadge();
        
        // Wait a bit for Socket.IO script to be ready (injected by sidebar-enterprise.js)
        setTimeout(initGlobalSocket, 1500);
    }

    // Since this script is dynamically injected, DOMContentLoaded may have already fired.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp(); // Execute immediately if DOM is already ready
    }

    function injectMenuItems() {
        const nav = document.querySelector('.sidebar-nav, .sidebar nav, nav');
        if (!nav) return;

        // --- YÊU CẦU VẬT TƯ (auto-inject badge) ---
        // Move this BEFORE the TIN NHẮN early return so it executes on all pages
        const vtLinks = document.querySelectorAll('a[href="material-requests.html"]');
        vtLinks.forEach(link => {
            if (!link.querySelector('#sidebarMRBadge')) {
                const badge = document.createElement('span');
                badge.id = 'sidebarMRBadge';
                badge.className = 'hidden';
                badge.style.cssText = 'background:#ef4444;color:white;font-size:9px;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:auto;';
                badge.textContent = '0';
                link.appendChild(badge);
            }
        });

        // Check if TIN NHẮN already exists
        const hasTinNhan = nav.innerHTML.includes('TIN NHẮN');
        if (hasTinNhan) {
            // Just ensure badge element exists and has ID
            const msgLink = nav.querySelector('a[href="messages.html"]');
            if (msgLink && !document.getElementById('sidebarMsgBadge')) {
                const badge = document.createElement('span');
                badge.id = 'sidebarMsgBadge';
                badge.className = 'hidden';
                badge.style.cssText = 'background:#ef4444;color:white;font-size:9px;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:auto;';
                msgLink.appendChild(badge);
            }
            return; // EXIT EARLY IF TIN NHẮN EXISTS
        }

        // Find QUẢN TRỊ nav-item to insert before it
        const navItems = nav.querySelectorAll('.nav-item, a.nav-item');
        let quanTriItem = null;
        navItems.forEach(item => {
            if (item.textContent.includes('QUẢN TRỊ') && !quanTriItem) {
                quanTriItem = item;
            }
        });

        if (!quanTriItem) return;

        // TIN NHẮN link
        const isMessagesPage = window.location.pathname.includes('messages.html');
        const msgHtml = `
            <!-- TIN NHẮN (auto-injected) -->
            <a href="messages.html" class="nav-item" ${isMessagesPage ? 'style="background:rgba(255,255,255,0.1);"' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span>TIN NHẮN</span>
                <span id="sidebarMsgBadge" class="hidden" style="background:#ef4444;color:white;font-size:9px;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:auto;">0</span>
            </a>`;

        // Insert before QUẢN TRỊ
        quanTriItem.insertAdjacentHTML('beforebegin', msgHtml);
    }

    async function initGlobalSocket() {
        // Skip if we're on the messages page (chat-client.js handles its own socket)
        if (window.location.pathname.includes('messages.html')) {
            console.log('[ChatBadge] On messages.html, skipping secondary socket.');
            return;
        }

        if (typeof io === 'undefined') {
            console.warn('[ChatBadge] Socket.IO client not found yet. Retrying...');
            setTimeout(initGlobalSocket, 2000);
            return;
        }

        const token = sessionStorage.getItem('token');
        if (!token) return;

        try {
            socket = io(SERVER_BASE, { 
                auth: { token },
                reconnectionDelay: 5000,
                reconnectionAttempts: 10
            });

            socket.on('connect', () => console.log('[ChatBadge] Real-time monitoring active.'));
            
            socket.on('new_message', (msg) => {
                console.log('[ChatBadge] New message received via socket.');
                // Update badge
                updateUnreadBadge();
                // Play notification sound
                playNotificationSound();
            });

            socket.on('mention_notification', (data) => {
                console.log('[ChatBadge] Mention received via socket.');
                updateUnreadBadge();
                playNotificationSound();
            });

        } catch (e) {
            console.error('[ChatBadge] Socket init error:', e);
        }
    }

    async function updateUnreadBadge() {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/chat/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.success) return;

            // Ensure we strictly sum integers in case MySQL returns BigInt strings
            let totalUnread = 0;
            (data.data || []).forEach(c => {
                totalUnread += parseInt(c.unread_count || 0, 10);
            });

            const badge = document.getElementById('sidebarMsgBadge');
            
            if (badge) {
                if (totalUnread > 0) {
                    badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                    badge.classList.remove('hidden');
                    // Force display to override any flex/hidden conflicts
                    badge.style.display = 'inline-block';
                    badge.style.setProperty('display', 'inline-block', 'important');
                    
                    // Update document title optionally
                    if (!window.location.pathname.includes('messages.html')) {
                        const originalTitle = document.title.replace(/^\(\d+\+\) /, '').replace(/^\(\d+\) /, '');
                        document.title = `(${totalUnread}) ${originalTitle}`;
                    }
                } else {
                    badge.classList.add('hidden');
                    badge.style.display = 'none';
                    badge.style.setProperty('display', 'none', 'important');
                    document.title = document.title.replace(/^\(\d+\) /, '').replace(/^\(\d+\+\) /, '');
                }
            }
        } catch (e) { console.error('[ChatBadge] Update failed:', e); }
    }

    // Update Material Request Badge (Yêu cầu vật tư)
    async function updateMaterialRequestBadge() {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/material-requests/pending-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.success) return;

            const pendingCount = parseInt(data.count || 0, 10);
            const badge = document.getElementById('sidebarMRBadge');
            
            if (badge) {
                if (pendingCount > 0) {
                    badge.textContent = pendingCount > 99 ? '99+' : pendingCount;
                    badge.classList.remove('hidden');
                    badge.style.display = 'inline-block';
                    badge.style.setProperty('display', 'inline-block', 'important');
                } else {
                    badge.classList.add('hidden');
                    badge.style.display = 'none';
                    badge.style.setProperty('display', 'none', 'important');
                }
            }
        } catch (e) { console.error('[MRBadge] Update failed:', e); }
    }

    // Polling backup (less frequent now that we have socket)
    setInterval(() => {
        updateUnreadBadge();
        updateMaterialRequestBadge();
    }, 120000); // 2 minutes backup

    // Fetch initial state for MR Badge too
    // Call this inside initApp() below.
    
    setTimeout(updateMaterialRequestBadge, 1000); // Fetch on load

    // Expose for external use (like chat-client.js)
    window.updateChatBadge = updateUnreadBadge;
    window.playChatNotification = playNotificationSound;
    window.updateMaterialRequestBadge = updateMaterialRequestBadge;
})();
