/**
 * Enterprise Sidebar - Advanced Navigation System
 * Features: SPA Navigation, Prefetching, Skeleton Loading, Ripple Effects
 */

class EnterpriseSidebar {
    constructor() {
        this.currentPage = window.location.pathname.split('/').pop() || 'index.html';
        this.prefetchCache = new Map();
        this.isNavigating = false;
        this.init();
    }

    init() {
        this.injectMissingMenuItems();
        this.setupMobileMenu();
        this.setupActiveStates();
        this.setupSPANavigation();
        this.setupPrefetching();
        // this.setupRippleEffects();
        this.setupAccordionMenus();
        this.setupSkeletonLoading();
        this.loadUserRoleDisplay();
        this.loadCompanyLogo();
        this.loadAIWidgets();
    }

    /**
     * Inject missing TRỢ LÝ AI and TIN NHẮN menu items into sidebar
     * This ensures ALL pages have these menu items without editing 30+ HTML files
     */
    injectMissingMenuItems() {
        const nav = document.querySelector('.sidebar-nav');
        if (!nav) return;

        const navHTML = nav.innerHTML;

        // Find QUẢN TRỊ section to insert before it
        const allNavItems = nav.querySelectorAll(':scope > .nav-item, :scope > a.nav-item, :scope > div.nav-item');
        let quantriEl = null;
        let kinhDoanhEl = null;
        allNavItems.forEach(item => {
            const text = item.textContent || '';
            if (text.includes('QUẢN TRỊ')) quantriEl = item;
            if (text.includes('KINH DOANH')) kinhDoanhEl = item;
        });

        // Check if KẾ HOẠCH CÔNG VIỆC already exists
        const hasWorkPlan = navHTML.includes('work-plan.html');
        if (!hasWorkPlan) {
            const workPlanLink = document.createElement('a');
            workPlanLink.href = 'work-plan.html';
            workPlanLink.className = 'nav-item';
            
            const isWorkPlanPage = this.currentPage === 'work-plan.html';
            if (isWorkPlanPage) {
                workPlanLink.classList.add('active');
                workPlanLink.style.background = 'rgba(255,255,255,0.1)';
            }

            workPlanLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>KẾ HOẠCH CÔNG VIỆC</span>`;
                
            if (kinhDoanhEl) {
                nav.insertBefore(workPlanLink, kinhDoanhEl);
            } else if (quantriEl) {
                nav.insertBefore(workPlanLink, quantriEl);
            } else {
                nav.appendChild(workPlanLink);
            }
        }

        // Check if AI ASSISTANT / TRỢ LÝ AI already exists (from template or hardcoded)
        const hasAI = navHTML.includes('reports-ai.html');
        if (!hasAI) {
            const aiSection = document.createElement('div');
            aiSection.innerHTML = `
            <!-- TRỢ LÝ AI -->
            <div class="nav-item has-submenu"><div class="flex items-center gap-3 flex-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg><span>AI ASSISTANT</span><span style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:9px;padding:2px 6px;border-radius:10px;font-weight:700;">AI</span></div><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4 transition-transform duration-200 arrow-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg></div>
            <div class="submenu">
                <a href="reports-ai.html" class="submenu-item"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span>Báo cáo AI</span></a>
                <a href="javascript:void(0)" class="submenu-item" onclick="if(window.openAISearch)window.openAISearch();else alert('Nhấn Ctrl+K');"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><span>Tìm kiếm AI</span><span style="font-size:10px;color:#94a3b8;margin-left:auto;">Ctrl+K</span></a>
            </div>`;
            const aiNodes = Array.from(aiSection.children);
            aiNodes.forEach(node => {
                if (quantriEl) nav.insertBefore(node, quantriEl);
                else nav.appendChild(node);
            });
        }

        // Check if TIN NHẮN already exists (from template or hardcoded)
        const hasMsg = navHTML.includes('sidebarMsgBadge');
        if (!hasMsg) {
            const isMessagesPage = this.currentPage === 'messages.html';
            const msgLink = document.createElement('a');
            msgLink.href = 'messages.html';
            msgLink.className = 'nav-item';
            if (isMessagesPage) msgLink.style.background = 'rgba(255,255,255,0.1)';
            msgLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span>TIN NHẮN</span>
                <span style="background:#ef4444;color:white;font-size:9px;padding:2px 6px;border-radius:10px;font-weight:700;" id="sidebarMsgBadge" class="hidden">0</span>`;
            if (quantriEl) nav.insertBefore(msgLink, quantriEl);
            else nav.appendChild(msgLink);
        }

        // Check if CHẤM CÔNG already exists
        const hasAttendance = navHTML.includes('attendance.html');
        if (!hasAttendance) {
            const isAttendancePage = this.currentPage === 'attendance.html';
            const attLink = document.createElement('a');
            attLink.href = 'attendance.html';
            attLink.className = 'nav-item';
            if (isAttendancePage) attLink.style.background = 'rgba(255,255,255,0.1)';
            attLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>CHẤM CÔNG</span>`;
            if (quantriEl) nav.insertBefore(attLink, quantriEl);
            else nav.appendChild(attLink);
        }
    }

    /**
     * Load AI Widgets (Chatbot + Search) on all pages
     */
    loadAIWidgets() {
        const isMessagesPage = window.location.pathname.includes('messages.html');

        // Load AI widgets (skip chatbot on messages page to avoid overlap)
        const scripts = isMessagesPage
            ? ['js/ai-search-widget.js']
            : ['js/ai-chatbot-widget.js', 'js/ai-search-widget.js'];

        scripts.forEach(src => {
            if (!document.querySelector(`script[src="${src}"]`)) {
                const s = document.createElement('script');
                s.src = src;
                s.async = true;
                document.body.appendChild(s);
            }
        });

        // Auto-load Socket.IO client globally if not present
        if (!window.io && !document.querySelector('script[src*="socket.io.min.js"]')) {
            const socketScript = document.createElement('script');
            socketScript.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
            socketScript.async = false;
            document.head.appendChild(socketScript);
        }

        // Auto-load chat menu on ALL pages (TIN NHẮN + unread badge)
        if (!document.querySelector('script[src="js/sidebar-chat-menu.js"]')) {
            const chatMenuScript = document.createElement('script');
            chatMenuScript.src = 'js/sidebar-chat-menu.js';
            chatMenuScript.async = true;
            document.body.appendChild(chatMenuScript);
        }
    }

    /**
     * Mobile Hamburger Menu - Auto inject and manage
     * Creates hamburger button + overlay, handles open/close
     */
    setupMobileMenu() {
        // Create hamburger button
        const hamburger = document.createElement('button');
        hamburger.className = 'mobile-hamburger';
        hamburger.id = 'mobileHamburger';
        hamburger.setAttribute('aria-label', 'Menu');
        hamburger.innerHTML = `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
        `;
        document.body.appendChild(hamburger);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';
        document.body.appendChild(overlay);

        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Toggle sidebar
        const toggleSidebar = (open) => {
            if (open) {
                sidebar.classList.add('mobile-open');
                overlay.classList.add('show');
                hamburger.innerHTML = `
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                `;
            } else {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('show');
                hamburger.innerHTML = `
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                `;
            }
        };

        // Hamburger click
        hamburger.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('mobile-open');
            toggleSidebar(!isOpen);
        });

        // Overlay click → close
        overlay.addEventListener('click', () => toggleSidebar(false));

        // Close when clicking a nav link (on mobile)
        sidebar.addEventListener('click', (e) => {
            const link = e.target.closest('a.nav-item, a.submenu-item');
            if (link && link.getAttribute('href') && window.innerWidth <= 768) {
                setTimeout(() => toggleSidebar(false), 150);
            }
        });

        // Handle resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('show');
            }
        });
    }


    /**
     * Get API base URL - dynamically detect from current environment
     */
    getApiBase() {
        return window.API_BASE || '/api';
    }

    /**
     * Load and display company logo from settings API
     */
    async loadCompanyLogo() {
        try {
            const token = sessionStorage.getItem('token');
            if (!token) return;

            const apiBase = this.getApiBase();
            const response = await fetch(`${apiBase}/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (result.success && result.data) {
                const settings = result.data;

                // Update company name
                const companyNameEl = document.getElementById('companyName');
                if (companyNameEl && settings.company_name) {
                    companyNameEl.textContent = settings.company_name;
                }

                // Update company logo
                const companyLogo = document.getElementById('companyLogo');
                const companyLogoIcon = document.getElementById('companyLogoIcon');

                if (settings.logo_path && companyLogo && companyLogoIcon) {
                    companyLogo.src = settings.logo_path;
                    companyLogo.classList.remove('hidden');
                    companyLogoIcon.classList.add('hidden');
                    console.log(`[Sidebar] Loaded company logo: ${settings.company_name}`);
                }
            }
        } catch (e) {
            console.error('Error loading company logo:', e);
        }
    }

