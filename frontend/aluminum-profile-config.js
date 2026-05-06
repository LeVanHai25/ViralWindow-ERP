/**
 * ALUMINUM PROFILE CONFIGURATION
 * Định nghĩa kích thước profile cho các hệ nhôm
 */

const ALUMINUM_PROFILES = {
    'Xingfa 55': {
        name: 'Xingfa 55',
        frame: {
            width: 50,      // mm - độ dày khung
            height: 50,
            thickness: 1.4
        },
        sash: {
            width: 45,      // mm - độ dày cánh
            height: 45,
            thickness: 1.4
        },
        mullion: {
            width: 80,      // mm - độ dày đố
            height: 80,
            thickness: 1.4
        },
        glassOffset: 15,    // mm - khoảng cách từ khung đến kính
        sashOffset: 5       // mm - khoảng cách từ khung đến cánh
    },
    'Xingfa 60': {
        name: 'Xingfa 60',
        frame: {
            width: 60,
            height: 60,
            thickness: 1.4
        },
        sash: {
            width: 55,
            height: 55,
            thickness: 1.4
        },
        mullion: {
            width: 90,
            height: 90,
            thickness: 1.4
        },
        glassOffset: 18,
        sashOffset: 5
    },
    'Xingfa 70': {
        name: 'Xingfa 70',
        frame: {
            width: 70,
            height: 70,
            thickness: 1.6
        },
        sash: {
            width: 65,
            height: 65,
            thickness: 1.6
        },
        mullion: {
            width: 100,
            height: 100,
            thickness: 1.6
        },
        glassOffset: 20,
        sashOffset: 6
    },
    'Việt Pháp': {
        name: 'Việt Pháp',
        frame: {
            width: 55,
            height: 55,
            thickness: 1.4
        },
        sash: {
            width: 50,
            height: 50,
            thickness: 1.4
        },
        mullion: {
            width: 85,
            height: 85,
            thickness: 1.4
        },
        glassOffset: 16,
        sashOffset: 5
    },
    'ViralWindow': {
        name: 'ViralWindow',
        frame: {
            width: 50,
            height: 50,
            thickness: 1.4
        },
        sash: {
            width: 45,
            height: 45,
            thickness: 1.4
        },
        mullion: {
            width: 80,
            height: 80,
            thickness: 1.4
        },
        glassOffset: 15,
        sashOffset: 5
    }
};

/**
 * Get profile config for a system
 */
function getProfileConfig(systemName) {
    return ALUMINUM_PROFILES[systemName] || ALUMINUM_PROFILES['Xingfa 55'];
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ALUMINUM_PROFILES, getProfileConfig };
} else {
    window.ALUMINUM_PROFILES = ALUMINUM_PROFILES;
    window.getProfileConfig = getProfileConfig;
}






















