import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
console.log('Attempting to connect to socket URL:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Add socket event listeners for debugging
socket.on("connect", () => {
    console.log("Socket connected successfully");
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
    console.log("Connection details:", {
        url: SOCKET_URL,
        path: socket.io.opts.path,
        transport: socket.io.engine.transport.name
    });
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
});

export const connectSocket = () => {
    console.log("connectSocket called, current state:", socket.connected);
    if (!socket.connected) {
        socket.connect();
        console.log("Socket connect called");
    }
};

export const disconnectSocket = () => {
    console.log("disconnectSocket called, current state:", socket.connected);
    if (socket.connected) {
        socket.disconnect();
        console.log("Socket disconnect called");
    }
}; 