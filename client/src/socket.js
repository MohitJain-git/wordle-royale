import io from 'socket.io-client';

// Connect once and export this single instance
export const socket = io.connect("http://localhost:3001");