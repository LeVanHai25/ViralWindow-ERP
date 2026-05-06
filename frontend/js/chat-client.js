/**
 * CHAT CLIENT v4 — Enhanced with Status, Presence, Reactions, Mentions, Pin
 */
const API_BASE = window.API_BASE || '/api';
const SERVER_BASE = window.SERVER_BASE || API_BASE.replace('/api', '');
const SOCKET_URL = SERVER_BASE;
const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','🔥'];

// =====================================================
// ICONS — Lucide SVG inline (không phụ thuộc emoji font)
// =====================================================
const ICONS = {
    users:      `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    pin:        `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
    pin_lg:     `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="1.5"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
    paperclip:  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
    paperclip_lg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="1.5"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
    image_lg:   `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    link_lg:    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    smile:      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    pencil:     `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
    search:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:5px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    loader:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;animation:spin .8s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
    file:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#6366f1" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    download:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    link:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#6366f1" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    user_plus:  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
    crown:      `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`,
    shield:     `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#6366f1" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    user_sm:    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    upload:     `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#6366f1" stroke-width="1.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
    msg_square: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:5px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    users_tab:  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    image_tab:  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    file_tab:   `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    link_tab:   `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    pin_tab:    `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
};

let socket=null, currentConversationId=null, currentConversation=null;
let currentUserId=null, currentUserName='', currentUserAvatar='';
let conversations=[], allUsers=[], oldestMessageId=null, isLoadingMore=false;
let onlineUserIds = new Set();
let mentionDropdown = null;
let replyingTo = null; // {id, sender_name, content}
let currentGroupMembers = []; // members of current group (for @mentions)
window._msgData = {}; // msg id -> {sender_name, content} for context menu

function resolveFileUrl(u){if(!u)return '';if(u.startsWith('http://')||u.startsWith('https://')||u.startsWith('data:'))return u;return SERVER_BASE+(u.startsWith('/')?'':'/')+u;}
function escHtml(s){if(!s)return '';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function linkify(t,c){c=c||'#6366f1';return t.replace(/(https?:\/\/[^\s<]+)/g,`<a href="$1" target="_blank" style="color:${c};text-decoration:underline;word-break:break-all;" onclick="event.stopPropagation()">$1</a>`);}
function formatTime(ds){if(!ds)return '';const d=new Date(ds),now=new Date(),diff=now-d;if(diff<60000)return 'Vừa xong';if(diff<3600000)return Math.floor(diff/60000)+' phút';if(diff<86400000)return d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});if(diff<604800000){return['CN','T2','T3','T4','T5','T6','T7'][d.getDay()];}return d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'});}
function formatLastSeen(ds){if(!ds)return 'Không rõ';const d=new Date(ds),now=new Date(),diff=now-d;if(diff<60000)return 'vừa xong';if(diff<3600000)return Math.floor(diff/60000)+' phút trước';if(diff<86400000)return Math.floor(diff/3600000)+' giờ trước';return d.toLocaleDateString('vi-VN');}
function playNotificationSound(){
    if (window.playChatNotification) {
        window.playChatNotification();
    } else {
        try{const c=new(window.AudioContext||window.webkitAudioContext)();const o=c.createOscillator();const g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=800;g.gain.value=0.1;o.start();o.stop(c.currentTime+0.1);}catch(e){}
    }
}

// INIT
function initChat(){
    const token=sessionStorage.getItem('token');
    if(!token){window.location.href='login.html';return;}
    // Read user info from sessionStorage FIRST (reliable, no atob needed)
    const u=JSON.parse(sessionStorage.getItem('user')||'{}');
    currentUserId=String(u.id||'');
    currentUserName=u.full_name||'Tôi';
    currentUserAvatar=u.avatar_url||'';
    // Fallback: try JWT decode if sessionStorage user has no id
    if(!currentUserId||currentUserId==='undefined'||currentUserId==='null'||currentUserId===''){
        try{let payload=token.split('.')[1];payload=payload.replace(/-/g,'+').replace(/_/g,'/');const p=JSON.parse(atob(payload));currentUserId=String(p.id||'');currentUserName=currentUserName||p.full_name||'Tôi';}catch(e){console.error('[Chat] JWT decode fallback error:',e);}
    }
    console.log('[Chat] currentUserId=',currentUserId,'type=',typeof currentUserId);

    socket=io(SOCKET_URL,{auth:{token},reconnectionDelay:1000,reconnectionDelayMax:5000,reconnectionAttempts:10});
    socket.on('connect',()=>{const el=document.getElementById('connectionStatus');if(el){el.innerHTML='<span class="status-dot online"></span> Đã kết nối';el.style.color='#22c55e';}});
    socket.on('disconnect',()=>{const el=document.getElementById('connectionStatus');if(el){el.innerHTML='<span class="status-dot offline"></span> Mất kết nối';el.style.color='#ef4444';}});
    socket.on('connect_error',()=>{const el=document.getElementById('connectionStatus');if(el)el.innerHTML='<span class="status-dot warning"></span> Lỗi';});
    socket.on('new_message',handleNewMessage);
    socket.on('user_typing',handleTyping);
    socket.on('user_stop_typing',handleStopTyping);
    socket.on('read_receipt',handleReadReceipt);
    socket.on('user_online',(d)=>{onlineUserIds.add(d.userId);updatePresenceUI();});
    socket.on('user_offline',(d)=>{onlineUserIds.delete(d.userId);updatePresenceUI();});
    socket.on('reaction_update',handleReactionUpdate);
    socket.on('pin_update',()=>{if(currentConversationId)loadMessages(currentConversationId);});
    socket.on('mention_notification',(d)=>{if(d.userId===currentUserId){playNotificationSound();if(window.updateChatBadge)window.updateChatBadge();}});
    socket.on('error',(d)=>console.error('Socket error:',d.message));
    document.addEventListener('submit',(e)=>{e.preventDefault();return false;},true);
    loadConversations();loadUsers();injectStyles();setupDragDrop();
}

// CONVERSATIONS
async function loadConversations(){try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations`,{headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(data.success){conversations=data.data;renderConversations();}}catch(e){}}

