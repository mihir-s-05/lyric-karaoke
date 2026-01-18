import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';

interface LyricDisplayProps {
    className?: string;
}

export function LyricDisplay({ className = '' }: LyricDisplayProps) {
    const { lyrics, currentLineIndex, typedText, isLineCompleted } = useGameStore();

    const lines = useMemo(() => lyrics?.lines ?? [], [lyrics]);

    const displayLines = useMemo(() => {
        const prev = currentLineIndex > 0 ? lines[currentLineIndex - 1] : null;
        const current = currentLineIndex >= 0 ? lines[currentLineIndex] : null;
        const next = currentLineIndex < lines.length - 1 ? lines[currentLineIndex + 1] : null;
        return { prev, current, next };
    }, [lines, currentLineIndex]);

    const renderCurrentLine = () => {
        if (!displayLines.current) return null;

        const expectedText = displayLines.current.text;
        const chars = expectedText.split('');

        return (
            <div className="flex flex-wrap justify-center gap-[2px] leading-tight">
                {chars.map((char, index) => {
                    let styleClass = 'text-white/20'; // Pending state

                    // If line is completed, show all chars as correct
                    if (isLineCompleted) {
                        styleClass = 'text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]';
                    } else if (index < typedText.length) {
                        const typedChar = typedText[index];
                        if (typedChar.toLowerCase() === char.toLowerCase()) {
                            styleClass = 'text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]';
                        } else {
                            styleClass = 'text-rose-500 line-through opacity-50';
                        }
                    } else if (index === typedText.length) {
                        styleClass = 'text-white bg-neon-blue/20 rounded-sm animate-pulse';
                    }

                    return (
                        <span key={index} className={`font-display font-medium text-4xl md:text-5xl transition-colors duration-100 ${styleClass}`}>
                            {char === ' ' ? '\u00A0' : char}
                        </span>
                    );
                })}
            </div>
        );
    };

    if (!lyrics || lyrics.lines.length === 0) {
        return <div className={`text-center text-white/20 font-mono animate-pulse ${className}`}>AWAITING DATA STREAM...</div>;
    }

    if (currentLineIndex < 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 animate-pulse">
                <div className="font-display text-2xl text-neon-purple tracking-widest mb-4">GET READY</div>
                <div className="text-4xl text-white/50">{lines[0]?.text}</div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center min-h-[300px] ${className}`}>
            {/* Previous Line (Fading Out) */}
            <div className="h-12 flex items-center justify-center mb-8 opacity-40 transform scale-90 blur-[1px] transition-all duration-500">
                {displayLines.prev && (
                    <span className="font-display text-xl text-white/60">
                        {displayLines.prev.text}
                    </span>
                )}
            </div>

            {/* Current Line (Active) */}
            <div className="relative py-8 px-8 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 shadow-2xl w-full max-w-4xl text-center">
                {renderCurrentLine()}

                {/* Progress Indicator for current line */}
                <div className="absolute bottom-0 left-0 h-1 bg-neon-blue/30 w-full rounded-b-3xl overflow-hidden">
                    <div
                        className="h-full bg-neon-blue transition-all duration-100 ease-linear shadow-[0_0_10px_#00f3ff]"
                        style={{ width: `${isLineCompleted ? 100 : Math.min(100, (typedText.length / displayLines.current!.text.length) * 100)}%` }}
                    />
                </div>
            </div>

            {/* Next Line (Preview) */}
            <div className="mt-12 h-8 flex items-center justify-center opacity-30 transform scale-90">
                {displayLines.next && (
                    <span className="font-display text-xl text-white/40">
                        {displayLines.next.text}
                    </span>
                )}
            </div>
        </div>
    );
}
