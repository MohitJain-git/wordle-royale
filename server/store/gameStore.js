const redisClient = require('../config/redisClient');
const wordValidator = require('../utils/wordValidator');

// Helper: Generate a random 4-letter room code
const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

class GameStore {
    
    // 1. Create a new Room
    async createRoom(hostId, username, gameMode) {
        const roomId = generateRoomId();
        
        const initialState = {
            roomId,
            status: "LOBBY",
            gameMode, // 'DUEL' or 'ELIMINATION'
            players: [{
                id: hostId,
                username,
                isHost: true,
                isAlive: true,
                score: 0
            }],
            guessingTimer: 30, // Default guessing time in seconds
            createdAt: Date.now()
        };

        // Save to Redis (Expire after 24 hours to clean up junk)
        // usage: 'room:ABCD'
        await redisClient.set(`room:${roomId}`, JSON.stringify(initialState), {
            EX: 86400 
        });

        return roomId;
    }

    // 2. Join an existing Room
    async joinRoom(roomId, playerId, username) {
        const roomKey = `room:${roomId}`;
        
        // Fetch current state
        const roomData = await redisClient.get(roomKey);
        if (!roomData) return { error: "Room not found" };

        let room = JSON.parse(roomData);

        // Validation: Is game already running?
        if (room.status !== "LOBBY") return { error: "Game already in progress" };

        // Check if player already exists
        const existingPlayer = room.players.find(p => p.username === username);
        if (existingPlayer) return { error: "Username taken" };

        // Add the new player
        const newPlayer = { id: playerId, username, isHost: false, isAlive: true, score: 0 };
        room.players.push(newPlayer);

        // Save updated state back to Redis
        await redisClient.set(roomKey, JSON.stringify(room));

        return { room };
    }

    // 3. Get Room Details (For checking state)
    async getRoom(roomId) {
        const data = await redisClient.get(`room:${roomId}`);
        return data ? JSON.parse(data) : null;
    }

