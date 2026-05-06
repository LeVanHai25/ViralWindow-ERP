/**
 * Controller for Attendance System UI
 */

const API_BASE = window.API_BASE || '/api';
let currentUser = null;
let currentPos = { lat: null, lng: null, address: '', method: 'unknown' };

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    currentUser = window.AuthHelper.getUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Check if user is Admin or HR to show Admin Tab
    const isAdmin = currentUser.user_type === 'admin' || 
                    (currentUser.role_name && ['Super Admin', 'Admin', 'Giám đốc', 'Manager', 'Quản lý', 'Nhân sự'].includes(currentUser.role_name));
    
    if (isAdmin) {
        renderAdminTab();
        document.querySelector('[data-target="panel-checkin"]').classList.add('hidden');
        
        // Auto default to Admin Tab
        setTimeout(() => {
            const adminTab = document.querySelector('[data-target="panel-admin"]');
            if (adminTab) adminTab.click();
        }, 50);
    } else {
        // Auto load current position với fallback GPS → IP → Default
        getGeolocation();

        loadTodayStatus();
        loadWeeklyTimeline();
    }

    // Setup Date Filters
    setupDateFilters();

    // Start Realtime Clock
    initClock();

    // Add Tab Switch Listener
    window.addEventListener('tabSwitched', (e) => {
        const target = e.detail.targetId;
        if (target === 'panel-checkin') {
            loadTodayStatus();
            loadWeeklyTimeline();
        } else if (target === 'panel-history') {
            isAdmin ? loadAdminHistory() : loadMyHistory();
        } else if (target === 'panel-leaves') {
            isAdmin ? loadAdminLeaves() : loadMyLeaves();
        } else if (target === 'panel-admin') {
            loadAdminReport();
            loadAdminKPIs();
        } else if (target === 'panel-shifts') {
            loadShifts();
        }
    });

}

// ==========================================
// 1. CLOCK & GPS
// ==========================================
function initClock() {
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    
    // Vietnamese days formatter
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    
    setInterval(() => {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('vi-VN', { hour12: false });
        if (now.getSeconds() === 0 || !dateEl.textContent.includes(now.getFullYear())) {
            dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
        }
    }, 1000);
}