function renderConversations(filter=''){
    const list=document.getElementById('conversationsList');if(!list)return;
    const filtered=filter?conversations.filter(c=>(c.display_name||'').toLowerCase().includes(filter.toLowerCase())):conversations;
    if(!filtered.length){list.innerHTML='<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="margin-bottom:8px;display:flex;justify-content:center;">'+ICONS.msg_square+'</div><p style="font-size:13px;">'+(filter?'Không tìm thấy':'Chưa có cuộc trò chuyện')+'</p></div>';return;}
    list.innerHTML=filtered.map(c=>{
        const init=(c.display_name||'?')[0].toUpperCase();const isActive=c.id===currentConversationId;
        const time=c.last_message_at?formatTime(c.last_message_at):'';
        const unread=c.unread_count>0?`<div class="chat-conv-badge">${c.unread_count}</div>`:'';
        const av=c.display_avatar?`<img src="${resolveFileUrl(c.display_avatar)}" alt="">`:init;
        const isOnline=c.type==='private'&&c.other_user_id&&onlineUserIds.has(c.other_user_id);
        const onlineDot=isOnline?'<span style="position:absolute;bottom:0;right:0;width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid white;"></span>':'';
        return `<div class="chat-conversation-item ${isActive?'active':''}" onclick="openConversation(${c.id})">
            <div class="chat-conv-avatar" style="position:relative;">${av}${onlineDot}</div>
            <div class="chat-conv-info"><div class="chat-conv-name">${c.type==='group'?ICONS.users:''}${escHtml(c.display_name||'')}</div><div class="chat-conv-preview">${escHtml(c.last_message_preview||'')}</div></div>
            <div class="chat-conv-meta"><div class="chat-conv-time">${time}</div>${unread}</div>
        </div>`;
    }).join('');
}

