import type { HighScore, Difficulty } from '../types';

const STORAGE_KEY = 'lyric-karaoke-highscores';
const MAX_SCORES_PER_SONG = 5;

/**
 * Get all high scores from localStorage
 */
export function getAllHighScores(): HighScore[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as HighScore[];
    } catch {
        console.error('Failed to load high scores');
        return [];
    }
}

/**
 * Get high scores for a specific song
 */
export function getHighScoresForSong(songId: string, difficulty?: Difficulty): HighScore[] {
    const allScores = getAllHighScores();
    return allScores
        .filter(s => s.songId === songId && (difficulty === undefined || s.difficulty === difficulty))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SCORES_PER_SONG);
}

/**
 * Save a new high score
 */
export function saveHighScore(score: HighScore): void {
    try {
        const allScores = getAllHighScores();

        // Add new score
        allScores.push(score);

        // Sort and limit scores per song/difficulty
        const grouped = new Map<string, HighScore[]>();

        for (const s of allScores) {
            const key = `${s.songId}-${s.difficulty}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(s);
        }

        // Keep only top scores per song/difficulty
        const finalScores: HighScore[] = [];
        for (const [, scores] of grouped) {
            scores.sort((a, b) => b.score - a.score);
            finalScores.push(...scores.slice(0, MAX_SCORES_PER_SONG));
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalScores));
    } catch {
        console.error('Failed to save high score');
    }
}

/**
 * Check if a score qualifies as a high score
 */
export function isHighScore(songId: string, difficulty: Difficulty, score: number): boolean {
    const existingScores = getHighScoresForSong(songId, difficulty);
    if (existingScores.length < MAX_SCORES_PER_SONG) return true;
    return score > existingScores[existingScores.length - 1].score;
}

/**
 * Get the top scores across all songs
 */
export function getTopScores(limit: number = 10): HighScore[] {
    return getAllHighScores()
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Clear all high scores (for testing/reset)
 */
export function clearAllHighScores(): void {
    localStorage.removeItem(STORAGE_KEY);
}

// Settings persistence
const SETTINGS_KEY = 'lyric-karaoke-settings';
const ONBOARDING_KEY = 'lyric-karaoke-onboarding-seen';

export interface AppSettings {
    difficulty: Difficulty;
    volume: number;
    showUpcoming: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    difficulty: 'medium',
    volume: 0.7,
    showUpcoming: true,
};

export function getSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (!stored) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function saveSettings(settings: Partial<AppSettings>): void {
    try {
        const current = getSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
        console.error('Failed to save settings');
    }
}

// Onboarding
export function hasSeenOnboarding(): boolean {
    try {
        return localStorage.getItem(ONBOARDING_KEY) === 'true';
    } catch {
        return false;
    }
}

export function setOnboardingSeen(): void {
    try {
        localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
        console.error('Failed to save onboarding state');
    }
}

export function resetOnboarding(): void {
    try {
        localStorage.removeItem(ONBOARDING_KEY);
    } catch {
        console.error('Failed to reset onboarding');
    }
}
