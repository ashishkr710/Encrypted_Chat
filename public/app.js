// // Encrypted Chat Application JavaScript

// // Application State
// const AppState = {
//     currentUser: null,
//     secretKey: null,
//     socket: null,
//     isConnected: false,
//     messages: [],
//     processedMessageIds: new Set(),
//     // Voice call state
//     isInCall: false,
//     currentCall: null,
//     localStream: null,
//     peerConnection: null,
//     isMuted: false,
//     isSpeakerOn: false,
//     callStartTime: null,
//     callTimer: null
// };

// // Crypto Utilities
// const CryptoUtils = {
//     encrypt(text, key) {
//         try {
//             return CryptoJS.AES.encrypt(text, key).toString();
//         } catch (error) {
//             console.error('Encryption error:', error);
//             return null;
//         }
//     },

//     decrypt(ciphertext, key) {
//         try {
//             const bytes = CryptoJS.AES.decrypt(ciphertext, key);
//             const decrypted = bytes.toString(CryptoJS.enc.Utf8);
//             return decrypted || null;
//         } catch (error) {
//             console.error('Decryption error:', error);
//             return null;
//         }
//     }
// };

// // Validation
// const Validation = {
//     validateDisplayName(name) {
//         const errors = [];
//         if (!name || name.trim().length === 0) {
//             errors.push('Display name is required');
//         } else if (name.trim().length < 2) {
//             errors.push('Display name must be at least 2 characters');
//         } else if (name.trim().length > 20) {
//             errors.push('Display name must be less than 20 characters');
//         } else if (!/^[a-zA-Z0-9\s_-]+$/.test(name.trim())) {
//             errors.push('Display name can only contain letters, numbers, spaces, hyphens and underscores');
//         }
//         return errors;
//     },

//     validateSecretKey(key) {
//         const errors = [];
//         if (!key || key.trim().length === 0) {
//             errors.push('Secret key is required');
//         } else if (key.trim().length < 3) {
//             errors.push('Secret key must be at least 3 characters');
//         }
//         return errors;
//     }
// };

// // Voice Call Manager
// const VoiceCall = {
//     // WebRTC configuration with STUN servers
//     configuration: {
//         iceServers: [
//             { urls: 'stun:stun.l.google.com:19302' },
//             { urls: 'stun:stun1.l.google.com:19302' }
//         ]
//     },

//     async initializeCall() {
//         try {
//             // Get user media (microphone)
//             AppState.localStream = await navigator.mediaDevices.getUserMedia({
//                 audio: true,
//                 video: false
//             });

//             // Create peer connection
//             AppState.peerConnection = new RTCPeerConnection(this.configuration);

//             // Add local stream to peer connection
//             AppState.localStream.getTracks().forEach(track => {
//                 AppState.peerConnection.addTrack(track, AppState.localStream);
//             });

//             // Handle ICE candidates
//             AppState.peerConnection.onicecandidate = (event) => {
//                 if (event.candidate && AppState.socket) {
//                     AppState.socket.emit('ice-candidate', {
//                         candidate: event.candidate
//                     });
//                 }
//             };

//             // Handle remote stream
//             AppState.peerConnection.ontrack = (event) => {
//                 console.log('Received remote stream');
//                 this.handleRemoteStream(event.streams[0]);
//             };

//             // Handle connection state changes
//             AppState.peerConnection.onconnectionstatechange = () => {
//                 console.log('Connection state:', AppState.peerConnection.connectionState);
//                 if (AppState.peerConnection.connectionState === 'connected') {
//                     UI.updateCallStatus('Connected');
//                 } else if (AppState.peerConnection.connectionState === 'disconnected') {
//                     this.endCall();
//                 }
//             };

//             return true;
//         } catch (error) {
//             console.error('Failed to initialize call:', error);
//             UI.showError('Failed to access microphone. Please check permissions.');
//             return false;
//         }
//     },

//     async startCall() {
//         console.log('Starting voice call...');

//         if (!AppState.isConnected) {
//             UI.showError('Not connected to server. Please try again.');
//             return;
//         }

//         if (AppState.isInCall) {
//             this.endCall();
//             return;
//         }

//         const initialized = await this.initializeCall();
//         if (!initialized) return;

//         try {
//             // Create offer
//             const offer = await AppState.peerConnection.createOffer();
//             await AppState.peerConnection.setLocalDescription(offer);

//             // Send call invitation to all users
//             AppState.socket.emit('call-user', {
//                 caller: AppState.currentUser,
//                 offer: offer
//             });

