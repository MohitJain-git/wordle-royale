const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
// const db = require('./config/db');
const redisClient = require('./config/redisClient'); // Import Redis
const gameStore = require('./store/gameStore'); // Import the new store

// 1. Test Postgres
// db.query('SELECT NOW()', (err, res) => {
//   if (err) {
//     console.error('❌ Postgres connection error:', err.stack);
//   } else {
//     console.log('✅ Postgres connected at:', res.rows[0].now);
//   }
// });

// 2. Test Redis (Write and Read a test value)
(async () => {
    try {
        await redisClient.set('test_key', 'Hello from Redis!');
        const value = await redisClient.get('test_key');
        console.log('✅ Redis Read/Write Test:', value);
    } catch (e) {
        console.error('❌ Redis Test Failed:', e);
    }
})();

const app = express();
const server = http.createServer(app);

// Allow frontend to connect
const io = new Server(server, {
    cors: { origin: "http://localhost:5173" } // Vite default port
});

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // --- EVENT: CREATE GAME ---
    socket.on('create_game', async ({ username, mode }) => {
        try {
            const roomId = await gameStore.createRoom(socket.id, username, mode);
            
            socket.join(roomId);
            
            // 👇 FIX: Fetch full room data immediately so Host sees themselves
            const roomData = await gameStore.getRoom(roomId);
            
            // Use 'joined_success' because App.jsx already listens for this 
            // and will update the full gameState (players, host, etc.)
            socket.emit('joined_success', roomData); 
            
            console.log(`Game created: ${roomId} by ${username}`);
        } catch (e) {
            console.error(e);
        }
    });

    // --- EVENT: JOIN GAME ---
    socket.on('join_game', async ({ roomId, username }) => {
        try {
            const result = await gameStore.joinRoom(roomId, socket.id, username);
            
            if (result.error) {
                socket.emit('error_message', { message: result.error });
                return;
            }

            socket.join(roomId);

            // 1. Tell the user they joined successfully
            socket.emit('joined_success', result.room);

            // 2. Tell EVERYONE else in the room "A new player appeared!"
            io.to(roomId).emit('player_joined', result.room.players);
            
            console.log(`${username} joined room ${roomId}`);
        } catch (e) {
            console.error(e);
        }
    });

    // --- EVENT: START GAME (Host Only) ---
    socket.on('start_game_request', async ({ roomId, guessingTimer }) => {
        const result = await gameStore.startGame(roomId, guessingTimer);
        if (result.error) {
            socket.emit('error_message', { message: result.error });
            return;
        }
        // Broadcast to everyone: "Switch screens to Word Selection!"
        io.to(roomId).emit('game_state_update', result.room);
    });

    // --- EVENT: SUBMIT SECRET WORD ---
    socket.on('submit_secret_word', async ({ roomId, word }) => {
        const result = await gameStore.setPlayerSecret(roomId, socket.id, word);
        
        if (result.error) {
            socket.emit('error_message', { message: result.error });
            return;
        }

        // 1. Tell the user "Word Accepted"
        socket.emit('word_accepted', { word });

        // 2. Tell everyone "Player X is Ready" (Do not reveal the word!)
        const maskedRoom = { ...result.room };
        maskedRoom.players = maskedRoom.players.map(p => ({
            ...p,
            secretWord: p.secretWord ? "*****" : null 
        }));

        io.to(roomId).emit('game_state_update', maskedRoom);

        // 3. IF GAME STARTED (All ready)
        if (result.allReady) {
            console.log(`🚀 All players ready in ${roomId}. Starting Game!`);
            
            // Note: The Store has already set status to "PLAYING", so we just broadcast it.
            io.to(roomId).emit('game_started', result.room);
            
            // Start the Heartbeat
            // (Our optimized startGameLoop handles existing timers safely now)
            gameStore.startGameLoop(roomId, io); 
        }
    });

    // --- EVENT: SUBMIT GUESS ---
    socket.on('submit_guess', async ({ roomId, guess }) => {
        // console.log(`Processing guess: ${guess} for room ${roomId}`); // Uncomment to debug

        const result = await gameStore.processGuess(roomId, socket.id, guess);
        
        if (result.error) {
            socket.emit('error_message', { message: result.error });
            return;
        }

        // 1. Update Game State (Target swaps, hasGuessed flags, etc.)
        io.to(roomId).emit('game_state_update', result.room);

        // 2. Update Global Feed
        io.to(roomId).emit('feed_update', {
            username: result.room.players.find(p => p.id === socket.id).username,
            result: `${result.score.bulls}B ${result.score.bears}C`,
            type: result.event,
            guess: guess
        });

        // 3. Handle Eliminations
        if (result.event === "ELIMINATION") {
             io.to(roomId).emit('elimination_alert', result.eliminationData);
        }
    });

    // --- EVENT: RESET / PLAY AGAIN ---
    socket.on('reset_game', async ({ roomId }) => {
        console.log(`♻️ Resetting Game for Room: ${roomId}`); // Add this log to debug
        const result = await gameStore.resetGame(roomId);
        
        if (result.error) {
            socket.emit('error_message', { message: result.error });
            return;
        }

        // This triggers the frontend to switch back to the "Start Game" button
        io.to(roomId).emit('game_state_update', result.room);
    });

    socket.on('disconnect', async () => {
        console.log("User Disconnected", socket.id);
        const updatedRoom = await gameStore.removePlayer(socket.id);
        if (updatedRoom) {
            // Notify remaining players in the room
            io.to(updatedRoom.roomId).emit('game_state_update', updatedRoom);
        }
    });
});

server.listen(3001, () => {
    console.log('SERVER RUNNING ON PORT 3001');
});