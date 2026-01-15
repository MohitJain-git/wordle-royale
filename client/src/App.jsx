import { useState, useEffect } from 'react';
import { socket } from './socket'; // Import singleton
import Lobby from './components/Lobby';
import WordSelection from './components/WordSelection';
import GameRoom from './components/GameRoom';

function App() {
  const [gameState, setGameState] = useState({ status: "LOBBY", players: [], roomId: null, timer: 0 });
  const [myUsername, setMyUsername] = useState(""); 
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Connection Debug
    socket.on('connect', () => console.log("Connected with ID:", socket.id));

    // 2. Room Entry Events
    socket.on('game_created', ({ roomId }) => {
        setGameState(prev => ({ ...prev, roomId, status: "LOBBY" }));
    });

    socket.on('joined_success', (room) => {
        setGameState(room);
    });

    // 3. Game State Sync (The "God Event")
    socket.on('game_state_update', (room) => setGameState(room));
    
    // 4. Lobby Updates
    socket.on('player_joined', (players) => {
        setGameState(prev => ({ ...prev, players }));
    });

    socket.on('game_started', (room) => setGameState(room));

    // 5. THE TIMER & ROUND SYNC (Critical Fix)
    // This updates the clock AND unlocks players when a new round starts
    socket.on('timer_update', (data) => {
        setGameState(prev => ({
            ...prev,
            timer: data.timer,
            phase: data.phase,
            round: data.round,
            // Only update players if the server sent them (e.g., on New Round reset)
            players: data.players || prev.players 
        }));
    });

    // 6. Error Handling
    socket.on('error_message', ({ message }) => {
        setError(message);
        setTimeout(() => setError(""), 3000);
    });

    // Cleanup listeners on unmount
    return () => {
        socket.off('connect');
        socket.off('game_created');
        socket.off('joined_success');
        socket.off('game_state_update');
        socket.off('player_joined');
        socket.off('game_started');
        socket.off('timer_update');
        socket.off('error_message');
    };
  }, []);

  // --- TRAFFIC COP LOGIC ---
  // Decides which screen to show based on Room ID and Game Status
  const isInRoom = !!gameState.roomId;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-inter text-slate-200">
        
        {/* Title Header */}
        <h1 className="text-4xl md:text-6xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 tracking-tighter drop-shadow-sm">
            WORDLE ROYALE
        </h1>
        
        {/* Global Error Toast */}
        {error && (
            <div className="fixed top-5 z-50 bg-red-600 text-white px-6 py-3 rounded-lg font-bold shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-bounce">
                ⚠️ {error}
            </div>
        )}
        
        {!isInRoom ? (
            // VIEW 1: LOGIN / CREATE
            // We capture the username here to pass it down to GameRoom later
            <Lobby 
                setMyUsername={setMyUsername} 
                error={error} 
            />
        ) : (
           // VIEW 2: INSIDE ROOM
           <>
              {gameState.status === "PLAYING" || gameState.status === "GAME_OVER" ? (
                // 👇 Keep GameRoom mounted if Playing OR Game Over
                <GameRoom gameState={gameState} myUsername={myUsername} />
            ) : (
                // 👇 Only show this for LOBBY or SELECTING phases
                <WordSelection 
                    gameState={gameState} 
                    myUsername={myUsername} 
                    error={error} 
                />
            )}
           </>
        )}
    </div>
  );
}

export default App;