//             AppState.isInCall = true;
//             AppState.callStartTime = Date.now();
//             UI.showCallDialog();
//             UI.updateCallStatus('Calling...');
//             UI.updateVoiceCallButton(true);

//             console.log('Call invitation sent');
//         } catch (error) {
//             console.error('Failed to start call:', error);
//             UI.showError('Failed to start call. Please try again.');
//             this.cleanup();
//         }
//     },

//     async acceptCall(offer) {
//         console.log('Accepting incoming call...');

//         const initialized = await this.initializeCall();
//         if (!initialized) return;

//         try {
//             // Set remote description
//             await AppState.peerConnection.setRemoteDescription(offer);

//             // Create answer
//             const answer = await AppState.peerConnection.createAnswer();
//             await AppState.peerConnection.setLocalDescription(answer);

//             // Send answer
//             AppState.socket.emit('answer-call', {
//                 answerer: AppState.currentUser,
//                 answer: answer
//             });

//             AppState.isInCall = true;
//             AppState.callStartTime = Date.now();
//             UI.hideIncomingCallDialog();
//             UI.showCallDialog();
//             UI.updateCallStatus('Connected');
//             UI.updateVoiceCallButton(true);
//             this.startCallTimer();

//             console.log('Call accepted and answer sent');
//         } catch (error) {
//             console.error('Failed to accept call:', error);
//             UI.showError('Failed to accept call. Please try again.');
//             this.cleanup();
//         }
//     },

//     async handleAnswer(answer) {
//         console.log('Received call answer');

//         if (!AppState.peerConnection) return;

//         try {
//             await AppState.peerConnection.setRemoteDescription(answer);
//             UI.updateCallStatus('Connected');
//             this.startCallTimer();
//             console.log('Call established successfully');
//         } catch (error) {
//             console.error('Failed to handle answer:', error);
//             this.endCall();
//         }
//     },

//     async handleIceCandidate(candidate) {
//         if (!AppState.peerConnection) return;

//         try {
//             await AppState.peerConnection.addIceCandidate(candidate);
//             console.log('ICE candidate added');
//         } catch (error) {
//             console.error('Failed to add ICE candidate:', error);
//         }
//     },

//     handleRemoteStream(stream) {
//         // Create audio element for remote stream
//         let remoteAudio = document.getElementById('remoteAudio');
//         if (!remoteAudio) {
//             remoteAudio = document.createElement('audio');
//             remoteAudio.id = 'remoteAudio';
//             remoteAudio.autoplay = true;
//             document.body.appendChild(remoteAudio);
//         }
//         remoteAudio.srcObject = stream;
//     },

//     toggleMute() {
//         if (!AppState.localStream) return;

//         AppState.isMuted = !AppState.isMuted;
//         AppState.localStream.getAudioTracks().forEach(track => {
//             track.enabled = !AppState.isMuted;
//         });

//         UI.updateMuteButton(AppState.isMuted);
//         console.log('Microphone', AppState.isMuted ? 'muted' : 'unmuted');
//     },

//     toggleSpeaker() {
//         AppState.isSpeakerOn = !AppState.isSpeakerOn;
//         UI.updateSpeakerButton(AppState.isSpeakerOn);

//         // Note: Speaker control is limited in web browsers
//         // This is more of a visual indicator
//         console.log('Speaker', AppState.isSpeakerOn ? 'on' : 'off');
//     },

//     declineCall() {
//         console.log('Declining call');
//         AppState.socket.emit('decline-call', {
//             decliner: AppState.currentUser
//         });
//         UI.hideIncomingCallDialog();
//     },

//     endCall() {
//         console.log('Ending call');

//         if (AppState.isInCall) {
//             AppState.socket.emit('end-call', {
//                 ender: AppState.currentUser
//             });
//         }

//         this.cleanup();
//         UI.hideCallDialog();
//         UI.updateVoiceCallButton(false);

//         if (AppState.callTimer) {
//             clearInterval(AppState.callTimer);
//             AppState.callTimer = null;
//         }
//     },

//     cleanup() {
//         // Stop local stream
//         if (AppState.localStream) {
//             AppState.localStream.getTracks().forEach(track => track.stop());
//             AppState.localStream = null;
//         }

//         // Close peer connection
//         if (AppState.peerConnection) {
//             AppState.peerConnection.close();
//             AppState.peerConnection = null;
//         }

//         // Remove remote audio element
//         const remoteAudio = document.getElementById('remoteAudio');
//         if (remoteAudio) {
//             remoteAudio.remove();
//         }

