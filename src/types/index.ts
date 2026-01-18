// Core game types

export interface LyricLine {
    time: number;      // Time in milliseconds
    text: string;      // Lyric text
    endTime?: number;  // End time (calculated from next line)
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

// Difficulty settings
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultySettings {
    name: string;
    description: string;
    // Timing windows in milliseconds
    perfectWindow: number;     // ±X ms for perfect timing
    goodWindow: number;        // ±X ms for good timing (partial penalty)
    // Penalty multipliers (1 = no penalty, 0.5 = 50% of score)
    earlyPenalty: number;
    latePenalty: number;
    tooEarlyPenalty: number;
    tooLatePenalty: number;
    // Scoring multipliers
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

// Timing result
export type TimingResult = 'perfect' | 'early' | 'late' | 'too_early' | 'too_late';

export interface LineResult {
    lineIndex: number;
    typedText: string;
    expectedText: string;
    characterAccuracy: number;  // 0-1
    timingResult: TimingResult;
    timingScore: number;        // 0-1
    score: number;              // Final calculated score
    combo: number;              // Combo at time of completion
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

// High score persistence
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

// Game statistics
export interface GameStats {
    totalScore: number;
    accuracy: number;
    maxCombo: number;
    perfectLines: number;
    goodLines: number;
    missedLines: number;
    wordsPerMinute: number;
}

// Audio source types
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
