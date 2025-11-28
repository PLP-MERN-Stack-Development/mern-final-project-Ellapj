import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// --- Configuration ---
const PORT = process.env.PORT || 3001;
// FIX: Update the client origin to the actual Vite port
const CLIENT_ORIGIN = 'http://localhost:5173'; 

// --- 1. Set up Express App and HTTP Server ---
const app = express();
// Allow the React client to connect
app.use(cors({
    origin: CLIENT_ORIGIN, 
    methods: ['GET', 'POST'],
    credentials: true
}));

const httpServer = createServer(app);

// --- 2. Configure Socket.io on the Server Side ---
const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// --- Basic Express route check (optional) ---
app.get('/', (req, res) => {
    res.send('Server is running and waiting for Socket.io connections.');
});

// --- 3. Establish a Basic Connection (Socket.io Logic) ---

// Listen for new client connections
io.on('connection', (socket) => {
    console.log(`[Server] User connected: ${socket.id}`);

    // Listen for a test message from the client
    socket.on('hello_from_client', (data) => {
        console.log(`[Server] Received message: ${data.message}`);
        
        // Respond back to the specific client
        socket.emit('hello_from_server', { message: 'Hello back! Connection acknowledged.' });
    });

    // Listen for client disconnection
    socket.on('disconnect', () => {
        console.log(`[Server] User disconnected: ${socket.id}`);
    });
});

// --- Start the Server ---
httpServer.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});