//         AppState.isInCall = false;
//         AppState.isMuted = false;
//         AppState.isSpeakerOn = false;
//         AppState.callStartTime = null;
//     },

//     startCallTimer() {
//         if (AppState.callTimer) {
//             clearInterval(AppState.callTimer);
//         }

//         AppState.callTimer = setInterval(() => {
//             if (AppState.callStartTime) {
//                 const duration = Date.now() - AppState.callStartTime;
//                 UI.updateCallDuration(duration);
//             }
//         }, 1000);
//     },

//     formatDuration(milliseconds) {
//         const seconds = Math.floor(milliseconds / 1000);
//         const minutes = Math.floor(seconds / 60);
//         const remainingSeconds = seconds % 60;
//         return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
//     }
// };

// // Socket Management
// const SocketManager = {
//     connect() {
//         try {
//             if (typeof io !== 'undefined') {
//                 const socketUrl = `${window.location.protocol}//${window.location.host}`;
//                 console.log('Connecting to:', socketUrl);

//                 // Detect if we're on Vercel or local development
//                 const isVercel = window.location.hostname.includes('vercel.app') ||
//                     window.location.hostname.includes('vercel.com');

//                 const socketOptions = {
//                     timeout: 10000,
//                     transports: ['websocket', 'polling'],
//                     upgrade: true,
//                     rememberUpgrade: true,
//                     pingTimeout: 60000,
//                     pingInterval: 25000,
//                     forceNew: false,
//                     reconnection: true,
//                     reconnectionAttempts: 5,
//                     reconnectionDelay: 1000
//                 };

//                 // Only add custom path for Vercel deployment
//                 if (isVercel) {
//                     socketOptions.path = '/api/socket';
//                 }

//                 console.log('Socket options:', socketOptions);
//                 AppState.socket = io(socketUrl, socketOptions);

//                 AppState.socket.on('connect', () => {
//                     console.log('Connected to server');
//                     AppState.isConnected = true;
//                     UI.updateConnectionStatus('connected', 'Connected');
//                 });

//                 AppState.socket.on('disconnect', () => {
//                     console.log('Disconnected from server');
//                     AppState.isConnected = false;
//                     UI.updateConnectionStatus('disconnected', 'Disconnected');
//                 });

//                 AppState.socket.on('connect_error', (error) => {
//                     console.log('Connection error:', error);
//                     AppState.isConnected = false;
//                     UI.updateConnectionStatus('demo', 'Demo Mode');
//                 });

//                 AppState.socket.on('reconnect', () => {
//                     console.log('Reconnected to server');
//                     AppState.isConnected = true;
//                     UI.updateConnectionStatus('connected', 'Reconnected');
//                 });

//                 AppState.socket.on('message', (data) => {
//                     MessageHandler.handleIncomingMessage(data);
//                 });

//                 // Voice call event handlers
//                 AppState.socket.on('incoming-call', (data) => {
//                     console.log('Incoming call from:', data.caller);
//                     UI.showIncomingCallDialog(data.caller, data.offer);
//                 });

//                 AppState.socket.on('call-answered', (data) => {
//                     console.log('Call answered by:', data.answerer);
//                     VoiceCall.handleAnswer(data.answer);
//                 });

//                 AppState.socket.on('call-declined', (data) => {
//                     console.log('Call declined by:', data.decliner);
//                     UI.showError(`Call declined by ${data.decliner}`);
//                     VoiceCall.cleanup();
//                     UI.hideCallDialog();
//                     UI.updateVoiceCallButton(false);
//                 });

//                 AppState.socket.on('call-ended', (data) => {
//                     console.log('Call ended by:', data.ender);
//                     VoiceCall.cleanup();
//                     UI.hideCallDialog();
//                     UI.updateVoiceCallButton(false);
//                     if (data.ender !== AppState.currentUser) {
//                         UI.showError(`Call ended by ${data.ender}`);
//                     }
//                 });

//                 AppState.socket.on('ice-candidate', (data) => {
//                     console.log('Received ICE candidate');
//                     VoiceCall.handleIceCandidate(data.candidate);
//                 });

//                 AppState.socket.on('user-left-call', (data) => {
//                     console.log('User left call:', data.userId);
//                     if (AppState.isInCall) {
//                         VoiceCall.endCall();
//                         UI.showError('Other participant left the call');
//                     }
//                 });

//                 // Set connecting status initially
//                 UI.updateConnectionStatus('connecting', 'Connecting...');

