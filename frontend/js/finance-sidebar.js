/**
 * Finance Sidebar Template - Sidebar for Finance Pages
 * Inject this into finance-receipts.html, finance-payments.html, finance-debt.html
 */

const FINANCE_SIDEBAR_HTML = `
<!-- SIDEBAR -->
<div class="sidebar text-white">
    <!-- Logo -->
    <a href="settings.html" class="sidebar-logo block">
        <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                id="companyLogoContainer">
                <img id="companyLogo" src="" alt="Logo" class="hidden w-full h-full object-contain">
                <svg id="companyLogoIcon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" class="w-6 h-6 text-white">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <span class="text-xl font-bold" id="companyName">ViralWindow</span>
        </div>
    </a>

    <!-- User Profile -->
    <div class="p-4 border-b border-blue-600 relative">
        <div class="flex items-center gap-3 cursor-pointer hover:bg-blue-700 rounded-lg p-2"
            onclick="toggleSidebarUserMenu()">
            <div class="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center font-semibold overflow-hidden"
                id="sidebarUserAvatar">
                <div id="sidebarUserAvatarInitial">U</div>
                <img id="sidebarUserAvatarImage" src="" alt="Avatar"
                    class="hidden w-full h-full object-cover rounded-full">
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-medium text-sm" id="sidebarUserName">Đang tải...</div>
                <div class="text-xs text-blue-200" id="sidebarUserRole">Đang tải...</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        <!-- User Menu Dropdown -->
        <div id="sidebarUserMenuDropdown"
            class="hidden absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-xl z-[9999] border border-gray-200">
            <div class="p-2">
                <a href="profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">Hồ sơ</a>
                <a href="settings.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">Cài đặt</a>
                <hr class="my-2">
                <button onclick="handleLogout()"
                    class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded">Đăng xuất</button>
            </div>
        </div>
    </div>

    <!-- Navigation Menu -->
    <nav class="sidebar-nav">
        <!-- TỔNG QUAN -->
        <a href="index.html" class="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>TỔNG QUAN</span>
        </a>

        <!-- THEO DÕI DỰ ÁN -->
        <a href="production-excel-view.html" class="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>THEO DÕI DỰ ÁN</span>
        </a>

        <!-- KINH DOANH -->
        <div class="nav-item has-submenu">
            <div class="flex items-center gap-3 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>KINH DOANH</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                class="w-4 h-4 transition-transform duration-200 arrow-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        <div class="submenu">
            <a href="sales.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Khách hàng</span>
            </a>
            <a href="projects-new.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Dự án</span>
            </a>
            <a href="quotation-new.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Báo giá</span>
            </a>
        </div>

        <!-- KỸ THUẬT -->
        <div class="nav-item has-submenu">
            <div class="flex items-center gap-3 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>KỸ THUẬT</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                class="w-4 h-4 transition-transform duration-200 arrow-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        <div class="submenu">
            <a href="design-new.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Thiết kế & Bóc tách</span>
            </a>
            <a href="material-requests.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Yêu cầu vật tư</span>
            </a>
        </div>

        <!-- KHO & VẬT TƯ -->
        <div class="nav-item has-submenu">
            <div class="flex items-center gap-3 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>KHO & VẬT TƯ</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                class="w-4 h-4 transition-transform duration-200 arrow-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        <div class="submenu">
            <a href="inventory.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Kho vật tư</span>
            </a>
            <a href="exported-materials.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Xuất vật tư</span>
            </a>
        </div>

        <!-- THI CÔNG & NGHIỆM THU -->
        <div class="nav-item has-submenu">
            <div class="flex items-center gap-3 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>THI CÔNG & NGHIỆM THU</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                class="w-4 h-4 transition-transform duration-200 arrow-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        <div class="submenu">
            <a href="product-manufacturing.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Sản xuất sản phẩm</span>
            </a>
            <a href="installation.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Lắp đặt</span>
            </a>
            <a href="handover.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Bàn giao</span>
            </a>
        </div>

        <!-- TÀI CHÍNH - EXPANDED -->
        <div class="nav-item has-submenu expanded">
            <div class="flex items-center gap-3 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>TÀI CHÍNH</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                class="w-4 h-4 transition-transform duration-200 arrow-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        <div class="submenu expanded">
            <a href="finance-dashboard.html" class="submenu-item" data-page="finance-dashboard">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Tổng quan</span>
            </a>
            <a href="finance-receipts.html" class="submenu-item" data-page="finance-receipts">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 4v16m8-8H4" />
                </svg>
                <span>Phiếu thu</span>
            </a>
            <a href="finance-payments.html" class="submenu-item" data-page="finance-payments">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M20 12H4" />
                </svg>
                <span>Phiếu chi</span>
            </a>
            <a href="finance-debt.html" class="submenu-item" data-page="finance-debt">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Công nợ</span>
            </a>
            <a href="finance-reports.html" class="submenu-item" data-page="finance-reports">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Báo cáo</span>
            </a>
        </div>

        <!-- QUẢN TRỊ -->
        <div class="nav-item has-submenu">
            <div class="flex items-center gap-3 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>QUẢN TRỊ</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                class="w-4 h-4 transition-transform duration-200 arrow-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        <div class="submenu">
            <a href="admin-management.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Phân quyền</span>
            </a>
            <a href="settings.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Cài đặt hệ thống</span>
            </a>
            <a href="agencies.html" class="submenu-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Chi nhánh</span>
            </a>
        </div>
    </nav>
</div>
`;

