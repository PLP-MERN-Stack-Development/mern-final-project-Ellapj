import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Zap, Wifi } from 'lucide-react';
import { socket } from './socket.js';

// Utility to get current timestamp
const getCurrentTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const generateId = () => Math.random().toString(36).substring(2, 9);

const initialMessages = [
    { id: generateId(), user: 'System', text: 'Welcome to the Global Job Hub Chat Room. Enter a username to begin.', timestamp: getCurrentTimestamp() },
];

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [messages, setMessages] = useState(initialMessages);
    const [inputMessage, setInputMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const messagesEndRef = useRef(null);

    // --- Task 1 & 2: Connection and State Management ---
    useEffect(() => {
        // 1. Connection status listeners
        const onConnect = () => {
            setIsConnected(true);
            console.log('--- Socket Connected ---');
            // Inform the server about the new user for user management (Task 2)
            socket.emit('user_register', { username });
            
            // Send the test message for Task 1 confirmation
            socket.emit('hello_from_client', { message: 'Client is here!' });
        };

        const onDisconnect = (reason) => {
            setIsConnected(false);
            console.warn('--- Socket Disconnected ---', reason);
        };
        
        const onTestResponse = (data) => {
            console.log(`[Client] Server responded: ${data.message}`);
        };

        // 2. Core Chat Listener (Global Room)
        const onReceiveMessage = (message) => {
            setMessages(prev => [...prev, {...message, timestamp: getCurrentTimestamp()}]);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('hello_from_server', onTestResponse); // For Task 1 test
        socket.on('chat_message', onReceiveMessage);
        
        // Cleanup function
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('hello_from_server', onTestResponse);
            socket.off('chat_message', onReceiveMessage);
            socket.disconnect(); 
        };
    }, [username]); 

    // Scroll to the bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    // --- Core Chat Functionality ---
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !isAuthenticated || !isConnected) return;

        const messageData = {
            user: username,
            text: inputMessage.trim(),
        };

        // Emit the message to the server
        socket.emit('send_chat_message', messageData);

        setInputMessage('');
    };

    const handleSetUsername = (e) => {
        e.preventDefault();
        if (username.trim().length > 2) {
            setIsAuthenticated(true);
            // Manually trigger socket connection after authentication
            socket.connect(); 
        }
    };

    // --- Rendering Logic ---
    
    const MessageBubble = ({ message, isSelf }) => (
        <div className={`flex mb-4 ${isSelf ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md p-3 rounded-xl shadow-lg transition-all duration-300 ${
                isSelf 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
            }`}>
                <div className="flex justify-between items-baseline mb-1">
                    <span className={`font-semibold text-sm ${isSelf ? 'text-blue-200' : 'text-gray-900'}`}>
                        {message.user}
                    </span>
                </div>
                <p className="text-sm break-words leading-relaxed">
                    {message.text}
                </p>
                <div className="text-right mt-1">
                    <span className={`text-xs ${isSelf ? 'text-blue-300' : 'text-gray-500'}`}>
                        {message.timestamp}
                    </span>
                </div>
            </div>
        </div>
    );

    if (!isAuthenticated) {
        // Authentication Form (Login Screen)
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
                    <div className="text-center">
                        <MessageSquare className="h-10 w-10 text-blue-600 mx-auto" />
                        <h2 className="mt-4 text-2xl font-bold text-gray-900">
                            Join the Job Hub Chat
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Set a username to enter the global room.
                        </p>
                    </div>
                    <form className="mt-6 space-y-4" onSubmit={handleSetUsername}>
                        <div>
                            <label htmlFor="username" className="sr-only">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150"
                                placeholder="Choose a Username (e.g., JobSeeker77)"
                            />
                        </div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-md"
                        >
                            Enter Chat Room
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6 font-inter">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col h-[90vh] border border-gray-100">
                
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-xl sticky top-0 z-10">
                    <div className="flex items-center space-x-3">
                        <Zap className="h-6 w-6 text-yellow-500" />
                        <h1 className="text-xl font-bold text-gray-900">Global Chat Room</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
                            {isConnected ? 'Online' : 'Connecting...'}
                        </span>
                        <Wifi className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-400'}`} />
                        <div className="hidden sm:block text-sm font-medium text-gray-700 bg-blue-100 px-3 py-1 rounded-full shadow-inner">
                            <span className="text-blue-600">You:</span> {username}
                        </div>
                    </div>
                </header>

                {/* Message Display Area */}
                <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((message) => (
                        <MessageBubble 
                            key={message.id || generateId()} 
                            message={message} 
                            isSelf={message.user === username} 
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </main>

                {/* Message Input Form */}
                <footer className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
                    <form className="flex items-center space-x-3" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder={isConnected ? "Type your message here..." : "Connecting to server..."}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-sm"
                            disabled={!isConnected || !isAuthenticated}
                        />
                        <button
                            type="submit"
                            className="p-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
                            disabled={!isConnected || !inputMessage.trim()}
                            aria-label="Send Message"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default App;