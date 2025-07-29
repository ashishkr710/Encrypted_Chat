/**
 * Main Application Entry Point
 * Initializes and coordinates all modules
 */

import { AppState } from './state/AppState.js';
import { uiManager } from './modules/UIManager.js';
import { messageHandler } from './modules/MessageHandler.js';
import { socketService } from './services/SocketService.js';
import { voiceCallService } from './services/VoiceCallService.js';

/**
 * Application class - Main controller
 */
class EncryptedChatApp {
    constructor() {
        this.initialized = false;
        this.version = '2.0.0';
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            console.log(`🚀 Initializing Encrypted Chat App v${this.version}...`);

            // Check browser compatibility
            this._checkBrowserCompatibility();

            // Initialize modules in order
            await this._initializeModules();

            // Setup global error handlers
            this._setupErrorHandlers();

            // Mark as initialized
            this.initialized = true;

            console.log('✅ Application initialized successfully');

            // Emit ready event
            this._emitGlobalEvent('app-ready');

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this._handleInitializationError(error);
        }
    }

    /**
     * Get application information
     * @returns {Object} - Application info
     */
    getInfo() {
        return {
            version: this.version,
            initialized: this.initialized,
            modules: {
                ui: !!uiManager,
                messaging: !!messageHandler,
                socket: !!socketService,
                voiceCall: !!voiceCallService
            },
            state: {
                user: AppState.currentUser,
                connected: AppState.isConnected,
                inCall: AppState.isInCall,
                messageCount: AppState.messages.length
            }
        };
    }

    /**
     * Shutdown the application
     */
    async shutdown() {
        console.log('🔄 Shutting down application...');

        try {
            // End any active call
            if (AppState.isInCall) {
                voiceCallService.endCall();
            }

            // Disconnect from socket
            socketService.disconnect();

            // Clear application state
            AppState.clearSession();

            // Remove global event listeners
            this._removeGlobalEventListeners();

            this.initialized = false;

            console.log('✅ Application shutdown complete');

        } catch (error) {
            console.error('❌ Error during shutdown:', error);
        }
    }

    /**
     * Restart the application
     */
    async restart() {
        await this.shutdown();
        await this.init();
    }

    /**
     * Check browser compatibility
     * @private
     */
    _checkBrowserCompatibility() {
        const requiredFeatures = [
            'WebSocket',
            'RTCPeerConnection',
            'MediaDevices',
            'sessionStorage',
            'fetch'
        ];

        const missingFeatures = requiredFeatures.filter(feature => {
            switch (feature) {
                case 'WebSocket':
                    return typeof WebSocket === 'undefined';
                case 'RTCPeerConnection':
                    return typeof RTCPeerConnection === 'undefined';
                case 'MediaDevices':
                    return !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia;
                case 'sessionStorage':
                    return typeof sessionStorage === 'undefined';
                case 'fetch':
                    return typeof fetch === 'undefined';
                default:
                    return false;
            }
        });

        if (missingFeatures.length > 0) {
            const message = `Browser missing required features: ${missingFeatures.join(', ')}`;
            console.error(message);
            throw new Error(message);
        }

        console.log('✅ Browser compatibility check passed');
    }

    /**
     * Initialize all modules
     * @private
     */
    async _initializeModules() {
        console.log('📦 Initializing modules...');

        // Initialize UI Manager (this also handles session loading)
        uiManager.init();
        console.log('✅ UI Manager initialized');

        // Message handler and services are initialized automatically
        // through their constructors and imports

        console.log('✅ All modules initialized');
    }

    /**
     * Setup global error handlers
     * @private
     */
    _setupErrorHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this._handleGlobalError(event.error);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this._handleGlobalError(event.reason);
        });

        // WebRTC error handler
        if (typeof RTCPeerConnection !== 'undefined') {
            const originalCreateOffer = RTCPeerConnection.prototype.createOffer;
            RTCPeerConnection.prototype.createOffer = function (...args) {
                return originalCreateOffer.apply(this, args).catch(error => {
                    console.error('WebRTC createOffer error:', error);
                    throw error;
                });
            };
        }
    }

    /**
     * Handle initialization errors
     * @param {Error} error - Initialization error
     * @private
     */
    _handleInitializationError(error) {
        // Show user-friendly error message
        const errorMessage = this._getErrorMessage(error);

        // Try to show error through UI if possible
        if (uiManager && typeof uiManager.showError === 'function') {
            uiManager.showError(`Initialization failed: ${errorMessage}`);
        } else {
            alert(`Application failed to start: ${errorMessage}`);
        }

        // Attempt graceful degradation
        this._attemptGracefulDegradation(error);
    }

    /**
     * Handle global errors
     * @param {Error} error - Global error
     * @private
     */
    _handleGlobalError(error) {
        const errorMessage = this._getErrorMessage(error);
        console.error('Handling global error:', errorMessage);

        // Don't overwhelm user with too many error messages
        if (this._shouldShowErrorToUser(error)) {
            if (uiManager && typeof uiManager.showError === 'function') {
                uiManager.showError(errorMessage);
            }
        }
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} - User-friendly message
     * @private
     */
    _getErrorMessage(error) {
        if (!error) return 'Unknown error occurred';

        // Handle specific error types
        if (error.name === 'NotAllowedError') {
            return 'Permission denied. Please allow microphone access for voice calls.';
        }

        if (error.name === 'NotFoundError') {
            return 'Microphone not found. Please check your audio devices.';
        }

        if (error.message && error.message.includes('network')) {
            return 'Network connection error. Please check your internet connection.';
        }

        return error.message || 'An unexpected error occurred';
    }

    /**
     * Check if error should be shown to user
     * @param {Error} error - Error object
     * @returns {boolean} - Whether to show error
     * @private
     */
    _shouldShowErrorToUser(error) {
        // Don't show certain types of errors to avoid spam
        const ignoredErrors = [
            'Script error',
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured'
        ];

        const errorMessage = error.message || error.toString();
        return !ignoredErrors.some(ignored => errorMessage.includes(ignored));
    }

    /**
     * Attempt graceful degradation on critical errors
     * @param {Error} error - Critical error
     * @private
     */
    _attemptGracefulDegradation(error) {
        console.log('Attempting graceful degradation...');

        try {
            // At minimum, try to show a basic interface
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                    <h1>🚫 Application Error</h1>
                    <p>The application failed to start properly.</p>
                    <p><strong>Error:</strong> ${this._getErrorMessage(error)}</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px;">
                        Reload Page
                    </button>
                </div>
            `;
        } catch (degradationError) {
            console.error('Even graceful degradation failed:', degradationError);
        }
    }

    /**
     * Emit global application event
     * @param {string} event - Event name
     * @param {any} data - Event data
     * @private
     */
    _emitGlobalEvent(event, data = {}) {
        const customEvent = new CustomEvent(event, { detail: data });
        window.dispatchEvent(customEvent);
    }

    /**
     * Remove global event listeners
     * @private
     */
    _removeGlobalEventListeners() {
        // Remove error handlers if needed
        // (In this case, we'll keep them for debugging)
    }
}

// Create and initialize the application
const app = new EncryptedChatApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    // DOM already loaded
    app.init();
}

// Make app globally available for debugging
window.EncryptedChatApp = app;
window.AppState = AppState;

// Export for module systems
export default app;
