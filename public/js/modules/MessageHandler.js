/**
 * Message Handler Module
 * Handles message creation, encryption, sending, and receiving
 */

import { AppState } from '../state/AppState.js';
import { CryptoUtils } from '../utils/CryptoUtils.js';
import { socketService } from '../services/SocketService.js';

export class MessageHandler {
    constructor() {
        this.eventListeners = new Map();
        this._setupSocketEventHandlers();
    }

    /**
     * Create a new message object
     * @param {string} text - Message text
     * @param {boolean} encrypted - Whether the text is already encrypted
     * @returns {Object} - Message object
     */
    createMessage(text, encrypted = false) {
        return {
            id: Date.now() + Math.random(),
            sender: AppState.currentUser,
            text: text,
            cipher: encrypted ? text : null,
            createdAt: Date.now(),
            isOwn: true
        };
    }

    /**
     * Send a message
     * @param {string} text - Message text to send
     * @returns {boolean} - Success status
     */
    sendMessage(text) {
        if (!text || !text.trim()) {
            this._emitToListeners('message-error', {
                message: 'Message cannot be empty'
            });
            return false;
        }

        const trimmedText = text.trim();
        let messageToSend;

        // Encrypt the message if we have a key
        if (AppState.secretKey) {
            const encrypted = CryptoUtils.encrypt(trimmedText, AppState.secretKey);
            if (encrypted) {
                messageToSend = {
                    id: Date.now() + Math.random(),
                    sender: AppState.currentUser,
                    cipher: encrypted,
                    createdAt: Date.now()
                };
            } else {
                this._emitToListeners('message-error', {
                    message: 'Failed to encrypt message'
                });
                return false;
            }
        } else {
            // Send as plain text if no key
            messageToSend = {
                id: Date.now() + Math.random(),
                sender: AppState.currentUser,
                text: trimmedText,
                createdAt: Date.now()
            };
        }

        // Add to local messages immediately (own message)
        const localMessage = this.createMessage(trimmedText);
        const added = AppState.addMessage(localMessage);

        if (added) {
            this._emitToListeners('message-added', { message: localMessage });
        }

        // Send to server (this will be broadcast to OTHER users only)
        const sent = this._sendToServer(messageToSend);

        if (sent) {
            this._emitToListeners('message-sent', { message: messageToSend });
        } else {
            this._emitToListeners('message-error', {
                message: 'Failed to send message to server'
            });
        }

        return sent;
    }

    /**
     * Handle incoming message from server
     * @param {Object} data - Message data from server
     */
    handleIncomingMessage(data) {
        // Don't add our own messages again
        if (data.sender === AppState.currentUser) {
            console.log('Ignoring own message from:', data.sender);
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

        const added = AppState.addMessage(message);

        if (added) {
            this._emitToListeners('message-received', { message });
            this._emitToListeners('message-added', { message });
        }
    }

    /**
     * Get decrypted text from a message
     * @param {Object} message - Message object
     * @returns {string} - Decrypted or plain text
     */
    getDecryptedText(message) {
        if (message.text) {
            return message.text; // Already decrypted/plain text
        }

        if (message.cipher && AppState.secretKey) {
            const decrypted = CryptoUtils.decrypt(message.cipher, AppState.secretKey);
            return decrypted || message.cipher; // Fallback to cipher if decryption fails
        }

        return message.cipher || 'Encrypted message';
    }

    /**
     * Check if a message is encrypted and cannot be decrypted
     * @param {Object} message - Message object
     * @returns {boolean} - True if message is encrypted and cannot be decrypted
     */
    isMessageEncrypted(message) {
        return !message.text && message.cipher && !AppState.secretKey;
    }

    /**
     * Get all messages
     * @returns {Array} - Array of messages
     */
    getAllMessages() {
        return AppState.messages;
    }

    /**
     * Clear all messages
     */
    clearAllMessages() {
        AppState.clearMessages();
        this._emitToListeners('messages-cleared');
    }

    /**
     * Search messages by text
     * @param {string} searchTerm - Search term
     * @returns {Array} - Filtered messages
     */
    searchMessages(searchTerm) {
        if (!searchTerm || !searchTerm.trim()) {
            return AppState.messages;
        }

        const term = searchTerm.toLowerCase().trim();
        return AppState.messages.filter(message => {
            const text = this.getDecryptedText(message).toLowerCase();
            const sender = message.sender.toLowerCase();
            return text.includes(term) || sender.includes(term);
        });
    }

    /**
     * Get messages from a specific sender
     * @param {string} sender - Sender name
     * @returns {Array} - Messages from sender
     */
    getMessagesBySender(sender) {
        return AppState.messages.filter(message => message.sender === sender);
    }

    /**
     * Get messages from a specific time range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} - Messages in time range
     */
    getMessagesByDateRange(startDate, endDate) {
        const start = startDate.getTime();
        const end = endDate.getTime();

        return AppState.messages.filter(message => {
            return message.createdAt >= start && message.createdAt <= end;
        });
    }

    /**
     * Export messages as JSON
     * @returns {string} - JSON string of messages
     */
    exportMessages() {
        const exportData = {
            user: AppState.currentUser,
            exportDate: new Date().toISOString(),
            messages: AppState.messages.map(message => ({
                ...message,
                decryptedText: this.getDecryptedText(message)
            }))
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Send message to server
     * @param {Object} message - Message object
     * @returns {boolean} - Success status
     * @private
     */
    _sendToServer(message) {
        if (socketService.isConnected()) {
            return socketService.emit('message', message);
        } else {
            // Try HTTP fallback if available
            return this._sendViaHTTP(message);
        }
    }

    /**
     * Send message via HTTP fallback
     * @param {Object} message - Message object
     * @returns {boolean} - Success status
     * @private
     */
    _sendViaHTTP(message) {
        // Check if we're on Vercel (where API routes exist) or local development
        const isVercel = window.location.hostname.includes('vercel.app') ||
            window.location.hostname.includes('vercel.com');

        if (!isVercel) {
            console.log('HTTP fallback not available in local development');
            return false;
        }

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
                this._emitToListeners('message-sent-http', { message, response: data });
            })
            .catch(error => {
                console.log('HTTP fallback failed:', error);
                this._emitToListeners('message-error', {
                    message: 'HTTP fallback failed, using demo mode',
                    error
                });
            });

        return true; // Assume success for async operation
    }

    /**
     * Setup socket event handlers
     * @private
     */
    _setupSocketEventHandlers() {
        socketService.on('message', (data) => {
            this.handleIncomingMessage(data);
        });
    }

    /**
     * Emit events to registered listeners
     * @param {string} event - Event name
     * @param {any} data - Event data
     * @private
     */
    _emitToListeners(event, data = {}) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in message handler event listener for ${event}:`, error);
                }
            });
        }
    }
}

// Export singleton instance
export const messageHandler = new MessageHandler();
