
export interface LyricLine {
    time: number;
    text: string;
    endTime?: number;
}

export interface ParsedLyrics {
    lines: LyricLine[];
    metadata: {
        artist?: string;
        title?: string;
        album?: string;
        duration?: number;
    };
}

export interface SongInfo {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName?: string;
    duration: number;
    instrumental: boolean;
    plainLyrics?: string;
    syncedLyrics?: string;
}

export interface SearchResult {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    syncedLyrics: string | null;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultySettings {
    name: string;
    description: string;
    perfectWindow: number;
    goodWindow: number;
    earlyPenalty: number;
    latePenalty: number;
    tooEarlyPenalty: number;
    tooLatePenalty: number;
    baseScoreMultiplier: number;
    comboMultiplier: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
    easy: {
        name: 'Easy',
        description: 'Relaxed timing, forgiving penalties',
        perfectWindow: 500,
        goodWindow: 1500,
        earlyPenalty: 0.9,
        latePenalty: 0.85,
        tooEarlyPenalty: 0.7,
        tooLatePenalty: 0.6,
        baseScoreMultiplier: 0.8,
        comboMultiplier: 1.05,
    },
    medium: {
        name: 'Medium',
        description: 'Balanced timing and penalties',
        perfectWindow: 300,
        goodWindow: 800,
        earlyPenalty: 0.8,
        latePenalty: 0.75,
        tooEarlyPenalty: 0.5,
        tooLatePenalty: 0.4,
        baseScoreMultiplier: 1.0,
        comboMultiplier: 1.1,
    },
    hard: {
        name: 'Hard',
        description: 'Tight timing, harsh penalties',
        perfectWindow: 150,
        goodWindow: 400,
        earlyPenalty: 0.6,
        latePenalty: 0.5,
        tooEarlyPenalty: 0.2,
        tooLatePenalty: 0.1,
        baseScoreMultiplier: 1.5,
        comboMultiplier: 1.2,
    },
};

export type TimingResult = 'perfect' | 'early' | 'late' | 'too_early' | 'too_late';

export interface LineResult {
    lineIndex: number;
    typedText: string;
    expectedText: string;
    characterAccuracy: number;
    timingResult: TimingResult;
    timingScore: number;
    score: number;
    combo: number;
}

export interface GameState {
    status: 'idle' | 'loading' | 'countdown' | 'playing' | 'paused' | 'finished';
    difficulty: Difficulty;
    currentLineIndex: number;
    typedText: string;
    score: number;
    combo: number;
    maxCombo: number;
    isLineCompleted: boolean;
    lineResults: LineResult[];
    startTime: number | null;
    currentTime: number;
}

export interface HighScore {
    songId: string;
    trackName: string;
    artistName: string;
    difficulty: Difficulty;
    score: number;
    accuracy: number;
    maxCombo: number;
    date: string;
}

export interface GameStats {
    totalScore: number;
    accuracy: number;
    maxCombo: number;
    perfectLines: number;
    goodLines: number;
    missedLines: number;
    wordsPerMinute: number;
}

export type AudioSource =
    | { type: 'youtube'; videoId: string; url?: string }
    | { type: 'file'; file: File; url: string };

export interface AudioState {
    source: AudioSource | null;
    isLoading: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    error: string | null;
}