//                 // Fallback to demo mode after timeout
//                 setTimeout(() => {
//                     if (!AppState.isConnected) {
//                         console.log('Connection timeout, switching to demo mode');
//                         UI.updateConnectionStatus('demo', 'Demo Mode');
//                     }
//                 }, 10000);
//             } else {
//                 throw new Error('Socket.IO not available');
//             }
//         } catch (error) {
//             console.log('Socket connection failed, using demo mode:', error);
//             AppState.isConnected = false;
//             UI.updateConnectionStatus('demo', 'Demo Mode');
//         }
//     },

//     sendMessage(message) {
//         if (AppState.socket && AppState.isConnected) {
//             AppState.socket.emit('message', message);
//         } else {
//             // Try HTTP fallback if available
//             this.sendViaHTTP(message);
//         }
//     },

//     sendViaHTTP(message) {
//         // Check if we're on Vercel (where API routes exist) or local development
//         const isVercel = window.location.hostname.includes('vercel.app') ||
//             window.location.hostname.includes('vercel.com');

//         if (!isVercel) {
//             console.log('HTTP fallback not available in local development');
//             return;
//         }

//         fetch('/api/messages', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ message })
//         })
//             .then(response => response.json())
//             .then(data => {
//                 console.log('Message sent via HTTP:', data);
//             })
//             .catch(error => {
//                 console.log('HTTP fallback failed, using demo mode:', error);
//             });
//     }
// };

// // Message Handling
// const MessageHandler = {
//     createMessage(text, encrypted = false) {
//         return {
//             id: Date.now() + Math.random(),
//             sender: AppState.currentUser,
//             text: text,
//             cipher: encrypted ? text : null,
//             createdAt: Date.now(),
//             isOwn: true
//         };
//     },

//     sendMessage(text) {
//         if (!text.trim()) return;

//         // Encrypt the message if we have a key
//         let messageToSend;
//         if (AppState.secretKey) {
//             const encrypted = CryptoUtils.encrypt(text.trim(), AppState.secretKey);
//             if (encrypted) {
//                 messageToSend = {
//                     id: Date.now() + Math.random(), // Add unique ID
//                     sender: AppState.currentUser,
//                     cipher: encrypted,
//                     createdAt: Date.now()
//                 };
//             } else {
//                 UI.showError('Failed to encrypt message');
//                 return;
//             }
//         } else {
//             // Send as plain text if no key
//             messageToSend = {
//                 id: Date.now() + Math.random(), // Add unique ID
//                 sender: AppState.currentUser,
//                 text: text.trim(),
//                 createdAt: Date.now()
//             };
//         }

//         // Add to local messages immediately (own message)
//         const localMessage = this.createMessage(text.trim());
//         AppState.messages.push(localMessage);
//         UI.renderMessages();

//         // Send to server (this will be broadcast to OTHER users only)
//         SocketManager.sendMessage(messageToSend);
//     },

//     handleIncomingMessage(data) {
//         // Don't add our own messages again
//         if (data.sender === AppState.currentUser) {
//             console.log('Ignoring own message from:', data.sender);
//             return;
//         }

//         // Prevent duplicate messages using ID
//         if (data.id && AppState.processedMessageIds.has(data.id)) {
//             console.log('Ignoring duplicate message with ID:', data.id);
//             return;
//         }

//         console.log('Adding incoming message from:', data.sender, 'to user:', AppState.currentUser);
//         const messageId = data.id || Date.now() + Math.random();
//         const message = {
//             id: messageId,
//             sender: data.sender,
//             text: data.text || null,
//             cipher: data.cipher || null,
//             createdAt: data.createdAt,
//             isOwn: false
//         };

//         // Track this message ID to prevent duplicates
//         if (data.id) {
//             AppState.processedMessageIds.add(data.id);
//         }

//         AppState.messages.push(message);
//         UI.renderMessages();
//     },


//     getDecryptedText(message) {
//         if (message.text) {
//             return message.text; // Already decrypted
//         }

//         if (message.cipher && AppState.secretKey) {
//             const decrypted = CryptoUtils.decrypt(message.cipher, AppState.secretKey);
//             return decrypted || message.cipher; // Fallback to cipher if decryption fails
//         }

//         return message.cipher || 'Encrypted message';
//     },

//     isMessageEncrypted(message) {
//         return !message.text && message.cipher && !AppState.secretKey;
//     }
// };

// // UI Management
// const UI = {
//     elements: {},

//     init() {
//         console.log('Initializing UI...');
//         this.cacheElements();
//         this.bindEvents();
//         this.checkExistingSession();
//     },

