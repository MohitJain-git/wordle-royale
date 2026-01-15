import { useState } from 'react';
import { socket } from '../socket';
import HowToPlay from './HowToPlay'; // <--- 1. Import the Modal

export default function Lobby({ error, setMyUsername }) { 
    const [username, setUsername] = useState("");
    const [roomId, setRoomId] = useState("");
    const [showRules, setShowRules] = useState(false);

    const handleCreate = () => {
        if (!username) return alert("Enter a username!");
        
        // FIX: Set the global username before creating
        setMyUsername(username); 
        socket.emit('create_game', { username });
    };

    const handleJoin = () => {
        if (!username || !roomId) return alert("Enter username and room ID!");
        
        // FIX: Set the global username before joining
        setMyUsername(username); 
        socket.emit('join_game', { username, roomId });
    };

    return (
        <div className="w-full max-w-md p-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 relative">
            
            {/* 3. Render Modal if State is True */}
            {showRules && <HowToPlay onClose={() => setShowRules(false)} />}

            {/* 4. Help Button (Top Right) */}
            <button 
                onClick={() => setShowRules(true)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                title="How to Play"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
            </button>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome, Agent.</h2>
                <p className="text-slate-400 text-sm">Enter your credentials to begin.</p>
                
                {/* Optional: Text Link if icon is too subtle */}
                <button 
                    onClick={() => setShowRules(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline mt-2"
                >
                    Read Mission Briefing (Rules)
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Codename</label>
                    <input 
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600 font-bold"
                        placeholder="Enter Username" 
                        value={username}
                        onChange={e => setUsername(e.target.value.toUpperCase())}
                        maxLength={12}
                    />
                </div>

                <div className="pt-4 border-t border-slate-700">
                    <button 
                        onClick={handleCreate}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-lg shadow-lg transform transition active:scale-95"
                    >
                        CREATE NEW LOBBY
                    </button>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-600"></div>
                    <span className="flex-shrink mx-4 text-slate-500 text-xs">OR JOIN EXISTING</span>
                    <div className="flex-grow border-t border-slate-600"></div>
                </div>

                <div className="flex gap-2">
                    <input 
                        className="flex-1 p-3 bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-green-500 transition-colors font-mono tracking-widest text-center uppercase"
                        placeholder="ROOM ID" 
                        value={roomId}
                        onChange={e => setRoomId(e.target.value)}
                    />
                    <button 
                        onClick={handleJoin}
                        className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition"
                    >
                        JOIN
                    </button>
                </div>
            </div>
        </div>
    );
}