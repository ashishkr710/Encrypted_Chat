// Encrypted Chat Application JavaScript

// Application State
const AppState = {
    currentUser: null,
    secretKey: null,
    socket: null,
    isConnected: false,
    messages: [],
    processedMessageIds: new Set()
};


const SAMPLE_MESSAGES = [
    {
        sender: "Alice",
        cipher: "U2FsdGVkX1+uueoxmsRrZcL8MNKJxiksU3M5XzxlHkE=",
        createdAt: Date.now() - 300000 // 5 minutes ago
    },
    {
        sender: "Bob",
        cipher: "U2FsdGVkX1/53I3t9rvnpa9ZXQJr+a7hH4eQYoIDvII=",
        createdAt: Date.now() - 240000 // 4 minutes ago
    },
    {
        sender: "Charlie",
        cipher: "U2FsdGVkX19XLmH5YqL8PxL9QGPMHJzJ5Jd6Jl8VJH8=",
        createdAt: Date.now() - 180000 // 3 minutes ago
    }
];

// Crypto Utilities
const CryptoUtils = {
    encrypt(text, key) {
        try {
            return CryptoJS.AES.encrypt(text, key).toString();
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    },

    decrypt(ciphertext, key) {
        try {
            const bytes = CryptoJS.AES.decrypt(ciphertext, key);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            return decrypted || null;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }
};

// Validation
const Validation = {
    validateDisplayName(name) {
        const errors = [];
        if (!name || name.trim().length === 0) {
            errors.push('Display name is required');
        } else if (name.trim().length < 2) {
            errors.push('Display name must be at least 2 characters');
        } else if (name.trim().length > 20) {
            errors.push('Display name must be less than 20 characters');
        } else if (!/^[a-zA-Z0-9\s_-]+$/.test(name.trim())) {
            errors.push('Display name can only contain letters, numbers, spaces, hyphens and underscores');
        }
        return errors;
    },

    validateSecretKey(key) {
        const errors = [];
        if (!key || key.trim().length === 0) {
            errors.push('Secret key is required');
        } else if (key.trim().length < 3) {
            errors.push('Secret key must be at least 3 characters');
        }
        return errors;
    }
};

// Socket Management
const SocketManager = {
    connect() {
        try {
            if (typeof io !== 'undefined') {
                // Use current host with API path for Vercel
                const socketUrl = `${window.location.protocol}//${window.location.host}`;
                console.log('Connecting to:', socketUrl);

                AppState.socket = io(socketUrl, {
                    path: '/api/socket',
                    timeout: 10000,
                    transports: ['websocket', 'polling'],
                    upgrade: true,
                    rememberUpgrade: true,
                    pingTimeout: 60000,
                    pingInterval: 25000,
                    forceNew: false,
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000
                });

                AppState.socket.on('connect', () => {
                    console.log('Connected to server');
                    AppState.isConnected = true;
                    UI.updateConnectionStatus('connected', 'Connected');
                });

                AppState.socket.on('disconnect', () => {
                    console.log('Disconnected from server');
                    AppState.isConnected = false;
                    UI.updateConnectionStatus('disconnected', 'Disconnected');
                });

                AppState.socket.on('connect_error', (error) => {
                    console.log('Connection error:', error);
                    AppState.isConnected = false;
                    UI.updateConnectionStatus('demo', 'Demo Mode');
                });

                AppState.socket.on('reconnect', () => {
                    console.log('Reconnected to server');
                    AppState.isConnected = true;
                    UI.updateConnectionStatus('connected', 'Reconnected');
                });

                AppState.socket.on('message', (data) => {
                    MessageHandler.handleIncomingMessage(data);
                });

                // Set connecting status initially
                UI.updateConnectionStatus('connecting', 'Connecting...');

                // Fallback to demo mode after timeout
                setTimeout(() => {
                    if (!AppState.isConnected) {
                        console.log('Connection timeout, switching to demo mode');
                        UI.updateConnectionStatus('demo', 'Demo Mode');
                    }
                }, 10000);
            } else {
                throw new Error('Socket.IO not available');
            }
        } catch (error) {
            console.log('Socket connection failed, using demo mode:', error);
            AppState.isConnected = false;
            UI.updateConnectionStatus('demo', 'Demo Mode');
        }
    },

    sendMessage(message) {
        if (AppState.socket && AppState.isConnected) {
            AppState.socket.emit('message', message);
        } else {
            // Try HTTP fallback if available
            this.sendViaHTTP(message);
        }
    },

    sendViaHTTP(message) {
        fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        })
            .then(response => response.json())
            .then(data => {
                console.log('Message sent via HTTP:', data);
            })
            .catch(error => {
                console.log('HTTP fallback failed, using demo mode:', error);
            });
    }
};