/**
 * Reverse Geocoding: Chuyển tọa độ → tên địa chỉ
 * Sử dụng Nominatim (OpenStreetMap) - miễn phí, không cần API key
 */
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&accept-language=vi&addressdetails=1`,
            { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        if (data && data.address) {
            const a = data.address;
            // Xây dựng tên ngắn gọn: đường, phường/xã, quận/huyện, thành phố
            const parts = [
                a.road || a.pedestrian || a.neighbourhood || '',
                a.suburb || a.quarter || a.village || '',
                a.city_district || a.county || a.town || '',
                a.city || a.state || ''
            ].filter(p => p && p.trim());
            return parts.join(', ');
        }
        return data.display_name || '';
    } catch (err) {
        console.warn('[GEO] Reverse geocoding thất bại:', err.message);
        return '';
    }
}

/**
 * Lấy vị trí theo chiến lược 3 tầng:
 * Tầng 1: GPS trình duyệt (chính xác nhất)
 * Tầng 2: IP Geolocation qua ip-api.com (xấp xỉ theo mạng)
 * Tầng 3: Tọa độ văn phòng mặc định từ company_config
 * Sau khi lấy tọa độ → reverse geocode để hiển thị tên vị trí
 */
async function getGeolocation() {
    const locEl = document.getElementById('location-info');

    // Hiển thị trạng thái đang lấy
    if (locEl) {
        locEl.innerHTML = `<i data-lucide="loader" class="w-3 h-3 animate-spin text-blue-400"></i> <span class="text-slate-400">Đang xác định vị trí...</span>`;
        lucide.createIcons();
    }

    // ─── TẦNG 1: GPS TRÌNH DUYỆT ───
    if ('geolocation' in navigator) {
        try {
            const gpsPos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 0
                });
            });
            currentPos.lat = gpsPos.coords.latitude;
            currentPos.lng = gpsPos.coords.longitude;
            currentPos.method = 'gps';
            
            // Reverse geocode để lấy tên địa chỉ
            if (locEl) {
                locEl.innerHTML = `<i data-lucide="loader" class="w-3 h-3 animate-spin text-green-400"></i> <span class="text-green-600 font-medium">GPS OK, đang lấy tên vị trí...</span>`;
                lucide.createIcons();
            }
            const addr = await reverseGeocode(currentPos.lat, currentPos.lng);
            currentPos.address = addr || `${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`;
            if (locEl) {
                locEl.innerHTML = `<i data-lucide="map-pin" class="w-3 h-3 text-green-500"></i> <span class="text-green-600 font-medium" title="GPS chính xác">📍 ${currentPos.address}</span>`;
                lucide.createIcons();
            }
            console.log('[GPS] Vị trí GPS:', currentPos.address);
            return;
        } catch (gpsErr) {
            console.warn('[GPS] Không lấy được GPS:', gpsErr.message, '→ thử IP fallback...');
        }
    }

    // ─── TẦNG 2: IP GEOLOCATION ───
    try {
        const ipRes = await fetch('http://ip-api.com/json/?fields=status,lat,lon,city,regionName,query', {
            signal: AbortSignal.timeout(5000)
        });
        const ipData = await ipRes.json();
        if (ipData.status === 'success' && ipData.lat && ipData.lon) {
            currentPos.lat = ipData.lat;
            currentPos.lng = ipData.lon;
            currentPos.method = 'ip';
            
            // Reverse geocode để lấy tên địa chỉ chi tiết hơn chỉ city
            const addr = await reverseGeocode(currentPos.lat, currentPos.lng);
            currentPos.address = addr || (ipData.city ? `${ipData.city}, ${ipData.regionName || ''}` : 'Vị trí theo IP');
            if (locEl) {
                locEl.innerHTML = `<i data-lucide="wifi" class="w-3 h-3 text-orange-400"></i> <span class="text-orange-600 font-medium" title="Vị trí ước tính từ IP mạng">📡 ${currentPos.address} <span class="text-orange-400 text-xs">(IP)</span></span>`;
                lucide.createIcons();
            }
            console.log('[IP] Vị trí IP:', currentPos.address);
            return;
        }
    } catch (ipErr) {
        console.warn('[IP] IP Geolocation thất bại:', ipErr.message, '→ thử tọa độ mặc định...');
    }

    // ─── TẦNG 3: TỌA ĐỘ VĂN PHÒNG MẶC ĐỊNH ───
    try {
        const cfgRes = await fetch(`${API_BASE}/company-settings`, {
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const cfg = await cfgRes.json();
        if (cfg.success && cfg.data && cfg.data.office_lat && cfg.data.office_lng) {
            currentPos.lat = parseFloat(cfg.data.office_lat);
            currentPos.lng = parseFloat(cfg.data.office_lng);
            currentPos.method = 'default';
            currentPos.address = cfg.data.office_address || cfg.data.address || 'Văn phòng công ty';
            if (locEl) {
                locEl.innerHTML = `<i data-lucide="building-2" class="w-3 h-3 text-slate-400"></i> <span class="text-slate-500" title="Vị trí mặc định văn phòng">🏢 ${currentPos.address} <span class="text-slate-400 text-xs">(VP mặc định)</span></span>`;
                lucide.createIcons();
            }
            console.log('[DEFAULT] Vị trí VP mặc định:', currentPos.address);
            return;
        }
    } catch (cfgErr) {
        console.warn('[DEFAULT] Không lấy được tọa độ mặc định:', cfgErr.message);
    }

    // Mọi phương pháp đều thất bại - vẫn cho thử check-in nhưng cảnh báo
    currentPos.method = 'unknown';
    currentPos.address = 'Không xác định';
    if (locEl) {
        locEl.innerHTML = `<i data-lucide="map-pin-off" class="w-3 h-3 text-red-400"></i> <span class="text-red-500">Không xác định được vị trí</span>`;
        lucide.createIcons();
    }
    console.warn('[LOCATION] Tất cả phương pháp định vị đều thất bại');
}

// ==========================================
// 2. CHECK-IN / CHECK-OUT (TAB 1)
// ==========================================
async function loadTodayStatus() {
    try {
        const res = await fetch(`${API_BASE}/attendance/today`, {
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const data = await res.json();
        
        if (data.success) {
            renderCheckInPanel(data.data.record, data.data.default_shift);
        }
    } catch (err) {
        console.error('Lỗi tải trạng thái:', err);
    }
}

function renderCheckInPanel(record, defaultShift) {
    const btnContainer = document.getElementById('action-buttons-container');
    const shiftNameEl = document.getElementById('current-shift-name');
    const shiftTimeEl = document.getElementById('current-shift-time');
    
    // Set Shift Info
    if (record && record.shift_name) {
        shiftNameEl.textContent = record.shift_name;
        shiftTimeEl.textContent = `${record.shift_start.substring(0,5)} - ${record.shift_end.substring(0,5)}`;
    } else if (defaultShift) {
        shiftNameEl.textContent = defaultShift.name;
        shiftTimeEl.textContent = `${defaultShift.start_time.substring(0,5)} - ${defaultShift.end_time.substring(0,5)}`;
    }

    // Reset details
    document.getElementById('lbl-checkin-time').textContent = '--:--';
    document.getElementById('lbl-checkout-time').textContent = '--:--';
    document.getElementById('lbl-checkin-status').textContent = 'Chưa có dữ liệu';
    document.getElementById('lbl-checkout-stats').textContent = 'Chưa có dữ liệu';

    if (!record || (!record.check_in && !record.check_out)) {
        // Cần Check In
        btnContainer.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <button onclick="handleCheckIn()" class="btn-checkin w-48 h-48 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 text-white shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:shadow-[0_0_60px_rgba(34,197,94,0.5)] transition-all flex flex-col items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
                    <i data-lucide="fingerprint" class="w-16 h-16"></i>
                    <span class="text-xl font-bold uppercase tracking-widest">Check In</span>
                </button>
                <div class="text-slate-500 text-sm font-medium bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
                    Chưa bắt đầu làm việc
                </div>
            </div>
        `;
        if (window.liveWorkInterval) clearInterval(window.liveWorkInterval);
    } else if (record.check_in && !record.check_out) {
        // Đã IN, chờ OUT
        document.getElementById('lbl-checkin-time').textContent = new Date(record.check_in).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
        document.getElementById('lbl-checkin-status').innerHTML = getStatusBadge(record.status);

        btnContainer.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <button onclick="handleCheckOut()" class="btn-checkin w-48 h-48 rounded-full bg-gradient-to-tr from-rose-500 to-red-400 text-white shadow-[0_0_40px_rgba(244,63,94,0.3)] hover:shadow-[0_0_60px_rgba(244,63,94,0.5)] transition-all flex flex-col items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
                    <i data-lucide="log-out" class="w-16 h-16"></i>
                    <span class="text-xl font-bold uppercase tracking-widest">Check Out</span>
                </button>
                <div id="live-work-hours" class="text-slate-700 text-sm font-semibold bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm flex items-center gap-2">
                    <i data-lucide="timer" class="w-4 h-4 text-blue-500"></i>
                    <span>Đang tính giờ...</span>
                </div>
            </div>
        `;
        startLiveWorkCounter(record.check_in);
    } else if (record.check_in && record.check_out) {
        // Hoàn thành
        document.getElementById('lbl-checkin-time').textContent = new Date(record.check_in).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
        document.getElementById('lbl-checkin-status').innerHTML = getStatusBadge(record.status);
        
        document.getElementById('lbl-checkout-time').textContent = new Date(record.check_out).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
        document.getElementById('lbl-checkout-stats').innerHTML = 
            `<span class="text-green-600 font-medium">${record.work_hours} giờ làm</span> ` + 
            (record.overtime_hours > 0 ? `<br><span class="text-orange-500 font-medium">+${record.overtime_hours} giờ TC</span>` : '');

        btnContainer.innerHTML = `
            <div class="w-48 h-48 rounded-full bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 border-4 border-slate-200 shadow-inner">
                <i data-lucide="check-circle-2" class="w-16 h-16 text-green-500"></i>
                <span class="text-lg font-bold uppercase text-slate-500 text-center">Hoàn Thành<br>Hôm Nay</span>
            </div>
        `;
    }

    lucide.createIcons();
}

window.liveWorkInterval = null;
function startLiveWorkCounter(checkInStr) {
    if (window.liveWorkInterval) clearInterval(window.liveWorkInterval);
    const checkInTime = new Date(checkInStr).getTime();
    
    function updateCounter() {
        const now = new Date().getTime();
        let diffMins = Math.floor((now - checkInTime) / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        const el = document.getElementById('live-work-hours');
        if (el) {
            el.innerHTML = `<i data-lucide="timer" class="w-4 h-4 text-blue-500"></i> <span>Thời gian làm: <span class="text-blue-700">${hours} giờ ${mins} phút</span></span>`;
            lucide.createIcons();
        }
    }
    
    updateCounter();
    window.liveWorkInterval = setInterval(updateCounter, 60000); // Update every minute
}

async function handleCheckIn() {
    // Nếu chưa có vị trí, thử lấy lại trước
    if (!currentPos.lat || !currentPos.lng) {
        await getGeolocation();
    }

    const methodLabel = currentPos.method === 'gps' ? '📍 GPS' 
        : currentPos.method === 'ip' ? '📡 IP mạng'
        : currentPos.method === 'default' ? '🏢 VP mặc định'
        : '⚠️ Không xác định';
    const addrDisplay = currentPos.address || 'Chưa xác định vị trí';

    const isConfirm = await VWModal.confirm('Chấm Công Vào', 
        `Xác nhận chấm công vào lúc này?<br><div class="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-left"><div class="text-xs text-slate-400 mb-1">${methodLabel}</div><div class="text-sm font-medium text-slate-700">${addrDisplay}</div></div>`, {
        confirmText: 'Có, Check-in ngay',
        cancelText: 'Hủy'
    });
    
    if (isConfirm) {
        try {
            const res = await fetch(`${API_BASE}/attendance/check-in`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.AuthHelper.getToken()}` 
                },
                body: JSON.stringify({
                    lat: currentPos.lat || null,
                    lng: currentPos.lng || null,
                    location_method: currentPos.method || 'unknown'
                })
            });
            const data = await res.json();
            
            if (data.success) {
                VWModal.success(data.message);
                loadTodayStatus();
                loadWeeklyTimeline();
            } else {
                VWModal.error(data.message);
            }
        } catch (err) {
            VWModal.error('Lỗi kết nối máy chủ');
        }
    }
}

