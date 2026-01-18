import { formatTime } from '../utils/lrcParser';

interface ProgressBarProps {
    currentTimeMs: number;
    durationMs: number;
    className?: string;
}

export function ProgressBar({ currentTimeMs, durationMs, className = '' }: ProgressBarProps) {
    const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

    return (
        <div className={`w-full ${className} select-none`}>

            <div className="flex justify-between mb-2 font-mono text-xs tracking-widest text-neon-blue/80">
                <span>{formatTime(currentTimeMs)}</span>
                <span>{formatTime(durationMs)}</span>
            </div>


            <div className="relative h-1 bg-white/5 rounded-full overflow-visible">

                <div
                    className="absolute inset-x-0 h-full rounded-full opacity-0 overflow-hidden"
                    style={{
                        background: `linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.2) ${progress}%, transparent)`
                    }}
                />


                <div
                    className="absolute left-0 top-0 h-full bg-neon-blue rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_#00f3ff]"
                    style={{ width: `${progress}%` }}
                />


                <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-[0_0_15px_#00f3ff] transition-all duration-100 ease-linear"
                    style={{ left: `${progress}%`, transform: `translate(-50%, -50%) scale(${progress > 0 ? 1 : 0})` }}
                />
            </div>
        </div>
    );
}