// Message Handling
const MessageHandler = {
    createMessage(text, encrypted = false) {
        return {
            id: Date.now() + Math.random(),
            sender: AppState.currentUser,
            text: text,
            cipher: encrypted ? text : null,
            createdAt: Date.now(),
            isOwn: true
        };
    },

    sendMessage(text) {
        if (!text.trim()) return;

        // Encrypt the message if we have a key
        let messageToSend;
        if (AppState.secretKey) {
            const encrypted = CryptoUtils.encrypt(text.trim(), AppState.secretKey);
            if (encrypted) {
                messageToSend = {
                    id: Date.now() + Math.random(), // Add unique ID
                    sender: AppState.currentUser,
                    cipher: encrypted,
                    createdAt: Date.now()
                };
            } else {
                UI.showError('Failed to encrypt message');
                return;
            }
        } else {
            // Send as plain text if no key
            messageToSend = {
                id: Date.now() + Math.random(), // Add unique ID
                sender: AppState.currentUser,
                text: text.trim(),
                createdAt: Date.now()
            };
        }

        // Add to local messages immediately (own message)
        const localMessage = this.createMessage(text.trim());
        AppState.messages.push(localMessage);
        UI.renderMessages();

        // Send to server (this will be broadcast to OTHER users only)
        SocketManager.sendMessage(messageToSend);
    },

    handleIncomingMessage(data) {
        // Don't add our own messages again
        if (data.sender === AppState.currentUser) {
            console.log('Ignoring own message from:', data.sender);
            return;
        }

        // Prevent duplicate messages using ID
        if (data.id && AppState.processedMessageIds.has(data.id)) {
            console.log('Ignoring duplicate message with ID:', data.id);
            return;
        }

        console.log('Adding incoming message from:', data.sender, 'to user:', AppState.currentUser);
        const messageId = data.id || Date.now() + Math.random();
        const message = {
            id: messageId,
            sender: data.sender,
            text: data.text || null,
            cipher: data.cipher || null,
            createdAt: data.createdAt,
            isOwn: false
        };

        // Track this message ID to prevent duplicates
        if (data.id) {
            AppState.processedMessageIds.add(data.id);
        }

        AppState.messages.push(message);
        UI.renderMessages();
    },


    getDecryptedText(message) {
        if (message.text) {
            return message.text; // Already decrypted
        }

        if (message.cipher && AppState.secretKey) {
            const decrypted = CryptoUtils.decrypt(message.cipher, AppState.secretKey);
            return decrypted || message.cipher; // Fallback to cipher if decryption fails
        }

        return message.cipher || 'Encrypted message';
    },

    isMessageEncrypted(message) {
        return !message.text && message.cipher && !AppState.secretKey;
    }
};

