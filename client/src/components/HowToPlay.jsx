export default function HowToPlay({ onClose }) {
    return (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-900/50 sticky top-0 backdrop-blur-sm z-10 flex justify-between items-center">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
                        MISSION BRIEFING
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white text-2xl font-bold px-3 py-1 rounded hover:bg-slate-700 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 text-slate-200 font-sans leading-relaxed">
                    
                    {/* SECTION 1: OBJECTIVE */}
                    <section>
                        <h3 className="text-xl font-bold text-yellow-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                            <span>🎯</span> Objective
                        </h3>
                        <p className="text-slate-300">
                            This is <strong className="text-white">Wordle meets Battle Royale</strong>. 
                            You are placed in a circle of players. You hunt the player to your right, 
                            and the player to your left hunts you.
                        </p>
                        <div className="mt-2 bg-slate-900/50 p-4 rounded-lg border-l-4 border-yellow-500 text-yellow-100 font-bold text-center">
                            BE THE LAST PLAYER ALIVE TO WIN.
                        </div>
                    </section>

                    <hr className="border-slate-700" />

                    {/* SECTION 2: GAMEPLAY */}
                    <section>
                        <h3 className="text-xl font-bold text-blue-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <span>⚔️</span> How to Fight
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex gap-4">
                                <div className="bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0">1</div>
                                <div>
                                    <strong className="block text-white">Choose Your Secret</strong>
                                    <span className="text-sm text-slate-400">Pick a 4-letter word with <span className="underline decoration-red-500">no repeating letters</span> (e.g., "WORD" is ok, "BALL" is not).</span>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0">2</div>
                                <div>
                                    <strong className="block text-white">Guess & Deduction</strong>
                                    <span className="text-sm text-slate-400">Every round, guess your target's word. You get clues:</span>
                                    <div className="flex gap-4 mt-2 font-mono text-sm font-bold">
                                        <div className="bg-green-900 text-green-400 px-3 py-1 rounded border border-green-600">
                                            1 BULL (B)
                                        </div>
                                        <span className="self-center text-slate-500">= Right Letter, Right Spot</span>
                                    </div>
                                    <div className="flex gap-4 mt-2 font-mono text-sm font-bold">
                                        <div className="bg-yellow-900 text-yellow-400 px-3 py-1 rounded border border-yellow-600">
                                            1 COW (C)
                                        </div>
                                        <span className="self-center text-slate-500">= Right Letter, Wrong Spot</span>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <hr className="border-slate-700" />

                    {/* SECTION 3: ELIMINATION */}
                    <section>
                        <h3 className="text-xl font-bold text-red-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                            <span>💀</span> The Kill & Loot
                        </h3>
                        <p className="text-slate-300 mb-4">
                            If you get <strong>4 BULLS</strong> (guess the exact word), your target is <span className="text-red-500 font-bold">ELIMINATED</span>.
                        </p>
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded border border-slate-600">
                            <h4 className="font-bold text-white mb-2">🎁 The Loot Drop</h4>
                            <p className="text-sm text-slate-400">
                                When you kill a player, you inherit their target.
                                <br/>
                                <strong className="text-green-400">CRITICAL:</strong> You also steal all the clues ("Intel") they had gathered on that target!
                            </p>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-900 sticky bottom-0 z-10">
                    <button 
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg"
                    >
                        GOT IT, LET'S PLAY
                    </button>
                </div>

            </div>
        </div>
    );
}