async function openConversation(convId){
    currentConversationId=convId;oldestMessageId=null;
    const conv=conversations.find(c=>c.id===convId);if(!conv)return;currentConversation=conv;
    socket.emit('join_conversation',{conversationId:convId});
    const hAv=document.getElementById('chatWindowHeaderAvatar'),hNm=document.getElementById('chatWindowHeaderName'),hSub=document.getElementById('chatWindowHeaderSub');
    if(hNm)hNm.textContent=conv.display_name||'Chat';
    if(hAv){if(conv.display_avatar){hAv.innerHTML=`<img src="${resolveFileUrl(conv.display_avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;}else{const colors=['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4'];hAv.style.background=colors[convId%colors.length];hAv.innerHTML=(conv.display_name||'?')[0].toUpperCase();}}
    // Presence in header
    if(hSub){
        if(conv.type==='private'&&conv.other_user_id){
            hSub.innerHTML=onlineUserIds.has(conv.other_user_id)?'<span class="status-dot online"></span> Online':'<span class="status-dot offline"></span> Offline';
            hSub.style.color=onlineUserIds.has(conv.other_user_id)?'#22c55e':'#94a3b8';
        }else{hSub.textContent=`${conv.member_count||0} thành viên`;hSub.style.color='';}
    }
    document.getElementById('chatEmptyState').style.display='none';
    document.getElementById('chatActiveWindow').style.display='flex';
    document.querySelector('.chat-container')?.classList.add('show-chat');
    renderConversations();await loadMessages(convId);conv.unread_count=0;renderConversations();
    // Load group members for @mentions (only for groups)
    currentGroupMembers=[];
    if(conv.type==='group'){try{const token=sessionStorage.getItem('token');const mRes=await fetch(`${API_BASE}/chat/conversations/${convId}/members`,{headers:{'Authorization':`Bearer ${token}`}});const mData=await mRes.json();if(mData.success)currentGroupMembers=mData.data;}catch(e){}}
    document.getElementById('chatInput')?.focus();
}

// MESSAGES
async function loadMessages(convId,loadMore=false){
    try{const token=sessionStorage.getItem('token');let url=`${API_BASE}/chat/conversations/${convId}/messages?limit=30`;
    if(loadMore&&oldestMessageId)url+=`&before=${oldestMessageId}`;
    const res=await fetch(url,{headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();
    if(data.success){const area=document.getElementById('messagesArea');if(!area)return;
    if(!loadMore)area.innerHTML='';
    if(data.data.length>0){oldestMessageId=data.data[0].id;const html=data.data.map(renderMessage).join('');
    if(loadMore)area.insertAdjacentHTML('afterbegin',html);else{area.innerHTML=html;area.scrollTop=area.scrollHeight;}}
    else if(!loadMore)area.innerHTML='<div style="text-align:center;padding:40px;color:#94a3b8;"><p>Bắt đầu cuộc trò chuyện!</p></div>';
    if(data.data.length>0){const last=data.data[data.data.length-1];socket.emit('message_read',{messageId:last.id,conversationId:convId});}
    }}catch(e){console.error('loadMessages:',e);}
}

function renderMessage(msg){
    if(msg.type==='system')return `<div class="chat-msg-system">${ICONS.pin} ${escHtml(msg.content)}</div>`;
    const isMe=String(msg.sender_id)===String(currentUserId);
    if(!isMe && msg.sender_name && msg.sender_name===currentUserName) console.warn('[Chat] Name match but ID mismatch! sender_id=',msg.sender_id,typeof msg.sender_id,'currentUserId=',currentUserId,typeof currentUserId);
    const colors=['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4'];
    const avCol=colors[(msg.sender_id||0)%colors.length];
    const avUrl=msg.sender_avatar?resolveFileUrl(msg.sender_avatar):'';
    const av=avUrl?`<img src="${avUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:`<span>${(msg.sender_name||'?')[0].toUpperCase()}</span>`;
    const time=formatTime(msg.created_at);

    let content='';
    if(msg.type==='image'){const u=resolveFileUrl(msg.file_url);content=`<div class="chat-msg-image"><img src="${u}" alt="" onclick="openImageLightbox('${u}')" style="max-width:280px;max-height:200px;border-radius:8px;cursor:pointer;"></div>`;}
    else if(msg.type==='file'){const u=resolveFileUrl(msg.file_url);const sz=msg.file_size?`(${(msg.file_size/1024).toFixed(0)}KB)`:'';content=`<a href="${u}" target="_blank" style="color:${isMe?'#e0e7ff':'#6366f1'};text-decoration:underline;display:inline-flex;align-items:center;gap:4px;">${ICONS.paperclip} ${escHtml(msg.file_name)} ${sz}</a>`;}
    else{content=renderMentions(linkify(escHtml(msg.content||''),isMe?'#d4d4ff':'#6366f1'));}

    // Reply preview (if this message is a reply)
    let replyHtml='';
    if(msg.reply_to_id&&(msg.reply_content||msg.reply_sender_name)){
        replyHtml=`<div onclick="scrollToMessage(${msg.reply_to_id})" style="padding:6px 10px;margin-bottom:6px;border-left:3px solid #6366f1;background:${isMe?'rgba(255,255,255,0.15)':'#f1f5f9'};border-radius:0 6px 6px 0;cursor:pointer;font-size:12px;"><div style="font-weight:600;color:${isMe?'#e0e7ff':'#6366f1'};margin-bottom:2px;">${escHtml(msg.reply_sender_name||'')}</div><div style="color:${isMe?'#c7d2fe':'#64748b'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;">${escHtml((msg.reply_content||'').substring(0,80))}</div></div>`;
    }

    const sender=!isMe?`<div class="chat-msg-sender">${escHtml(msg.sender_name)}</div>`:'';
    const pin=msg.is_pinned?`<span style="display:inline-flex;align-items:center;">${ICONS.pin}</span> `:'';
    const status=isMe?`<span class="msg-status" data-msg-id="${msg.id}" style="font-size:10px;margin-left:4px;color:${msg.all_read?'#3b82f6':'#94a3b8'};">${msg.all_read?'✓✓':'✓'}</span>`:'';
    const reactions=renderReactionBadges(msg.reactions||[],msg.id);
    const emojiBtn=`<span class="msg-emoji-trigger" onclick="event.stopPropagation();toggleEmojiPicker(${msg.id})" style="display:none;position:absolute;top:-8px;${isMe?'left:-30px':'right:-30px'};cursor:pointer;background:white;border-radius:50%;width:24px;height:24px;box-shadow:0 1px 4px rgba(0,0,0,0.15);display:none;align-items:center;justify-content:center;">${ICONS.smile}</span>`;
    // Store msg data in global map for context menu (avoids inline string escaping bugs)
    window._msgData[msg.id]={sender_name:msg.sender_name||'',content:(msg.content||msg.file_name||'').substring(0,60)};
    const ctx=`<span class="msg-ctx-trigger" onclick="event.stopPropagation();showMsgContextMenu(event,${msg.id},${msg.is_pinned?1:0})" style="display:none;position:absolute;top:-8px;${isMe?'left:-8px':'right:-8px'};cursor:pointer;font-size:12px;background:white;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;box-shadow:0 1px 4px rgba(0,0,0,0.15);">⋯</span>`;

    return `<div class="chat-message ${isMe?'me':''}" data-msg-id="${msg.id}" onmouseenter="this.querySelectorAll('.msg-emoji-trigger,.msg-ctx-trigger').forEach(e=>e.style.display='block')" onmouseleave="this.querySelectorAll('.msg-emoji-trigger,.msg-ctx-trigger').forEach(e=>e.style.display='none')">
        <div class="chat-msg-avatar" style="background:${isMe?'linear-gradient(135deg,#6366f1,#8b5cf6)':avCol}">${av}</div>
        <div class="chat-msg-bubble" style="position:relative;">${emojiBtn}${ctx}${sender}${replyHtml}${pin}${content}<div class="chat-msg-time">${time}${status}</div>${reactions}</div>
    </div>`;
}

function renderMentions(text) {
    if (!text) return '';
    let result = text;
    // 1. Dò tìm tên đầy đủ của nhân sự trong mảng allUsers có sẵn
    if (allUsers && allUsers.length > 0) {
        // Sắp xếp tên dài xuống trước vòng lặp để tránh việc "Hoa" nuốt mất "Hoa Kế Toán"
        const sortedUsers = [...allUsers]
            .filter(u => u.full_name)
            .sort((a, b) => b.full_name.length - a.full_name.length);

        sortedUsers.forEach(u => {
            // Escape các ký tự đặc biệt trong Tên để Regex không hiểu lầm
            const safeName = u.full_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Tìm chính xác ký tự @ + Tên Mở Rộng
            const regex = new RegExp(`@${safeName}(?=[\\s\\.,!\\?"'\n]|$)`, 'g');
            result = result.replace(regex, `<span style="background:#dbeafe;color:#2563eb;padding:0 3px;border-radius:4px;font-weight:600;cursor:pointer;">@${u.full_name}</span>`);
        });
    }

    // 2. Fallback cho các từ khóa một từ như @admin, @all (chỉ match những chữ chưa bị bọc thẻ span)
    // Lưu ý: Regex này lấy phần "@text" chưa nằm trong thẻ <span>
    result = result.replace(/(^|[^>])@(\w+)/g, '$1<span style="background:#dbeafe;color:#2563eb;padding:0 3px;border-radius:4px;font-weight:600;cursor:pointer;">@$2</span>');
    return result;
}

function renderReactionBadges(reactions,msgId){
    if(!reactions||!reactions.length)return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">${reactions.map(r=>{
        const myReaction=r.users?.some(u=>u.id===currentUserId);
        return `<span onclick="event.stopPropagation();toggleReaction(${msgId},'${r.emoji}')" style="display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:12px;font-size:12px;cursor:pointer;border:1px solid ${myReaction?'#6366f1':'#e2e8f0'};background:${myReaction?'#eef2ff':'#f8fafc'};">${r.emoji}<span style="font-size:10px;color:#64748b;">${r.count}</span></span>`;
    }).join('')}</div>`;
}

// SEND MESSAGE
function sendMessage(){try{const input=document.getElementById('chatInput');if(!input)return false;const content=input.value.trim();if(!content||!currentConversationId)return false;if(!socket||!socket.connected){alert('Mất kết nối');return false;}const msgData={conversationId:currentConversationId,content,type:'text'};if(replyingTo){msgData.replyToId=replyingTo.id;}socket.emit('send_message',msgData);input.value='';input.style.height='auto';cancelReply();hideMentionDropdown();try{socket.emit('stop_typing',{conversationId:currentConversationId});}catch(e){}return false;}catch(e){console.error('sendMessage:',e);return false;}}

// REPLY
function setReply(msgId, senderName, contentPreview) {
    replyingTo = { id: msgId, sender_name: senderName, content: contentPreview };
    // Remove old bar if exists
    const oldBar = document.getElementById('replyPreviewBar');
    if (oldBar) oldBar.remove();
    // Create reply preview bar
    const wrapper = document.querySelector('.chat-input-area');
    if (!wrapper) return;
    const bar = document.createElement('div');
    bar.id = 'replyPreviewBar';
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f1f5f9;border-left:3px solid #6366f1;border-radius:8px 8px 0 0;margin:0 12px;';
    bar.innerHTML = `<div style="flex:1;min-width:0;"><div style="font-size:11px;font-weight:600;color:#6366f1;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Trả lời ${escHtml(senderName)}</div><div style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(contentPreview)}</div></div><span onclick="cancelReply()" style="cursor:pointer;color:#94a3b8;padding:4px;font-size:18px;line-height:1;">×</span>`;
    wrapper.insertBefore(bar, wrapper.firstChild);
    document.getElementById('chatInput')?.focus();
}
function cancelReply() {
    replyingTo = null;
    const bar = document.getElementById('replyPreviewBar');
    if (bar) bar.remove();
}
function scrollToMessage(msgId){const el=document.querySelector(`[data-msg-id="${msgId}"]`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.transition='background 0.3s';el.style.background='rgba(99,102,241,0.1)';setTimeout(()=>{el.style.background='';},1500);}}

