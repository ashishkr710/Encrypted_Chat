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

app.use(express.static(path.join(__dirname, 'public')));

// Handle root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('message', (data) => {
        console.log('Message received from', socket.id, '- Sender:', data.sender, '- Message ID:', data.id);
        socket.broadcast.emit('message', data);
        console.log('Message broadcasted to', socket.adapter.rooms.size - 1, 'other clients');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;