    // 3.5. Remove a player (on disconnect)
    async removePlayer(playerId) {
        // Find the room containing this player
        const keys = await redisClient.keys('room:*');
        for (const key of keys) {
            const roomStr = await redisClient.get(key);
            if (!roomStr) continue;
            let room = JSON.parse(roomStr);
            const playerIndex = room.players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                // Only allow leaving if game hasn't started playing
                if (room.status !== "LOBBY" && room.status !== "SELECTING_WORD") {
                    return null; // Don't remove during active game
                }
                // Remove the player
                room.players.splice(playerIndex, 1);
                // If no players left, delete the room
                if (room.players.length === 0) {
                    await redisClient.del(key);
                    return null; // Room deleted
                }
                // If only one player left in SELECTING_WORD, reset to LOBBY
                if (room.status === "SELECTING_WORD" && room.players.length === 1) {
                    room.status = "LOBBY";
                    room.players[0].isHost = true;
                    room.players[0].secretWord = null;
                    room.players[0].isReady = false;
                }
                // If host left, assign new host
                if (!room.players.some(p => p.isHost)) {
                    room.players[0].isHost = true;
                }
                // Save updated room
                await redisClient.set(key, JSON.stringify(room));
                return room;
            }
        }
        return null; // Player not found in any room
    }

    // 4. Host starts the game -> Moves to "Selecting Word" phase
    async startGame(roomId, guessingTimer) {
        const roomKey = `room:${roomId}`;
        const roomStr = await redisClient.get(roomKey);
        if (!roomStr) return { error: "Room closed" };
        
        let room = JSON.parse(roomStr);

        if (room.players.length < 2) return { error: "Need at least 2 players!" };

        // Set the timer
        room.guessingTimer = guessingTimer;

        // Change status
        room.status = "SELECTING_WORD"; 
        
        // Save
        await redisClient.set(roomKey, JSON.stringify(room));
        return { room };
    }

    // 5. Player submits their Secret Word
    async setPlayerSecret(roomId, playerId, word) {
        const roomKey = `room:${roomId}`;
        const roomStr = await redisClient.get(roomKey);
        if (!roomStr) return { error: "Room closed" };

        let room = JSON.parse(roomStr);
        word = word.toUpperCase();

        // 1. Validate Word
        if (!wordValidator.isValid(word)) {
            return { error: "Invalid word! Must be 4 unique letters." };
        }

        // 2. Find player and set word
        const player = room.players.find(p => p.id === playerId);
        if (!player) return { error: "Player not found" };

        player.secretWord = word;
        player.isReady = true; // Mark as ready

        // 3. Check if EVERYONE is ready
        const allReady = room.players.every(p => p.isReady);
        
        if (allReady) {
            this.assignTargets(room); // LINK THE PLAYERS!
            room.status = "PLAYING";
            room.phase = "GUESSING";
            room.round = 1;
            room.timer = room.guessingTimer; // Use the configured timer
        }

        await redisClient.set(roomKey, JSON.stringify(room));
        return { room, allReady };
    }

    // 6. The "Circular Linked List" Logic
    assignTargets(room) {
        const players = room.players;
        // Shuffle randomly so you don't always target the person who joined after you
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }

        // A -> B -> C -> A
        for (let i = 0; i < players.length; i++) {
            const current = players[i];
            const next = players[(i + 1) % players.length]; // Wrap around to 0 at end
            
            current.targetId = next.id;
            current.targetName = next.username; // Useful for UI
        }
    }

    // 7. THE HEARTBEAT (Optimized: Memory-First to save Quota)
    async startGameLoop(roomId, io) {
        // 1. Force Kill existing timer to prevent double-speed bugs
        if (!this.intervals) this.intervals = {};
        if (this.intervals[roomId]) {
            clearInterval(this.intervals[roomId]);
            delete this.intervals[roomId];
        }

        console.log(`⏰ STARTING Game Loop for ${roomId}`);

        // 2. Load initial state ONCE
        const roomKey = `room:${roomId}`;
        let roomStr = await redisClient.get(roomKey);
        if (!roomStr) return; 
        
        let localRoomState = JSON.parse(roomStr);

        this.intervals[roomId] = setInterval(async () => {
            // --- IN-MEMORY COUNTDOWN ---
            // We modify the local variable, NOT the database (Saves 30 writes/min)
            if (localRoomState.timer > 0) {
                localRoomState.timer--;
                
                // Broadcast time only
                io.to(roomId).emit('timer_update', { 
                    timer: localRoomState.timer, 
                    phase: localRoomState.phase, 
                    round: localRoomState.round 
                });
            } else {
                // --- PHASE CHANGE ---
                // Timer hit 0. Now we MUST touch Redis to sync and switch phases.
                
                // 1. Fetch Latest Data (To catch any eliminations/wins from the last second)
                const freshRoomStr = await redisClient.get(roomKey);
                if (!freshRoomStr) {
                    clearInterval(this.intervals[roomId]);
                    return;
                }
                
                let freshRoom = JSON.parse(freshRoomStr);
                
                // Stop if game is done
                if (freshRoom.status === "GAME_OVER") {
                    clearInterval(this.intervals[roomId]);
                    return;
                }

                // 2. Switch Phases
                if (freshRoom.phase === "GUESSING") {
                    // GUESSING -> COOLDOWN (5s Buffer to read logs)
                    freshRoom.phase = "COOLDOWN";
                    freshRoom.timer = 5; 
                } else {
                    // COOLDOWN -> GUESSING (New Round)
                    freshRoom.phase = "GUESSING";
                    freshRoom.timer = freshRoom.guessingTimer;
                    freshRoom.round++;
                    
                    // 🔥 CRITICAL FIX: Unlock all players for the new round
                    freshRoom.players.forEach(p => p.hasGuessed = false);
                }

                // 3. Save to Redis
                await redisClient.set(roomKey, JSON.stringify(freshRoom));
                
                // 4. Update local cache so the loop knows the new timer
                localRoomState = freshRoom;

                // 5. Broadcast State (Including players, to unlock their inputs on frontend)
                io.to(roomId).emit('timer_update', { 
                    timer: freshRoom.timer, 
                    phase: freshRoom.phase, 
                    round: freshRoom.round,
                    players: freshRoom.players 
                });
            }
        }, 1000); 
    }

    // HELPER: Calculate Bulls (Green) and Bears (Yellow)
    calculateScore(secret, guess) {
        let bulls = 0;
        let bears = 0;
        
        // Convert to arrays for easier comparison
        const sChars = secret.split('');
        const gChars = guess.split('');

        // 1. Count Bulls (Correct Letter, Correct Position)
        for (let i = 0; i < 4; i++) {
            if (sChars[i] === gChars[i]) {
                bulls++;
                sChars[i] = null; // Mark as used so it doesn't count for Bear
                gChars[i] = null;
            }
        }

        // 2. Count Bears (Correct Letter, Wrong Position)
        for (let i = 0; i < 4; i++) {
            if (gChars[i] && sChars.includes(gChars[i])) {
                bears++;
                // Remove ONE instance of this letter from secret to prevent double counting
                sChars[sChars.indexOf(gChars[i])] = null; 
            }
        }

        return { bulls, bears };
    }
    // 8. PROCESS A GUESS (Handles Scoring, Elimination & Early Timer Kill)
    async processGuess(roomId, playerId, guessWord) {
        const roomKey = `room:${roomId}`;
        const roomStr = await redisClient.get(roomKey);
        if (!roomStr) return { error: "Room closed" };

        let room = JSON.parse(roomStr);
        const player = room.players.find(p => p.id === playerId);
        
        // --- VALIDATION ---
        if (!player || !player.isAlive) return { error: "You are eliminated." };
        if (room.phase !== "GUESSING") return { error: "Wait for next round!" };
        if (player.hasGuessed) return { error: "You already guessed this round!" };
        if (!wordValidator.isValid(guessWord)) return { error: "Not a valid English word." };

        // --- SCORING ---
        const targetId = player.targetId;
        const target = room.players.find(p => p.id === targetId);
        const score = this.calculateScore(target.secretWord, guessWord);
        
        // 1. Record Intel
        if (!player.intel) player.intel = {};
        if (!player.intel[targetId]) player.intel[targetId] = [];
        
        const guessRecord = { 
            word: guessWord, 
            bulls: score.bulls, 
            bears: score.bears,
            round: room.round,
            timestamp: Date.now()
        };
        player.intel[targetId].push(guessRecord);

        // 2. Lock Player for this round
        player.hasGuessed = true;

        // 3. Handle Elimination (4 Bulls)
        let event = "GUESS"; 
        let eliminationData = null;

        if (score.bulls === 4) {
            event = "ELIMINATION";
            target.isAlive = false;

            target.killedBy = player.username; 
            target.deathRound = room.round;
            
            // a. Update Target Links (Attacker now targets Victim's target)
            const nextTargetId = target.targetId;
            player.targetId = nextTargetId;
            player.targetName = target.targetName;
            
            // b. Loot Drop (Steal Victim's Intel on their target)
            const victimIntel = target.intel && target.intel[nextTargetId] ? target.intel[nextTargetId] : [];
            if (victimIntel.length > 0) {
                 if (!player.intel[nextTargetId]) player.intel[nextTargetId] = [];
                 player.intel[nextTargetId].push(...victimIntel);
            }
            
            eliminationData = { 
                victimName: target.username, 
                nextTargetName: player.targetName, 
                stolenCluesCount: victimIntel.length 
            };
            
            // c. Win Condition (1 Survivor left)
            const survivors = room.players.filter(p => p.isAlive);
            if (survivors.length === 1) {
                room.status = "GAME_OVER";
                room.winner = player.username;
            }
        }

        // 4. CHECK EARLY ROUND END
        // If ALL alive players have guessed, set timer to 0 to skip waiting
        const allGuessed = room.players.filter(p => p.isAlive).every(p => p.hasGuessed);
        
        if (allGuessed && room.status !== "GAME_OVER") {
            // We set timer to 0. The startGameLoop will see this in the next second and switch phases.
            room.timer = 0; 
        }

        await redisClient.set(roomKey, JSON.stringify(room));

        return { room, score, event, eliminationData, guessRecord };
    }

    // 9. RESET GAME (Back to Lobby)
    async resetGame(roomId) {
        const roomKey = `room:${roomId}`;
        const roomStr = await redisClient.get(roomKey);
        if (!roomStr) return { error: "Room not found" };

        let room = JSON.parse(roomStr);

        // 1. Reset Room State
        room.status = "LOBBY"; 
        room.phase = null;
        room.winner = null;
        room.round = 0;
        room.timer = 0;

        // 2. Reset Player States
        room.players = room.players.map(p => ({
            id: p.id,
            username: p.username,
            isHost: p.isHost,
            isAlive: true,         // Resurrect everyone
            score: 0,
            secretWord: null,      // Forget secrets
            isReady: false,        // Unready
            hasGuessed: false,
            targetId: null,        // Unlink targets
            targetName: null,
            intel: {},              // Wipe clues
            killedBy: null,
            deathRound: null
        }));

        // 3. Clear any running timers
        if (this.intervals && this.intervals[roomId]) {
            clearInterval(this.intervals[roomId]);
            delete this.intervals[roomId];
        }

        // 4. Save to Redis
        await redisClient.set(roomKey, JSON.stringify(room));
        
        return { room };
    }
}

module.exports = new GameStore();