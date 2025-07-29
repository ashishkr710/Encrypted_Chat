/**
 * UI Manager Module
 * Handles all user interface interactions and DOM manipulations
 */

import { AppState } from '../state/AppState.js';
import { ValidationUtils } from '../utils/ValidationUtils.js';
import { messageHandler } from './MessageHandler.js';
import { voiceCallService } from '../services/VoiceCallService.js';
import { socketService } from '../services/SocketService.js';
import CONFIG from '../config/Config.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.eventListeners = new Map();
    }

    /**
     * Initialize the UI Manager
     */
    init() {
        console.log('Initializing UI...');
        this._cacheElements();
        this._bindEvents();
        this._setupServiceEventListeners();
        this._checkExistingSession();
    }

    /**
     * Show user setup dialog
     */
    showUserSetupDialog() {
        console.log('Showing user setup dialog');
        this._showDialog('userSetupDialog');
        this._hideDialog('keyDialog');
        this._hideDialog('chatInterface');
        this._focusElement('displayName');
    }

    /**
     * Show secret key dialog
     */
    showKeyDialog() {
        console.log('Showing key dialog');
        this._hideDialog('userSetupDialog');
        this._showDialog('keyDialog');
        this._hideDialog('chatInterface');

        if (this.elements.secretKey) {
            this.elements.secretKey.value = '';
            this._focusElement('secretKey');
        }
        this._clearError('secretKeyError');
    }

    /**
     * Show main chat interface
     */
    showChatInterface() {
        console.log('Showing chat interface');
        this._hideDialog('userSetupDialog');
        this._hideDialog('keyDialog');
        this._showDialog('chatInterface');

        // Handle key status bar visibility
        if (!AppState.secretKey) {
            this._showElement('keyStatusBar');
        } else {
            this._hideElement('keyStatusBar');
        }

        this.renderMessages();
        this._focusElement('messageInput');

        // Connect to socket
        socketService.connect();
    }

    /**
     * Show voice call dialog
     */
    showCallDialog() {
        this._showDialog('voiceCallDialog');
        this.updateParticipantsList();
    }

    /**
     * Hide voice call dialog
     */
    hideCallDialog() {
        this._hideDialog('voiceCallDialog');
    }

    /**
     * Show incoming call dialog
     * @param {string} callerName - Name of the caller
     * @param {RTCSessionDescription} offer - WebRTC offer
     */
    showIncomingCallDialog(callerName, offer) {
        if (this.elements.callerName) {
            this.elements.callerName.textContent = callerName;
        }

        if (this.elements.acceptCallBtn) {
            this.elements.acceptCallBtn.dataset.offer = JSON.stringify(offer);
        }

        this._showDialog('incomingCallDialog');
    }

    /**
     * Hide incoming call dialog
     */
    hideIncomingCallDialog() {
        this._hideDialog('incomingCallDialog');
    }

    /**
     * Update connection status display
     * @param {string} status - Status type ('connected', 'disconnected', 'demo', etc.)
     * @param {string} text - Status text to display
     */
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
    }

    /**
     * Update call status display
     * @param {string} status - Call status text
     */
    updateCallStatus(status) {
        if (this.elements.callStatus) {
            this.elements.callStatus.textContent = status;
        }
    }

    /**
     * Update call duration display
     * @param {number} milliseconds - Duration in milliseconds
     */
    updateCallDuration(milliseconds) {
        if (this.elements.callDuration) {
            const duration = voiceCallService.formatDuration(milliseconds);
            this.elements.callDuration.textContent = duration;
        }
    }

    /**
     * Update voice call button state
     * @param {boolean} isInCall - Whether currently in a call
     */
    updateVoiceCallButton(isInCall) {
        if (!this.elements.voiceCallBtn) return;

        const icon = this.elements.voiceCallBtn.querySelector('.material-icons');
        const text = this.elements.voiceCallBtn.querySelector('span:not(.material-icons)');

        if (icon) {
            icon.textContent = isInCall ? 'call_end' : 'call';
        }
        if (text) {
            text.textContent = isInCall ? 'End' : 'Call';
        }

        this.elements.voiceCallBtn.classList.toggle('calling', isInCall);
    }

    /**
     * Update mute button state
     * @param {boolean} isMuted - Whether microphone is muted
     */
    updateMuteButton(isMuted) {
        if (!this.elements.muteBtn) return;

        const icon = this.elements.muteBtn.querySelector('.material-icons');
        if (icon) {
            icon.textContent = isMuted ? 'mic_off' : 'mic';
        }
        this.elements.muteBtn.classList.toggle('muted', isMuted);
        this.updateParticipantsList();
    }

    /**
     * Update speaker button state
     * @param {boolean} isSpeakerOn - Whether speaker is on
     */
    updateSpeakerButton(isSpeakerOn) {
        if (!this.elements.speakerBtn) return;

        const icon = this.elements.speakerBtn.querySelector('.material-icons');
        if (icon) {
            icon.textContent = isSpeakerOn ? 'volume_up' : 'volume_down';
        }
        this.elements.speakerBtn.classList.toggle('active', isSpeakerOn);
    }

    /**
     * Update participants list in call dialog
     */
    updateParticipantsList() {
        if (!this.elements.callParticipants) return;

        // Clear existing participants
        this.elements.callParticipants.innerHTML = '';

        // Add current user
        const userParticipant = this._createParticipantElement(
            AppState.currentUser,
            'You',
            AppState.isMuted
        );
        this.elements.callParticipants.appendChild(userParticipant);

        // Update participants count
        if (this.elements.participantsCount) {
            const count = AppState.isInCall ? 2 : 1; // Assuming 1-on-1 calls for now
            this.elements.participantsCount.textContent = `${count} participant${count > 1 ? 's' : ''}`;
        }
    }

    /**
     * Render all messages in the chat
     */
    renderMessages() {
        if (!this.elements.messagesList) return;

        const container = this.elements.messagesList;
        container.innerHTML = '';

        AppState.messages.forEach(message => {
            const messageEl = this._createMessageElement(message);
            container.appendChild(messageEl);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('Error:', message);
        // You could implement a better error display system here
        alert('Error: ' + message);
    }

    /**
     * Show success message to user
     * @param {string} message - Success message
     */
    showSuccess(message) {
        console.log('Success:', message);
        // You could implement a better success display system here
        // For now, just log it
    }

    /**
     * Handle user logout
     */
    logout() {
        console.log('Logging out...');

        // End any active call
        if (AppState.isInCall) {
            voiceCallService.endCall();
        }

        // Clear session and state
        AppState.clearSession();

        // Clear form fields
        this._clearFormFields();
        this._clearErrors();

        this.showUserSetupDialog();
    }

    /**
     * Cache DOM elements
     * @private
     */
    _cacheElements() {
        const elementIds = [
            // Dialog elements
            'userSetupDialog', 'keyDialog', 'chatInterface', 'keyStatusBar',

            // Form elements
            'userSetupForm', 'keyForm', 'displayName', 'secretKey',

            // Chat elements
            'messagesList', 'messageInput', 'sendBtn',

            // Status elements
            'connectionStatus', 'statusText', 'keyStatusText',

            // Error elements
            'displayNameError', 'secretKeyError',

            // Button elements
            'changeKeyBtn', 'logoutBtn', 'skipKeyBtn', 'setKeyBtn',

            // Voice call elements
            'voiceCallBtn', 'voiceCallDialog', 'incomingCallDialog',
            'callTitle', 'callStatus', 'callParticipants', 'callDuration',
            'participantsCount', 'muteBtn', 'endCallBtn', 'speakerBtn',
            'callerName', 'acceptCallBtn', 'declineCallBtn'
        ];

        this.elements = {};
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
            if (!this.elements[id]) {
                console.warn(`Element not found: ${id}`);
            }
        });
    }

    /**
     * Bind event handlers to DOM elements
     * @private
     */
    _bindEvents() {
        // Form submissions
        this._bindFormEvent('userSetupForm', 'submit', (e) => {
            e.preventDefault();
            this._handleUserSetup();
        });

        this._bindFormEvent('keyForm', 'submit', (e) => {
            e.preventDefault();
            this._handleKeySetup();
        });

        // Button clicks
        this._bindButtonEvent('skipKeyBtn', () => this._skipKeySetup());
        this._bindButtonEvent('setKeyBtn', () => this.showKeyDialog());
        this._bindButtonEvent('changeKeyBtn', () => this.showKeyDialog());
        this._bindButtonEvent('logoutBtn', () => this.logout());
        this._bindButtonEvent('sendBtn', () => this._handleSendMessage());

        // Voice call buttons
        this._bindButtonEvent('voiceCallBtn', () => voiceCallService.startCall());
        this._bindButtonEvent('muteBtn', () => voiceCallService.toggleMute());
        this._bindButtonEvent('endCallBtn', () => voiceCallService.endCall());
        this._bindButtonEvent('speakerBtn', () => voiceCallService.toggleSpeaker());
        this._bindButtonEvent('acceptCallBtn', () => this._handleAcceptCall());
        this._bindButtonEvent('declineCallBtn', () => voiceCallService.declineCall());

        // Message input events
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('input', () => {
                this._updateSendButton();
                this._autoResizeTextarea();
            });

            this.elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this._handleSendMessage();
                }
            });
        }
    }

    /**
     * Setup event listeners for services
     * @private
     */
    _setupServiceEventListeners() {
        // Socket service events
        socketService.on('connection-status', (data) => {
            this.updateConnectionStatus(data.status, data.message);
        });

        // Message handler events
        messageHandler.on('message-added', () => {
            this.renderMessages();
        });

        messageHandler.on('message-error', (data) => {
            this.showError(data.message);
        });

        // Voice call service events
        voiceCallService.on('call-started', (data) => {
            this.showCallDialog();
            this.updateCallStatus(data.status);
            this.updateVoiceCallButton(true);
        });

        voiceCallService.on('call-connected', () => {
            this.updateCallStatus('Connected');
        });

        voiceCallService.on('call-ended', () => {
            this.hideCallDialog();
            this.updateVoiceCallButton(false);
        });

        voiceCallService.on('call-error', (data) => {
            this.showError(data.message);
        });

        voiceCallService.on('incoming-call', (data) => {
            this.showIncomingCallDialog(data.caller, data.offer);
        });

        voiceCallService.on('call-declined', (data) => {
            this.showError(`Call declined by ${data.decliner}`);
            this.hideCallDialog();
            this.updateVoiceCallButton(false);
        });

        voiceCallService.on('mute-toggled', (data) => {
            this.updateMuteButton(data.isMuted);
        });

        voiceCallService.on('speaker-toggled', (data) => {
            this.updateSpeakerButton(data.isSpeakerOn);
        });

        voiceCallService.on('call-duration-updated', (data) => {
            this.updateCallDuration(data.duration);
        });
    }

    /**
     * Check for existing session on load
     * @private
     */
    _checkExistingSession() {
        const session = AppState.loadSession();

        if (session.user) {
            console.log('Found saved user:', session.user);
            this.showChatInterface();
        } else {
            console.log('No saved user, showing setup dialog');
            this.showUserSetupDialog();
        }
    }

    /**
     * Handle user setup form submission
     * @private
     */
    _handleUserSetup() {
        if (!this.elements.displayName) return;

        const name = this.elements.displayName.value.trim();
        const errors = ValidationUtils.validateDisplayName(name);

        if (errors.length > 0) {
            this._showError('displayNameError', errors[0]);
            return;
        }

        this._clearError('displayNameError');
        AppState.updateUser(name);
        this.showKeyDialog();
    }

    /**
     * Handle key setup form submission
     * @private
     */
    _handleKeySetup() {
        if (!this.elements.secretKey) return;

        const key = this.elements.secretKey.value.trim();
        const errors = ValidationUtils.validateSecretKey(key);

        if (errors.length > 0) {
            this._showError('secretKeyError', errors[0]);
            return;
        }

        this._clearError('secretKeyError');
        AppState.updateSecretKey(key);
        this.showChatInterface();
    }

    /**
     * Skip key setup
     * @private
     */
    _skipKeySetup() {
        AppState.updateSecretKey(null);
        this.showChatInterface();
    }

    /**
     * Handle send message
     * @private
     */
    _handleSendMessage() {
        if (!this.elements.messageInput) return;

        const text = this.elements.messageInput.value.trim();
        if (!text) return;

        const sent = messageHandler.sendMessage(text);
        if (sent) {
            this.elements.messageInput.value = '';
            this._updateSendButton();
            this._autoResizeTextarea();
        }
    }

    /**
     * Handle accept call button click
     * @private
     */
    _handleAcceptCall() {
        const offer = this.elements.acceptCallBtn?.dataset.offer;
        if (offer) {
            voiceCallService.acceptCall(JSON.parse(offer));
        }
    }

    // ... (Additional private helper methods continue)

    /**
     * Create message element for rendering
     * @param {Object} message - Message object
     * @returns {HTMLElement} - Message DOM element
     * @private
     */
    _createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.isOwn ? 'own' : 'other'}`;

        const text = messageHandler.getDecryptedText(message);
        const isEncrypted = messageHandler.isMessageEncrypted(message);
        const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const senderHtml = !message.isOwn ?
            `<div class="message-sender">${this._escapeHtml(message.sender)}</div>` : '';

        div.innerHTML = `
            ${senderHtml}
            <div class="message-bubble">
                <div class="message-text ${isEncrypted ? 'encrypted' : ''}">${this._escapeHtml(text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        return div;
    }

    /**
     * Create participant element for call dialog
     * @param {string} name - Participant name
     * @param {string} status - Participant status
     * @param {boolean} isMuted - Whether participant is muted
     * @returns {HTMLElement} - Participant DOM element
     * @private
     */
    _createParticipantElement(name, status, isMuted) {
        const div = document.createElement('div');
        div.className = 'participant';

        const avatarLetter = name.charAt(0).toUpperCase();

        div.innerHTML = `
            <div class="participant-avatar">${this._escapeHtml(avatarLetter)}</div>
            <div class="participant-info">
                <div class="participant-name">${this._escapeHtml(name)}</div>
                <div class="participant-status">${this._escapeHtml(status)}</div>
            </div>
            <div class="participant-audio">
                <div class="audio-indicator ${isMuted ? 'muted' : ''}"></div>
            </div>
        `;

        return div;
    }

    // Helper methods for DOM manipulation
    _showDialog(elementId) { this._showElement(elementId); }
    _hideDialog(elementId) { this._hideElement(elementId); }
    _showElement(elementId) { this.elements[elementId]?.classList.remove('hidden'); }
    _hideElement(elementId) { this.elements[elementId]?.classList.add('hidden'); }
    _focusElement(elementId) { this.elements[elementId]?.focus(); }

    _showError(elementId, message) {
        if (this.elements[elementId]) {
            this.elements[elementId].textContent = message;
        }
    }

    _clearError(elementId) { this._showError(elementId, ''); }

    _clearErrors() {
        ['displayNameError', 'secretKeyError'].forEach(id => this._clearError(id));
    }

    _clearFormFields() {
        ['displayName', 'secretKey'].forEach(id => {
            if (this.elements[id]) this.elements[id].value = '';
        });
    }

    _bindFormEvent(formId, event, handler) {
        this.elements[formId]?.addEventListener(event, handler);
    }

    _bindButtonEvent(buttonId, handler) {
        this.elements[buttonId]?.addEventListener('click', (e) => {
            e.preventDefault();
            handler();
        });
    }

    _updateSendButton() {
        if (!this.elements.messageInput || !this.elements.sendBtn) return;
        const hasText = this.elements.messageInput.value.trim().length > 0;
        this.elements.sendBtn.disabled = !hasText;
    }

    _autoResizeTextarea() {
        if (!this.elements.messageInput) return;
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, CONFIG.UI.TEXTAREA_MAX_HEIGHT) + 'px';
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export singleton instance
export const uiManager = new UIManager();
