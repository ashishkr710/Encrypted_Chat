/**
 * Global Application State Management
 * Centralized state store for the entire application
 */

export const AppState = {
    // User session state
    currentUser: null,
    secretKey: null,

    // Connection state
    socket: null,
    isConnected: false,

    // Chat state
    messages: [],
    processedMessageIds: new Set(),

    // Voice call state
    isInCall: false,
    currentCall: null,
    localStream: null,
    peerConnection: null,
    isMuted: false,
    isSpeakerOn: false,
    callStartTime: null,
    callTimer: null,

    // State update methods
    updateUser(user) {
        this.currentUser = user;
        if (user) {
            sessionStorage.setItem('chatUser', user);
        } else {
            sessionStorage.removeItem('chatUser');
        }
    },

    updateSecretKey(key) {
        this.secretKey = key;
        if (key) {
            sessionStorage.setItem('chatKey', key);
        } else {
            sessionStorage.removeItem('chatKey');
        }
    },

    updateConnectionStatus(isConnected, socket = null) {
        this.isConnected = isConnected;
        if (socket) {
            this.socket = socket;
        }
    },

    addMessage(message) {
        // Prevent duplicate messages
        if (message.id && this.processedMessageIds.has(message.id)) {
            return false;
        }

        this.messages.push(message);

        if (message.id) {
            this.processedMessageIds.add(message.id);
        }

        return true;
    },

    clearMessages() {
        this.messages = [];
        this.processedMessageIds.clear();
    },

    updateCallState(callState) {
        Object.assign(this, callState);
    },

    resetCallState() {
        this.isInCall = false;
        this.currentCall = null;
        this.localStream = null;
        this.peerConnection = null;
        this.isMuted = false;
        this.isSpeakerOn = false;
        this.callStartTime = null;

        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    },

    // Session management
    loadSession() {
        const savedUser = sessionStorage.getItem('chatUser');
        const savedKey = sessionStorage.getItem('chatKey');

        if (savedUser) {
            this.currentUser = savedUser;
        }

        if (savedKey) {
            this.secretKey = savedKey;
        }

        return { user: savedUser, key: savedKey };
    },

    clearSession() {
        this.currentUser = null;
        this.secretKey = null;
        this.clearMessages();
        this.resetCallState();

        sessionStorage.removeItem('chatUser');
        sessionStorage.removeItem('chatKey');

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
};

// Make it globally available for debugging
if (typeof window !== 'undefined') {
    window.AppState = AppState;
}