async function handleCheckOut() {
    // Nếu chưa có vị trí, thử lấy lại
    if (!currentPos.lat || !currentPos.lng) {
        await getGeolocation();
    }

    const methodLabel = currentPos.method === 'gps' ? '📍 GPS' 
        : currentPos.method === 'ip' ? '📡 IP mạng'
        : currentPos.method === 'default' ? '🏢 VP mặc định'
        : '⚠️ Không xác định';
    const addrDisplay = currentPos.address || 'Chưa xác định vị trí';

    const isConfirm = await VWModal.confirm('Chấm Công Ra', 
        `Xác nhận chấm công ra kết thúc ca làm việc?<br><div class="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-left"><div class="text-xs text-slate-400 mb-1">${methodLabel}</div><div class="text-sm font-medium text-slate-700">${addrDisplay}</div></div>`, {
        confirmText: 'Có, Check-out ngay',
        cancelText: 'Hủy'
    });
    
    if (isConfirm) {
        try {
            const res = await fetch(`${API_BASE}/attendance/check-out`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.AuthHelper.getToken()}` 
                },
                body: JSON.stringify({
                    lat: currentPos.lat || null,
                    lng: currentPos.lng || null,
                    location_method: currentPos.method || 'unknown'
                })
            });
            const data = await res.json();
            
            if (data.success) {
                VWModal.success(data.message);
                loadTodayStatus();
                loadWeeklyTimeline();
            } else {
                VWModal.error(data.message);
            }
        } catch (err) {
            VWModal.error('Lỗi kết nối máy chủ');
        }
    }
}

async function loadWeeklyTimeline() {
    try {
        const res = await fetch(`${API_BASE}/attendance/weekly`, {
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const data = await res.json();
        
        if (data.success) {
            const container = document.getElementById('weekly-timeline');
            container.innerHTML = '';
            
            // Generate full week Mon-Sun
            const today = new Date();
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const isToday = dateStr === today.toISOString().split('T')[0];
                
                const record = data.data.find(r => r.date === dateStr);
                
                let iconClass = 'bg-slate-100 text-slate-300';
                let iconHtml = '<i data-lucide="minus" class="w-4 h-4"></i>';
                
                if (record) {
                    if (record.status === 'present') { iconClass = 'bg-green-100 text-green-600'; iconHtml = '<i data-lucide="check" class="w-4 h-4"></i>'; }
                    else if (record.status === 'late') { iconClass = 'bg-yellow-100 text-yellow-600'; iconHtml = '<i data-lucide="clock-9" class="w-4 h-4"></i>'; }
                    else if (record.status === 'early_leave') { iconClass = 'bg-orange-100 text-orange-600'; iconHtml = '<i data-lucide="log-out" class="w-4 h-4"></i>'; }
                    else if (record.status === 'absent') { iconClass = 'bg-red-100 text-red-600'; iconHtml = '<i data-lucide="x" class="w-4 h-4"></i>'; }
                    else if (record.status === 'on_leave') { iconClass = 'bg-indigo-100 text-indigo-600'; iconHtml = '<i data-lucide="file-text" class="w-4 h-4"></i>'; }
                }

                container.innerHTML += `
                    <div class="flex flex-col items-center flex-1">
                        <span class="text-xs font-medium ${isToday ? 'text-blue-600 font-bold' : 'text-slate-500'} mb-2">${days[i]}</span>
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${iconClass} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}">
                            ${iconHtml}
                        </div>
                        <span class="text-[10px] text-slate-400 mt-1">${d.getDate()}/${d.getMonth()+1}</span>
                    </div>
                `;
            }
            lucide.createIcons();
        }
    } catch (err) {
        console.error(err);
    }
}

// ==========================================
// 3. HISTORY TAB (Calendar Grid)
// ==========================================
async function loadMyHistory() {
    const month = document.getElementById('filter-month').value;
    const year = document.getElementById('filter-year').value;
    
    try {
        const res = await fetch(`${API_BASE}/attendance/my?month=${month}&year=${year}`, {
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const json = await res.json();
        
        if (json.success) {
            renderHistorySummary(json.data.summary);
            renderCalendar(json.data.records, month, year);
        }
    } catch (error) {
        VWModal.error('Lỗi tải bảng chấm công');
    }
}

function renderHistorySummary(summary) {
    document.getElementById('history-summary').innerHTML = `
        <div class="text-center">
            <div class="text-sm text-slate-500 mb-1">Tổng ngày công</div>
            <div class="text-2xl font-bold text-blue-600">${summary.total_days} <span class="text-xs font-normal text-slate-400">ngày</span></div>
        </div>
        <div class="text-center border-l border-slate-200">
            <div class="text-sm text-slate-500 mb-1">Giờ làm việc</div>
            <div class="text-2xl font-bold text-emerald-600">${summary.total_work_hours} <span class="text-xs font-normal text-slate-400">giờ</span></div>
        </div>
        <div class="text-center border-l border-slate-200">
            <div class="text-sm text-slate-500 mb-1">Đi trễ / Về sớm</div>
            <div class="text-2xl font-bold text-orange-500">${summary.late_days} / ${summary.early_leave_days} <span class="text-xs font-normal text-slate-400">lần</span></div>
        </div>
        <div class="text-center border-l border-slate-200">
            <div class="text-sm text-slate-500 mb-1">Nghỉ phép / Vắng</div>
            <div class="text-2xl font-bold text-rose-500">${summary.leave_days} / ${summary.absent_days} <span class="text-xs font-normal text-slate-400">ngày</span></div>
        </div>
    `;
}

function renderCalendar(records, month, year) {
    const body = document.getElementById('calendar-body');
    body.innerHTML = '';
    
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Empty cells for offset
    for (let i = 0; i < firstDay; i++) {
        body.innerHTML += `<div class="calendar-cell empty"></div>`;
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const record = records.find(r => r.date === dateStr);
        const isToday = dateStr === todayStr;
        
        let content = '';
        if (record) {
            if (record.check_in) {
                const ciTime = new Date(record.check_in).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                content += `<div class="time-badge time-in"><i data-lucide="log-in" class="w-3 h-3"></i> ${ciTime}</div>`;
            }
            if (record.check_out) {
                const coTime = new Date(record.check_out).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                content += `<div class="time-badge time-out"><i data-lucide="log-out" class="w-3 h-3"></i> ${coTime}</div>`;
            }
            if (['on_leave', 'holiday', 'absent'].includes(record.status)) {
                content += `<div class="status-pill status-${record.status.replace('on_','')} mt-auto w-full">${getStatusText(record.status)}</div>`;
            } else {
                content += `<div class="status-pill status-${record.status.replace('_leave','')} mt-auto w-full">${getStatusText(record.status)}</div>`;
            }
        }
        
        body.innerHTML += `
            <div class="calendar-cell ${isToday ? 'today ring-2 ring-blue-400 border-blue-400' : ''}">
                <div class="date-number">${i}</div>
                ${content}
            </div>
        `;
    }
    lucide.createIcons();
}

// ==========================================
// 4. LEAVE REQUESTS
// ==========================================
async function loadMyLeaves() {
    try {
        const res = await fetch(`${API_BASE}/leave-requests/my`, {
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const json = await res.json();
        
        if (json.success) {
            renderLeaveTable(json.data.leaves);
            
            // Render summary mini
            const s = json.data.summary;
            document.getElementById('leave-summary').innerHTML = `
                <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-blue-600">${s.pending}</div>
                    <div class="text-xs text-blue-800 font-medium">Chờ duyệt</div>
                </div>
                <div class="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-green-600">${s.approved}</div>
                    <div class="text-xs text-green-800 font-medium">Đã duyệt</div>
                </div>
                <div class="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-red-600">${s.rejected}</div>
                    <div class="text-xs text-red-800 font-medium">Từ chối</div>
                </div>
                <div class="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-purple-600">${s.total_days_used}</div>
                    <div class="text-xs text-purple-800 font-medium">Số ngày đã nghỉ</div>
                </div>
            `;
        }
    } catch (error) {
        console.error(error);
    }
}

function renderLeaveTable(leaves) {
    const tbody = document.getElementById('leave-table-body');
    if (leaves.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 italic">Chưa có đơn xin phép nào</td></tr>`;
        return;
    }
    
    tbody.innerHTML = leaves.map(l => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3 font-medium text-slate-800">${getLeaveTypeText(l.type)}</td>
            <td class="px-4 py-3 text-slate-600">
                ${new Date(l.start_date).toLocaleDateString('vi-VN')} - 
                ${new Date(l.end_date).toLocaleDateString('vi-VN')}
            </td>
            <td class="px-4 py-3 text-slate-600"><b>${l.days_count}</b> ngày</td>
            <td class="px-4 py-3 text-slate-600 truncate max-w-xs" title="${l.reason}">${l.reason}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2.5 py-1 text-xs font-semibold rounded-full 
                    ${l.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      l.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${l.status === 'pending' ? 'Chờ duyệt' : l.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                </span>
            </td>
            <td class="px-4 py-3 text-right">
                ${l.status === 'pending' ? `
                    <button onclick="deleteLeave(${l.id})" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Hủy đơn">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                ` : l.status === 'approved' ? `
                    <span class="text-xs text-slate-400" title="Duyệt bởi: ${l.approved_by_name}"><i data-lucide="check-check" class="w-4 h-4 inline text-green-500"></i> ${l.approved_by_name || ''}</span>
                ` : ''}
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function openLeaveModal() {
    document.getElementById('leaveForm').reset();
    document.getElementById('leaveModal').classList.remove('hidden');
}

window.submitLeave = async function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    try {
        const res = await fetch(`${API_BASE}/leave-requests`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.AuthHelper.getToken()}` 
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            VWModal.success(data.message);
            document.getElementById('leaveModal').classList.add('hidden');
            loadMyLeaves();
        } else {
            VWModal.error(data.message);
        }
    } catch (err) {
        VWModal.error('Lỗi server');
    }
};

window.deleteLeave = async function(id) {
    const isConfirm = await VWModal.confirm('Hủy Đơn', 'Xác nhận hủy đơn xin phép này?', {
        confirmText: 'Đồng ý',
        cancelText: 'Đóng'
    });
    
    if (isConfirm) {
        try {
            const res = await fetch(`${API_BASE}/leave-requests/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
            });
            const data = await res.json();
            if (data.success) {
                VWModal.success('Đã hủy đơn');
                loadMyLeaves();
            }
        } catch(err) {
            VWModal.error('Lỗi hủy đơn');
        }
    }
};