//     cacheElements() {
//         // Cache DOM elements with error checking
//         this.elements = {
//             userSetupDialog: document.getElementById('userSetupDialog'),
//             keyDialog: document.getElementById('keyDialog'),
//             chatInterface: document.getElementById('chatInterface'),
//             keyStatusBar: document.getElementById('keyStatusBar'),
//             userSetupForm: document.getElementById('userSetupForm'),
//             keyForm: document.getElementById('keyForm'),
//             displayName: document.getElementById('displayName'),
//             secretKey: document.getElementById('secretKey'),
//             messagesList: document.getElementById('messagesList'),
//             messageInput: document.getElementById('messageInput'),
//             sendBtn: document.getElementById('sendBtn'),
//             connectionStatus: document.getElementById('connectionStatus'),
//             statusText: document.getElementById('statusText'),
//             keyStatusText: document.getElementById('keyStatusText'),
//             displayNameError: document.getElementById('displayNameError'),
//             secretKeyError: document.getElementById('secretKeyError'),
//             changeKeyBtn: document.getElementById('changeKeyBtn'),
//             logoutBtn: document.getElementById('logoutBtn'),
//             skipKeyBtn: document.getElementById('skipKeyBtn'),
//             setKeyBtn: document.getElementById('setKeyBtn'),
//             // Voice call elements
//             voiceCallBtn: document.getElementById('voiceCallBtn'),
//             voiceCallDialog: document.getElementById('voiceCallDialog'),
//             incomingCallDialog: document.getElementById('incomingCallDialog'),
//             callTitle: document.getElementById('callTitle'),
//             callStatus: document.getElementById('callStatus'),
//             callParticipants: document.getElementById('callParticipants'),
//             callDuration: document.getElementById('callDuration'),
//             participantsCount: document.getElementById('participantsCount'),
//             muteBtn: document.getElementById('muteBtn'),
//             endCallBtn: document.getElementById('endCallBtn'),
//             speakerBtn: document.getElementById('speakerBtn'),
//             callerName: document.getElementById('callerName'),
//             acceptCallBtn: document.getElementById('acceptCallBtn'),
//             declineCallBtn: document.getElementById('declineCallBtn')
//         };

//         // Log missing elements
//         Object.entries(this.elements).forEach(([key, element]) => {
//             if (!element) {
//                 console.error(`Element not found: ${key}`);
//             }
//         });
//     },

//     bindEvents() {
//         console.log('Binding events...');

//         // User setup form
//         if (this.elements.userSetupForm) {
//             this.elements.userSetupForm.addEventListener('submit', (e) => {
//                 console.log('User setup form submitted');
//                 e.preventDefault();
//                 this.handleUserSetup();
//             });
//         }

//         // Key form
//         if (this.elements.keyForm) {
//             this.elements.keyForm.addEventListener('submit', (e) => {
//                 console.log('Key form submitted');
//                 e.preventDefault();
//                 this.handleKeySetup();
//             });
//         }

//         // Skip key button
//         if (this.elements.skipKeyBtn) {
//             this.elements.skipKeyBtn.addEventListener('click', (e) => {
//                 console.log('Skip key clicked');
//                 e.preventDefault();
//                 this.skipKeySetup();
//             });
//         }

//         // Set key button in status bar
//         if (this.elements.setKeyBtn) {
//             this.elements.setKeyBtn.addEventListener('click', (e) => {
//                 console.log('Set key clicked');
//                 e.preventDefault();
//                 this.showKeyDialog();
//             });
//         }

//         // Change key button
//         if (this.elements.changeKeyBtn) {
//             this.elements.changeKeyBtn.addEventListener('click', (e) => {
//                 console.log('Change key clicked');
//                 e.preventDefault();
//                 this.showKeyDialog();
//             });
//         }

//         // Logout button
//         if (this.elements.logoutBtn) {
//             this.elements.logoutBtn.addEventListener('click', (e) => {
//                 console.log('Logout clicked');
//                 e.preventDefault();
//                 this.logout();
//             });
//         }

//         // Message input
//         if (this.elements.messageInput) {
//             this.elements.messageInput.addEventListener('input', () => {
//                 this.updateSendButton();
//                 this.autoResizeTextarea();
//             });

//             this.elements.messageInput.addEventListener('keydown', (e) => {
//                 if (e.key === 'Enter' && !e.shiftKey) {
//                     e.preventDefault();
//                     this.handleSendMessage();
//                 }
//             });
//         }

//         // Send button
//         if (this.elements.sendBtn) {
//             this.elements.sendBtn.addEventListener('click', (e) => {
//                 console.log('Send button clicked');
//                 e.preventDefault();
//                 this.handleSendMessage();
//             });
//         }