/**
 * Initialize sidebar for finance pages
 * @param {string} currentPage - Current page name (finance-receipts, finance-payments, finance-debt)
 */
function initFinanceSidebar(currentPage) {
    // Inject sidebar HTML
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = FINANCE_SIDEBAR_HTML;
    }

    // Highlight current page
    const currentMenuItem = document.querySelector(`[data-page="${currentPage}"]`);
    if (currentMenuItem) {
        currentMenuItem.classList.add('active');
    }

    // Initialize sidebar interactions
    initSidebarInteractions();

    // Load user info
    loadSidebarUserInfo();

    // Load company info
    loadSidebarCompanyInfo();
}

/**
 * Initialize sidebar submenu interactions
 */
function initSidebarInteractions() {
    document.querySelectorAll('.nav-item.has-submenu').forEach(item => {
        item.addEventListener('click', function () {
            const isExpanded = this.classList.contains('expanded');
            const submenu = this.nextElementSibling;

            if (submenu && submenu.classList.contains('submenu')) {
                if (isExpanded) {
                    this.classList.remove('expanded');
                    submenu.classList.remove('expanded');
                } else {
                    this.classList.add('expanded');
                    submenu.classList.add('expanded');
                }
            }
        });
    });
}

/**
 * Toggle sidebar user menu
 */
function toggleSidebarUserMenu() {
    const dropdown = document.getElementById('sidebarUserMenuDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
}

/**
 * Load user info into sidebar
 */
async function loadSidebarUserInfo() {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        const API_BASE = window.API_BASE || '/api';
        const res = await fetch(`${API_BASE}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.data) {
            const user = data.data;

            // Update user name
            const userName = document.getElementById('sidebarUserName');
            if (userName) {
                userName.textContent = user.full_name || 'Người dùng';
            }

            // Update user role
            const userRole = document.getElementById('sidebarUserRole');
            if (userRole) {
                userRole.textContent = user.role_name || user.user_type || 'Nhân viên';
            }

            // Update avatar
            const avatarInitial = document.getElementById('sidebarUserAvatarInitial');
            const avatarImage = document.getElementById('sidebarUserAvatarImage');

            if (user.avatar_url && avatarImage && avatarInitial) {
                avatarImage.src = user.avatar_url;
                avatarImage.classList.remove('hidden');
                avatarInitial.classList.add('hidden');
            } else if (avatarInitial) {
                const initial = (user.full_name || 'U').charAt(0).toUpperCase();
                avatarInitial.textContent = initial;
            }
        }
    } catch (error) {
        console.error('Error loading sidebar user info:', error);
    }
}

/**
 * Load company info into sidebar
 */
async function loadSidebarCompanyInfo() {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        const API_BASE = window.API_BASE || '/api';
        const res = await fetch(`${API_BASE}/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.data) {
            // Update company name
            const companyName = document.getElementById('companyName');
            if (companyName && data.data.company_name) {
                companyName.textContent = data.data.company_name;
            }

            // Update company logo
            const companyLogo = document.getElementById('companyLogo');
            const companyLogoIcon = document.getElementById('companyLogoIcon');

            if (data.data.logo_path && companyLogo && companyLogoIcon) {
                companyLogo.src = data.data.logo_path;
                companyLogo.classList.remove('hidden');
                companyLogoIcon.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading sidebar company info:', error);
    }
}
