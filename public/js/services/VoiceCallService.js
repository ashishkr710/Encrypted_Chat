/**
 * Voice Call Service
 * Manages WebRTC voice calls and peer-to-peer audio communication
 */

import { AppState } from '../state/AppState.js';
import { socketService } from './SocketService.js';
import CONFIG from '../config/Config.js';

export class VoiceCallService {
    constructor() {
        // WebRTC configuration with STUN servers from Config
        this.configuration = {
            iceServers: CONFIG.WEBRTC.ICE_SERVERS
        };

        this.eventListeners = new Map();
        this._setupSocketEventHandlers();
    }

    /**
     * Initialize WebRTC call components
     * @returns {Promise<boolean>} - Success status
     */
    async initializeCall() {
        try {
            // Get user media (microphone)
            AppState.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

            // Create peer connection
            AppState.peerConnection = new RTCPeerConnection(this.configuration);

            // Add local stream to peer connection
            AppState.localStream.getTracks().forEach(track => {
                AppState.peerConnection.addTrack(track, AppState.localStream);
            });

            // Handle ICE candidates
            AppState.peerConnection.onicecandidate = (event) => {
                if (event.candidate && socketService.isConnected()) {
                    socketService.emit('ice-candidate', {
                        candidate: event.candidate
                    });
                }
            };

            // Handle remote stream
            AppState.peerConnection.ontrack = (event) => {
                console.log('Received remote stream');
                this._handleRemoteStream(event.streams[0]);
            };

            // Handle connection state changes
            AppState.peerConnection.onconnectionstatechange = () => {
                const state = AppState.peerConnection.connectionState;
                console.log('Connection state:', state);

                this._emitToListeners('call-state-changed', { state });

                if (state === 'connected') {
                    this._emitToListeners('call-connected');
                } else if (state === 'disconnected' || state === 'failed') {
                    this.endCall();
                }
            };

            return true;
        } catch (error) {
            console.error('Failed to initialize call:', error);
            this._emitToListeners('call-error', {
                message: 'Failed to access microphone. Please check permissions.',
                error
            });
            return false;
        }
    }

    /**
     * Start a new voice call
     * @returns {Promise<boolean>} - Success status
     */
    async startCall() {
        console.log('Starting voice call...');

        if (!socketService.isConnected()) {
            this._emitToListeners('call-error', {
                message: 'Not connected to server. Please try again.'
            });
            return false;
        }

        if (AppState.isInCall) {
            this.endCall();
            return false;
        }

        const initialized = await this.initializeCall();
        if (!initialized) return false;

        try {
            // Create offer
            const offer = await AppState.peerConnection.createOffer();
            await AppState.peerConnection.setLocalDescription(offer);

            // Send call invitation to all users
            socketService.emit('call-user', {
                caller: AppState.currentUser,
                offer: offer
            });

            AppState.updateCallState({
                isInCall: true,
                callStartTime: Date.now()
            });

            this._emitToListeners('call-started', {
                status: 'calling',
                caller: AppState.currentUser
            });

            this._startCallTimer();
            console.log('Call invitation sent');
            return true;
        } catch (error) {
            console.error('Failed to start call:', error);
            this._emitToListeners('call-error', {
                message: 'Failed to start call. Please try again.',
                error
            });
            this._cleanup();
            return false;
        }
    }

    /**
     * Accept an incoming call
     * @param {RTCSessionDescription} offer - WebRTC offer from caller
     * @returns {Promise<boolean>} - Success status
     */
    async acceptCall(offer) {
        console.log('Accepting incoming call...');

        const initialized = await this.initializeCall();
        if (!initialized) return false;

        try {
            // Set remote description
            await AppState.peerConnection.setRemoteDescription(offer);

            // Create answer
            const answer = await AppState.peerConnection.createAnswer();
            await AppState.peerConnection.setLocalDescription(answer);

            // Send answer
            socketService.emit('answer-call', {
                answerer: AppState.currentUser,
                answer: answer
            });

            AppState.updateCallState({
                isInCall: true,
                callStartTime: Date.now()
            });

            this._emitToListeners('call-accepted', {
                answerer: AppState.currentUser
            });

            this._startCallTimer();
            console.log('Call accepted and answer sent');
            return true;
        } catch (error) {
            console.error('Failed to accept call:', error);
            this._emitToListeners('call-error', {
                message: 'Failed to accept call. Please try again.',
                error
            });
            this._cleanup();
            return false;
        }
    }

    /**
     * Decline an incoming call
     */
    declineCall() {
        console.log('Declining call');
        socketService.emit('decline-call', {
            decliner: AppState.currentUser
        });
        this._emitToListeners('call-declined', {
            decliner: AppState.currentUser
        });
    }