//         // Voice call button
//         if (this.elements.voiceCallBtn) {
//             this.elements.voiceCallBtn.addEventListener('click', (e) => {
//                 console.log('Voice call button clicked');
//                 e.preventDefault();
//                 VoiceCall.startCall();
//             });
//         }

//         // Call control buttons
//         if (this.elements.muteBtn) {
//             this.elements.muteBtn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 VoiceCall.toggleMute();
//             });
//         }

//         if (this.elements.endCallBtn) {
//             this.elements.endCallBtn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 VoiceCall.endCall();
//             });
//         }

//         if (this.elements.speakerBtn) {
//             this.elements.speakerBtn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 VoiceCall.toggleSpeaker();
//             });
//         }

//         // Incoming call buttons
//         if (this.elements.acceptCallBtn) {
//             this.elements.acceptCallBtn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 const offer = this.elements.acceptCallBtn.dataset.offer;
//                 if (offer) {
//                     VoiceCall.acceptCall(JSON.parse(offer));
//                 }
//             });
//         }

//         if (this.elements.declineCallBtn) {
//             this.elements.declineCallBtn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 VoiceCall.declineCall();
//             });
//         }
//     },

//     checkExistingSession() {
//         console.log('Checking existing session...');
//         const savedUser = sessionStorage.getItem('chatUser');
//         const savedKey = sessionStorage.getItem('chatKey');

//         if (savedUser) {
//             console.log('Found saved user:', savedUser);
//             AppState.currentUser = savedUser;
//             if (savedKey) {
//                 AppState.secretKey = savedKey;
//             }
//             this.showChatInterface();
//         } else {
//             console.log('No saved user, showing setup dialog');
//             this.showUserSetupDialog();
//         }
//     },

//     showUserSetupDialog() {
//         console.log('Showing user setup dialog');
//         if (this.elements.userSetupDialog) {
//             this.elements.userSetupDialog.classList.remove('hidden');
//         }
//         if (this.elements.keyDialog) {
//             this.elements.keyDialog.classList.add('hidden');
//         }
//         if (this.elements.chatInterface) {
//             this.elements.chatInterface.classList.add('hidden');
//         }
//         if (this.elements.displayName) {
//             this.elements.displayName.focus();
//         }
//     },

//     showKeyDialog() {
//         console.log('Showing key dialog');
//         if (this.elements.userSetupDialog) {
//             this.elements.userSetupDialog.classList.add('hidden');
//         }
//         if (this.elements.keyDialog) {
//             this.elements.keyDialog.classList.remove('hidden');
//         }
//         if (this.elements.chatInterface) {
//             this.elements.chatInterface.classList.add('hidden');
//         }
//         if (this.elements.secretKey) {
//             this.elements.secretKey.value = '';
//             this.elements.secretKey.focus();
//         }
//         if (this.elements.secretKeyError) {
//             this.elements.secretKeyError.textContent = '';
//         }
//     },

//     showChatInterface() {
//         console.log('Showing chat interface');
//         if (this.elements.userSetupDialog) {
//             this.elements.userSetupDialog.classList.add('hidden');
//         }
//         if (this.elements.keyDialog) {
//             this.elements.keyDialog.classList.add('hidden');
//         }
//         if (this.elements.chatInterface) {
//             this.elements.chatInterface.classList.remove('hidden');
//         }

//         if (!AppState.secretKey) {
//             if (this.elements.keyStatusBar) {
//                 this.elements.keyStatusBar.classList.remove('hidden');
//             }
//         } else {
//             if (this.elements.keyStatusBar) {
//                 this.elements.keyStatusBar.classList.add('hidden');
//             }
//         }

//         // Load sample messages if none exist

//         this.renderMessages();
//         if (this.elements.messageInput) {
//             this.elements.messageInput.focus();
//         }
//         SocketManager.connect();
//     },

//     handleUserSetup() {
//         console.log('Handling user setup...');

//         if (!this.elements.displayName) {
//             console.error('Display name element not found');
//             return;
//         }

//         const name = this.elements.displayName.value.trim();
//         console.log('Display name entered:', name);

//         const errors = Validation.validateDisplayName(name);

//         if (errors.length > 0) {
//             console.log('Validation errors:', errors);
//             if (this.elements.displayNameError) {
//                 this.elements.displayNameError.textContent = errors[0];
//             }
//             return;
//         }

//         if (this.elements.displayNameError) {
//             this.elements.displayNameError.textContent = '';
//         }

