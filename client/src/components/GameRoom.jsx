import { useState, useEffect } from 'react';
import { socket } from '../socket';

export default function GameRoom({ gameState, myUsername }) {
    const [timer, setTimer] = useState(gameState.timer);
    const [phase, setPhase] = useState(gameState.phase);
    const [guess, setGuess] = useState("");
    const [feed, setFeed] = useState([]); // Stores global game logs

    // 1. Identify "Me" and my status
    const myPlayer = gameState.players.find(p => p.username === myUsername);
    
    // 2. Logic: Can I type right now?
    // Must be Guessing phase, I must be alive, and I must NOT have guessed yet this round.
    const canGuess = phase === "GUESSING" && myPlayer?.isAlive && !myPlayer?.hasGuessed;

    // 3. Extract my history against my CURRENT target
    // The backend stores this in player.intel[targetId]
    const currentTargetId = myPlayer?.targetId;
    const myHistory = (myPlayer?.intel && myPlayer.intel[currentTargetId]) || [];

    useEffect(() => {
        // --- SOCKET LISTENERS ---

        // A. Timer & Phase Sync
        const onTick = (data) => {
            setTimer(data.timer);
            setPhase(data.phase);
            // Note: Player state updates (unlocking inputs) are handled 
            // by the parent App.jsx via 'game_state_update' or 'timer_update'
        };

        // B. Global Feed (Who guessed what)
        const onFeed = (data) => {
            setFeed(prev => [data, ...prev].slice(0, 8)); // Keep last 8 events
        };

        // C. Elimination Alert (Pop-up)
        const onElimination = (data) => {
             // Set the message
             setNotification({
                 title: "💀 ELIMINATION CONFIRMED",
                 message: `${data.victimName} was eliminated! In ${data.stolenCluesCount} guesses.`,
                 type: "kill"
             });

             // Auto-hide after 5 seconds
             setTimeout(() => setNotification(null), 5000);
        };

        socket.on('timer_update', onTick);
        socket.on('feed_update', onFeed);
        socket.on('elimination_alert', onElimination);

        return () => {
            socket.off('timer_update', onTick);
            socket.off('feed_update', onFeed);
            socket.off('elimination_alert', onElimination);
        };
    }, []);

    const handleGuess = () => {
        if (!canGuess || guess.length !== 4) return;
        
        socket.emit('submit_guess', { roomId: gameState.roomId, guess });
        setGuess(""); 
    };

    if (!myPlayer) return <div className="text-white">Loading Player Data...</div>;

    return (
        <div className="flex flex-col items-center w-full max-w-6xl text-white font-mono p-4">
            
            {/* --- HEADER: HUD --- */}
            <div className="flex justify-between w-full mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                <div>
                    <span className="text-slate-400 text-xs block tracking-widest">ROUND</span>
                    <span className="text-3xl font-bold text-white">{gameState.round || 1}</span>
                </div>
                
                <div className={`text-center px-8 py-2 rounded-lg transition-colors duration-500
                    ${phase === 'GUESSING' ? 'bg-blue-600/20 border border-blue-500' : 'bg-orange-600/20 border border-orange-500'}`}>
                    <span className={`block text-[10px] tracking-[0.2em] font-bold mb-1
                        ${phase === 'GUESSING' ? 'text-blue-400' : 'text-orange-400'}`}>
                        {phase}
                    </span>
                    <span className="text-4xl font-bold tabular-nums">{timer}</span>
                </div>

                <div className="text-right">
                    <span className="text-slate-400 text-xs block tracking-widest">ALIVE</span>
                    <span className="text-3xl font-bold text-green-400">{gameState.players.filter(p => p.isAlive).length}</span>
                </div>
            </div>

            {/* --- MAIN GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full h-[600px]">
                
                {/* 1. LEFT PANEL: MY INTEL (History) */}
                <div className="md:col-span-3 bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col shadow-inner">
                    <h3 className="text-slate-400 uppercase text-[10px] tracking-widest mb-4 border-b border-slate-700 pb-2">
                        My Data vs Target
                    </h3>
                    
                    <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2 pr-1">
                        {myHistory.length === 0 && (
                            <div className="h-full flex items-center justify-center text-slate-600 text-xs text-center">
                                No guesses yet.<br/>Start hunting!
                            </div>
                        )}
                        
                        {/* Show newest guesses at the top */}
                        {[...myHistory].reverse().map((entry, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700 animate-in fade-in slide-in-from-left-4">
                                <span className="text-lg font-bold tracking-widest text-slate-200">{entry.word}</span>
                                <div className="flex gap-3 text-sm font-bold">
                                    <span className="text-green-400">{entry.bulls} B</span>
                                    <span className="text-yellow-400">{entry.bears} C</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. CENTER PANEL: ACTION AREA */}
                <div className="md:col-span-6 flex flex-col items-center justify-center bg-slate-800/40 rounded-xl border border-slate-700 p-8 relative overflow-hidden">
                    
                    {/* Elimination Overlay */}
                    {!myPlayer.isAlive && (
                         <div className="absolute inset-0 bg-red-950/90 z-50 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm animate-in zoom-in">
                             <h2 className="text-6xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,1)] tracking-tighter">WASTED</h2>
                             <p className="text-red-300 mt-2 font-bold tracking-widest">YOU HAVE BEEN ELIMINATED</p>
                         </div>
                    )}
                    
                    <h3 className="text-slate-400 uppercase text-[10px] tracking-widest mb-2">Current Target</h3>
                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-10 drop-shadow-sm">
                        {myPlayer.targetName}
                    </div>
                    
                    {/* Input Box */}
                    <input 
                        disabled={!canGuess}
                        maxLength={4}
                        value={guess}
                        onChange={e => setGuess(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && handleGuess()}
                        className={`w-64 p-5 text-center text-4xl font-bold rounded-xl outline-none transition-all duration-300 mb-6 tracking-[0.2em]
                            ${!canGuess 
                                ? 'bg-slate-900/50 text-slate-600 border-2 border-slate-800 cursor-not-allowed' 
                                : 'bg-slate-800 text-white border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] focus:scale-105'
                            }`}
                        placeholder={
                            !myPlayer.isAlive ? "DEAD" :
                            phase === "COOLDOWN" ? "WAIT" :
                            myPlayer.hasGuessed ? "DONE" : 
                            "????"
                        }
                    />
                    
                    {/* Status Text / Button */}
                    <button 
                        onClick={handleGuess}
                        disabled={!canGuess}
                        className={`w-64 py-4 font-bold rounded-xl transition-all transform tracking-wider
                            ${!canGuess 
                                ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-lg'
                            }`}
                    >
                        {phase === "COOLDOWN" ? "NEXT ROUND SOON" :
                         myPlayer.hasGuessed ? "WAITING FOR OTHERS" :
                         "FIRE MISSILE"}
                    </button>
                </div>

                {/* 3. RIGHT PANEL: GLOBAL FEED */}
                <div className="md:col-span-3 bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col">
                    <h3 className="text-slate-400 uppercase text-[10px] tracking-widest mb-4 border-b border-slate-700 pb-2">
                        Global Feed
                    </h3>
                    <div className="flex-1 space-y-3 overflow-hidden">
                        {feed.map((log, idx) => (
                            <div key={idx} className="text-xs border-l-2 border-slate-600 pl-3 py-1 animate-in slide-in-from-right-2">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-blue-300">{log.username}</span>
                                    <span className="font-mono text-slate-500">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <div className="text-slate-300">
                                    {log.type === "ELIMINATION" ? (
                                        <span className="text-red-400 font-bold bg-red-900/30 px-2 py-0.5 rounded">
                                            💀 ELIMINATED TARGET
                                        </span>
                                    ) : (
                                        <>
                                            <span>guessed </span>
                                            <span className="font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded text-white border border-slate-700">
                                                {log.guess}
                                            </span>
                                            <span> got </span>
                                            <span className="font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded text-white border border-slate-700">
                                                {log.result}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {feed.length === 0 && <p className="text-slate-600 text-xs italic">Waiting for activity...</p>}
                    </div>
                </div>

            </div>

            {/* 4. GAME OVER OVERLAY */}
            {/* 4. DETAILED GAME OVER BOARD */}
            {gameState.status === "GAME_OVER" && (
                <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-y-auto p-4">
                    
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-600 mb-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                        GAME OVER
                    </h1>
                    
                    <div className="text-2xl text-white font-bold mb-8">
                        Winner: <span className="text-green-400 text-3xl">{gameState.winner}</span>
                    </div>

                    {/* MATCH REPORT CARD */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-4xl overflow-hidden">
                        <div className="grid grid-cols-5 bg-slate-900/50 p-4 text-slate-400 font-bold text-xs uppercase tracking-widest border-b border-slate-700">
                            <div className="col-span-1">Player</div>
                            <div className="col-span-1 text-center">Secret Word</div>
                            <div className="col-span-2 text-center">Status</div>
                        </div>

                        <div className="divide-y divide-slate-700/50">
                            {gameState.players
                                .sort((a, b) => {
                                    // Sort Logic: Winner first, then by death round (later is better)
                                    if (a.username === gameState.winner) return -1;
                                    if (b.username === gameState.winner) return 1;
                                    return b.deathRound - a.deathRound;
                                })
                                .map((p) => {
                                    // Calculate total guesses made by this player
                                    // We sum up all arrays in their 'intel' object
                                    const totalGuesses = p.intel 
                                        ? Object.values(p.intel).reduce((acc, curr) => acc + curr.length, 0) 
                                        : 0;

                                    return (
                                        <div key={p.username} className={`grid grid-cols-5 p-4 items-center ${p.username === gameState.winner ? 'bg-green-900/10' : ''}`}>
                                            {/* NAME */}
                                            <div className="col-span-1 font-bold text-white flex items-center gap-2">
                                                {p.username === gameState.winner && <span>👑</span>}
                                                {p.username}
                                            </div>

                                            {/* SECRET WORD (REVEALED) */}
                                            <div className="col-span-1 text-center">
                                                <span className="bg-slate-900 px-3 py-1 rounded border border-slate-700 text-blue-300 font-mono font-bold tracking-widest">
                                                    {p.secretWord || "????افر"}
                                                </span>
                                            </div>

                                            {/* STATUS */}
                                            <div className="col-span-2 text-center text-sm">
                                                {p.username === gameState.winner ? (
                                                    <span className="text-green-400 font-bold bg-green-900/30 px-2 py-1 rounded">SURVIVOR</span>
                                                ) : (
                                                    <span className="text-red-400">
                                                        Eliminated by <strong className="text-red-300">{p.killedBy || "Unknown"}</strong>
                                                        <span className="text-slate-500 text-xs ml-2">(Round {p.deathRound})</span>
                                                    </span>
                                                )}
                                            </div>

                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="mt-8 w-full max-w-md">
                        {gameState.players.find(p => p.username === myUsername)?.isHost ? (
                            <button 
                                onClick={() => socket.emit('reset_game', { roomId: gameState.roomId })}
                                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-4 rounded-xl text-xl shadow-[0_0_30px_rgba(22,163,74,0.4)] transition-all active:scale-95"
                            >
                                START NEW GAME ↻
                            </button>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                                </div>
                                <p className="text-slate-400 text-sm">Waiting for host to restart...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}