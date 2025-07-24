import { Server } from 'socket.io';

const SocketHandler = (req, res) => {
    if (res.socket.server.io) {
        console.log('Socket is already running');
    } else {
        console.log('Socket is initializing');
        const io = new Server(res.socket.server, {
            path: '/api/socket',
            addTrailingSlash: false,
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            allowEIO3: true,
            pingTimeout: 60000,
            pingInterval: 25000
        });
        res.socket.server.io = io;

        io.on('connection', (socket) => {
            console.log('User connected:', socket.id);

            socket.on('message', (data) => {
                console.log('Message received from', socket.id, '- Sender:', data.sender, '- Message ID:', data.id);
                socket.broadcast.emit('message', data);
                console.log('Message broadcasted to other clients');
            });

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });
    }
    res.end();
};

export default SocketHandler;
