/**
 * Auth Helper - Centralized Authentication Handler
 * ViralWindow System
 * 
 * MUST be loaded FIRST before any other scripts in <head>
 * This ensures Remember Login works across all pages
 */

(function () {
    'use strict';

    // Immediately sync token on load (synchronous, before anything else runs)
    const localToken = localStorage.getItem('token');
    const sessionToken = sessionStorage.getItem('token');

    // If token exists in localStorage but not in sessionStorage, user has "Remember Me" enabled
    if (localToken && !sessionToken) {
        sessionStorage.setItem('token', localToken);
        const localUser = localStorage.getItem('user');
        if (localUser) {
            sessionStorage.setItem('user', localUser);
        }
        console.log('[AuthHelper] Token synced from localStorage');
    }

    // Expose global auth helper functions
    window.AuthHelper = {
        /**
         * Get token - prioritize sessionStorage, fallback to localStorage
         */
        getToken: function () {
            return sessionStorage.getItem('token') || localStorage.getItem('token');
        },

        /**
         * Get user object
         */
        getUser: function () {
            const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
            try {
                return userStr ? JSON.parse(userStr) : null;
            } catch (e) {
                return null;
            }
        },

        /**
         * Check if user is authenticated
         */
        isAuthenticated: function () {
            return !!this.getToken();
        },

        /**
         * Save auth data with Remember Me support
         * @param {string} token - JWT token
         * @param {object} user - User object
         * @param {boolean} rememberMe - Whether to persist across browser sessions
         */
        saveAuth: function (token, user, rememberMe) {
            // Always save to sessionStorage for current session
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(user));

            if (rememberMe) {
                // Also save to localStorage for persistence
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('rememberMe', 'true');
            } else {
                // Clear localStorage if not remembering
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.setItem('rememberMe', 'false');
            }
        },

        /**
         * Clear all auth data (logout)
         */
        clearAuth: function () {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('userPermissions');
            sessionStorage.removeItem('isAdmin');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('rememberMe');
        },

        /**
         * Get Remember Me preference
         */
        getRememberMe: function () {
            return localStorage.getItem('rememberMe') === 'true';
        },

        /**
         * Redirect to login page
         */
        redirectToLogin: function () {
            this.clearAuth();
            window.location.href = 'login.html';
        },

        /**
         * Check auth and redirect to login if not authenticated
         * @returns {boolean} - true if authenticated, false otherwise
         */
        checkAuth: function () {
            if (!this.isAuthenticated()) {
                this.redirectToLogin();
                return false;
            }
            return true;
        },

        /**
         * Enable Remember Me for current session
         */
        enableRememberMe: function () {
            const token = sessionStorage.getItem('token');
            const user = sessionStorage.getItem('user');
            if (token) {
                localStorage.setItem('token', token);
                localStorage.setItem('rememberMe', 'true');
                if (user) {
                    localStorage.setItem('user', user);
                }
            }
        },

        /**
         * Disable Remember Me
         */
        disableRememberMe: function () {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.setItem('rememberMe', 'false');
        }
    };

    // Also expose as global checkAuth for backward compatibility
    window.checkAuth = function () {
        return window.AuthHelper.checkAuth();
    };

    // Expose getAuthToken for backward compatibility
    window.getAuthToken = function () {
        return window.AuthHelper.getToken();
    };

    // Global handleLogout - clears both storages and redirects to login
    // This overrides any local handleLogout functions defined later in HTML files
    window.handleLogout = async function () {
        // Check if VWModal is available for confirmation dialog
        if (window.VWModal && typeof window.VWModal.confirm === 'function') {
            const confirmed = await window.VWModal.confirm('Đăng xuất', 'Bạn có chắc muốn đăng xuất?');
            if (!confirmed) return;
        } else {
            // Fallback to native confirm
            if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
        }

        // Clear all auth data from both storages
        window.AuthHelper.clearAuth();

        // Redirect to login page
        window.location.href = 'login.html';
    };

    // Global fetch interceptor to handle SESSION_EXPIRED
    // This wraps the native fetch to auto-logout when session is terminated
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        const responseClone = response.clone();

        if (response.status === 401) {
            try {
                const data = await responseClone.json();
                if (data.code === 'SESSION_EXPIRED') {
                    alert('Phiên đăng nhập đã hết hạn hoặc đã bị đăng xuất từ thiết bị khác.');
                    window.AuthHelper.clearAuth();
                    window.location.href = 'login.html';
                    return response;
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        }

        return response;
    };

    // Load AI Brain Chat Widget for authenticated users
    document.addEventListener('DOMContentLoaded', () => {
        if (window.AuthHelper.isAuthenticated()) {
            const aiScript = document.createElement('script');
            aiScript.src = 'js/ai-chat.js';
            document.head.appendChild(aiScript);
        }
    });

})();
