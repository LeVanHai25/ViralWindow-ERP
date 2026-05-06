/**
 * AI Brain Chat Widget (Phase 5)
 * Cung cấp giao diện Chat nổi toàn cục, kết nối với API Persistent Memory & Analytics
 */

class AIChatWidget {
    constructor() {
        this.currentSessionId = null;
        this.sessions = [];
        this.isTyping = false;
        
        // Thêm CSS vào header nếu chưa có
        if (!document.querySelector('link[href*="ai-chat.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/ai-chat.css';
            document.head.appendChild(link);
        }

        this.init();
    }

    init() {
        this.createDOM();
        this.attachEvents();
        // Không load sessions ngay, chỉ load khi user mở chat
    }

    createDOM() {
        // Icon Trigger
        this.triggerBtn = document.createElement('button');
        this.triggerBtn.className = 'ai-brain-trigger';
        this.triggerBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        `;
        document.body.appendChild(this.triggerBtn);

        // Main Container
        this.container = document.createElement('div');
        this.container.className = 'ai-chat-container';
        this.container.innerHTML = `
            <!-- Sidebar: Danh sách chat -->
            <div class="ai-chat-sidebar">
                <div class="ai-sidebar-header">
                    <button class="ai-new-chat-btn" id="aiNewChatBtn">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Cuộc trò chuyện mới
                    </button>
                </div>
                <div class="ai-sessions-list" id="aiSessionsList">
                    <!-- Sessions will be loaded here -->
                </div>
            </div>

            <!-- Main Chat Area -->
            <div class="ai-chat-main">
                <div class="ai-chat-header">
                    <div class="ai-chat-title">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20" class="text-indigo-500">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            ViralWindow AI Brain
                        </h3>
                    </div>
                    <button class="ai-chat-close" id="aiChatCloseBtn">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="ai-chat-messages" id="aiChatMessages">
                    <div class="ai-message assistant">
                        <div class="ai-avatar">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div class="ai-message-content">
                            Xin chào! Tôi là AI Brain của hệ thống ViralWindow. Tôi có thể giúp gì cho bạn hôm nay?
                        </div>
                    </div>
                </div>

                <div class="ai-chat-input-area">
                    <div class="ai-input-wrapper">
                        <textarea class="ai-chat-input" id="aiChatInput" placeholder="Hỏi AI bất cứ điều gì về dữ liệu ERP..." rows="1"></textarea>
                        <button class="ai-send-btn" id="aiSendBtn">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);

        // Cache elements
        this.sessionsListEl = document.getElementById('aiSessionsList');
        this.messagesEl = document.getElementById('aiChatMessages');
        this.inputEl = document.getElementById('aiChatInput');
        this.sendBtn = document.getElementById('aiSendBtn');
    }

