/**
 * API Configuration - ViralWindow
 * Centralized API URL management
 * 
 * Usage:
 * 1. Include in HTML: <script src="js/api-config.js"></script>
 * 2. Use: const response = await fetch(`${API_BASE}/endpoint`);
 * 
 * Architecture: Same-origin (frontend + backend on same domain)
 * All API calls use relative /api paths.
 * 
 * @version 2.0.0
 * @date 2026-03-29
 */

(function () {
    'use strict';

    // Same-origin: always use relative path
    const API_BASE_URL = '/api';

    // Only set if not already set by config.js
    if (!window.API_BASE) {
        window.API_BASE = API_BASE_URL;
    }
    if (!window.SERVER_BASE && window.SERVER_BASE !== '') {
        window.SERVER_BASE = '';
    }

    // Also export as module if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { API_BASE: API_BASE_URL };
    }
})();

/**
 * Helper function to make authenticated API calls
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function apiCall(endpoint, options = {}) {
    const url = `${window.API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    // Add auth token if available
    const token = (window.AuthHelper && window.AuthHelper.getToken()) || sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }

    // Default content type for POST/PUT
    if ((options.method === 'POST' || options.method === 'PUT') && options.body && typeof options.body === 'object') {
        options.headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, options);
        return response;
    } catch (err) {
        console.error('[API] Request failed:', endpoint, err.message);
        throw err;
    }
}

/**
 * Helper function to handle API response
 * @param {Response} response - Fetch response
 * @returns {Promise<object>}
 */
async function handleApiResponse(response) {
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
}