    /**
     * End the current call
     */
    endCall() {
        console.log('Ending call');

        if (AppState.isInCall) {
            socketService.emit('end-call', {
                ender: AppState.currentUser
            });
        }

        this._cleanup();
        this._emitToListeners('call-ended', {
            ender: AppState.currentUser
        });
    }

    /**
     * Toggle microphone mute
     */
    toggleMute() {
        if (!AppState.localStream) return;

        AppState.isMuted = !AppState.isMuted;
        AppState.localStream.getAudioTracks().forEach(track => {
            track.enabled = !AppState.isMuted;
        });

        this._emitToListeners('mute-toggled', {
            isMuted: AppState.isMuted
        });

        console.log('Microphone', AppState.isMuted ? 'muted' : 'unmuted');
    }

    /**
     * Toggle speaker mode (visual indicator only)
     */
    toggleSpeaker() {
        AppState.isSpeakerOn = !AppState.isSpeakerOn;

        this._emitToListeners('speaker-toggled', {
            isSpeakerOn: AppState.isSpeakerOn
        });

        console.log('Speaker', AppState.isSpeakerOn ? 'on' : 'off');
    }

    /**
     * Handle WebRTC answer from remote peer
     * @param {RTCSessionDescription} answer - WebRTC answer
     */
    async handleAnswer(answer) {
        console.log('Received call answer');

        if (!AppState.peerConnection) return;

        try {
            await AppState.peerConnection.setRemoteDescription(answer);
            this._emitToListeners('call-connected');
            console.log('Call established successfully');
        } catch (error) {
            console.error('Failed to handle answer:', error);
            this.endCall();
        }
    }

    /**
     * Handle ICE candidate from remote peer
     * @param {RTCIceCandidate} candidate - ICE candidate
     */
    async handleIceCandidate(candidate) {
        if (!AppState.peerConnection) return;

        try {
            await AppState.peerConnection.addIceCandidate(candidate);
            console.log('ICE candidate added');
        } catch (error) {
            console.error('Failed to add ICE candidate:', error);
        }
    }

    /**
     * Format call duration in MM:SS format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} - Formatted duration
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
     * Handle remote audio stream
     * @param {MediaStream} stream - Remote audio stream
     * @private
     */
    _handleRemoteStream(stream) {
        // Create audio element for remote stream
        let remoteAudio = document.getElementById('remoteAudio');
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = 'remoteAudio';
            remoteAudio.autoplay = true;
            document.body.appendChild(remoteAudio);
        }
        remoteAudio.srcObject = stream;
    }

    /**
     * Clean up call resources
     * @private
     */
    _cleanup() {
        // Stop local stream
        if (AppState.localStream) {
            AppState.localStream.getTracks().forEach(track => track.stop());
        }

        // Close peer connection
        if (AppState.peerConnection) {
            AppState.peerConnection.close();
        }

        // Remove remote audio element
        const remoteAudio = document.getElementById('remoteAudio');
        if (remoteAudio) {
            remoteAudio.remove();
        }

        // Reset call state
        AppState.resetCallState();
    }

    /**
     * Start call timer
     * @private
     */
    _startCallTimer() {
        if (AppState.callTimer) {
            clearInterval(AppState.callTimer);
        }

        AppState.callTimer = setInterval(() => {
            if (AppState.callStartTime) {
                const duration = Date.now() - AppState.callStartTime;
                this._emitToListeners('call-duration-updated', { duration });
            }
        }, 1000);
    }

    /**
     * Setup socket event handlers for voice calls
     * @private
     */
    _setupSocketEventHandlers() {
        socketService.on('incoming-call', (data) => {
            console.log('Incoming call from:', data.caller);
            this._emitToListeners('incoming-call', data);
        });

        socketService.on('call-answered', (data) => {
            console.log('Call answered by:', data.answerer);
            this.handleAnswer(data.answer);
        });

        socketService.on('call-declined', (data) => {
            console.log('Call declined by:', data.decliner);
            this._cleanup();
            this._emitToListeners('call-declined', data);
        });

        socketService.on('call-ended', (data) => {
            console.log('Call ended by:', data.ender);
            this._cleanup();
            this._emitToListeners('call-ended', data);
        });

        socketService.on('ice-candidate', (data) => {
            console.log('Received ICE candidate');
            this.handleIceCandidate(data.candidate);
        });

        socketService.on('user-left-call', (data) => {
            console.log('User left call:', data.userId);
            if (AppState.isInCall) {
                this.endCall();
                this._emitToListeners('call-error', {
                    message: 'Other participant left the call'
                });
            }
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
                    console.error(`Error in voice call event listener for ${event}:`, error);
                }
            });
        }
    }
}

// Export singleton instance
export const voiceCallService = new VoiceCallService();