// FILE UPLOAD
async function uploadChatFile(){if(!currentConversationId){alert('Chọn cuộc trò chuyện');return;}const fi=document.createElement('input');fi.type='file';fi.accept='image/*,.pdf,.docx,.xlsx,.txt,.zip';fi.onchange=async(e)=>{const f=e.target.files[0];if(!f)return;if(f.size>10*1024*1024){alert('File quá lớn (max 10MB)');return;}const fd=new FormData();fd.append('file',f);try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/upload`,{method:'POST',headers:{'Authorization':`Bearer ${token}`},body:fd});const data=await res.json();if(data.success)socket.emit('send_message',{conversationId:currentConversationId,content:f.name,type:data.data.type,fileData:data.data});else alert(data.message);}catch(e){alert('Lỗi upload');}};fi.click();}

// REACTIONS
function toggleEmojiPicker(msgId){
    document.querySelectorAll('.emoji-picker-popup').forEach(e=>e.remove());
    const msgEl=document.querySelector(`[data-msg-id="${msgId}"]`);if(!msgEl)return;
    const picker=document.createElement('div');picker.className='emoji-picker-popup';
    picker.style.cssText='position:absolute;top:-40px;left:50%;transform:translateX(-50%);background:white;border-radius:24px;padding:4px 8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;gap:2px;z-index:1000;';
    picker.innerHTML=REACTION_EMOJIS.map(e=>`<span onclick="event.stopPropagation();toggleReaction(${msgId},'${e}');this.parentElement.remove();" style="cursor:pointer;font-size:20px;padding:4px;border-radius:8px;transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">${e}</span>`).join('');
    const bubble=msgEl.querySelector('.chat-msg-bubble');if(bubble){bubble.style.position='relative';bubble.appendChild(picker);}
    setTimeout(()=>{document.addEventListener('click',()=>picker.remove(),{once:true});},50);
}

function toggleReaction(msgId,emoji){if(!socket)return;socket.emit('add_reaction',{messageId:msgId,emoji,conversationId:currentConversationId});}

function handleReactionUpdate(data){
    const msgEl=document.querySelector(`[data-msg-id="${data.messageId}"]`);if(!msgEl)return;
    const bubble=msgEl.querySelector('.chat-msg-bubble');if(!bubble)return;
    const oldReactions=bubble.querySelector('div[style*="flex-wrap"]');
    const newHtml=renderReactionBadges(data.reactions,data.messageId);
    if(oldReactions)oldReactions.outerHTML=newHtml;
    else if(newHtml)bubble.insertAdjacentHTML('beforeend',newHtml);
}

// MESSAGE STATUS
function handleReadReceipt(data){
    const el=document.querySelector(`.msg-status[data-msg-id="${data.messageId}"]`);
    if(el){el.textContent='✓✓';el.style.color='#3b82f6';}
}

// PRESENCE
function updatePresenceUI(){
    renderConversations();
    if(currentConversation){
        const hSub=document.getElementById('chatWindowHeaderSub');
        if(hSub&&currentConversation.type==='private'&&currentConversation.other_user_id){
            const online=onlineUserIds.has(currentConversation.other_user_id);
            hSub.innerHTML=online?'<span class="status-dot online"></span> Online':'<span class="status-dot offline"></span> Offline';hSub.style.color=online?'#22c55e':'#94a3b8';
        }
    }
}

function handleNewMessage(msg){try{if(msg.conversation_id===currentConversationId){const area=document.getElementById('messagesArea');if(area){area.insertAdjacentHTML('beforeend',renderMessage(msg));area.scrollTop=area.scrollHeight;}socket.emit('message_read',{messageId:msg.id,conversationId:msg.conversation_id});}const conv=conversations.find(c=>c.id===msg.conversation_id);if(conv){conv.last_message_at=msg.created_at;conv.last_message_preview=msg.type==='text'?`${msg.sender_name}: ${(msg.content||'').substring(0,50)}`:`${msg.sender_name}: 📎 ${msg.file_name||'File'}`;if(msg.conversation_id!==currentConversationId)conv.unread_count=(conv.unread_count||0)+1;conversations.sort((a,b)=>new Date(b.last_message_at||0)-new Date(a.last_message_at||0));renderConversations();}else loadConversations();if(String(msg.sender_id)!==String(currentUserId))playNotificationSound();if(window.updateChatBadge)window.updateChatBadge();}catch(e){}}

let typingUsers=new Map();
function handleTyping(d){if(d.conversationId!==currentConversationId)return;typingUsers.set(d.userId,d.userName);updateTypingUI();}
function handleStopTyping(d){typingUsers.delete(d.userId);updateTypingUI();}
function updateTypingUI(){const el=document.getElementById('typingIndicator');if(!el)return;if(!typingUsers.size){el.innerHTML='';return;}el.innerHTML=`${ICONS.pencil} ${Array.from(typingUsers.values()).join(', ')} đang gõ...`;}

// @MENTION AUTOCOMPLETE
function handleInputKeydown(e){
    if(mentionDropdown&&mentionDropdown.style.display!=='none'){
        if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Enter'||e.key==='Tab'){
            e.preventDefault();handleMentionNav(e.key);return false;
        }
    }
    // Note: Enter key is handled by the HTML script block, not here
    if(currentConversationId&&e.key!=='Enter')try{socket.emit('typing',{conversationId:currentConversationId});}catch(e){}
    setTimeout(()=>checkMentionTrigger(),10);
}

function checkMentionTrigger(){
    // @mentions only work in group conversations
    if(!currentConversation||currentConversation.type!=='group'){hideMentionDropdown();return;}
    const input=document.getElementById('chatInput');if(!input)return;
    const v=input.value,pos=input.selectionStart;
    const before=v.substring(0,pos);const atIdx=before.lastIndexOf('@');
    if(atIdx===-1||atIdx<before.lastIndexOf(' ',atIdx)){hideMentionDropdown();return;}
    const query=before.substring(atIdx+1).toLowerCase();
    // Filter from currentGroupMembers (not allUsers)
    const members=currentGroupMembers.filter(u=>u.user_id!==currentUserId&&u.full_name&&u.full_name.toLowerCase().includes(query));
    if(!members.length){hideMentionDropdown();return;}
    // Map to format expected by showMentionDropdown
    showMentionDropdown(members.map(m=>({id:m.user_id,full_name:m.full_name,avatar_url:m.avatar_url})),atIdx);
}

function showMentionDropdown(users,atIdx){
    if(!mentionDropdown){mentionDropdown=document.createElement('div');mentionDropdown.id='mentionDropdown';mentionDropdown.style.cssText='position:absolute;bottom:100%;left:0;width:250px;max-height:180px;overflow-y:auto;background:white;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:100;margin-bottom:4px;';const wrapper=document.querySelector('.chat-input-wrapper');if(wrapper){wrapper.style.position='relative';wrapper.appendChild(mentionDropdown);}}
    mentionDropdown.innerHTML=users.slice(0,6).map((u,i)=>`<div class="mention-item${i===0?' active':''}" data-name="${escHtml(u.full_name)}" data-at-idx="${atIdx}" onclick="selectMention(this)" onmouseenter="this.parentElement.querySelectorAll('.mention-item').forEach(e=>e.classList.remove('active'));this.classList.add('active');" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;${i===0?'background:#f1f5f9;':''}"><span style="font-weight:600;">@${escHtml(u.full_name)}</span></div>`).join('');
    mentionDropdown.style.display='block';
}

function hideMentionDropdown(){if(mentionDropdown)mentionDropdown.style.display='none';}

function handleMentionNav(key){
    const items=mentionDropdown.querySelectorAll('.mention-item');const activeIdx=[...items].findIndex(i=>i.classList.contains('active'));
    if(key==='Enter'||key==='Tab'){const active=items[activeIdx];if(active)selectMention(active);return;}
    items.forEach(i=>i.classList.remove('active'));
    const next=key==='ArrowDown'?Math.min(activeIdx+1,items.length-1):Math.max(activeIdx-1,0);
    items[next].classList.add('active');items[next].style.background='#f1f5f9';
    if(items[activeIdx])items[activeIdx].style.background='';
}

function selectMention(el){
    const name=el.dataset.name,atIdx=parseInt(el.dataset.atIdx);
    const input=document.getElementById('chatInput');if(!input)return;
    const v=input.value;input.value=v.substring(0,atIdx)+'@'+name+' '+v.substring(input.selectionStart);
    hideMentionDropdown();input.focus();
}

// PIN & REPLY CONTEXT MENU — uses global _msgData map (no inline string params)
function showMsgContextMenu(evt,msgId,isPinned){
    document.querySelectorAll('.msg-ctx-menu').forEach(e=>e.remove());
    const menu=document.createElement('div');menu.className='msg-ctx-menu';
    menu.style.cssText=`position:fixed;left:${evt.clientX}px;top:${evt.clientY}px;background:white;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:1000;min-width:160px;padding:4px;`;
    // Reply button uses data-msg-id and reads from _msgData
    const replyBtn=document.createElement('div');replyBtn.textContent='↩️ Trả lời';replyBtn.style.cssText='padding:8px 12px;cursor:pointer;font-size:13px;border-radius:6px;';replyBtn.onmouseover=function(){this.style.background='#f1f5f9';};replyBtn.onmouseout=function(){this.style.background='';};replyBtn.onclick=function(){document.querySelectorAll('.msg-ctx-menu').forEach(e=>e.remove());const d=window._msgData[msgId]||{};setReply(msgId,d.sender_name||'',d.content||'');};
    const pinBtn=document.createElement('div');pinBtn.innerHTML=`<span style="display:inline-flex;align-items:center;">${ICONS.pin} ${isPinned?'Bỏ ghim':'Ghim tin nhắn'}</span>`;pinBtn.style.cssText='padding:8px 12px;cursor:pointer;font-size:13px;border-radius:6px;';pinBtn.onmouseover=function(){this.style.background='#f1f5f9';};pinBtn.onmouseout=function(){this.style.background='';};pinBtn.onclick=function(){pinMessage(msgId);};
    menu.appendChild(replyBtn);menu.appendChild(pinBtn);
    document.body.appendChild(menu);
    setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),50);
}

