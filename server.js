const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle socket connections
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle incoming messages
    socket.on('message', (data) => {
        console.log('Message received from', socket.id, '- Sender:', data.sender, '- Message ID:', data.id);
        // Broadcast message to all clients except sender
        socket.broadcast.emit('message', data);
        console.log('Message broadcasted to', socket.adapter.rooms.size - 1, 'other clients');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all network interfaces

server.listen(PORT, HOST, () => {
    console.log(`Chat server running on http://${HOST}:${PORT}`);
    console.log(`Access from network: http://[YOUR_IP]:${PORT}`);
});
