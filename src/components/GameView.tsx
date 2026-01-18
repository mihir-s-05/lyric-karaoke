import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useGameEngine } from '../hooks/useGameEngine';
import { LyricDisplay } from './LyricDisplay';
import { TypingInput } from './TypingInput';
import { ScoreBoard } from './ScoreBoard';
import { ProgressBar } from './ProgressBar';
import { GameResults } from './GameResults';

interface GameViewProps {
    onBackToSearch: () => void;
}

export function GameView({ onBackToSearch }: GameViewProps) {
    const { status, currentSong, lyrics, audioUrl, resetGame, lyricsOffset, setLyricsOffset, typingMode, setTypingMode, showAutoSubmitNotification, setShowAutoSubmitNotification } = useGameStore();
    const { audio, handleTyping, handleInputKey, handleSubmitLine, startPlaying, pauseGame, resumeGame } = useGameEngine();
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const countdownStartRef = useRef<number | null>(null);

    // Countdown logic
    useEffect(() => {
        if (status !== 'countdown') {
            countdownStartRef.current = null;
            return;
        }

        countdownStartRef.current = Date.now();
        const interval = setInterval(() => {
            const start = countdownStartRef.current ?? Date.now();
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, 3 - Math.floor(elapsed / 1000));
            setCountdown(remaining <= 0 ? null : remaining);
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [status]);

    // Auto-hide auto-submit notification
    useEffect(() => {
        if (showAutoSubmitNotification) {
            const timer = setTimeout(() => {
                setShowAutoSubmitNotification(false);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [showAutoSubmitNotification, setShowAutoSubmitNotification]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (status === 'playing') {
                    pauseGame();
                } else if (status === 'paused') {
                    resumeGame();
                }
            }
            if (e.key === ' ' && status === 'paused') {
                e.preventDefault();
                resumeGame();
            }
        };
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [status, pauseGame, resumeGame]);

    const handlePlayAgain = () => {
        useGameStore.setState({
            status: 'idle', currentLineIndex: -1, typedText: '', score: 0, combo: 0,
            maxCombo: 0, lineResults: [], startTime: null, currentTime: 0
        });
    };

    const handleBackToSearch = () => {
        audio.unload();
        resetGame();
        onBackToSearch();
    };

    if (!currentSong || !lyrics) return null;

    if (status === 'finished') {
        return (
            <GameResults durationMs={audio.duration} onPlayAgain={handlePlayAgain} onBackToSearch={handleBackToSearch} />
        );
    }

    return (
        <div className="w-full h-screen flex flex-col overflow-hidden relative">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Top Bar / HUD */}
            <div className="relative z-10 px-8 py-6 flex justify-between items-start">
                <button
                    onClick={handleBackToSearch}
                    className="p-3 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>

                {/* ScoreBoard Floating HUD */}
                {(status === 'playing' || status === 'paused') && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-5xl">
                        <ScoreBoard />
                    </div>
                )}

                {/* Pause Button */}
                {(status === 'playing' || status === 'paused') && (
                    <button
                        onClick={status === 'playing' ? pauseGame : resumeGame}
                        className="p-3 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                    >
                        {status === 'playing' ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>
                )}
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative z-10 flex flex-col justify-center items-center w-full max-w-7xl mx-auto px-4">
                {/* Countdowns & Overlays */}
                {status === 'countdown' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="font-display font-black text-[15rem] text-transparent bg-clip-text bg-gradient-to-br from-neon-blue to-neon-purple animate-ping">
                            {countdown ?? 3}
                        </div>
                    </div>
                )}

                {status === 'paused' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                        <div className="text-center">
                            <div className="font-display font-bold text-6xl text-white mb-2 tracking-widest">PAUSED</div>
                            <div className="flex gap-6 mt-8">
                                <button onClick={resumeGame} className="px-8 py-3 bg-neon-blue text-deep-bg font-bold rounded hover:bg-white transition-colors">
                                    RESUME
                                </button>
                                <button onClick={handleBackToSearch} className="px-8 py-3 border border-white/20 text-white font-bold rounded hover:bg-white/10 transition-colors">
                                    QUIT
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Idle / Start Screen */}
                {status === 'idle' && (
                    <div className="text-center space-y-6 animate-slide-up py-8 overflow-y-auto max-h-full">
                        <div className="space-y-2">
                            <h2 className="font-display font-bold text-4xl md:text-5xl text-white tracking-tight">
                                {currentSong.trackName}
                            </h2>
                            <p className="font-mono text-neon-blue uppercase tracking-[0.2em] text-base md:text-lg">
                                {currentSong.artistName}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto py-4">
                            <div className="text-center">
                                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{lyrics.lines.length}</div>
                                <div className="text-xs font-mono text-white/40 uppercase">Lines</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{Math.floor(currentSong.duration / 60)}:{String(currentSong.duration % 60).padStart(2, '0')}</div>
                                <div className="text-xs font-mono text-white/40 uppercase">Duration</div>
                            </div>
                        </div>

                        {/* Settings Panel */}
                        <div className="bg-white/5 p-5 rounded-2xl max-w-md mx-auto border border-white/10 space-y-5">
                            {/* Volume Control */}
                            <div>
                                <label className="flex justify-between text-sm font-mono text-white/60 mb-3">
                                    <span className="flex items-center gap-2">
                                        <button onClick={audio.toggleMute} className="hover:text-white transition-colors">
                                            {audio.isMuted ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                </svg>
                                            )}
                                        </button>
                                        VOLUME
                                    </span>
                                    <span className="text-neon-blue">{audio.isMuted ? 'MUTED' : `${Math.round(audio.volume * 100)}%`}</span>
                                </label>
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={audio.volume}
                                    onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
                                    disabled={audio.isMuted}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-blue disabled:opacity-50"
                                />
                            </div>

                            {/* Speed Control */}
                            <div>
                                <label className="flex justify-between text-sm font-mono text-white/60 mb-3">
                                    <span>PLAYBACK SPEED</span>
                                    <span className="text-neon-blue">{audio.playbackRate.toFixed(2)}x</span>
                                </label>
                                <input
                                    type="range" min="0.5" max="2.0" step="0.1"
                                    value={audio.playbackRate}
                                    onChange={(e) => audio.setPlaybackRate(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-blue"
                                />
                            </div>

                            {/* Lyrics Offset Control */}
                            <div>
                                <label className="flex justify-between text-sm font-mono text-white/60 mb-3">
                                    <span>LYRICS OFFSET</span>
                                    <span className={lyricsOffset === 0 ? 'text-white/40' : 'text-neon-purple'}>
                                        {lyricsOffset > 0 ? '+' : ''}{lyricsOffset}ms
                                    </span>
                                </label>
                                <input
                                    type="range" min="-2000" max="2000" step="50"
                                    value={lyricsOffset}
                                    onChange={(e) => setLyricsOffset(parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                                />
                                <div className="flex justify-between text-xs text-white/30 mt-1">
                                    <span>Earlier</span>
                                    <button onClick={() => setLyricsOffset(0)} className="text-white/50 hover:text-white">Reset</button>
                                    <span>Later</span>
                                </div>
                            </div>

                            {/* Typing Mode */}
                            <div>
                                <label className="block text-sm font-mono text-white/60 mb-3">TYPING MODE</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setTypingMode('normal')}
                                        className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                                            typingMode === 'normal'
                                                ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50'
                                                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        NORMAL
                                    </button>
                                    <button
                                        onClick={() => setTypingMode('strict')}
                                        className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                                            typingMode === 'strict'
                                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                                                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        STRICT
                                    </button>
                                    <button
                                        onClick={() => setTypingMode('assist')}
                                        className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                                            typingMode === 'assist'
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        ASSIST
                                    </button>
                                </div>
                                <p className="text-xs text-white/30 mt-2 text-center">
                                    {typingMode === 'normal' && 'Standard typing experience'}
                                    {typingMode === 'strict' && 'No backspace allowed'}
                                    {typingMode === 'assist' && 'Auto-skip punctuation'}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4">
                            {audioUrl ? (
                                <button
                                    onClick={startPlaying}
                                    disabled={audio.isLoading}
                                    className="px-12 py-5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full font-display font-bold text-lg md:text-xl text-white tracking-widest hover:scale-105 hover:shadow-[0_0_30px_#bc13fe] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {audio.isLoading ? 'LOADING ASSETS...' : 'INITIATE SEQUENCE'}
                                </button>
                            ) : (
                                <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 rounded font-mono text-sm">
                                    ⚠ AUDIO SOURCE MISSING
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Active Gameplay */}
                {(status === 'playing' || status === 'paused') && (
                    <div className="w-full flex-1 flex flex-col justify-center space-y-12 pb-12">
                        {/* Auto-submit notification */}
                        {showAutoSubmitNotification && (
                            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
                                <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-300 text-sm font-mono">
                                    Line auto-submitted
                                </div>
                            </div>
                        )}

                        <div className="flex-1 flex items-center">
                            <LyricDisplay className="w-full" />
                        </div>

                        <div className="w-full space-y-8">
                            <TypingInput
                                onTyping={handleTyping}
                                onInputKey={handleInputKey}
                                onSubmit={handleSubmitLine}
                                disabled={status !== 'playing'}
                            />
                            <div className="max-w-3xl mx-auto w-full px-8">
                                <ProgressBar currentTimeMs={audio.currentTime} durationMs={audio.duration} />
                            </div>
                        </div>

                        {/* Quick settings during gameplay */}
                        {showSettings && (
                            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-deep-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-80 animate-slide-up">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-mono text-white/60">QUICK SETTINGS</span>
                                    <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Volume */}
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs font-mono text-white/40 mb-1">
                                        <span>Volume</span>
                                        <span>{Math.round(audio.volume * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={audio.volume}
                                        onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-blue"
                                    />
                                </div>

                                {/* Lyrics Offset */}
                                <div>
                                    <div className="flex justify-between text-xs font-mono text-white/40 mb-1">
                                        <span>Lyrics Offset</span>
                                        <span>{lyricsOffset > 0 ? '+' : ''}{lyricsOffset}ms</span>
                                    </div>
                                    <input
                                        type="range" min="-2000" max="2000" step="50"
                                        value={lyricsOffset}
                                        onChange={(e) => setLyricsOffset(parseInt(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Settings toggle button */}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs font-mono"
                        >
                            {showSettings ? 'HIDE' : 'SETTINGS'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
