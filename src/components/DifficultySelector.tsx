import { useGameStore } from '../stores/gameStore';
import { type Difficulty, DIFFICULTY_SETTINGS } from '../types';

export function DifficultySelector() {
    const { difficulty, setDifficulty } = useGameStore();

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

    return (
        <div className="flex flex-col gap-3">
            <label className="text-sm text-slate-400 uppercase tracking-wider">
                Difficulty
            </label>
            <div className="flex gap-2">
                {difficulties.map((diff) => {
                    const settings = DIFFICULTY_SETTINGS[diff];
                    const isSelected = difficulty === diff;

                    return (
                        <button
                            key={diff}
                            onClick={() => setDifficulty(diff)}
                            className={`
                flex-1 px-4 py-3 rounded-xl transition-all duration-300
                ${isSelected
                                    ? `difficulty-${diff} text-white shadow-lg scale-105`
                                    : 'glass glass-hover text-slate-300'
                                }
              `}
                        >
                            <div className="font-semibold">{settings.name}</div>
                            <div className="text-xs opacity-75 mt-1">
                                ±{settings.perfectWindow}ms perfect
                            </div>
                        </button>
                    );
                })}
            </div>


            <p className="text-sm text-slate-500 text-center">
                {DIFFICULTY_SETTINGS[difficulty].description}
            </p>
        </div>
    );
}
