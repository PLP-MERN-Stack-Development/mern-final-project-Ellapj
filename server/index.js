// --- Firebase Admin SDK Setup (Uses Canvas Globals for Credentials) ---
// Note: Requires 'firebase-admin', 'express', 'http', and 'socket.io' dependencies in the environment.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// --- Server and Socket.io Imports ---
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// --- Global Variables (Provided by Canvas Environment) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Server Configuration ---
const PORT = 3001;

// --- Firebase Admin Initialization ---
if (Object.keys(firebaseConfig).length) {
    // initializeApp uses applicationDefault() to automatically pick up credentials
    initializeApp({ credential: applicationDefault() }); 
    console.log("[Server] Firebase Admin SDK initialized successfully.");
} else {
    console.error("[Server] Firebase Admin SDK failed to initialize: Configuration missing.");
}
const db = getFirestore();
// Note: The client handles all persistence (add/read) via its own SDK,
// so the server only needs to manage presence (active users).

// --- Application and Socket.io Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Required for cross-origin client/server communication
        methods: ["GET", "POST"]
    }
});

// Global state to map Socket ID to Username
// { 'socket_id_1': 'UserA', 'socket_id_2': 'UserB' }
let activeUsers = {};

// --- Helper Functions ---

/**
 * Broadcasts the unique list of currently connected usernames to all clients.
 */
const broadcastUserList = () => {
    // Use a Set to ensure only unique usernames are sent, 
    // even if a user has multiple tabs/sockets open.
    const uniqueUsers = [...new Set(Object.values(activeUsers))];
    io.emit('user_list_update', uniqueUsers);
    console.log(`[Server] Active users updated: ${uniqueUsers.length} unique users online.`);
};

/**
 * Broadcasts a system announcement message to all clients.
 * @param {string} text The system message content.
 */
const broadcastSystemMessage = (text) => {
    io.emit('chat_message', {
        user: 'System',
        text: text,
        type: 'system'
    });
};

// --- Socket.io Connection Handlers ---

io.on('connection', (socket) => {
    console.log(`[Server] New connection established: ${socket.id}`);

    // 1. Handle user registration after client connects and submits username
    socket.on('user_register', (data) => {
        const username = data.username;
        if (username) {
            activeUsers[socket.id] = username;
            
            // Broadcast the updated list of users to everyone
            broadcastUserList();
            
            // Announce the user joined, but only if this is their first connection instance
            const isFirstConnection = Object.values(activeUsers).filter(u => u === username).length === 1;
            if (isFirstConnection) {
                broadcastSystemMessage(`${username} has joined the chat.`);
            }
            console.log(`[Server] User registered: ${username} (${socket.id})`);
        }
    });

    // 2. Handle disconnection
    socket.on('disconnect', () => {
        const disconnectedUsername = activeUsers[socket.id];
        
        if (disconnectedUsername) {
            delete activeUsers[socket.id];
            
            // Broadcast the updated user list
            broadcastUserList();
            
            // Announce the user left ONLY if they have no remaining active sockets
            const isUserStillActive = Object.values(activeUsers).includes(disconnectedUsername);
            if (!isUserStillActive) {
                broadcastSystemMessage(`${disconnectedUsername} has left the chat.`);
            }
        }
        console.log(`[Server] User disconnected: ${socket.id}`);
    });

    // Note: The server does not handle message forwarding (chat_message) 
    // because the client's direct write to Firestore and subsequent 
    // real-time onSnapshot listener handles the message broadcast, 
    // ensuring persistence and real-time delivery in one step.
});

// Start the server
server.listen(PORT, () => {
    console.log(`[Server] Socket.io listening on port ${PORT}`);
});