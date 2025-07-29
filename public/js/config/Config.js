/**
 * Application Configuration
 * Central configuration management for the application
 */

export const CONFIG = {
    // Application metadata
    APP: {
        NAME: 'Encrypted Chat',
        VERSION: '2.0.0',
        DESCRIPTION: 'End-to-end encrypted chat with voice calls'
    },

    // WebRTC Configuration
    WEBRTC: {
        ICE_SERVERS: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ],
        CONNECTION_TIMEOUT: 10000,
        PING_TIMEOUT: 60000,
        PING_INTERVAL: 25000
    },

    // Socket.IO Configuration
    SOCKET: {
        TRANSPORTS: ['websocket', 'polling'],
        TIMEOUT: 10000,
        RECONNECTION_ATTEMPTS: 5,
        RECONNECTION_DELAY: 1000,
        UPGRADE: true,
        REMEMBER_UPGRADE: true
    },

    // UI Configuration
    UI: {
        MESSAGE_INPUT_MAX_LENGTH: 1000,
        TEXTAREA_MAX_HEIGHT: 120,
        AUTO_SCROLL_THRESHOLD: 100,
        ANIMATION_DURATION: 300
    },

    // Validation Rules
    VALIDATION: {
        DISPLAY_NAME: {
            MIN_LENGTH: 2,
            MAX_LENGTH: 20,
            PATTERN: /^[a-zA-Z0-9\s_-]+$/
        },
        SECRET_KEY: {
            MIN_LENGTH: 3,
            MAX_LENGTH: 100
        },
        MESSAGE: {
            MAX_LENGTH: 1000
        }
    },

    // Storage Keys
    STORAGE: {
        USER_KEY: 'chatUser',
        SECRET_KEY: 'chatKey',
        SETTINGS_KEY: 'chatSettings'
    },

    // Error Messages
    ERRORS: {
        NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
        MICROPHONE_ERROR: 'Failed to access microphone. Please check permissions.',
        CALL_FAILED: 'Voice call failed. Please try again.',
        ENCRYPTION_FAILED: 'Failed to encrypt message.',
        INVALID_INPUT: 'Invalid input provided.'
    },

    // Features flags
    FEATURES: {
        VOICE_CALLS: true,
        FILE_SHARING: false,
        VIDEO_CALLS: false,
        SCREEN_SHARING: false,
        MESSAGE_REACTIONS: false,
        TYPING_INDICATORS: false
    },

    // Development/Debug settings
    DEBUG: {
        ENABLED: false, // Set to true for development
        LOG_SOCKET_EVENTS: false,
        LOG_WEBRTC_EVENTS: false,
        SHOW_PERFORMANCE_METRICS: false
    },

    // Environment detection
    ENVIRONMENT: {
        get IS_DEVELOPMENT() {
            return window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('192.168.') ||
                window.location.hostname.includes('10.') ||
                window.location.hostname.includes('172.');
        },

        get IS_VERCEL() {
            return window.location.hostname.includes('vercel.app') ||
                window.location.hostname.includes('vercel.com');
        },

        get IS_HTTPS() {
            return window.location.protocol === 'https:';
        }
    },

    // API Endpoints (for Vercel deployment)
    API: {
        SOCKET_PATH: '/api/socket',
        MESSAGES_ENDPOINT: '/api/messages',
        HEALTH_ENDPOINT: '/health'
    }
};

// Environment-specific overrides
if (CONFIG.ENVIRONMENT.IS_DEVELOPMENT) {
    CONFIG.DEBUG.ENABLED = true;
    CONFIG.DEBUG.LOG_SOCKET_EVENTS = true;
}

// Freeze configuration to prevent accidental modification
Object.freeze(CONFIG.APP);
Object.freeze(CONFIG.WEBRTC);
Object.freeze(CONFIG.SOCKET);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.VALIDATION);
Object.freeze(CONFIG.STORAGE);
Object.freeze(CONFIG.ERRORS);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.API);
Object.freeze(CONFIG);

export default CONFIG;