    attachEvents() {
        this.triggerBtn.addEventListener('click', () => this.toggleChat());
        document.getElementById('aiChatCloseBtn').addEventListener('click', () => this.toggleChat());
        document.getElementById('aiNewChatBtn').addEventListener('click', () => this.startNewChat());
        
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto resize textarea
        this.inputEl.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    async toggleChat() {
        const isActive = this.container.classList.toggle('active');
        if (isActive) {
            this.inputEl.focus();
            if (this.sessions.length === 0) {
                await this.loadSessions();
            }
        }
    }

    startNewChat() {
        this.currentSessionId = null;
        this.renderSessions(); // Remove active state
        this.messagesEl.innerHTML = `
            <div class="ai-message assistant fade-in">
                <div class="ai-avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div class="ai-message-content">
                    Bắt đầu cuộc trò chuyện mới. Dữ liệu ngữ cảnh trước đó sẽ không được kế thừa.
                </div>
            </div>
        `;
        this.inputEl.focus();
    }

    async loadSessions() {
        try {
            const res = await fetch(`${API_URL}/api/ai/sessions`, {
                headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
            });
            const data = await res.json();
            if (data.success) {
                this.sessions = data.data;
                this.renderSessions();
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách chat:', error);
        }
    }

    renderSessions() {
        this.sessionsListEl.innerHTML = this.sessions.map(s => `
            <div class="ai-session-item ${this.currentSessionId === s.id ? 'active' : ''}" data-id="${s.id}">
                <div class="ai-session-title">${this.escapeHTML(s.title || 'Trò chuyện không tên')}</div>
                <div class="ai-session-date">${new Date(s.updated_at || s.created_at).toLocaleString('vi-VN')}</div>
            </div>
        `).join('');

        // Cắn sự kiện click
        this.sessionsListEl.querySelectorAll('.ai-session-item').forEach(item => {
            item.addEventListener('click', () => this.loadSessionHistory(item.dataset.id));
        });
    }

    async loadSessionHistory(sessionId) {
        if (this.currentSessionId === sessionId) return;
        this.currentSessionId = sessionId;
        this.renderSessions(); // Update active class
        
        this.messagesEl.innerHTML = '<div class="text-center text-gray-500 py-4">Đang tải lịch sử...</div>';

        try {
            const res = await fetch(`${API_URL}/api/ai/sessions/${sessionId}/history`, {
                headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
            });
            const data = await res.json();
            
            if (data.success) {
                this.messagesEl.innerHTML = ''; // Xoá loading
                // DB trả về DESC (mới nhất lên đầu) nên ta cần reverse lại để render từ trên xuống dưới
                const historyAsc = data.data.reverse();
                
                historyAsc.forEach(msg => {
                    this.appendMessage(msg.role, msg.content, msg.metadata);
                });
                this.scrollToBottom();
            }
        } catch (error) {
            this.messagesEl.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi khi tải lịch sử!</div>';
        }
    }

    async sendMessage() {
        const text = this.inputEl.value.trim();
        if (!text || this.isTyping) return;

        this.inputEl.value = '';
        this.inputEl.style.height = 'auto'; // Reset chiều cao
        this.appendMessage('user', text);
        this.showTypingIndicator();
        this.isTyping = true;
        this.sendBtn.disabled = true;
        this.scrollToBottom();

        try {
            const res = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.AuthHelper.getToken()}`
                },
                body: JSON.stringify({
                    message: text,
                    session_id: this.currentSessionId
                })
            });

            const data = await res.json();
            this.hideTypingIndicator();
            this.isTyping = false;
            this.sendBtn.disabled = false;

            if (data.success) {
                // Update session ID if it's a new chat
                if (!this.currentSessionId && data.data.session_id) {
                    this.currentSessionId = data.data.session_id;
                    this.loadSessions(); // Reload sidebar
                }

                // Prepare metadata cho tin nhắn trả về
                const meta = {
                    tools_used: data.data.tools_used,
                    processing_ms: data.data.processing_ms
                };
                
                this.appendMessage('assistant', data.data.reply, meta);
            } else {
                this.appendMessage('assistant', `Lỗi: ${data.message || 'Không thể kết nối AI Server'}`);
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.isTyping = false;
            this.sendBtn.disabled = false;
            this.appendMessage('assistant', 'Lỗi kết nối tới Server. Vui lòng thử lại sau.');
        }
    }

    appendMessage(role, content, meta = null) {
        const div = document.createElement('div');
        div.className = `ai-message ${role} fade-in`;
        
        let metaHtml = '';
        if (role === 'assistant' && meta) {
            let toolsStr = '';
            if (meta.tools_used && meta.tools_used.length > 0) {
                // Lọc bỏ prefix "tools_used:" nếu model trả về raw
                const parsedTools = meta.tools_used.map(t => {
                    if(typeof t === 'string' && t.startsWith('tools_used: [')) {
                         try { return JSON.parse(t.replace('tools_used: ', '')); } catch(e){ return t; }
                    }
                    return t;
                }).flat();
                
                toolsStr = ` Sử dụng ${parsedTools.length} tools `;
            }
            if (meta.processing_ms || toolsStr) {
                 metaHtml = `<div class="ai-tool-badge">
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                 </svg>
                                 ${toolsStr} ${meta.processing_ms ? `(${meta.processing_ms}ms)` : ''}
                             </div>`;
            }
        }

        const avatarSvg = role === 'user' 
            ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;

        div.innerHTML = `
            <div class="ai-avatar">${avatarSvg}</div>
            <div>
                <div class="ai-message-content">${this.parseMarkdown(content)}</div>
                ${metaHtml}
            </div>
        `;
        this.messagesEl.appendChild(div);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'ai-message assistant ai-typing-msg';
        div.innerHTML = `
            <div class="ai-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div class="ai-message-content ai-typing">
                <span></span><span></span><span></span>
            </div>
        `;
        this.messagesEl.appendChild(div);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingMsg = this.messagesEl.querySelector('.ai-typing-msg');
        if (typingMsg) typingMsg.remove();
    }

    scrollToBottom() {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    parseMarkdown(text) {
        if (!text) return '';
        // Basic Markdown parser for AI Response
        let html = this.escapeHTML(text);
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Inline code
        html = html.replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:2px 4px;border-radius:4px;font-family:monospace;color:#dc2626;">$1</code>');
        // Line breaks
        html = html.replace(/\n/g, '<br/>');
        // Headers (### Header)
        html = html.replace(/### (.*?)<br\/>/g, '<h4 style="margin:12px 0 8px 0;font-size:15px;color:#0f172a;">$1</h4>');
        html = html.replace(/## (.*?)<br\/>/g, '<h3 style="margin:16px 0 8px 0;font-size:16px;color:#0f172a;">$1</h3>');

        // Note: Khó parse Tables bằng regex tĩnh một cách hoàn hảo, nhưng ta xử lý cơ bản
        // hoặc để nguyên (vì AI đã cố gắng format dễ đọc)
        
        return html;
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
}

// Khởi tạo Widget khi DOM load xong
document.addEventListener('DOMContentLoaded', () => {
    // Chỉ khởi tạo nếu user đã đăng nhập
    if (window.AuthHelper && window.AuthHelper.isAuthenticated()) {
        window.aiChatWidget = new AIChatWidget();
    }
});
