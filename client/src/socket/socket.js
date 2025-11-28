import { io } from 'socket.io-client';

// The URL of our Node.js server
const SERVER_URL = 'http://localhost:3001';

// Set up Socket.io client
// autoConnect: false allows us to connect manually after the user enters a username.
export const socket = io(SERVER_URL, {
    autoConnect: false,
});

// Basic connection status listeners (for logging purposes)
socket.on('connect', () => {
    console.log(`[Client] Connected to server! Socket ID: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
    console.warn(`[Client] Disconnected from server: ${reason}`);
});