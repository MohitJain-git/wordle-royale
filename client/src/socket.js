import { io } from 'socket.io-client';

// 👇 IF we are in production (Vercel), use Render URL. ELSE use Localhost.
const URL = import.meta.env.PROD 
    ? 'https://wordle-server-66g3.onrender.com/' // 👈 PASTE YOUR RENDER URL HERE
    : 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: true
});