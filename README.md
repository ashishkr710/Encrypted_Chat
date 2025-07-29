# Encrypted Chat with Voice Calls

An end-to-end encrypted chat application with voice calling functionality built with Node.js, Socket.IO, and WebRTC.

## Features

### Chat Features
- **End-to-End Encryption**: Messages are encrypted using AES encryption with a shared secret key
- **Real-time Messaging**: Instant message delivery using WebSocket connections
- **Demo Mode**: Fallback mode when server connection is unavailable
- **Network Support**: Works across local networks and can be deployed to cloud platforms

### Voice Call Features ✨ NEW
- **WebRTC Voice Calls**: High-quality peer-to-peer voice communication
- **Call Controls**: Mute/unmute, speaker toggle, and call end functionality
- **Incoming Call Notifications**: Visual and interactive call notifications
- **Call Status**: Real-time call duration and connection status
- **Network Traversal**: Uses STUN servers for NAT traversal

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ashishkr710/Encrypted_Chat.git
cd Encrypted_Chat
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

4. Open your browser and navigate to:
   - Local: `http://localhost:4000`
   - Network: `http://YOUR_IP_ADDRESS:4000`

## Voice Call Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Microphone access permissions
- HTTPS connection (required for WebRTC in production)

### Usage

1. **Starting a Call**:
   - Click the "Call" button in the chat header
   - Grant microphone permissions when prompted
   - Wait for other participants to accept the call

2. **Receiving a Call**:
   - You'll see an incoming call dialog
   - Click "Accept" to join or "Decline" to reject

3. **During a Call**:
   - **Mute/Unmute**: Click the microphone button
   - **Speaker**: Toggle speaker mode (visual indicator)
   - **End Call**: Click the red phone button to disconnect

### Call Controls

| Button | Icon | Description |
|--------|------|-------------|
| Mute | 🎤 | Toggle microphone on/off |
| End Call | 📞 | Disconnect from the call |
| Speaker | 🔊 | Toggle speaker mode |

## Technical Implementation

### WebRTC Architecture
```
Client A ←→ Signaling Server ←→ Client B
    ↓                               ↓
    └─────── P2P Audio Stream ──────┘
```

### Server-Side Changes
- Added WebRTC signaling endpoints:
  - `call-user`: Initiate a call
  - `answer-call`: Accept a call
  - `decline-call`: Reject a call
  - `end-call`: Terminate a call
  - `ice-candidate`: Exchange ICE candidates

### Client-Side Implementation
- **VoiceCall Manager**: Handles WebRTC peer connections
- **UI Integration**: Voice call dialogs and controls
- **Audio Management**: Microphone and speaker controls
- **Event Handling**: Socket.IO integration for signaling

## Network Configuration

### Local Network
The server binds to `0.0.0.0:4000` to accept connections from any device on your network.

### Firewall Settings
Make sure port 4000 is open:
```bash
sudo ufw allow 4000
```

### Find Your IP Address
```bash
# Linux/Mac
ip addr show | grep inet

# Windows
ipconfig
```

Other devices can connect using: `http://YOUR_IP:4000`

## Browser Permissions

Voice calls require microphone permissions. The application will:
1. Request permission when you start your first call
2. Show an error if permission is denied
3. Work with any modern browser that supports WebRTC

## Troubleshooting

### Voice Call Issues

1. **Can't start call**:
   - Check microphone permissions
   - Ensure HTTPS in production
   - Verify WebRTC support in browser

2. **Can't hear audio**:
   - Check speaker/headphone volume
   - Verify browser audio settings
   - Try refreshing the page

3. **Connection failed**:
   - Check network connectivity
   - Verify firewall settings
   - Try using STUN/TURN servers for complex networks

### Common Solutions

```javascript
// Check WebRTC support
if (!window.RTCPeerConnection) {
    console.error('WebRTC not supported');
}

// Debug audio stream
navigator.mediaDevices.getUserMedia({audio: true})
    .then(stream => console.log('Audio stream:', stream))
    .catch(err => console.error('Audio error:', err));
```

## Deployment

### Local Development
```bash
node server.js
```

### Production (Vercel)
The application includes Vercel configuration files:
- `vercel.json`: Deployment configuration
- `api/socket.js`: Serverless Socket.IO handler
- `api/messages.js`: Message API endpoint

### Environment Variables
```bash
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
```

## Security Considerations

### Message Encryption
- Messages are encrypted client-side using AES
- Keys are never transmitted to the server
- Each session uses a unique encryption key

### Voice Call Security
- WebRTC uses DTLS for media encryption
- Peer-to-peer connections bypass server audio routing
- STUN servers only help with connection establishment

## Browser Compatibility

| Browser | Chat | Voice Calls |
|---------|------|-------------|
| Chrome 80+ | ✅ | ✅ |
| Firefox 72+ | ✅ | ✅ |
| Safari 13+ | ✅ | ✅ |
| Edge 80+ | ✅ | ✅ |

## File Structure

```
├── server.js              # Main server with voice call signaling
├── public/
│   ├── index.html         # UI with voice call dialogs
│   ├── app.js            # Client logic + VoiceCall manager
│   └── style.css         # Styling + voice call components
├── api/                  # Vercel serverless functions
├── package.json
└── README.md
```

## API Reference

### Socket Events

#### Chat Events
- `message`: Send/receive chat messages
- `connect`: Client connected
- `disconnect`: Client disconnected

#### Voice Call Events
- `call-user`: Initiate a voice call
- `incoming-call`: Receive call invitation
- `answer-call`: Accept a call
- `call-answered`: Call was accepted
- `decline-call`: Reject a call
- `call-declined`: Call was rejected
- `end-call`: End active call
- `call-ended`: Call was terminated
- `ice-candidate`: WebRTC ICE candidate exchange
- `user-left-call`: User disconnected during call

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/voice-calls`
3. Commit changes: `git commit -am 'Add voice call feature'`
4. Push to branch: `git push origin feature/voice-calls`
5. Submit a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### v2.0.0 - Voice Calls
- ✨ Added WebRTC voice calling functionality
- ✨ Added call controls (mute, speaker, end call)
- ✨ Added incoming call notifications
- ✨ Added call duration tracking
- 🐛 Fixed network connectivity issues
- 🎨 Enhanced UI with voice call components

### v1.0.0 - Initial Release
- 📱 End-to-end encrypted messaging
- 🔐 AES encryption with shared keys
- 🌐 Network support for multiple devices
- ⚡ Real-time message delivery
- 🎨 Modern, responsive UI design