//         AppState.currentUser = name;
//         sessionStorage.setItem('chatUser', name);
//         console.log('User setup complete, showing key dialog');
//         this.showKeyDialog();
//     },

//     handleKeySetup() {
//         console.log('Handling key setup...');

//         if (!this.elements.secretKey) {
//             console.error('Secret key element not found');
//             return;
//         }

//         const key = this.elements.secretKey.value.trim();
//         console.log('Secret key entered:', key ? 'Yes' : 'No');

//         const errors = Validation.validateSecretKey(key);

//         if (errors.length > 0) {
//             console.log('Key validation errors:', errors);
//             if (this.elements.secretKeyError) {
//                 this.elements.secretKeyError.textContent = errors[0];
//             }
//             return;
//         }

//         if (this.elements.secretKeyError) {
//             this.elements.secretKeyError.textContent = '';
//         }

//         AppState.secretKey = key;
//         sessionStorage.setItem('chatKey', key);
//         console.log('Key setup complete, showing chat interface');
//         this.showChatInterface();
//     },

//     skipKeySetup() {
//         console.log('Skipping key setup');
//         AppState.secretKey = null;
//         sessionStorage.removeItem('chatKey');
//         this.showChatInterface();
//     },

//     handleSendMessage() {
//         if (!this.elements.messageInput) return;

//         const text = this.elements.messageInput.value.trim();
//         if (!text) return;

//         console.log('Sending message:', text);
//         MessageHandler.sendMessage(text);
//         this.elements.messageInput.value = '';
//         this.updateSendButton();
//         this.autoResizeTextarea();
//     },

//     updateSendButton() {
//         if (!this.elements.messageInput || !this.elements.sendBtn) return;

//         const hasText = this.elements.messageInput.value.trim().length > 0;
//         this.elements.sendBtn.disabled = !hasText;
//     },

//     autoResizeTextarea() {
//         if (!this.elements.messageInput) return;

//         const textarea = this.elements.messageInput;
//         textarea.style.height = 'auto';
//         textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
//     },

//     renderMessages() {
//         if (!this.elements.messagesList) return;

//         const container = this.elements.messagesList;
//         container.innerHTML = '';

//         AppState.messages.forEach(message => {
//             const messageEl = this.createMessageElement(message);
//             container.appendChild(messageEl);
//         });

//         // Scroll to bottom
//         container.scrollTop = container.scrollHeight;
//     },

//     createMessageElement(message) {
//         const div = document.createElement('div');
//         div.className = `message ${message.isOwn ? 'own' : 'other'}`;

//         const text = MessageHandler.getDecryptedText(message);
//         const isEncrypted = MessageHandler.isMessageEncrypted(message);
//         const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
//             hour: '2-digit',
//             minute: '2-digit',
//             hour12: false
//         });

//         const senderHtml = !message.isOwn ? `<div class="message-sender">${this.escapeHtml(message.sender)}</div>` : '';

//         div.innerHTML = `
//             ${senderHtml}
//             <div class="message-bubble">
//                 <div class="message-text ${isEncrypted ? 'encrypted' : ''}">${this.escapeHtml(text)}</div>
//                 <div class="message-time">${time}</div>
//             </div>
//         `;

//         return div;
//     },

//     escapeHtml(text) {
//         const div = document.createElement('div');
//         div.textContent = text;
//         return div.innerHTML;
//     },

//     updateConnectionStatus(status, text) {
//         if (!this.elements.connectionStatus || !this.elements.statusText) return;

//         const statusDot = this.elements.connectionStatus.querySelector('.status-dot');
//         this.elements.statusText.textContent = text;

//         if (statusDot) {
//             statusDot.className = 'status-dot';
//             if (status === 'connected') {
//                 statusDot.classList.add('connected');
//             } else if (status === 'connecting') {
//                 statusDot.classList.add('connecting');
//             }
//         }
//     },

//     logout() {
//         console.log('Logging out...');
//         sessionStorage.removeItem('chatUser');
//         sessionStorage.removeItem('chatKey');
//         AppState.currentUser = null;
//         AppState.secretKey = null;
//         AppState.messages = [];

//         if (AppState.socket) {
//             AppState.socket.disconnect();
//         }

//         // Clear form fields
//         if (this.elements.displayName) {
//             this.elements.displayName.value = '';
//         }
//         if (this.elements.secretKey) {
//             this.elements.secretKey.value = '';
//         }
//         if (this.elements.displayNameError) {
//             this.elements.displayNameError.textContent = '';
//         }
//         if (this.elements.secretKeyError) {
//             this.elements.secretKeyError.textContent = '';
//         }

