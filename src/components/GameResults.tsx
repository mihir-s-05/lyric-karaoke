import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { calculateGameStats } from '../utils/scoring';
import { isHighScore } from '../utils/storage';
import { DIFFICULTY_SETTINGS } from '../types';

interface GameResultsProps {
    durationMs: number;
    onPlayAgain: () => void;
    onBackToSearch: () => void;
}

export function GameResults({ durationMs, onPlayAgain, onBackToSearch }: GameResultsProps) {
    const { currentSong, difficulty, lineResults } = useGameStore();
    const [showGrade, setShowGrade] = useState(false);

    // Animation trigger
    useEffect(() => {
        const timer = setTimeout(() => setShowGrade(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const stats = calculateGameStats(lineResults, durationMs);
    const settings = DIFFICULTY_SETTINGS[difficulty];

    const isNewHighScore = currentSong && isHighScore(
        currentSong.id.toString(),
        difficulty,
        stats.totalScore
    );

    const getGrade = (accuracy: number) => {
        if (accuracy >= 0.95) return { grade: 'S', color: 'text-neon-purple', shadow: 'shadow-neon-purple' };
        if (accuracy >= 0.90) return { grade: 'A', color: 'text-neon-green', shadow: 'shadow-neon-green' };
        if (accuracy >= 0.80) return { grade: 'B', color: 'text-neon-blue', shadow: 'shadow-neon-blue' };
        if (accuracy >= 0.70) return { grade: 'C', color: 'text-yellow-400', shadow: 'shadow-yellow-400' };
        if (accuracy >= 0.60) return { grade: 'D', color: 'text-orange-400', shadow: 'shadow-orange-400' };
        return { grade: 'F', color: 'text-rose-500', shadow: 'shadow-rose-500' };
    };

    const gradeInfo = getGrade(stats.accuracy);

    return (
        <div className="w-full max-w-4xl mx-auto text-center animate-slide-up">
            {/* Header */}
            <div className="mb-12">
                <h2 className="font-display font-bold text-4xl text-white mb-2 tracking-wide text-glow">
                    SESSION COMPLETE
                </h2>
                <p className="font-mono text-neon-blue tracking-[0.2em] uppercase">
                    {currentSong?.trackName} // {currentSong?.artistName}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
                {/* Left: Grade Reveal */}
                <div className="relative flex flex-col items-center justify-center p-12 bg-black/30 rounded-3xl border border-white/10 glass-panel">
                    <div className="text-white/40 font-mono tracking-widest text-sm mb-4">PERFORMANCE GRADE</div>

                    <div className={`relative transition-all duration-1000 transform ${showGrade ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                        <div className={`font-display font-black text-[12rem] leading-none ${gradeInfo.color} drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]`}>
                            {gradeInfo.grade}
                        </div>
                        {isNewHighScore && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1 bg-neon-purple/20 border border-neon-purple text-neon-purple rounded-full font-bold text-sm track-wider animate-bounce">
                                NEW HIGH SCORE!
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="TOTAL SCORE" value={stats.totalScore.toLocaleString()} delay={100} />
                    <StatCard label="ACCURACY" value={`${(stats.accuracy * 100).toFixed(1)}%`} delay={200} />
                    <StatCard label="MAX COMBO" value={`${stats.maxCombo}x`} delay={300} />
                    <StatCard label="WPM" value={stats.wordsPerMinute.toString()} delay={400} />

                    <div className="col-span-2 mt-4 p-6 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                        <div className="text-left">
                            <div className="text-xs text-slate-400 font-mono uppercase mb-1">Timing Adjusted</div>
                            <div className="text-emerald-400 font-bold">{stats.perfectLines} Perfect</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400 font-mono uppercase mb-1">Difficulty</div>
                            <div className="text-white font-bold uppercase">{settings.name}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-6">
                <button
                    onClick={onPlayAgain}
                    className="group relative px-8 py-4 bg-neon-blue text-deep-bg font-display font-bold text-xl tracking-widest hover:bg-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_0_20px_#00f3ff]"
                >
                    <span className="relative z-10">REPLAY TRACK</span>
                </button>
                <button
                    onClick={onBackToSearch}
                    className="px-8 py-4 bg-transparent border-2 border-white/20 text-white font-display font-bold text-xl tracking-widest hover:border-white hover:bg-white/5 transition-all duration-300"
                >
                    SONG SELECT
                </button>
            </div>
        </div>
    );
}

function StatCard({ label, value, delay }: { label: string, value: string, delay: number }) {
    return (
        <div
            className="p-6 bg-deep-surface rounded-2xl border border-white/5 hover:border-neon-blue/30 transition-colors animate-slide-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="font-display font-bold text-3xl text-white mb-1">{value}</div>
            <div className="font-mono text-xs text-white/40 tracking-widest">{label}</div>
        </div>
    );
}