// ==========================================
// 5. ADMIN TAB
// ==========================================
function renderAdminTab() {
    // Inject Tab Header
    document.getElementById('admin-report-tab-container').innerHTML = `
        <div class="w-px h-6 bg-slate-200 mx-2 self-center"></div>
        <div class="nav-tab text-purple-600" data-target="panel-admin" onclick="switchTab(this)">
            <i data-lucide="shield-alert" class="w-4 h-4"></i> Admin Báo Cáo
        </div>
        <div class="nav-tab text-emerald-600" data-target="panel-shifts" onclick="switchTab(this)">
            <i data-lucide="clock" class="w-4 h-4"></i> Quản lý Ca
        </div>
    `;
    lucide.createIcons();
}

async function loadAdminKPIs() {
    try {
        const res = await fetch(`${API_BASE}/attendance/stats`, {
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const json = await res.json();
        
        if (json.success) {
            const s = json.data;
            document.getElementById('admin-kpi-cards').innerHTML = `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-blue-500">
                    <div class="text-sm text-slate-500 font-medium mb-1">Tổng NV Check-in</div>
                    <div class="text-3xl font-bold text-slate-800">${s.checked_in_today}<span class="text-sm font-normal text-slate-400">/${s.total_employees}</span></div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-orange-500">
                    <div class="text-sm text-slate-500 font-medium mb-1">Đi muộn hôm nay</div>
                    <div class="text-3xl font-bold text-orange-600">${s.late_today} <span class="text-sm font-normal text-slate-400">người</span></div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-red-500">
                    <div class="text-sm text-slate-500 font-medium mb-1">Chưa Check-in</div>
                    <div class="text-3xl font-bold text-red-600">${s.not_checked_in} <span class="text-sm font-normal text-slate-400">người</span></div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-purple-500 cursor-pointer hover:bg-slate-50 transition-colors" onclick="switchTab(document.querySelector('[data-target=panel-leaves]'))">
                    <div class="text-sm text-slate-500 font-medium mb-1 flex justify-between">Đơn chờ duyệt <i data-lucide="chevron-right" class="w-4 h-4"></i></div>
                    <div class="text-3xl font-bold text-purple-600">${s.pending_leaves} <span class="text-sm font-normal text-slate-400">đơn</span></div>
                </div>
            `;
            lucide.createIcons();
        }
    } catch(err) { console.error('Error stats'); }
}

// ==========================================
// 6. NEW ADMIN VIEWS (LEAVES & HISTORY)
// ==========================================
window.loadAdminLeaves = async function() {
    // Update UI headers
    document.querySelector('#panel-leaves h2').textContent = 'Quản lý Đơn Xin Phép';
    document.querySelector('#panel-leaves button[onclick="openLeaveModal()"]').classList.add('hidden');
    
    // Add filtering UI if not exists
    let summaryDiv = document.getElementById('leave-summary');
    summaryDiv.innerHTML = `
        <div class="col-span-4 flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <select id="admin-leave-month" class="w-32 border border-slate-300 rounded px-3 py-2 text-sm">
                <option value="">Tất cả tháng</option>
                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}">Tháng ${m}</option>`).join('')}
            </select>
            <select id="admin-leave-status" class="w-40 border border-slate-300 rounded px-3 py-2 text-sm">
                <option value="all">Tất cả trạng thái</option>
                <option value="pending" selected>Đang chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Đã từ chối</option>
            </select>
            <button onclick="loadAdminLeaves()" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Lọc</button>
        </div>
    `;

    // Try setting current month/status if elements just created
    const monthEl = document.getElementById('admin-leave-month');
    const statusEl = document.getElementById('admin-leave-status');
    const s = statusEl ? statusEl.value : 'pending';
    const m = monthEl ? monthEl.value : '';

    const tbody = document.getElementById('leave-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-500">Đang tải dữ liệu...</td></tr>';
    
    try {
        let url = `${API_BASE}/leave-requests/all?status=${s}`;
        if (m) url += `&month=${m}&year=${new Date().getFullYear()}`;
        
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` } });
        const data = await res.json();
        
        if (data.success) {
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-500">Không có đơn xin phép nào</td></tr>';
                return;
            }
            tbody.innerHTML = data.data.map(l => {
                const typeMap = {'annual':'Nghỉ phép năm', 'sick':'Nghỉ ốm', 'personal':'Việc riêng', 'maternity':'Thai sản', 'other':'Khác'};
                let statusBadge = '';
                if (l.status === 'pending') statusBadge = '<span class="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Chờ duyệt</span>';
                else if (l.status === 'approved') statusBadge = '<span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Đã duyệt</span>';
                else statusBadge = '<span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Từ chối</span>';

                let actionBtns = '';
                if (l.status === 'pending') {
                    actionBtns = `
                        <button onclick="adminApproveLeave(${l.id})" class="text-green-600 font-medium font-sm hover:underline mr-3">Duyệt</button>
                        <button onclick="adminRejectLeave(${l.id})" class="text-red-600 font-medium font-sm hover:underline">Từ chối</button>
                    `;
                }

                return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-3 px-4">
                        <div class="font-medium text-slate-800">${l.full_name}</div>
                        <div class="text-xs text-slate-500">${typeMap[l.type] || l.type}</div>
                    </td>
                    <td class="py-3 px-4">${new Date(l.start_date).toLocaleDateString('vi-VN')} - ${new Date(l.end_date).toLocaleDateString('vi-VN')}</td>
                    <td class="py-3 px-4 text-center font-semibold text-slate-700">${l.days_count}</td>
                    <td class="py-3 px-4 text-slate-600 max-w-xs truncate" title="${l.reason}">${l.reason}</td>
                    <td class="py-3 px-4 text-center">${statusBadge}</td>
                    <td class="py-3 px-4 text-right">${actionBtns}</td>
                </tr>
                `;
            }).join('');
        }
    } catch(err) {}
};

window.adminApproveLeave = async function(id) {
    if(!await VWModal.confirm('Duyệt Đơn', 'Xác nhận duyệt đơn xin phép này?')) return;
    try {
        const res = await fetch(`${API_BASE}/leave-requests/${id}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const d = await res.json();
        if(d.success) { VWModal.success('Đã duyệt đơn'); loadAdminLeaves(); loadAdminKPIs(); }
        else VWModal.error(d.message);
    } catch(e) {}
};