// UI Management
const UI = {
    elements: {},

    init() {
        console.log('Initializing UI...');
        this.cacheElements();
        this.bindEvents();
        this.checkExistingSession();
    },

    cacheElements() {
        // Cache DOM elements with error checking
        this.elements = {
            userSetupDialog: document.getElementById('userSetupDialog'),
            keyDialog: document.getElementById('keyDialog'),
            chatInterface: document.getElementById('chatInterface'),
            keyStatusBar: document.getElementById('keyStatusBar'),
            userSetupForm: document.getElementById('userSetupForm'),
            keyForm: document.getElementById('keyForm'),
            displayName: document.getElementById('displayName'),
            secretKey: document.getElementById('secretKey'),
            messagesList: document.getElementById('messagesList'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            statusText: document.getElementById('statusText'),
            keyStatusText: document.getElementById('keyStatusText'),
            displayNameError: document.getElementById('displayNameError'),
            secretKeyError: document.getElementById('secretKeyError'),
            changeKeyBtn: document.getElementById('changeKeyBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            skipKeyBtn: document.getElementById('skipKeyBtn'),
            setKeyBtn: document.getElementById('setKeyBtn')
        };

        // Log missing elements
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                console.error(`Element not found: ${key}`);
            }
        });
    },

    bindEvents() {
        console.log('Binding events...');

        // User setup form
        if (this.elements.userSetupForm) {
            this.elements.userSetupForm.addEventListener('submit', (e) => {
                console.log('User setup form submitted');
                e.preventDefault();
                this.handleUserSetup();
            });
        }

        // Key form
        if (this.elements.keyForm) {
            this.elements.keyForm.addEventListener('submit', (e) => {
                console.log('Key form submitted');
                e.preventDefault();
                this.handleKeySetup();
            });
        }

        // Skip key button
        if (this.elements.skipKeyBtn) {
            this.elements.skipKeyBtn.addEventListener('click', (e) => {
                console.log('Skip key clicked');
                e.preventDefault();
                this.skipKeySetup();
            });
        }

        // Set key button in status bar
        if (this.elements.setKeyBtn) {
            this.elements.setKeyBtn.addEventListener('click', (e) => {
                console.log('Set key clicked');
                e.preventDefault();
                this.showKeyDialog();
            });
        }

        // Change key button
        if (this.elements.changeKeyBtn) {
            this.elements.changeKeyBtn.addEventListener('click', (e) => {
                console.log('Change key clicked');
                e.preventDefault();
                this.showKeyDialog();
            });
        }

        // Logout button
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', (e) => {
                console.log('Logout clicked');
                e.preventDefault();
                this.logout();
            });
        }

        // Message input
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('input', () => {
                this.updateSendButton();
                this.autoResizeTextarea();
            });

            this.elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
        }

        // Send button
        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', (e) => {
                console.log('Send button clicked');
                e.preventDefault();
                this.handleSendMessage();
            });
        }
    },

    checkExistingSession() {
        console.log('Checking existing session...');
        const savedUser = sessionStorage.getItem('chatUser');
        const savedKey = sessionStorage.getItem('chatKey');

        if (savedUser) {
            console.log('Found saved user:', savedUser);
            AppState.currentUser = savedUser;
            if (savedKey) {
                AppState.secretKey = savedKey;
            }
            this.showChatInterface();
        } else {
            console.log('No saved user, showing setup dialog');
            this.showUserSetupDialog();
        }
    },

    showUserSetupDialog() {
        console.log('Showing user setup dialog');
        if (this.elements.userSetupDialog) {
            this.elements.userSetupDialog.classList.remove('hidden');
        }
        if (this.elements.keyDialog) {
            this.elements.keyDialog.classList.add('hidden');
        }
        if (this.elements.chatInterface) {
            this.elements.chatInterface.classList.add('hidden');
        }
        if (this.elements.displayName) {
            this.elements.displayName.focus();
        }
    },

    showKeyDialog() {
        console.log('Showing key dialog');
        if (this.elements.userSetupDialog) {
            this.elements.userSetupDialog.classList.add('hidden');
        }
        if (this.elements.keyDialog) {
            this.elements.keyDialog.classList.remove('hidden');
        }
        if (this.elements.chatInterface) {
            this.elements.chatInterface.classList.add('hidden');
        }
        if (this.elements.secretKey) {
            this.elements.secretKey.value = '';
            this.elements.secretKey.focus();
        }
        if (this.elements.secretKeyError) {
            this.elements.secretKeyError.textContent = '';
        }
    },

    showChatInterface() {
        console.log('Showing chat interface');
        if (this.elements.userSetupDialog) {
            this.elements.userSetupDialog.classList.add('hidden');
        }
        if (this.elements.keyDialog) {
            this.elements.keyDialog.classList.add('hidden');
        }
        if (this.elements.chatInterface) {
            this.elements.chatInterface.classList.remove('hidden');
        }

        if (!AppState.secretKey) {
            if (this.elements.keyStatusBar) {
                this.elements.keyStatusBar.classList.remove('hidden');
            }
        } else {
            if (this.elements.keyStatusBar) {
                this.elements.keyStatusBar.classList.add('hidden');
            }
        }

        // Load sample messages if none exist

        this.renderMessages();
        if (this.elements.messageInput) {
            this.elements.messageInput.focus();
        }
        SocketManager.connect();
    },

    handleUserSetup() {
        console.log('Handling user setup...');

        if (!this.elements.displayName) {
            console.error('Display name element not found');
            return;
        }

        const name = this.elements.displayName.value.trim();
        console.log('Display name entered:', name);

        const errors = Validation.validateDisplayName(name);

        if (errors.length > 0) {
            console.log('Validation errors:', errors);
            if (this.elements.displayNameError) {
                this.elements.displayNameError.textContent = errors[0];
            }
            return;
        }

        if (this.elements.displayNameError) {
            this.elements.displayNameError.textContent = '';
        }

        AppState.currentUser = name;
        sessionStorage.setItem('chatUser', name);
        console.log('User setup complete, showing key dialog');
        this.showKeyDialog();
    },

    handleKeySetup() {
        console.log('Handling key setup...');

        if (!this.elements.secretKey) {
            console.error('Secret key element not found');
            return;
        }

        const key = this.elements.secretKey.value.trim();
        console.log('Secret key entered:', key ? 'Yes' : 'No');

        const errors = Validation.validateSecretKey(key);

        if (errors.length > 0) {
            console.log('Key validation errors:', errors);
            if (this.elements.secretKeyError) {
                this.elements.secretKeyError.textContent = errors[0];
            }
            return;
        }

        if (this.elements.secretKeyError) {
            this.elements.secretKeyError.textContent = '';
        }

        AppState.secretKey = key;
        sessionStorage.setItem('chatKey', key);
        console.log('Key setup complete, showing chat interface');
        this.showChatInterface();
    },

    skipKeySetup() {
        console.log('Skipping key setup');
        AppState.secretKey = null;
        sessionStorage.removeItem('chatKey');
        this.showChatInterface();
    },

    handleSendMessage() {
        if (!this.elements.messageInput) return;

        const text = this.elements.messageInput.value.trim();
        if (!text) return;

        console.log('Sending message:', text);
        MessageHandler.sendMessage(text);
        this.elements.messageInput.value = '';
        this.updateSendButton();
        this.autoResizeTextarea();
    },

    updateSendButton() {
        if (!this.elements.messageInput || !this.elements.sendBtn) return;

        const hasText = this.elements.messageInput.value.trim().length > 0;
        this.elements.sendBtn.disabled = !hasText;
    },

    autoResizeTextarea() {
        if (!this.elements.messageInput) return;

        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    },

    renderMessages() {
        if (!this.elements.messagesList) return;

        const container = this.elements.messagesList;
        container.innerHTML = '';

        AppState.messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            container.appendChild(messageEl);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },

    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.isOwn ? 'own' : 'other'}`;

        const text = MessageHandler.getDecryptedText(message);
        const isEncrypted = MessageHandler.isMessageEncrypted(message);
        const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const senderHtml = !message.isOwn ? `<div class="message-sender">${this.escapeHtml(message.sender)}</div>` : '';

        div.innerHTML = `
            ${senderHtml}
            <div class="message-bubble">
                <div class="message-text ${isEncrypted ? 'encrypted' : ''}">${this.escapeHtml(text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        return div;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    updateConnectionStatus(status, text) {
        if (!this.elements.connectionStatus || !this.elements.statusText) return;

        const statusDot = this.elements.connectionStatus.querySelector('.status-dot');
        this.elements.statusText.textContent = text;

        if (statusDot) {
            statusDot.className = 'status-dot';
            if (status === 'connected') {
                statusDot.classList.add('connected');
            } else if (status === 'connecting') {
                statusDot.classList.add('connecting');
            }
        }
    },

    logout() {
        console.log('Logging out...');
        sessionStorage.removeItem('chatUser');
        sessionStorage.removeItem('chatKey');
        AppState.currentUser = null;
        AppState.secretKey = null;
        AppState.messages = [];

        if (AppState.socket) {
            AppState.socket.disconnect();
        }

        // Clear form fields
        if (this.elements.displayName) {
            this.elements.displayName.value = '';
        }
        if (this.elements.secretKey) {
            this.elements.secretKey.value = '';
        }
        if (this.elements.displayNameError) {
            this.elements.displayNameError.textContent = '';
        }
        if (this.elements.secretKeyError) {
            this.elements.secretKeyError.textContent = '';
        }

        this.showUserSetupDialog();
    },

    showError(message) {
        console.error('Error:', message);
        alert('Error: ' + message);
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    UI.init();
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        CryptoUtils,
        Validation,
        MessageHandler,
        UI
    };
}