    /**
     * Load and display user role from API /auth/me
     * Gọi API để lấy role_name mới nhất và cập nhật sessionStorage
     */
    loadUserRoleDisplay() {

        // Đầu tiên hiển thị từ sessionStorage (để UI không bị trống)
        this.displayUserFromSession();

        // Sau đó gọi API để lấy dữ liệu mới nhất
        this.fetchAndUpdateUserRole();
    }

    /**
     * Display user info from sessionStorage (quick initial display)
     */
    displayUserFromSession() {
        try {
            const userStr = sessionStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            this.updateSidebarUI(user);
        } catch (e) {
            console.error('Error displaying user from session:', e);
        }
    }

    /**
     * Fetch latest user data from API and update sessionStorage
     */
    async fetchAndUpdateUserRole() {
        try {
            const token = sessionStorage.getItem('token');
            if (!token) return;

            const apiBase = this.getApiBase();
            const response = await fetch(`${apiBase}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });


            const result = await response.json();

            if (result.success && result.data) {
                const user = result.data;

                // Cập nhật sessionStorage với dữ liệu mới nhất từ API
                const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
                const updatedUser = {
                    ...currentUser,
                    ...user,
                    role_name: user.role_name || (user.user_type === 'admin' ? 'Quản trị viên' : 'Chưa phân quyền')
                };
                sessionStorage.setItem('user', JSON.stringify(updatedUser));

                // Cập nhật UI với dữ liệu mới
                this.updateSidebarUI(updatedUser);

                console.log(`[Sidebar] Updated from API - User: ${updatedUser.full_name}, Role: ${updatedUser.role_name}`);
            }
        } catch (e) {
            console.error('Error fetching user role from API:', e);
        }
    }

    /**
     * Update sidebar UI with user data
     */
    updateSidebarUI(user) {
        // Role fallback mapping table (khi API không trả về role_name)
        const ROLE_NAME_MAPPING = {
            1: 'Super Admin',
            2: 'Quản lý',
            3: 'Kế toán',
            4: 'Thiết kế',
            5: 'Sản xuất',
            6: 'Kho',
            7: 'Lắp đặt',
            8: 'Kinh doanh'
        };

        // Xác định roleName với fallback logic
        let roleName = user.role_name;

        // Fallback 1: Dùng mapping nếu có role_id
        if (!roleName && user.role_id) {
            roleName = ROLE_NAME_MAPPING[user.role_id];
            console.log(`[Sidebar] Using fallback mapping for role_id ${user.role_id}: ${roleName}`);
        }

        // Fallback 2: Dùng user_type
        if (!roleName) {
            roleName = user.user_type === 'admin' ? 'Quản trị viên' : 'Chưa phân quyền';
        }

        const fullName = user.full_name || 'Người dùng';

        // Cập nhật tên người dùng
        const userNameElements = document.querySelectorAll('#sidebarUserName, .sidebar-user-name');
        userNameElements.forEach(el => {
            if (el) el.textContent = fullName;
        });

        // Cập nhật chức vụ - tìm element có class text-blue-200 trong sidebar user section
        const roleElements = document.querySelectorAll('.p-4.border-b .text-xs.text-blue-200, .sidebar-role-text, #sidebarUserRole');
        roleElements.forEach(el => {
            if (el) el.textContent = roleName;
        });

        // Fallback: tìm element trong user profile section
        const userProfileSection = document.querySelector('.p-4.border-b.border-blue-600');
        if (userProfileSection) {
            const roleEl = userProfileSection.querySelector('.text-xs.text-blue-200');
            if (roleEl) {
                roleEl.textContent = roleName;
                roleEl.setAttribute('data-role', user.role_id || '');
            }
        }

        // Cập nhật avatar nếu có
        if (user.avatar_url) {
            const avatarInitial = document.getElementById('sidebarUserAvatarInitial');
            const avatarImage = document.getElementById('sidebarUserAvatarImage');
            if (avatarInitial && avatarImage) {
                avatarInitial.classList.add('hidden');
                avatarImage.src = user.avatar_url;
                avatarImage.classList.remove('hidden');
            }
        } else {
            // Hiển thị initial nếu không có avatar
            const avatarInitial = document.getElementById('sidebarUserAvatarInitial');
            const avatarImage = document.getElementById('sidebarUserAvatarImage');
            if (avatarInitial) {
                avatarInitial.textContent = (fullName || 'U').charAt(0).toUpperCase();
                avatarInitial.classList.remove('hidden');
            }
            if (avatarImage) {
                avatarImage.classList.add('hidden');
            }
        }

        // --- NEW: Handle Manager-Only Menu Items ---
        if (user.role === 'admin' || user.role === 'manager' || user.role === 'super_admin' || user.user_type === 'admin') {
            document.querySelectorAll('.manager-only').forEach(el => {
                el.style.display = '';
            });
        } else {
            document.querySelectorAll('.manager-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    }

    /**
     * Set active state for current page
     */
    setupActiveStates() {
        // First, check submenu items (if any)
        const submenuItems = document.querySelectorAll('.submenu-item');
        submenuItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && (href === this.currentPage || href.includes(this.currentPage))) {
                item.classList.add('active');

                // Expand parent submenu
                const parentItem = item.closest('.submenu')?.previousElementSibling;
                if (parentItem && parentItem.classList.contains('has-submenu')) {
                    parentItem.classList.add('expanded', 'active');
                    const submenu = parentItem.nextElementSibling;
                    if (submenu && submenu.classList.contains('submenu')) {
                        submenu.classList.add('expanded');
                    }
                }
            }
        });

        // Then check regular nav items (including those with href)
        const navItems = document.querySelectorAll('.nav-item[href]');
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && (href === this.currentPage || href.includes(this.currentPage))) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Setup Single Page Application Navigation
     * DISABLED: SPA navigation has issues with script re-initialization
     * Now uses normal page navigation for reliability
     */
    setupSPANavigation() {
        // SPA navigation is disabled due to issues with script initialization
        // The browser will handle navigation normally (full page reload)
        // This ensures all JavaScript is properly initialized on each page
        console.log('📌 SPA Navigation disabled - using standard page navigation');

        // Don't add click handlers that prevent default navigation
        // Let the browser handle <a href="..."> links normally
    }

    /**
     * Navigate to page without reload
     */
    async navigateToPage(href, clickedItem) {
        if (this.isNavigating) return;

        this.isNavigating = true;

        // Remove active state from all items
        document.querySelectorAll('.nav-item, .submenu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active state to clicked item
        clickedItem.classList.add('active');

        // Show loading state
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.add('loading');
            this.showSkeletonLoading(mainContent);
        }

        try {
            // Check if page is in cache
            let content;
            if (this.prefetchCache.has(href)) {
                content = this.prefetchCache.get(href);
            } else {
                // Fetch page content
                const response = await fetch(href);
                const html = await response.text();

                // Extract main content from fetched page
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newMainContent = doc.querySelector('.main-content') || doc.querySelector('body');

                if (newMainContent) {
                    content = newMainContent.innerHTML;
                    this.prefetchCache.set(href, content);
                } else {
                    // Fallback: use full body content
                    content = doc.body ? doc.body.innerHTML : html;
                    this.prefetchCache.set(href, content);
                }
            }

            // Update URL without reload
            window.history.pushState({ path: href }, '', href);

            // Update main content
            if (mainContent) {
                // Small delay for smooth transition
                await this.delay(100);

                // Set new content (inline scripts will execute automatically)
                mainContent.innerHTML = content;

                // Re-initialize only external scripts (avoid redeclaration errors)
                this.reinitializeScripts(mainContent);

                // Small delay to ensure scripts are executed and functions are available
                await this.delay(300);

                // Trigger page initialization after SPA navigation
                this.initializePageAfterNavigation(mainContent, href);

                // Additional delay to ensure all initialization is complete
                await this.delay(100);

                mainContent.classList.remove('loading');
                mainContent.classList.add('loaded');
            }

        } catch (error) {
            console.error('Navigation error:', error);
            // Fallback to normal navigation
            window.location.href = href;
        } finally {
            this.isNavigating = false;
        }
    }

    /**
     * Setup Prefetching - Load pages on hover
     * DISABLED: Prefetching disabled since SPA navigation is off
     */
    setupPrefetching() {
        // Prefetching disabled - not needed with standard page navigation
    }

    /**
     * Prefetch page content
     */
    async prefetchPage(href) {
        try {
            const response = await fetch(href);
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const mainContent = doc.querySelector('.main-content') || doc.querySelector('body');

            if (mainContent) {
                this.prefetchCache.set(href, mainContent.innerHTML);
            }
        } catch (error) {
            console.warn('Prefetch failed for:', href, error);
        }
    }

    /**
     * Setup Ripple Effects
     */
    setupRippleEffects() {
        const navItems = document.querySelectorAll('.nav-item, .submenu-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.createRipple(e, item);
            });
        });
    }

    /**
     * Create ripple effect
     */
    createRipple(event, element) {
        // đảm bảo item làm "khung" cho ripple
        element.style.position = element.style.position || 'relative';
        element.style.overflow = element.style.overflow || 'hidden';

        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        // QUAN TRỌNG: để ripple không chiếm layout
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '9999px';
        ripple.style.pointerEvents = 'none';
        ripple.style.transform = 'scale(0)';
        ripple.style.opacity = '0.25';
        ripple.style.background = 'rgba(255,255,255,0.9)';
        ripple.style.animation = 'ripple 600ms ease-out';

        ripple.classList.add('ripple');
        element.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * Setup Accordion Menus for submenus
     */
    setupAccordionMenus() {
        const submenuHeaders = document.querySelectorAll('.nav-item.has-submenu');
        console.log('[Sidebar] setupAccordionMenus - Found', submenuHeaders.length, 'submenu headers');

        submenuHeaders.forEach((header, index) => {
            // Skip if already has listener (prevent duplicates)
            if (header.dataset.accordionInit) return;
            header.dataset.accordionInit = 'true';

            header.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Sidebar] Submenu clicked:', index, header.textContent.trim().substring(0, 30));

                const submenu = header.nextElementSibling;
                if (!submenu || !submenu.classList.contains('submenu')) {
                    console.log('[Sidebar] No submenu found for header:', index);
                    return;
                }

                const isExpanded = header.classList.contains('expanded');
                console.log('[Sidebar] Toggle submenu', index, 'isExpanded:', isExpanded, '-> ', !isExpanded);

                // ✅ Cho phép mở nhiều mục: chỉ toggle mục hiện tại
                header.classList.toggle('expanded', !isExpanded);
                submenu.classList.toggle('expanded', !isExpanded);
            });
        });
    }



    /**
     * Show skeleton loading
     */
    showSkeletonLoading(container) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-container';
        skeleton.innerHTML = `
            <div class="space-y-4 p-6">
                <div class="skeleton-line long"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line long"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line long"></div>
            </div>
        `;
        container.appendChild(skeleton);
    }

    /**
     * Setup skeleton loading for initial page load
     */
    setupSkeletonLoading() {
        // Show skeleton while page is loading
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !mainContent.classList.contains('loaded')) {
            mainContent.classList.add('loading');
            setTimeout(() => {
                mainContent.classList.remove('loading');
                mainContent.classList.add('loaded');
            }, 300);
        }
    }

    /**
     * Re-initialize scripts in new content
     */
    reinitializeScripts(container) {
        // IMPORTANT: Inline scripts are already executed when innerHTML is set
        // We need to keep them temporarily to ensure functions are defined globally
        // Then remove them after a delay to prevent redeclaration errors
        // DO NOT remove immediately - functions need time to be defined

        // Only load external scripts that aren't already loaded globally
        const externalScripts = container.querySelectorAll('script[src]');
        externalScripts.forEach(oldScript => {
            const src = oldScript.getAttribute('src');
            if (src) {
                // Check if script is already loaded in document
                const existingScript = document.querySelector(`script[src="${src}"]`);
                if (!existingScript) {
                    const newScript = document.createElement('script');
                    newScript.src = src;
                    newScript.async = false;
                    document.head.appendChild(newScript);
                }
                // Remove from container since we've handled it
                oldScript.remove();
            }
        });

        // Remove inline scripts after a delay to prevent redeclaration errors
        // But keep them long enough for functions to be defined in global scope
        setTimeout(() => {
            const inlineScripts = container.querySelectorAll('script:not([src])');
            inlineScripts.forEach(script => {
                // Only remove if it's not needed (functions are already in global scope)
                script.remove();
            });
        }, 200);
    }

    /**
     * Initialize page after SPA navigation
     * This ensures data loading functions are called
     */
    initializePageAfterNavigation(container, href) {
        // Dispatch custom event for pages to listen
        const pageLoadEvent = new CustomEvent('spaPageLoad', {
            detail: { href, container }
        });
        document.dispatchEvent(pageLoadEvent);

        // Auto-detect and call common data loading functions based on page
        const pageName = this.getPageNameFromHref(href);

        // Wait a bit more for all scripts to be ready
        setTimeout(() => {
            this.callPageSpecificLoadFunctions(pageName);
        }, 100);
    }

    /**
     * Get page name from href
     */
    getPageNameFromHref(href) {
        const url = new URL(href, window.location.origin);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop() || 'index.html';
        return filename.replace('.html', '');
    }

    /**
     * Call page-specific load functions
     */
    callPageSpecificLoadFunctions(pageName) {
        // Common load functions pattern - call all that exist
        const loadFunctions = [
            'loadCompanyLogo',
            'loadUserInfo',
            'loadUnreadCount',
            'loadCustomers',
            'loadProjects',
            'loadAccessories',
            'loadAluminumSystems',
            'loadGlassItems',
            'loadOtherItems',
            'loadTransactions',
            'loadScraps',
            'loadStats',
            'loadDashboardStats',
            'loadProductionOrders',
            'loadInstallationProjects',
            'loadHandoverProjects',
            'loadExportedMaterials',
            'loadFinanceData',
            'loadProjectsForExport'
        ];

        // Try to call each function if it exists
        loadFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                try {
                    window[funcName]();
                } catch (error) {
                    console.warn(`Error calling ${funcName}:`, error);
                }
            }
        });

        // Page-specific initialization
        switch (pageName) {
            case 'sales':
                // Load customers by default
                if (typeof window.loadCustomers === 'function') {
                    window.loadCustomers();
                }
                break;

            case 'inventory':
                // Load stats and default tab (accessory)
                if (typeof window.loadStats === 'function') {
                    window.loadStats();
                }
                if (typeof window.loadAccessories === 'function') {
                    window.loadAccessories();
                }
                if (typeof window.loadProjectsForExport === 'function') {
                    window.loadProjectsForExport();
                }
                break;

            case 'production-management':
                if (typeof window.loadProjects === 'function') {
                    window.loadProjects();
                }
                break;
        }
    }

    /**
     * Utility: Delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.path) {
        window.location.href = e.state.path;
    }
});

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.enterpriseSidebar = new EnterpriseSidebar();
    });
} else {
    window.enterpriseSidebar = new EnterpriseSidebar();
}

