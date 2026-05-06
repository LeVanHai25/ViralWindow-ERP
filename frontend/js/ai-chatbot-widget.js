/**
 * =====================================================
 * AI CHATBOT WIDGET
 * =====================================================
 * Floating chatbot widget cho mọi trang ViralWindow
 * - Nút chat góc phải dưới
 * - Giao diện chat hiện đại
 * - Lưu lịch sử hội thoại trong session
 */
(function () {
    'use strict';

    const API_BASE = window.API_BASE || '/api';
    const CHAT_API = `${API_BASE}/ai/chat`;

    let chatHistory = [];
    let isOpen = false;
    let isTyping = false;

    // =====================================================
    // INJECT STYLES
    // =====================================================
    function injectStyles() {
        if (document.getElementById('ai-chatbot-styles')) return;
        const style = document.createElement('style');
        style.id = 'ai-chatbot-styles';
        style.textContent = `
            /* Floating Button */
            #ai-chat-btn {
                position: fixed; bottom: 24px; right: 24px; z-index: 99990;
                width: 60px; height: 60px; border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border: none; cursor: pointer;
                box-shadow: 0 8px 32px rgba(99,102,241,0.4);
                display: flex; align-items: center; justify-content: center;
                transition: all 0.3s ease;
                animation: ai-pulse 2s infinite;
            }
            #ai-chat-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 12px 40px rgba(99,102,241,0.5);
            }
            #ai-chat-btn svg { width: 28px; height: 28px; fill: white; }
            @keyframes ai-pulse {
                0%, 100% { box-shadow: 0 8px 32px rgba(99,102,241,0.4); }
                50% { box-shadow: 0 8px 32px rgba(99,102,241,0.6), 0 0 0 8px rgba(99,102,241,0.1); }
            }

            /* Chat Window */
            #ai-chat-window {
                position: fixed; bottom: 96px; right: 24px; z-index: 99991;
                width: 400px; max-width: calc(100vw - 48px);
                height: 560px; max-height: calc(100vh - 120px);
                background: #fff; border-radius: 20px;
                box-shadow: 0 24px 80px rgba(0,0,0,0.2);
                display: none; flex-direction: column;
                overflow: hidden;
                animation: ai-slide-up 0.3s ease;
            }
            #ai-chat-window.open { display: flex; }
            @keyframes ai-slide-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Header */
            .ai-chat-header {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white; padding: 18px 20px;
                display: flex; align-items: center; gap: 12px;
            }
            .ai-chat-avatar {
                width: 40px; height: 40px; border-radius: 12px;
                background: rgba(255,255,255,0.2);
                display: flex; align-items: center; justify-content: center;
                color: white;
            }
            .ai-chat-title { flex: 1; }
            .ai-chat-title h3 { margin: 0; font-size: 15px; font-weight: 700; }
            .ai-chat-title span { font-size: 11px; opacity: 0.8; }
            .ai-chat-close {
                background: rgba(255,255,255,0.15); border: none;
                width: 32px; height: 32px; border-radius: 8px;
                color: white; font-size: 18px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background 0.2s;
            }
            .ai-chat-close:hover { background: rgba(255,255,255,0.3); }

            /* Messages Area */
            .ai-chat-messages {
                flex: 1; overflow-y: auto; padding: 16px;
                display: flex; flex-direction: column; gap: 12px;
                background: #f8fafc;
            }
            .ai-chat-messages::-webkit-scrollbar { width: 4px; }
            .ai-chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

            /* Message Bubbles */
            .ai-msg {
                max-width: 85%; padding: 12px 16px;
                border-radius: 16px; font-size: 13.5px; line-height: 1.6;
                word-wrap: break-word;
            }
            .ai-msg.user {
                align-self: flex-end;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white; border-bottom-right-radius: 4px;
            }
            .ai-msg.bot {
                align-self: flex-start;
                background: white; color: #1e293b;
                border: 1px solid #e2e8f0;
                border-bottom-left-radius: 4px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .ai-msg.bot b { color: #4f46e5; }
            .ai-msg.bot ul { margin: 6px 0; padding-left: 18px; }
            .ai-msg.bot li { margin: 3px 0; }

            /* Typing Indicator */
            .ai-typing {
                align-self: flex-start; padding: 12px 20px;
                background: white; border-radius: 16px;
                border: 1px solid #e2e8f0;
                display: flex; gap: 5px; align-items: center;
            }
            .ai-typing span {
                width: 7px; height: 7px; border-radius: 50%;
                background: #94a3b8; display: inline-block;
                animation: ai-typing-dot 1.4s infinite;
            }
            .ai-typing span:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes ai-typing-dot {
                0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                40% { opacity: 1; transform: scale(1); }
            }

            /* Input Area */
            .ai-chat-input-area {
                padding: 12px 16px; border-top: 1px solid #e2e8f0;
                background: white; display: flex; gap: 8px; align-items: center;
            }
            .ai-chat-input {
                flex: 1; border: 2px solid #e2e8f0; border-radius: 12px;
                padding: 10px 14px; font-size: 14px; outline: none;
                transition: border-color 0.2s;
                font-family: inherit;
            }
            .ai-chat-input:focus { border-color: #6366f1; }
            .ai-chat-send {
                width: 40px; height: 40px; border-radius: 12px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border: none; cursor: pointer; color: white;
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.15s;
            }
            .ai-chat-send:hover { transform: scale(1.05); }
            .ai-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
            .ai-chat-send svg { width: 18px; height: 18px; fill: white; }

            /* Quick Actions */
            .ai-quick-actions {
                padding: 8px 16px 4px; display: flex; flex-wrap: wrap; gap: 6px;
            }
            .ai-quick-btn {
                padding: 6px 12px; border-radius: 20px;
                background: #eff6ff; border: 1px solid #bfdbfe;
                color: #3b82f6; font-size: 12px; cursor: pointer;
                transition: all 0.15s; white-space: nowrap;
            }
            .ai-quick-btn:hover { background: #dbeafe; }
        `;
        document.head.appendChild(style);
    }

    // =====================================================
    // CREATE DOM
    // =====================================================
    function createWidget() {
        injectStyles();

        // Floating Button
        const btn = document.createElement('button');
        btn.id = 'ai-chat-btn';
        btn.title = 'AI Trợ lý ViralWindow';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l4.93-1.38C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 14h-2v-2h2v2zm2.07-4.75l-.9.92C11.45 12.9 11 13.5 11 15H9v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H6c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`;
        btn.onclick = toggleChat;
        document.body.appendChild(btn);

        // Chat Window
        const win = document.createElement('div');
        win.id = 'ai-chat-window';
        win.innerHTML = `
            <div class="ai-chat-header">
                <div class="ai-chat-avatar"><i data-lucide="bot" style="width:24px;height:24px;"></i></div>
                <div class="ai-chat-title">
                    <h3>AI Trợ lý ViralWindow</h3>
                    <span>Hỏi bất kỳ điều gì về hệ thống</span>
                </div>
                <button class="ai-chat-close" onclick="document.getElementById('ai-chat-window').classList.remove('open')">✕</button>
            </div>
            <div class="ai-chat-messages" id="ai-chat-messages">
                <div class="ai-msg bot">
                    <i data-lucide="hand" style="display:inline;width:16px;height:16px;vertical-align:middle;color:#f59e0b;"></i> <b>Xin chào!</b> Tôi là AI Trợ lý ViralWindow.<br>
                    Tôi có thể giúp bạn:
                    <ul>
                        <li><i data-lucide="package" style="display:inline;width:13px;height:13px;vertical-align:middle;color:#ec4899;margin-right:4px;"></i> Tra cứu tồn kho, vật tư</li>
                        <li><i data-lucide="bar-chart-2" style="display:inline;width:13px;height:13px;vertical-align:middle;color:#3b82f6;margin-right:4px;"></i> Phân tích dự án, tài chính</li>
                        <li><i data-lucide="book-open" style="display:inline;width:13px;height:13px;vertical-align:middle;color:#10b981;margin-right:4px;"></i> Hướng dẫn thao tác hệ thống</li>
                        <li><i data-lucide="search" style="display:inline;width:13px;height:13px;vertical-align:middle;color:#6366f1;margin-right:4px;"></i> Tìm kiếm thông tin nhanh</li>
                    </ul>
                    Hãy hỏi tôi bất cứ điều gì! <i data-lucide="smile" style="display:inline;width:16px;height:16px;vertical-align:middle;color:#eab308;"></i>
                </div>
            </div>
            <div class="ai-quick-actions">
                <button class="ai-quick-btn" style="display:flex;align-items:center;gap:4px;" onclick="window._aiSendQuick('Tình hình tồn kho hiện tại?')"><i data-lucide="package" style="width:13px;height:13px;"></i> Tồn kho</button>
                <button class="ai-quick-btn" style="display:flex;align-items:center;gap:4px;" onclick="window._aiSendQuick('Dự án nào đang chậm tiến độ?')"><i data-lucide="bar-chart-2" style="width:13px;height:13px;"></i> Tiến độ DA</button>
                <button class="ai-quick-btn" style="display:flex;align-items:center;gap:4px;" onclick="window._aiSendQuick('Tổng hợp tài chính tháng này?')"><i data-lucide="dollar-sign" style="width:13px;height:13px;"></i> Tài chính</button>
                <button class="ai-quick-btn" style="display:flex;align-items:center;gap:4px;" onclick="window._aiSendQuick('Hướng dẫn tạo phiếu xuất kho')"><i data-lucide="help-circle" style="width:13px;height:13px;"></i> Hướng dẫn</button>
            </div>
            <div class="ai-chat-input-area">
                <input type="text" class="ai-chat-input" id="ai-chat-input" 
                       placeholder="Nhập câu hỏi..." autocomplete="off">
                <button class="ai-chat-send" id="ai-chat-send" onclick="window._aiSendMessage()">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        `;
        document.body.appendChild(win);

        // Enter to send
        document.getElementById('ai-chat-input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window._aiSendMessage();
            }
        });

        // Inject Lucide script if missing
        if (!window.lucide && !document.querySelector('script[src*="lucide"]')) {
            const script = document.createElement('script');
            script.src = "https://unpkg.com/lucide@latest";
            script.onload = () => lucide.createIcons();
            document.head.appendChild(script);
        } else if (window.lucide) {
            setTimeout(() => lucide.createIcons(), 50);
        }
    }

    // =====================================================
    // TOGGLE CHAT
    // =====================================================
    function toggleChat() {
        const win = document.getElementById('ai-chat-window');
        isOpen = !isOpen;
        if (isOpen) {
            win.classList.add('open');
            setTimeout(() => document.getElementById('ai-chat-input').focus(), 100);
        } else {
            win.classList.remove('open');
        }
    }

    // =====================================================
    // SEND MESSAGE
    // =====================================================
    window._aiSendMessage = async function () {
        const input = document.getElementById('ai-chat-input');
        const message = input.value.trim();
        if (!message || isTyping) return;

        input.value = '';
        addMessage(message, 'user');

        // Add to history
        chatHistory.push({ role: 'user', content: message });

        // Show typing
        isTyping = true;
        showTyping();

        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(CHAT_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message,
                    history: chatHistory.slice(-10) // Last 10 messages
                })
            });

            const result = await response.json();
            hideTyping();

            if (result.success) {
                addMessage(result.data.reply, 'bot');
                chatHistory.push({ role: 'assistant', content: result.data.reply });
            } else {
                addMessage('<i data-lucide="alert-triangle" style="display:inline;width:15px;height:15px;color:#ef4444;vertical-align:middle;margin-right:4px;"></i> ' + (result.message || 'Lỗi kết nối AI'), 'bot');
            }
        } catch (error) {
            hideTyping();
            addMessage('<i data-lucide="wifi-off" style="display:inline;width:15px;height:15px;color:#ef4444;vertical-align:middle;margin-right:4px;"></i> Không thể kết nối đến AI server. Vui lòng thử lại.', 'bot');
        }

        isTyping = false;
    };

    window._aiSendQuick = function (text) {
        document.getElementById('ai-chat-input').value = text;
        window._aiSendMessage();
    };

    // =====================================================
    // HELPERS
    // =====================================================
    function addMessage(content, type) {
        const container = document.getElementById('ai-chat-messages');
        const div = document.createElement('div');
        div.className = `ai-msg ${type}`;
        if (type === 'bot') {
            div.innerHTML = content;
            if (window.lucide) {
                setTimeout(() => lucide.createIcons({ root: div }), 10);
            }
        } else {
            div.textContent = content;
        }
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function showTyping() {
        const container = document.getElementById('ai-chat-messages');
        const typing = document.createElement('div');
        typing.className = 'ai-typing';
        typing.id = 'ai-typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('ai-typing-indicator');
        if (el) el.remove();
    }

    // =====================================================
    // INIT
    // =====================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
