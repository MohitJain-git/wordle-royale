import { useState, useEffect } from 'react';
import { socket } from '../socket';
import HowToPlay from './HowToPlay';

export default function WordSelection({ gameState, myUsername, error }) {
    const [secretWord, setSecretWord] = useState("");
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [guessingTimer, setGuessingTimer] = useState(gameState.guessingTimer || 30);
    const [showRules, setShowRules] = useState(false);

    // Am I the host?
    const amHost = gameState.players.find(p => p.username === myUsername)?.isHost;
    const isLobby = gameState.status === "LOBBY";

    // --- NEW: LISTEN FOR SUCCESS ---
    useEffect(() => {
        // Only lock the screen if the server says "Yes, that word is valid"
        const handleSuccess = () => {
            setIsConfirmed(true);
        };

        socket.on('word_accepted', handleSuccess);

        // Cleanup listener when component closes
        return () => {
            socket.off('word_accepted', handleSuccess);
        };
    }, []);

    // Reset local state when returning to lobby
    useEffect(() => {
        if (gameState.status === "LOBBY") {
            setSecretWord("");
            setIsConfirmed(false);
        }
    }, [gameState.status]);

    const handleStart = () => {
        socket.emit('start_game_request', { roomId: gameState.roomId, guessingTimer });
    };

    const handleSubmitWord = () => {
        // 1. Basic Client Check
        if (secretWord.length !== 4) return; 
        
        // 2. Send to Server
        socket.emit('submit_secret_word', { roomId: gameState.roomId, word: secretWord });
        
        // 3. DO NOT set isConfirmed(true) here! 
        // We wait for the useEffect above to trigger.
    };

    // --- RENDER 1: WAITING LOBBY ---
    if (isLobby) {
        return (
            <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 w-full max-w-md text-center">
                {/* 1. RENDER RULES MODAL IF OPEN */}
                {showRules && <HowToPlay onClose={() => setShowRules(false)} />}

                {/* 2. ADD HELP BUTTON (Top Right Corner) */}
                <button 
                    onClick={() => setShowRules(true)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
                    title="How to Play"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                </button>
                <h2 className="text-2xl text-green-400 mb-2 font-mono">CODE: {gameState.roomId}</h2>
                <p className="text-slate-400 mb-6">Waiting for players...</p>
                
                <div className="space-y-2 mb-6 text-left">
                    {gameState.players.map((p, idx) => (
                        <div key={idx} className="p-3 bg-slate-700 rounded flex justify-between text-white">
                            <span>{p.username}</span>
                            {p.isHost && <span className="text-yellow-400 text-xs font-bold border border-yellow-400 px-1 rounded h-fit">HOST</span>}
                        </div>
                    ))}
                </div>

                {amHost && (
                    <div className="mb-6">
                        <label className="block text-slate-400 text-sm mb-2">Guessing Time</label>
                        <select
                            value={guessingTimer}
                            onChange={(e) => setGuessingTimer(parseInt(e.target.value))}
                            className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                        >
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                            <option value={45}>45 seconds</option>
                            <option value={60}>60 seconds</option>
                            <option value={90}>90 seconds</option>
                        </select>
                    </div>
                )}

                {amHost ? (
                   <button onClick={handleStart} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded transition">
                     START GAME
                   </button>
                ) : (
                   <p className="animate-pulse text-sm text-slate-500">Waiting for host to start...</p>
                )}
            </div>
        );
    }

    // --- RENDER 2: SECRET WORD INPUT ---
    return (
        <div className="flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-6 text-white">Choose Secret Word</h2>
            {error && (
            <div className="bg-red-500 text-white px-6 py-2 rounded font-bold mb-6 animate-bounce shadow-lg">
                ⚠️ {error}
            </div>
            )}
            
            {!isConfirmed ? (
                <div className="flex gap-2">
                    <input 
                      maxLength={4}
                      className="p-4 text-black text-2xl uppercase font-bold w-40 text-center rounded outline-none focus:ring-4 focus:ring-green-500"
                      value={secretWord}
                      onChange={e => setSecretWord(e.target.value.toUpperCase())}
                      placeholder="????"
                    />
                    <button 
                        onClick={handleSubmitWord} 
                        className="bg-green-600 px-6 rounded font-bold text-white hover:bg-green-500 transition active:scale-95"
                    >
                        LOCK IN
                    </button>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-xl text-green-400 mb-4 font-bold">Locked: {secretWord}</p>
                    <p className="text-slate-400 animate-pulse">Waiting for others...</p>
                </div>
            )}

            {/* PLAYER STATUS LIST */}
            <div className="mt-10">
                <h3 className="text-xl mb-4 text-slate-400 text-center">Status</h3>
                <div className="flex gap-4">
                    {gameState.players.map(p => (
                        <div key={p.username} className={`p-3 rounded border text-white ${p.isReady ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'}`}>
                            {p.username} {p.isReady ? "✓" : "..."}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}