window.adminRejectLeave = async function(id) {
    // Basic prompt implementation since VWModal doesn't have prompt natively hooked in old code
    const reason = prompt("Nhập lý do từ chối (bắt buộc):");
    if (!reason || !reason.trim()) return;
    
    try {
        const res = await fetch(`${API_BASE}/leave-requests/${id}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reject_reason: reason })
        });
        const d = await res.json();
        if(d.success) { VWModal.success('Đã từ chối đơn'); loadAdminLeaves(); loadAdminKPIs(); }
        else VWModal.error(d.message);
    } catch(e) {}
};

window.loadAdminHistory = async function() {
    document.querySelector('#panel-history h2').innerHTML = '<i data-lucide="users" class="w-5 h-5 text-blue-600"></i> Lịch Sử Toàn Công Ty';
    
    // Replace Calendar layout with a Table view for Admins
    const pHistory = document.getElementById('panel-history');
    if (!pHistory.querySelector('#admin-history-table')) {
        const container = pHistory.querySelector('.bg-white');
        container.innerHTML = `
            <div class="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="users" class="w-5 h-5 text-blue-600"></i> Lịch sử Chấm Công Toàn Tuyến
                </h2>
                <div class="flex items-center gap-2">
                    <input type="date" id="admin-history-date" value="${new Date().toISOString().split('T')[0]}" class="border border-slate-300 rounded px-3 py-2 text-sm">
                    <button onclick="loadAdminHistory()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                        Lọc Ngày
                    </button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-slate-100 border-b border-slate-200">
                        <tr>
                            <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Nhân viên</th>
                            <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Ca / Vị trí</th>
                            <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Giờ Check-in</th>
                            <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Giờ Check-out</th>
                            <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase text-center">Trạng Thái</th>
                        </tr>
                    </thead>
                    <tbody id="admin-history-table" class="text-sm">
                        <tr><td colspan="5" class="text-center py-8 text-slate-500">Đang tải dữ liệu...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        lucide.createIcons();
    }
    
    const dateInput = document.getElementById('admin-history-date');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    const [y, m, d] = selectedDate.split('-');
    
    const tbody = document.getElementById('admin-history-table');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500">Đang tải dữ liệu...</td></tr>';
    
    try {
        const res = await fetch(`${API_BASE}/attendance/all?month=${parseInt(m)}&year=${y}`, {
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const data = await res.json();
        if(data.success) {
            // Filter by exactly that date string
            const dayRecords = data.data.filter(r => r.date && r.date.startsWith(selectedDate));
            if(dayRecords.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500">Không có ai điểm danh vào ngày này.</td></tr>';
                return;
            }
            
            tbody.innerHTML = dayRecords.map(r => {
                let badge = '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">Hoàn Thành</span>';
                if(r.status === 'late') badge = '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">Đi Muộn</span>';
                if(r.status === 'early_leave') badge = '<span class="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">Về Sớm</span>';
                if(r.status === 'absent') badge = '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">Vắng Mặt</span>';
                
                const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                
                return `
                    <tr class="border-b border-slate-100 hover:bg-slate-50">
                        <td class="py-3 px-6">
                            <div class="font-medium text-slate-800">${r.full_name}</div>
                            <div class="text-xs text-slate-500">${r.role_name || 'Nhân viên'}</div>
                        </td>
                        <td class="py-3 px-6 text-slate-600">${r.shift_name || 'Không xác định'}</td>
                        <td class="py-3 px-6 text-slate-800 font-medium">${formatTime(r.check_in)}</td>
                        <td class="py-3 px-6 text-slate-800 font-medium">${formatTime(r.check_out)}</td>
                        <td class="py-3 px-6 text-center">${badge}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch(err) {} 
};

window.loadAdminReport = async function() {
    const month = document.getElementById('admin-filter-month').value;
    const year = document.getElementById('admin-filter-year').value;
    const agency = document.getElementById('admin-filter-agency').value;
    
    let url = `${API_BASE}/attendance/summary?month=${month}&year=${year}`;
    if(agency) url += `&agency_id=${agency}`;
    
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` } });
        const json = await res.json();
        
        if (json.success) {
            const tbody = document.getElementById('admin-table-body');
            if (json.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400">Không có dữ liệu</td></tr>`;
                return;
            }
            
            tbody.innerHTML = json.data.map(u => `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                ${u.avatar_url ? `<img src="${u.avatar_url}" class="w-full h-full rounded-full object-cover">` : u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-medium text-slate-800">${u.full_name}</div>
                                <div class="text-[11px] text-slate-400">${u.role_name || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center font-medium text-slate-700">${u.total_days}</td>
                    <td class="px-4 py-3 text-center ${u.late_days > 0 ? 'text-orange-600 font-bold' : 'text-slate-400'}">${u.late_days}</td>
                    <td class="px-4 py-3 text-center ${u.early_leave_days > 0 ? 'text-orange-600 font-bold' : 'text-slate-400'}">${u.early_leave_days}</td>
                    <td class="px-4 py-3 text-center ${u.absent_days > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}">${u.absent_days}</td>
                    <td class="px-4 py-3 text-center ${u.leave_days > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400'}">${u.leave_days}</td>
                    <td class="px-4 py-3 text-right text-emerald-600 font-semibold">${u.total_work_hours}h</td>
                    <td class="px-4 py-3 text-right font-semibold ${u.total_overtime_hours > 0 ? 'text-purple-600' : 'text-slate-400'}">${u.total_overtime_hours > 0 ? '+'+u.total_overtime_hours+'h' : '-'}</td>
                </tr>
            `).join('');
        }
    } catch(err) {
        VWModal.error('Lỗi tải báo cáo');
    }
}

// ==========================================
// UTILS
// ==========================================
function setupDateFilters() {
    const d = new Date();
    const curMonth = d.getMonth() + 1;
    const curYear = d.getFullYear();
    
    // Arrays of filter IDs
    ['filter-month', 'admin-filter-month'].forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        for (let i = 1; i <= 12; i++) {
            el.innerHTML += `<option value="${i}" ${i === curMonth ? 'selected' : ''}>Tháng ${i}</option>`;
        }
    });
    
    ['filter-year', 'admin-filter-year'].forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        for (let i = curYear - 2; i <= curYear + 1; i++) {
            el.innerHTML += `<option value="${i}" ${i === curYear ? 'selected' : ''}>Năm ${i}</option>`;
        }
    });

    // Populate agency filter if admin
    const agencyFilter = document.getElementById('admin-filter-agency');
    if (agencyFilter) {
        fetch(`${API_BASE}/agencies`, { headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` } })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    data.data.forEach(a => {
                        agencyFilter.innerHTML += `<option value="${a.id}">${a.name}</option>`;
                    });
                }
            })
            .catch(err => console.error(err));
    }
}

function getStatusText(status) {
    const m = {
        'present': 'Có mặt',
        'late': 'Đi muộn',
        'early_leave': 'Về sớm',
        'absent': 'Vắng mặt',
        'on_leave': 'Nghỉ phép',
        'holiday': 'Ngày lễ'
    };
    return m[status] || status;
}

function getStatusBadge(status) {
    const txt = getStatusText(status);
    if (status === 'present') return `<span class="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-semibold">${txt}</span>`;
    if (status === 'late') return `<span class="px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-700 text-xs font-semibold">${txt}</span>`;
    if (status === 'early_leave') return `<span class="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-xs font-semibold">${txt}</span>`;
    if (status === 'on_leave') return `<span class="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-semibold">${txt}</span>`;
    return `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">${txt}</span>`;
}

function getLeaveTypeText(type) {
    const m = {
        'annual': 'Nghỉ phép năm',
        'sick': 'Nghỉ ốm',
        'personal': 'Việc riêng',
        'maternity': 'Thai sản',
        'other': 'Khác'
    };
    return m[type] || type;
}

// ==========================================
// 8. SHIFT MANAGEMENT (ADMIN ONLY)
// ==========================================
async function loadShifts() {
    try {
        const res = await fetch(`${API_BASE}/shifts`, {
            headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
        });
        const data = await res.json();
        
        if (data.success) {
            const tbody = document.getElementById('shifts-table-body');
            if(!tbody) return;
            
            if (data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-slate-500">Chưa có dữ liệu ca làm việc</td></tr>`;
                return;
            }

            tbody.innerHTML = data.data.map(shift => `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3 font-medium text-slate-800 flex items-center gap-2">
                        ${shift.name} 
                        ${shift.is_default ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">MẶC ĐỊNH</span>' : ''}
                        ${!shift.is_active ? '<span class="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600">VÔ HIỆU</span>' : ''}
                    </td>
                    <td class="px-4 py-3 text-slate-600">${shift.start_time.substring(0,5)}</td>
                    <td class="px-4 py-3 text-slate-600">${shift.end_time.substring(0,5)}</td>
                    <td class="px-4 py-3 text-slate-600">${shift.break_minutes} phút</td>
                    <td class="px-4 py-3 text-slate-600">${shift.late_threshold_minutes} ph / ${shift.early_leave_minutes} ph</td>
                    <td class="px-4 py-3 text-slate-500 text-xs">${shift.agency_id ? 'Chi nhánh đặc thù' : 'Tất cả'}</td>
                    <td class="px-4 py-3 text-right">
                        <button onclick='openShiftModal(${JSON.stringify(shift).replace(/'/g, "&#39;")})' class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors mr-1" title="Sửa ca làm">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        ${!shift.is_default ? `
                            <button onclick="deleteShift(${shift.id})" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Xóa ca làm">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
            lucide.createIcons();
        }
    } catch (err) {
        console.error('Lỗi tải danh sách ca làm:', err);
    }
}

function openShiftModal(shift = null) {
    const form = document.getElementById('shiftForm');
    const modal = document.getElementById('shiftModal');
    const title = document.getElementById('shiftModalTitle');
    
    if (form) form.reset();
    
    if (shift) {
        title.textContent = 'Cập nhật Ca Làm Việc';
        document.getElementById('shift_id').value = shift.id;
        document.getElementById('shift_name').value = shift.name;
        document.getElementById('shift_start_time').value = shift.start_time.substring(0,5);
        document.getElementById('shift_end_time').value = shift.end_time.substring(0,5);
        document.getElementById('shift_break_minutes').value = shift.break_minutes;
        document.getElementById('shift_late_threshold').value = shift.late_threshold_minutes;
        document.getElementById('shift_early_leave').value = shift.early_leave_minutes;
        document.getElementById('shift_is_default').checked = !!shift.is_default;
        document.getElementById('shift_is_active').value = shift.is_active ? "1" : "0";
    } else {
        title.textContent = 'Thêm Ca Làm Việc Mới';
        document.getElementById('shift_id').value = '';
        document.getElementById('shift_is_default').checked = false;
        document.getElementById('shift_is_active').value = "1";
    }
    
    if (modal) modal.classList.remove('hidden');
}

window.submitShift = async function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = formData.get('id');
    
    const payload = {
        name: formData.get('name'),
        start_time: formData.get('start_time'),
        end_time: formData.get('end_time'),
        break_minutes: parseInt(formData.get('break_minutes')) || 0,
        late_threshold_minutes: parseInt(formData.get('late_threshold_minutes')) || 0,
        early_leave_minutes: parseInt(formData.get('early_leave_minutes')) || 0,
        is_default: formData.get('is_default') ? 1 : 0,
        is_active: parseInt(formData.get('is_active')) || 0
    };
    
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/shifts/${id}` : `${API_BASE}/shifts`;
        
        const res = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.AuthHelper.getToken()}` 
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.success) {
            VWModal.success(data.message);
            document.getElementById('shiftModal').classList.add('hidden');
            loadShifts(); // Reload list
        } else {
            VWModal.error(data.message);
        }
    } catch (err) {
        VWModal.error('Lỗi kết nối server');
    }
};