async function pinMessage(msgId){
    try{const token=sessionStorage.getItem('token');await fetch(`${API_BASE}/chat/messages/${msgId}/pin`,{method:'PUT',headers:{'Authorization':`Bearer ${token}`}});if(currentConversationId)loadMessages(currentConversationId);}catch(e){}
    document.querySelectorAll('.msg-ctx-menu').forEach(e=>e.remove());
}

// SEARCH
function showSearchPanel(){const ov=document.createElement('div');ov.className='chat-modal-overlay';ov.onclick=(e)=>{if(e.target===ov)ov.remove();};ov.innerHTML=`<div class="chat-modal" style="width:500px;"><h3 style="display:flex;align-items:center;margin-top:0;">${ICONS.search} Tìm kiếm</h3><input type="text" id="searchMsgInput" placeholder="Nhập từ khóa..." autofocus onkeydown="if(event.key==='Enter'){event.preventDefault();searchMessages();}"><div style="display:flex;gap:8px;margin-bottom:16px;"><button type="button" class="btn-primary" style="flex:1;" onclick="searchMessages()">Tìm</button></div><div id="searchMsgResults" style="max-height:400px;overflow-y:auto;"><p style="text-align:center;color:#94a3b8;font-size:13px;">Nhập từ khóa</p></div><div class="chat-modal-btns" style="margin-top:16px;"><button type="button" class="btn-cancel" onclick="this.closest('.chat-modal-overlay').remove()">Đóng</button></div></div>`;document.body.appendChild(ov);setTimeout(()=>document.getElementById('searchMsgInput')?.focus(),100);}

