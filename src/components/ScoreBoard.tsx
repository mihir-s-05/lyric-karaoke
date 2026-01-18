import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { getTimingLabel, getTimingClass } from '../utils/scoring';

interface ScoreBoardProps {
    className?: string;
}

export function ScoreBoard({ className = '' }: ScoreBoardProps) {
    const { score, combo, difficulty, lineResults } = useGameStore();

    const accuracy = lineResults.length > 0
        ? lineResults.reduce((sum, r) => sum + r.characterAccuracy, 0) / lineResults.length
        : 1;

    const feedback = useMemo(() => {
        if (lineResults.length === 0) return null;
        const lastResult = lineResults[lineResults.length - 1];
        return {
            text: getTimingLabel(lastResult.timingResult),
            color: getTimingClass(lastResult.timingResult),
        };
    }, [lineResults]);

    return (
        <div className={`grid grid-cols-3 gap-8 items-start w-full max-w-5xl mx-auto ${className}`}>
            {/* Left: Combo Counter */}
            <div className="flex flex-col items-center">
                <div className="relative">
                    <div className={`font-display font-black text-6xl tracking-tighter transition-all duration-100 ${combo > 10 ? 'text-neon-blue scale-110 drop-shadow-[0_0_15px_#00f3ff]' :
                        combo > 0 ? 'text-white' : 'text-white/20'
                        }`}>
                        {combo}x
                    </div>
                    {combo >= 5 && (
                        <div className="absolute -top-4 -right-8 text-xl animate-bounce">🔥</div>
                    )}
                </div>
                <div className="text-xs font-mono text-neon-blue uppercase tracking-[0.2em] mt-1">
                    Combo Chain
                </div>
            </div>

            {/* Center: Main Score */}
            <div className="flex flex-col items-center relative top-2">
                <div className="font-display font-bold text-7xl text-white tracking-widest text-glow drop-shadow-2xl">
                    {score.toLocaleString()}
                </div>

                {/* Visual Feedback Popup */}
                <div className="h-8 mt-2 overflow-visible flex justify-center">
                    {feedback && (
                        <div key={lineResults.length} className={`
                            font-display font-bold text-xl uppercase tracking-widest animate-feedback
                            ${feedback.color}
                        `}>
                            {feedback.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Accuracy & Difficulty */}
            <div className="flex flex-col items-center">
                <div className={`font-display font-bold text-4xl transition-colors ${accuracy >= 0.9 ? 'text-neon-green' :
                    accuracy >= 0.7 ? 'text-yellow-400' : 'text-rose-500'
                    }`}>
                    {(accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mt-1 mb-2">
                    Accuracy
                </div>
                <div className={`px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono uppercase tracking-widest text-white/60`}>
                    MODE: {difficulty.toUpperCase()}
                </div>
            </div>
        </div>
    );
}