window.deleteShift = async function(id) {
    const isConfirm = await VWModal.confirm('Xóa Ca Làm', 'Xác nhận xóa ca làm việc này? Hành động này có thể ảnh hưởng đến lịch sử chấm công.', {
        confirmText: 'Đồng ý Xóa',
        cancelText: 'Hủy'
    });
    
    if (isConfirm) {
        try {
            const res = await fetch(`${API_BASE}/shifts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` }
            });
            const data = await res.json();
            if (data.success) {
                VWModal.success(data.message);
                loadShifts();
            } else {
                VWModal.error(data.message || 'Không thể xóa ca làm');
            }
        } catch(err) {
            VWModal.error('Lỗi khi xóa ca làm');
        }
    }
};

// ==========================================
// 8. SHIFT ASSIGNMENT (GÁN CA CHO NHÂN VIÊN)
// ==========================================

window.openAssignShiftModal = async function() {
    document.getElementById('assignShiftModal').classList.remove('hidden');
    loadShiftAssignments();
};

window.loadShiftAssignments = async function() {
    const tbody = document.getElementById('assign-shifts-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400"><i data-lucide="loader" class="w-6 h-6 animate-spin mx-auto mb-2"></i> Đang tải dữ liệu...</td></tr>';
    lucide.createIcons();

    try {
        const [usersRes, shiftsRes] = await Promise.all([
            fetch(`${API_BASE}/shifts/assignments`, { headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` } }),
            fetch(`${API_BASE}/shifts`, { headers: { 'Authorization': `Bearer ${window.AuthHelper.getToken()}` } })
        ]);

        const usersData = await usersRes.json();
        const shiftsData = await shiftsRes.json();

        if (usersData.success && shiftsData.success) {
            const users = usersData.data;
            const shifts = shiftsData.data.filter(s => s.is_active === 1); // Only active shifts
            
            tbody.innerHTML = users.map(u => {
                const currentShiftId = u.shift_id || '';
                return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-4">
                        <div class="font-medium text-slate-800">${u.full_name}</div>
                        <div class="text-xs text-slate-500">${u.email}</div>
                    </td>
                    <td class="py-3 px-4 text-xs font-medium text-slate-600">${u.role_name || u.user_type}</td>
                    <td class="py-3 px-4">
                        <select id="user-shift-${u.id}" class="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                            <option value="">-- Mặc định hệ thống --</option>
                            ${shifts.map(s => `<option value="${s.id}" ${currentShiftId == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <button onclick="saveShiftAssignment(${u.id})" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors">
                            Cập nhật
                        </button>
                    </td>
                </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">Lỗi lấy dữ liệu</td></tr>';
        }
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">Lỗi kết nối server</td></tr>';
    }
};

window.saveShiftAssignment = async function(userId) {
    const shiftId = document.getElementById(`user-shift-${userId}`).value;
    
    try {
        const res = await fetch(`${API_BASE}/shifts/assignments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.AuthHelper.getToken()}` 
            },
            body: JSON.stringify({ user_id: userId, shift_id: shiftId ? parseInt(shiftId) : null })
        });
        
        const data = await res.json();
        if (data.success) {
            VWModal.success('Đã cập nhật ca làm việc cho nhân viên');
        } else {
            VWModal.error(data.message);
        }
    } catch (err) {
        VWModal.error('Lỗi khi lưu gán ca');
    }
};