async function searchMessages(){const input=document.getElementById('searchMsgInput'),results=document.getElementById('searchMsgResults');if(!input||!results)return;const q=input.value.trim();if(!q)return;results.innerHTML='<p style="text-align:center;color:#94a3b8;">⏳ Đang tìm...</p>';try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/search?q=${encodeURIComponent(q)}`,{headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(!data.success||!data.data.length){results.innerHTML='<p style="text-align:center;color:#94a3b8;">Không tìm thấy</p>';return;}results.innerHTML=data.data.map(m=>`<div style="padding:10px;border-bottom:1px solid #e2e8f0;cursor:pointer;border-radius:8px;" onclick="document.querySelector('.chat-modal-overlay').remove();openConversation(${m.conversation_id})" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><strong style="font-size:13px;color:#6366f1;">${escHtml(m.sender_name)}</strong><span style="font-size:11px;color:#94a3b8;">${formatTime(m.created_at)}</span></div><p style="font-size:13px;color:#1e293b;margin:0;">${escHtml(m.content)}</p></div>`).join('');}catch(e){results.innerHTML='<p style="text-align:center;color:#ef4444;">Lỗi</p>';}}

// INFO PANEL
async function showInfoPanel(){if(!currentConversationId||!currentConversation){alert('Chọn cuộc trò chuyện');return;}let members=[];try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/members`,{headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(data.success)members=data.data;}catch(e){}
const conv=currentConversation,isAdmin=conv.my_role==='owner'||conv.my_role==='admin',isOwner=conv.my_role==='owner';
const avSrc=conv.display_avatar?resolveFileUrl(conv.display_avatar):'';
const avHtml=avSrc?`<img src="${avSrc}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">`:`<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:white;">${(conv.display_name||'?')[0].toUpperCase()}</div>`;
const ov=document.createElement('div');ov.className='chat-modal-overlay';ov.id='infoPanelOverlay';ov.onclick=(e)=>{if(e.target===ov)ov.remove();};
ov.innerHTML=`<div class="chat-modal" style="width:460px;max-height:90vh;overflow-y:auto;"><div style="text-align:center;margin-bottom:20px;">${avHtml}<h3 style="margin:12px 0 4px;font-size:18px;">${escHtml(conv.display_name||'Chat')}</h3><p style="color:#94a3b8;font-size:13px;margin:0;">${conv.type==='group'?`Nhóm · ${members.length} thành viên`:'Tin nhắn riêng'}</p></div><div style="display:flex;border-bottom:2px solid #e2e8f0;margin-bottom:16px;" id="infoTabs"><button type="button" class="info-tab active" onclick="switchInfoTab('members',this)">${ICONS.users_tab} Thành viên</button><button type="button" class="info-tab" onclick="switchInfoTab('images',this)">${ICONS.image_tab} Ảnh</button><button type="button" class="info-tab" onclick="switchInfoTab('files',this)">${ICONS.file_tab} File</button><button type="button" class="info-tab" onclick="switchInfoTab('links',this)">${ICONS.link_tab} Link</button><button type="button" class="info-tab" onclick="switchInfoTab('pinned',this)">${ICONS.pin_tab} Ghim</button></div><div id="infoTabContent" style="min-height:200px;">${renderMembersTab(members,isAdmin,isOwner)}</div><div style="margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0;"><button type="button" onclick="confirmClearHistory()" style="width:100%;padding:10px;border:1px solid #fca5a5;border-radius:10px;background:#fff5f5;color:#dc2626;font-weight:600;cursor:pointer;font-size:13px;margin-bottom:8px;"> Xóa lịch sử</button>${isOwner||conv.type==='private'?`<button type="button" onclick="confirmDeleteConversation()" style="width:100%;padding:10px;border:1px solid #fca5a5;border-radius:10px;background:#dc2626;color:white;font-weight:600;cursor:pointer;font-size:13px;"> Xóa cuộc trò chuyện</button>`:''}</div><div class="chat-modal-btns" style="margin-top:16px;"><button type="button" class="btn-cancel" onclick="this.closest('.chat-modal-overlay').remove()">Đóng</button></div></div>`;
document.body.appendChild(ov);}

function renderMembersTab(members,isAdmin,isOwner){const rl={owner:`${ICONS.crown} Chủ nhóm`,admin:`${ICONS.shield} Quản trị`,member:`${ICONS.user_sm} Thành viên`};return `<div style="max-height:300px;overflow-y:auto;">${members.map(m=>{const mAv=m.avatar_url?`<img src="${resolveFileUrl(m.avatar_url)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`:`<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;">${(m.full_name||'?')[0].toUpperCase()}</div>`;const onSt=m.online_status==='online'?'<span class="status-dot online" style="margin-left:4px;"></span> Online':(m.last_seen?`<span style="color:#94a3b8;font-size:10px;margin-left:4px;">${formatLastSeen(m.last_seen)}</span>`:'');const rmBtn=(isAdmin||isOwner)&&m.user_id!==currentUserId&&m.role!=='owner'?`<button type="button" onclick="confirmRemoveMember(${m.user_id},'${escHtml(m.full_name).replace(/'/g,"\\'")}')" style="border:none;background:none;color:#ef4444;cursor:pointer;font-size:11px;padding:4px 8px;border-radius:6px;">Xóa</button>`:'';const you=m.user_id===currentUserId?'<span style="font-size:10px;color:#6366f1;margin-left:4px;">Bạn</span>':'';return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">${mAv}<div style="flex:1;"><div style="font-size:14px;font-weight:600;display:flex;align-items:center;">${escHtml(m.full_name)}${you}${onSt}</div><div style="font-size:11px;color:#94a3b8;display:flex;align-items:center;margin-top:2px;">${rl[m.role]||m.role}</div></div>${rmBtn}</div>`;}).join('')}</div>${(isAdmin||isOwner)?`<div style="margin-top:12px;"><button type="button" onclick="showAddMemberModal()" style="display:flex;align-items:center;justify-content:center;width:100%;padding:10px;border:1px dashed #c7d2fe;border-radius:10px;background:none;color:#6366f1;font-weight:600;cursor:pointer;font-size:13px;">${ICONS.user_plus} Thêm thành viên</button></div>`:''}`;}

