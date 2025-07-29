/**
 * Socket Service
 * Manages WebSocket connection with Socket.IO
 */

import { AppState } from '../state/AppState.js';
import CONFIG from '../config/Config.js';

export class SocketService {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = CONFIG.SOCKET.RECONNECTION_ATTEMPTS;
        this.reconnectDelay = CONFIG.SOCKET.RECONNECTION_DELAY;
        this.eventListeners = new Map();
    }

    /**
     * Connect to the Socket.IO server
     * @returns {Promise<boolean>} - Success status
     */
    async connect() {
        try {
            if (typeof io === 'undefined') {
                throw new Error('Socket.IO not available');
            }

            const socketUrl = `${window.location.protocol}//${window.location.host}`;
            console.log('Connecting to:', socketUrl);

            // Detect if we're on Vercel or local development
            const isVercel = window.location.hostname.includes('vercel.app') ||
                window.location.hostname.includes('vercel.com');

            const socketOptions = {
                timeout: 10000,
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true,
                pingTimeout: 60000,
                pingInterval: 25000,
                forceNew: false,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay
            };

            // Only add custom path for Vercel deployment
            if (isVercel) {
                socketOptions.path = '/api/socket';
            }

            console.log('Socket options:', socketOptions);
            this.socket = io(socketUrl, socketOptions);

            // Store socket in global state
            AppState.updateConnectionStatus(false, this.socket);

            this._setupEventHandlers();

            return new Promise((resolve) => {
                this.socket.on('connect', () => {
                    console.log('Connected to server');
                    AppState.updateConnectionStatus(true, this.socket);
                    this.reconnectAttempts = 0;
                    this._emitToListeners('connection-status', { status: 'connected', message: 'Connected' });
                    resolve(true);
                });

                this.socket.on('connect_error', (error) => {
                    console.log('Connection error:', error);
                    AppState.updateConnectionStatus(false);
                    this._emitToListeners('connection-status', { status: 'demo', message: 'Demo Mode' });
                    resolve(false);
                });

                // Fallback timeout
                setTimeout(() => {
                    if (!AppState.isConnected) {
                        console.log('Connection timeout, switching to demo mode');
                        this._emitToListeners('connection-status', { status: 'demo', message: 'Demo Mode' });
                        resolve(false);
                    }
                }, 10000);
            });
        } catch (error) {
            console.log('Socket connection failed, using demo mode:', error);
            AppState.updateConnectionStatus(false);
            this._emitToListeners('connection-status', { status: 'demo', message: 'Demo Mode' });
            return false;
        }
    }

    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            AppState.updateConnectionStatus(false);
        }
    }

    /**
     * Send a message through the socket
     * @param {string} event - Event name
     * @param {any} data - Data to send
     * @returns {boolean} - Success status
     */
    emit(event, data) {
        if (this.socket && AppState.isConnected) {
            this.socket.emit(event, data);
            return true;
        } else {
            console.log('Socket not connected, cannot emit:', event);
            return false;
        }
    }

    /**
     * Listen for socket events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);

        // Also register with socket if connected
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }

        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    /**
     * Setup core socket event handlers
     * @private
     */
    _setupEventHandlers() {
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            AppState.updateConnectionStatus(false);
            this._emitToListeners('connection-status', { status: 'disconnected', message: 'Disconnected' });
        });

        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
            AppState.updateConnectionStatus(true);
            this._emitToListeners('connection-status', { status: 'connected', message: 'Reconnected' });
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            console.log(`Reconnection attempt ${attempt}`);
            this._emitToListeners('connection-status', { status: 'connecting', message: `Reconnecting... (${attempt})` });
        });

        this.socket.on('reconnect_failed', () => {
            console.log('Reconnection failed');
            this._emitToListeners('connection-status', { status: 'demo', message: 'Demo Mode' });
        });

        // Register existing event listeners
        for (const [event, callbacks] of this.eventListeners) {
            callbacks.forEach(callback => {
                this.socket.on(event, callback);
            });
        }
    }

    /**
     * Emit events to registered listeners
     * @param {string} event - Event name
     * @param {any} data - Event data
     * @private
     */
    _emitToListeners(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get connection status
     * @returns {boolean} - Connection status
     */
    isConnected() {
        return AppState.isConnected && this.socket && this.socket.connected;
    }

    /**
     * Get socket ID
     * @returns {string|null} - Socket ID or null if not connected
     */
    getSocketId() {
        return this.socket ? this.socket.id : null;
    }
}

// Export singleton instance
export const socketService = new SocketService();