//         this.showUserSetupDialog();
//     },

//     // Voice Call UI Methods
//     showCallDialog() {
//         if (this.elements.voiceCallDialog) {
//             this.elements.voiceCallDialog.classList.remove('hidden');
//             this.updateParticipantsList();
//         }
//     },

//     hideCallDialog() {
//         if (this.elements.voiceCallDialog) {
//             this.elements.voiceCallDialog.classList.add('hidden');
//         }
//     },

//     showIncomingCallDialog(callerName, offer) {
//         if (this.elements.incomingCallDialog && this.elements.callerName) {
//             this.elements.callerName.textContent = callerName;
//             this.elements.acceptCallBtn.dataset.offer = JSON.stringify(offer);
//             this.elements.incomingCallDialog.classList.remove('hidden');
//         }
//     },

//     hideIncomingCallDialog() {
//         if (this.elements.incomingCallDialog) {
//             this.elements.incomingCallDialog.classList.add('hidden');
//         }
//     },

//     updateCallStatus(status) {
//         if (this.elements.callStatus) {
//             this.elements.callStatus.textContent = status;
//         }
//     },

//     updateCallDuration(milliseconds) {
//         if (this.elements.callDuration) {
//             const duration = VoiceCall.formatDuration(milliseconds);
//             this.elements.callDuration.textContent = duration;
//         }
//     },

//     updateParticipantsList() {
//         if (!this.elements.callParticipants) return;

//         // Clear existing participants
//         this.elements.callParticipants.innerHTML = '';

//         // Add current user
//         const userParticipant = this.createParticipantElement(
//             AppState.currentUser,
//             'You',
//             AppState.isMuted
//         );
//         this.elements.callParticipants.appendChild(userParticipant);

//         // Update participants count
//         if (this.elements.participantsCount) {
//             const count = AppState.isInCall ? 2 : 1; // Assuming 1-on-1 calls for now
//             this.elements.participantsCount.textContent = `${count} participant${count > 1 ? 's' : ''}`;
//         }
//     },

//     createParticipantElement(name, status, isMuted) {
//         const div = document.createElement('div');
//         div.className = 'participant';

//         const avatarLetter = name.charAt(0).toUpperCase();

//         div.innerHTML = `
//             <div class="participant-avatar">${this.escapeHtml(avatarLetter)}</div>
//             <div class="participant-info">
//                 <div class="participant-name">${this.escapeHtml(name)}</div>
//                 <div class="participant-status">${this.escapeHtml(status)}</div>
//             </div>
//             <div class="participant-audio">
//                 <div class="audio-indicator ${isMuted ? 'muted' : ''}"></div>
//             </div>
//         `;

//         return div;
//     },

//     updateMuteButton(isMuted) {
//         if (this.elements.muteBtn) {
//             const icon = this.elements.muteBtn.querySelector('.material-icons');
//             if (icon) {
//                 icon.textContent = isMuted ? 'mic_off' : 'mic';
//             }
//             this.elements.muteBtn.classList.toggle('muted', isMuted);
//         }
//         this.updateParticipantsList();
//     },

//     updateSpeakerButton(isSpeakerOn) {
//         if (this.elements.speakerBtn) {
//             const icon = this.elements.speakerBtn.querySelector('.material-icons');
//             if (icon) {
//                 icon.textContent = isSpeakerOn ? 'volume_up' : 'volume_down';
//             }
//             this.elements.speakerBtn.classList.toggle('active', isSpeakerOn);
//         }
//     },

//     updateVoiceCallButton(isInCall) {
//         if (this.elements.voiceCallBtn) {
//             const icon = this.elements.voiceCallBtn.querySelector('.material-icons');
//             const text = this.elements.voiceCallBtn.querySelector('span:not(.material-icons)');

//             if (icon) {
//                 icon.textContent = isInCall ? 'call_end' : 'call';
//             }
//             if (text) {
//                 text.textContent = isInCall ? 'End' : 'Call';
//             }

//             this.elements.voiceCallBtn.classList.toggle('calling', isInCall);
//         }
//     },

//     showError(message) {
//         console.error('Error:', message);
//         alert('Error: ' + message);
//     }
// };

// // Initialize Application
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('DOM loaded, initializing app...');
//     UI.init();
// });

// // Export for testing (if needed)
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = {
//         AppState,
//         CryptoUtils,
//         Validation,
//         MessageHandler,
//         UI
//     };
// }