async function switchInfoTab(tab,btnEl){document.querySelectorAll('#infoTabs .info-tab').forEach(t=>t.classList.remove('active'));if(btnEl)btnEl.classList.add('active');const content=document.getElementById('infoTabContent');if(!content)return;
if(tab==='members'){let members=[];try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/members`,{headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(data.success)members=data.data;}catch(e){}const conv=currentConversation;content.innerHTML=renderMembersTab(members,conv.my_role==='owner'||conv.my_role==='admin',conv.my_role==='owner');return;}
if(tab==='pinned'){content.innerHTML=`<p style="text-align:center;color:#94a3b8;padding:20px;">${ICONS.loader} Đang tải...</p>`;try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/pinned`,{headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(!data.success||!data.data.length){content.innerHTML=`<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="margin-bottom:8px;display:flex;justify-content:center;">${ICONS.pin_lg}</div><p>Chưa có tin nhắn ghim</p></div>`;return;}content.innerHTML=data.data.map(m=>`<div style="padding:10px;border-bottom:1px solid #f1f5f9;border-radius:8px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><strong style="font-size:13px;">${escHtml(m.sender_name)}</strong><span style="font-size:11px;color:#94a3b8;">${formatTime(m.created_at)}</span></div><p style="font-size:13px;margin:0;color:#1e293b;">${escHtml(m.content||m.file_name||'[Media]')}</p></div>`).join('');}catch(e){content.innerHTML='<p style="color:#ef4444;">Lỗi</p>';}return;}
content.innerHTML='<p style="text-align:center;color:#94a3b8;padding:20px;">⏳ Đang tải...</p>';const typeMap={images:'image',files:'file',links:'link'};
try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/media?type=${typeMap[tab]}`,{headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(!data.success||!data.data.length){const icons={images:ICONS.image_lg,files:ICONS.paperclip_lg,links:ICONS.link_lg},labels={images:'ảnh',files:'file',links:'link'};content.innerHTML=`<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="margin-bottom:8px;display:flex;justify-content:center;">${icons[tab]}</div><p>Chưa có ${labels[tab]}</p></div>`;return;}
if(tab==='images')content.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">${data.data.map(m=>{const u=resolveFileUrl(m.file_url);return `<img src="${u}" onclick="openImageLightbox('${u}')" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;">`;}).join('')}</div>`;
else if(tab==='files')content.innerHTML=data.data.map(m=>{const u=resolveFileUrl(m.file_url);return `<a href="${u}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #f1f5f9;text-decoration:none;color:#1e293b;border-radius:8px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''"><div style="width:40px;height:40px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;">${ICONS.file}</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(m.file_name||'File')}</div><div style="font-size:11px;color:#94a3b8;">${m.file_size?(m.file_size/1024).toFixed(0)+'KB':''} · ${escHtml(m.sender_name)}</div></div><span>${ICONS.download}</span></a>`;}).join('');
else{const rx=/(https?:\/\/[^\s<]+)/g;let h='';data.data.forEach(m=>{(m.content||'').match(rx)?.forEach(url=>{h+=`<a href="${url}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #f1f5f9;text-decoration:none;color:#1e293b;border-radius:8px;"><div style="width:40px;height:40px;background:#f0f9ff;border-radius:8px;display:flex;align-items:center;justify-content:center;">${ICONS.link}</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#6366f1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(url)}</div><div style="font-size:11px;color:#94a3b8;">${escHtml(m.sender_name)}</div></div></a>`;});});content.innerHTML=h||'<p style="text-align:center;color:#94a3b8;padding:20px;">Chưa có link</p>';}}catch(e){content.innerHTML='<p style="color:#ef4444;">Lỗi</p>';}}

// MEMBER MANAGEMENT
async function showAddMemberModal(){document.getElementById('infoPanelOverlay')?.remove();const users=allUsers.filter(u=>u.id!==currentUserId);const ov=document.createElement('div');ov.className='chat-modal-overlay';ov.onclick=(e)=>{if(e.target===ov)ov.remove();};ov.innerHTML=`<div class="chat-modal"><h3 style="display:flex;align-items:center;">${ICONS.user_plus} Thêm thành viên</h3><div class="chat-modal-user-list">${users.map(u=>`<label class="chat-modal-user-item"><input type="checkbox" value="${u.id}" name="add_member"><div class="chat-conv-avatar" style="width:32px;height:32px;font-size:12px;">${u.avatar_url?`<img src="${resolveFileUrl(u.avatar_url)}">`:(u.full_name||'?')[0].toUpperCase()}</div><span style="font-size:14px;">${escHtml(u.full_name)}</span></label>`).join('')}</div><div class="chat-modal-btns"><button type="button" class="btn-cancel" onclick="this.closest('.chat-modal-overlay').remove()">Huỷ</button><button type="button" class="btn-primary" onclick="addMembers()">Thêm</button></div></div>`;document.body.appendChild(ov);}
async function addMembers(){const ck=Array.from(document.querySelectorAll('input[name="add_member"]:checked')).map(i=>parseInt(i.value));if(!ck.length){alert('Chọn ít nhất 1 người');return;}const token=sessionStorage.getItem('token');let n=0;for(const uid of ck){try{await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/members`,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({user_id:uid})});n++;}catch(e){}}document.querySelector('.chat-modal-overlay')?.remove();if(n>0){alert(`Đã thêm ${n} thành viên`);loadConversations();}}
async function confirmRemoveMember(uid,name){
    const confirmed = await confirm(`Xóa "${name}" khỏi nhóm?`);
    if(!confirmed) return;
    removeMember(uid);
}
async function removeMember(uid){try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/members/${uid}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(data.success){alert('Đã xóa');document.getElementById('infoPanelOverlay')?.remove();loadConversations();showInfoPanel();}else alert(data.message);}catch(e){alert('Lỗi');}}

// DELETE
async function confirmClearHistory(){
    const confirmed = await confirm('Xóa toàn bộ lịch sử?\nKhông thể hoàn tác!');
    if(!confirmed) return;
    clearChatHistory();
}
async function clearChatHistory(){try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/messages`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(data.success){alert('Đã xóa lịch sử');document.getElementById('infoPanelOverlay')?.remove();document.getElementById('messagesArea').innerHTML='<div style="text-align:center;padding:40px;color:#94a3b8;"><p>Lịch sử đã xóa</p></div>';loadConversations();}else alert(data.message);}catch(e){alert('Lỗi');}}
async function confirmDeleteConversation(){
    const confirmed = await confirm('Xóa vĩnh viễn cuộc trò chuyện?\nKhông thể hoàn tác!');
    if(!confirmed) return;
    deleteConversation();
}
async function deleteConversation(){try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations/${currentConversationId}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(data.success){alert('Đã xóa');document.getElementById('infoPanelOverlay')?.remove();currentConversationId=null;currentConversation=null;document.getElementById('chatActiveWindow').style.display='none';document.getElementById('chatEmptyState').style.display='flex';loadConversations();}else alert(data.message);}catch(e){alert('Lỗi');}}

