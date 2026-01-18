import type { HighScore, Difficulty } from '../types';

const STORAGE_KEY = 'lyric-karaoke-highscores';
const MAX_SCORES_PER_SONG = 5;


export function getAllHighScores(): HighScore[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as HighScore[];
}


export function getHighScoresForSong(songId: string, difficulty?: Difficulty): HighScore[] {
    const allScores = getAllHighScores();
    return allScores
        .filter(s => s.songId === songId && (difficulty === undefined || s.difficulty === difficulty))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SCORES_PER_SONG);
}


export function saveHighScore(score: HighScore): void {
    const allScores = getAllHighScores();

    allScores.push(score);

    const grouped = new Map<string, HighScore[]>();

    for (const s of allScores) {
        const key = `${s.songId}-${s.difficulty}`;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(s);
    }

    const finalScores: HighScore[] = [];
    for (const [, scores] of grouped) {
        scores.sort((a, b) => b.score - a.score);
        finalScores.push(...scores.slice(0, MAX_SCORES_PER_SONG));
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalScores));
}


export function isHighScore(songId: string, difficulty: Difficulty, score: number): boolean {
    const existingScores = getHighScoresForSong(songId, difficulty);
    if (existingScores.length < MAX_SCORES_PER_SONG) return true;
    return score > existingScores[existingScores.length - 1].score;
}


export function getTopScores(limit: number = 10): HighScore[] {
    return getAllHighScores()
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}


export function clearAllHighScores(): void {
    localStorage.removeItem(STORAGE_KEY);
}

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
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
}

export function saveSettings(settings: Partial<AppSettings>): void {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
}

export function hasSeenOnboarding(): boolean {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function setOnboardingSeen(): void {
    localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function resetOnboarding(): void {
    localStorage.removeItem(ONBOARDING_KEY);
}
