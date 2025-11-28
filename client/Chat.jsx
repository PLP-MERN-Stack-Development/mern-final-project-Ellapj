import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { MessageSquare, Send, Zap, Wifi, Users, UserPlus, RotateCw } from 'lucide-react';

const SERVER_URL = 'http://localhost:3001'; // Your Node.js server address
const socket = io(SERVER_URL, { autoConnect: false });

const getCurrentTimestamp = (date) => 
    date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const Chat = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const messagesEndRef = useRef(null);

    // --- 1. Load History (REST API) ---
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${SERVER_URL}/api/messages`);
                const history = await response.json();

                const formattedHistory = history.map(msg => ({
                    ...msg,
                    timestamp: getCurrentTimestamp(msg.timestamp)
                }));

                setMessages([
                    { user: 'System', text: 'Welcome to the MERN Chat Room.', timestamp: getCurrentTimestamp(), type: 'system' },
                    ...formattedHistory
                ]);
            } catch (error) {
                console.error("Error fetching chat history from API:", error);
                setMessages([{ user: 'System', text: 'Error loading history.', timestamp: getCurrentTimestamp(), type: 'system' }]);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        
        fetchHistory();
    }, []);

    // --- 2. Socket Listeners (Real-time updates) ---
    useEffect(() => {
        if (!isAuthenticated) return;

        const onConnect = () => {
            setIsConnected(true);
            console.log('--- Socket Connected ---');
            socket.emit('user_register', { username });
        };

        const onDisconnect = (reason) => {
            setIsConnected(false);
            console.warn('--- Socket Disconnected ---', reason);
        };
        
        // This receives system announcements AND new persistent messages from the server
        const onReceiveMessage = (message) => {
            setMessages(prev => [...prev, {...message, timestamp: message.timestamp || getCurrentTimestamp()}]);
        };
        
        const onUserListUpdate = (users) => {
            setActiveUsers(users);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('chat_message', onReceiveMessage);
        socket.on('user_list_update', onUserListUpdate); 
        
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('chat_message', onReceiveMessage);
            socket.off('user_list_update', onUserListUpdate);
        };
    }, [isAuthenticated, username]); 

    // Scroll to the bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    // --- Handlers ---
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !isAuthenticated || !isConnected) return;

        // Message is sent to the server via Socket.io, which will save it to MongoDB
        // and then broadcast it back to all clients (including this one).
        socket.emit('chat_message', {
            user: username,
            text: inputMessage.trim(),
        });

        setInputMessage('');
    };

    const handleSetUsername = (e) => {
        e.preventDefault();
        if (username.trim().length > 2) {
            setIsAuthenticated(true);
            socket.connect(); 
        }
    };

    // --- Message Rendering Component ---
    
    const MessageBubble = ({ message, isSelf }) => {
        if (message.type === 'system') {
            return (
                <div className="flex justify-center my-3">
                    <span className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded-full italic shadow-inner">
                        {message.text}
                    </span>
                </div>
            );
        }

        return (
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
    };


    if (!isAuthenticated) {
        // Authentication Form (Login Screen)
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
                    <div className="text-center">
                        <MessageSquare className="h-10 w-10 text-blue-600 mx-auto" />
                        <h2 className="mt-4 text-2xl font-bold text-gray-900">
                            Join the MERN Chat Hub
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
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150"
                                placeholder="Choose a Username (e.g., JobSeeker77)"
                            />
                        </div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-md disabled:opacity-50"
                            disabled={username.trim().length <= 2}
                        >
                            Enter Chat Room
                        </button>
                        <div className="text-xs text-center text-gray-400 mt-4 flex items-center justify-center space-x-1">
                            {isLoadingHistory ? 
                                (<RotateCw className='w-3 h-3 animate-spin text-yellow-500'/>) : 
                                (<div className='w-3 h-3 rounded-full bg-green-500'></div>)}
                            <span>{isLoadingHistory ? 'Loading history...' : 'History ready.'}</span>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // --- Main Chat UI ---
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6 font-inter">
            <div className="w-full max-w-6xl bg-white rounded-xl shadow-2xl flex h-[90vh] border border-gray-100">
                
                {/* -------------------- 1. Active Users Sidebar -------------------- */}
                <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-gray-50 p-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2 pb-4 border-b border-gray-200">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span>Active Users</span>
                        <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 ml-auto">
                            {activeUsers.length}
                        </span>
                    </h2>
                    <div className="mt-4 space-y-2 overflow-y-auto flex-1">
                        {activeUsers.length > 0 ? (
                            activeUsers.map((user) => (
                                <div key={user} className={`flex items-center space-x-3 p-2 rounded-lg transition duration-150 ${user === username ? 'bg-blue-100 font-semibold' : 'hover:bg-gray-100'}`}>
                                    <div className={`w-3 h-3 rounded-full ${user === username ? 'bg-blue-500' : 'bg-green-500'} flex-shrink-0`}></div>
                                    <span className="text-sm truncate">{user}</span>
                                    {user === username && (
                                        <span className="text-xs text-blue-600 ml-auto">(You)</span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 text-center mt-8">
                                <UserPlus className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                                No other users online.
                            </div>
                        )}
                    </div>
                </aside>
                
                {/* -------------------- 2. Chat Window (Main Content) -------------------- */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-xl md:rounded-tl-none sticky top-0 z-10">
                        <div className="flex items-center space-x-3">
                            <Zap className="h-6 w-6 text-yellow-500" />
                            <h1 className="text-xl font-bold text-gray-900">Global Chat Room</h1>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
                                {isConnected ? 'Online' : 'Connecting...'}
                            </span>
                            <Wifi className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-400'}`} />
                            <div className="text-sm font-medium text-gray-700 bg-blue-100 px-3 py-1 rounded-full shadow-inner">
                                <span className="text-blue-600">You:</span> {username}
                            </div>
                        </div>
                    </header>

                    {/* Message Display Area */}
                    <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {isLoadingHistory ? (
                            <div className="flex justify-center items-center h-full">
                                <RotateCw className='w-6 h-6 animate-spin text-blue-500 mr-2'/>
                                <span className="text-lg text-gray-600">Loading chat history...</span>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <MessageBubble 
                                    key={index} 
                                    message={message} 
                                    isSelf={message.user === username} 
                                />
                            ))
                        )}
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
                                disabled={!isConnected || !isAuthenticated || isLoadingHistory}
                            />
                            <button
                                type="submit"
                                className="p-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
                                disabled={!isConnected || !inputMessage.trim() || isLoadingHistory}
                                aria-label="Send Message"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </form>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default Chat;