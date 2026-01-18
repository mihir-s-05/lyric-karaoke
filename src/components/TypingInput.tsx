import { useRef, useEffect, useState, type KeyboardEvent } from 'react';
import { useGameStore } from '../stores/gameStore';

interface TypingInputProps {
    onTyping: (text: string) => void;
    onInputKey?: (key: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
}

export function TypingInput({ onTyping, onInputKey, onSubmit, disabled = false }: TypingInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { typedText, status, lyrics, currentLineIndex, isLineCompleted, typingMode } = useGameStore();
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-focus when game starts or resumes
    useEffect(() => {
        if ((status === 'playing' || status === 'countdown') && inputRef.current) {
            inputRef.current.focus();
        }
    }, [status]);

    // Keep focus unless paused
    const handleBlur = () => {
        if (status === 'playing' && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (onInputKey) {
            onInputKey(e.key);
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            // We rely on parent to handle Enter logic via onInputKey or fallback to old onSubmit
            // For now, let's just trigger submit to be safe for legacy, but useGameEngine handles it.
            if (!onInputKey) onSubmit();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onTyping(e.target.value);
    };

    const currentLine = lyrics?.lines[currentLineIndex];

    // Ghost UI: Render text manually with cursor
    const renderGhostText = () => {
        if (!typedText) return <span className="text-white/20">Type to start...</span>;

        // Show typed characters
        // We could do fancy diffing here (green for correct, red for wrong), 
        // but for now, let's keep it simple mono style or use isError logic if needed.
        // Actually, the request asked for "typing experience like monkeytype".
        // Monkeytype colors specific chars.

        return (
            <span>
                {typedText.split('').map((char, i) => {
                    // Check correctness against current line if available
                    let colorClass = 'text-white';
                    if (currentLine) {
                        const expectedChar = currentLine.text[i];
                        if (expectedChar && char.toLowerCase() === expectedChar.toLowerCase()) {
                            colorClass = 'text-white'; // Correct is just white/bright
                        } else {
                            colorClass = 'text-rose-500'; // Error is red
                        }
                    }
                    return <span key={i} className={colorClass}>{char === ' ' ? '\u00A0' : char}</span>;
                })}
            </span>
        );
    };

    return (
        <div
            className={`relative w-full max-w-4xl mx-auto group font-mono ${isMobile ? 'text-xl' : 'text-3xl'}`}
            onClick={() => inputRef.current?.focus()}
        >
            {/* The Invisible Real Input */}
            <input
                ref={inputRef}
                type="text"
                value={typedText}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20 caret-transparent"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                // Mobile-specific: prevent zoom on focus
                style={{ fontSize: '16px' }}
                // Keep the input in view on mobile
                enterKeyHint="done"
            />

            {/* Visual Layer */}
            <div className={`
                relative text-center rounded-2xl transition-all duration-300
                ${isMobile ? 'px-4 py-8' : 'px-8 py-6'}
                ${isLineCompleted ? 'opacity-50 blur-[1px]' : 'opacity-100'}
            `}>
                {/* Background Glow */}
                <div className={`absolute inset-0 bg-black/40 backdrop-blur-xl rounded-2xl transition-all duration-300 ${status === 'playing' ? 'border border-white/10' : ''}`} />

                {/* Typing Mode Indicator */}
                {typingMode !== 'normal' && status === 'playing' && (
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono uppercase tracking-wider ${
                        typingMode === 'strict' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                        {typingMode}
                    </div>
                )}

                {/* Text Content */}
                <div className="relative z-10 flex items-center justify-center min-h-[1.5em]">
                    <div className="flex items-center">
                        <div className="flex whitespace-pre animate-pulse-fast">
                            {renderGhostText()}
                        </div>
                        {/* Custom Caret */}
                        {!isLineCompleted && status === 'playing' && (
                            <div className={`${isMobile ? 'w-[2px] h-[1em]' : 'w-[3px] h-[1.2em]'} bg-neon-blue ml-[1px] rounded-full animate-pulse shadow-[0_0_10px_#00f3ff]`} />
                        )}
                    </div>
                </div>

                {/* Status Indicator */}
                {isLineCompleted && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neon-green font-bold text-sm tracking-widest uppercase animate-slide-up">
                        WAIT
                    </div>
                )}

                {/* Mobile: Tap to focus hint */}
                {isMobile && !typedText && status === 'playing' && !isLineCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-white/20 text-sm animate-pulse">Tap to type...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