// NEW CHAT
async function loadUsers(){try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/users`,{headers:{'Authorization':`Bearer ${token}`}});const data=await res.json();if(data.success){allUsers=data.data;data.data.forEach(u=>{if(u.is_online)onlineUserIds.add(u.id);});}}catch(e){}}
function showNewChatModal(){const users=allUsers.filter(u=>u.id!==currentUserId);document.body.insertAdjacentHTML('beforeend',`<div class="chat-modal-overlay" onclick="if(event.target===this)this.remove()"><div class="chat-modal"><h3 style="display:flex;align-items:center;">${ICONS.msg_square} Cuộc trò chuyện mới</h3><div style="margin-bottom:16px;"><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Loại</label><select id="newChatType" onchange="toggleGroupFields()" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;"><option value="private">Nhắn tin riêng</option><option value="group">Tạo nhóm</option></select></div><div id="groupFields" style="display:none;"><input type="text" id="newGroupName" placeholder="Tên nhóm" /><input type="text" id="newGroupDesc" placeholder="Mô tả (tùy chọn)" /></div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Chọn thành viên</label><div class="chat-modal-user-list">${users.map(u=>`<label class="chat-modal-user-item"><input type="checkbox" value="${u.id}" name="chat_member"><div class="chat-conv-avatar" style="width:32px;height:32px;font-size:12px;">${u.avatar_url?`<img src="${resolveFileUrl(u.avatar_url)}">`:(u.full_name||'?')[0].toUpperCase()}</div><span style="font-size:14px;">${escHtml(u.full_name)}</span></label>`).join('')}</div><div class="chat-modal-btns"><button type="button" class="btn-cancel" onclick="this.closest('.chat-modal-overlay').remove()">Huỷ</button><button type="button" class="btn-primary" onclick="createNewChat()">Tạo</button></div></div></div>`);}
function toggleGroupFields(){document.getElementById('groupFields').style.display=document.getElementById('newChatType').value==='group'?'block':'none';}
async function createNewChat(){const type=document.getElementById('newChatType').value;const ck=Array.from(document.querySelectorAll('input[name="chat_member"]:checked')).map(i=>parseInt(i.value));if(!ck.length){alert('Chọn ít nhất 1 người');return;}if(type==='private'&&ck.length!==1){alert('Chat riêng chỉ 1 người');return;}const body={type,member_ids:ck,name:type==='group'?document.getElementById('newGroupName').value:null,description:type==='group'?document.getElementById('newGroupDesc').value:null};if(type==='group'&&!body.name){alert('Nhập tên nhóm');return;}try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/conversations`,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(data.success){document.querySelector('.chat-modal-overlay')?.remove();await loadConversations();openConversation(data.data.id);}else alert(data.message);}catch(e){alert('Lỗi');}}

// INJECT STYLES
function injectStyles(){if(document.getElementById('chatV4Styles'))return;const s=document.createElement('style');s.id='chatV4Styles';s.textContent=`.info-tab{flex:1;padding:8px 4px;border:none;background:none;font-size:11px;font-weight:600;color:#94a3b8;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .2s;}.info-tab.active{color:#6366f1;border-bottom-color:#6366f1;}.info-tab:hover{color:#6366f1;}`;document.head.appendChild(s);}
function autoResizeTextarea(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px';}
function handleMessagesScroll(e){if(e.target.scrollTop===0&&!isLoadingMore&&currentConversationId){isLoadingMore=true;loadMessages(currentConversationId,true).then(()=>{isLoadingMore=false;});}}
function goBackToList(){document.querySelector('.chat-container')?.classList.remove('show-chat');}

// DRAG-DROP FILE UPLOAD
function setupDragDrop(){
    const area=document.getElementById('messagesArea');if(!area)return;
    let dragOverlay=null;
    area.addEventListener('dragover',(e)=>{e.preventDefault();e.stopPropagation();if(!dragOverlay){dragOverlay=document.createElement('div');dragOverlay.id='dragDropOverlay';dragOverlay.style.cssText='position:absolute;inset:0;background:rgba(99,102,241,0.08);border:2px dashed #6366f1;border-radius:12px;display:flex;align-items:center;justify-content:center;z-index:50;pointer-events:none;';dragOverlay.innerHTML=`<div style="text-align:center;pointer-events:none;"><div style="margin-bottom:8px;display:flex;justify-content:center;">${ICONS.upload}</div><p style="font-size:14px;font-weight:600;color:#6366f1;">Thả file vào đây để gửi</p></div>`;area.style.position='relative';area.appendChild(dragOverlay);}});
    area.addEventListener('dragleave',(e)=>{e.preventDefault();if(dragOverlay&&!area.contains(e.relatedTarget)){dragOverlay.remove();dragOverlay=null;}});
    area.addEventListener('drop',async(e)=>{e.preventDefault();e.stopPropagation();if(dragOverlay){dragOverlay.remove();dragOverlay=null;}if(!currentConversationId){alert('Chọn cuộc trò chuyện trước');return;}const files=e.dataTransfer?.files;if(!files||!files.length)return;for(const file of files){if(file.size>10*1024*1024){alert(`File ${file.name} quá lớn (max 10MB)`);continue;}const fd=new FormData();fd.append('file',file);try{const token=sessionStorage.getItem('token');const res=await fetch(`${API_BASE}/chat/upload`,{method:'POST',headers:{'Authorization':`Bearer ${token}`},body:fd});const data=await res.json();if(data.success){socket.emit('send_message',{conversationId:currentConversationId,content:file.name,type:data.data.type,fileData:data.data});}else{alert(data.message||'Lỗi upload '+file.name);}}catch(err){alert('Lỗi upload '+file.name);}}});
}

// =====================================================
// IMAGE LIGHTBOX — View images in-page overlay
// =====================================================
function openImageLightbox(url) {
    // Remove existing lightbox if any
    document.getElementById('imageLightbox')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'imageLightbox';
    overlay.className = 'image-lightbox-overlay';

    // Extract filename from URL
    const filename = decodeURIComponent(url.split('/').pop().split('?')[0]);

    overlay.innerHTML = `
        <div class="image-lightbox-actions">
            <button type="button" onclick="event.stopPropagation();downloadLightboxImage('${url}','${filename.replace(/'/g, "\\'")}')"
                    title="Tải ảnh"> 🡻 </button>
            <button type="button" onclick="event.stopPropagation();window.open('${url}','_blank')"
                    title="Mở tab mới"> ➜ </button>
            <button type="button" onclick="event.stopPropagation();closeLightbox()"
                    title="Đóng (ESC)">✕</button>
        </div>
        <img src="${url}" alt="" onclick="event.stopPropagation()">
        <div class="image-lightbox-filename">${escHtml(filename)}</div>
    `;

    // Click backdrop → close
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeLightbox();
    });

    document.body.appendChild(overlay);

    // ESC key → close
    function onEsc(e) {
        if (e.key === 'Escape') { closeLightbox(); document.removeEventListener('keydown', onEsc); }
    }
    document.addEventListener('keydown', onEsc);
}

function closeLightbox() {
    const el = document.getElementById('imageLightbox');
    if (el) {
        el.style.animation = 'lightboxFadeIn 0.15s ease reverse';
        setTimeout(() => el.remove(), 150);
    }
}

function downloadLightboxImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'image';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

document.addEventListener('DOMContentLoaded',initChat);
