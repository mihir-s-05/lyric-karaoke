import {
    DIFFICULTY_SETTINGS,
} from '../types';
import type {
    Difficulty,
    DifficultySettings,
    TimingResult,
    LineResult,
    GameStats,
} from '../types';

/**
 * Remove punctuation from text for fairer scoring comparisons
 */
export function removePunctuation(text: string): string {
    return text.replace(/[.,!?;:'"()\-???{}]/g, '').replace(/\[|\]/g, '');
}

/**
 * Calculate the Levenshtein distance between two strings
 * Used for measuring typing accuracy
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the matrix
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[a.length][b.length];
}

/**
 * Calculate character accuracy between typed and expected text
 * Returns a value from 0 to 1
 */
export function calculateCharacterAccuracy(typed: string, expected: string): number {
    if (!expected) return typed ? 0 : 1;
    if (!typed) return 0;

    // Normalize strings for comparison (case-insensitive, trim whitespace, remove punctuation)
    const normalizedTyped = removePunctuation(typed.toLowerCase().trim());
    const normalizedExpected = removePunctuation(expected.toLowerCase().trim());

    if (normalizedTyped === normalizedExpected) return 1;

    const distance = levenshteinDistance(normalizedTyped, normalizedExpected);
    const maxLength = Math.max(normalizedTyped.length, normalizedExpected.length);

    return Math.max(0, 1 - distance / maxLength);
}

/**
 * Determine timing result based on when the line was completed
 */
export function calculateTimingResult(
    typedTimeMs: number,
    expectedTimeMs: number,
    settings: DifficultySettings
): TimingResult {
    const diff = typedTimeMs - expectedTimeMs;

    if (Math.abs(diff) <= settings.perfectWindow) {
        return 'perfect';
    }

    if (diff < -settings.goodWindow) {
        return 'too_early';
    }

    if (diff < 0) {
        return 'early';
    }

    if (diff > settings.goodWindow) {
        return 'too_late';
    }

    return 'late';
}

/**
 * Get the timing multiplier based on timing result
 */
export function getTimingMultiplier(
    timingResult: TimingResult,
    settings: DifficultySettings
): number {
    switch (timingResult) {
        case 'perfect':
            return 1.0;
        case 'early':
            return settings.earlyPenalty;
        case 'late':
            return settings.latePenalty;
        case 'too_early':
            return settings.tooEarlyPenalty;
        case 'too_late':
            return settings.tooLatePenalty;
    }
}

/**
 * Calculate the score for a single line
 */
export function calculateLineScore(
    typed: string,
    expected: string,
    typedTimeMs: number,
    expectedTimeMs: number,
    lineEndTimeMs: number,
    combo: number,
    difficulty: Difficulty
): LineResult {
    const settings = DIFFICULTY_SETTINGS[difficulty];

    // Calculate character accuracy (60% weight)
    const characterAccuracy = calculateCharacterAccuracy(typed, expected);

    // Determine timing result and score (30% weight)
    // Use the midpoint between line start and end as the "expected" completion time if needed
    // But typically we expect completion at end of line (karaoke style) or slightly before?
    // Let's use expectedTimeMs as the "ideal" timestamp passed in (usually line.time or line.endTime?)
    // In gameEngine we passed `currentLine.time`, which is start time. Ideally we end AT start time of next line?
    // Actually, usually you type the line WHILE it's singing. So finishing at `endTime` is ideal?
    // Let's assume targetTime passed in is the "ideal" time.

    // For now, let's use the passed expectedTimeMs as target.
    const timingResult = calculateTimingResult(typedTimeMs, expectedTimeMs, settings);
    const timingScore = getTimingMultiplier(timingResult, settings);

    // Calculate combo bonus (10% weight)
    const isPerfect = characterAccuracy >= 0.95 && timingResult === 'perfect';
    const newCombo = isPerfect ? combo + 1 : 0;
    const comboBonus = 1 + (combo * (settings.comboMultiplier - 1) * 0.1);

    // Base score per line
    const baseScore = 1000;

    // Calculate final score
    // Weighted: 60% accuracy, 30% timing, 10% combo
    const accuracyComponent = characterAccuracy * 0.6;
    const timingComponent = timingScore * 0.3;
    const comboComponent = Math.min(comboBonus, 2) * 0.1; // Cap combo bonus at 2x

    const score = Math.round(
        baseScore *
        (accuracyComponent + timingComponent + comboComponent) *
        settings.baseScoreMultiplier
    );

    return {
        lineIndex: 0, // Will be set by caller
        typedText: typed,
        expectedText: expected,
        characterAccuracy,
        timingResult,
        timingScore,
        score,
        combo: newCombo
    };
}

/**
 * Calculate overall game statistics
 */
export function calculateGameStats(
    lineResults: LineResult[],
    totalDurationMs: number
): GameStats {
    if (lineResults.length === 0) {
        return {
            totalScore: 0,
            accuracy: 0,
            maxCombo: 0,
            perfectLines: 0,
            goodLines: 0,
            missedLines: 0,
            wordsPerMinute: 0,
        };
    }

    const totalScore = lineResults.reduce((sum, r) => sum + r.score, 0);
    const accuracy = lineResults.reduce((sum, r) => sum + r.characterAccuracy, 0) / lineResults.length;
    const maxCombo = Math.max(...lineResults.map(r => r.combo), 0);

    const perfectLines = lineResults.filter(r => r.timingResult === 'perfect' && r.characterAccuracy >= 0.95).length;
    // Good lines: nice accuracy but maybe slightly off timing, or perfect timing but lower accuracy
    const goodLines = lineResults.filter(r =>
        (r.score > 500 && r.timingResult !== 'perfect') || (r.timingResult === 'perfect' && r.characterAccuracy < 0.95)
    ).length;
    // Missed: low score
    const missedLines = lineResults.filter(r => r.score <= 500).length;

    // Calculate WPM based on total typed characters
    const totalCharacters = lineResults.reduce((sum, r) => sum + r.typedText.length, 0);
    const durationMinutes = totalDurationMs / 60000;
    const wordsPerMinute = durationMinutes > 0 ? Math.round((totalCharacters / 5) / durationMinutes) : 0;

    return {
        totalScore,
        accuracy,
        maxCombo,
        perfectLines,
        goodLines,
        missedLines,
        wordsPerMinute,
    };
}

/**
 * Get a descriptive label for timing result
 */
export function getTimingLabel(result: TimingResult): string {
    switch (result) {
        case 'perfect': return 'PERFECT';
        case 'early': return 'EARLY';
        case 'late': return 'LATE';
        case 'too_early': return 'TOO EARLY';
        case 'too_late': return 'TOO LATE';
    }
}

/**
 * Get CSS class for timing result styling
 */
export function getTimingClass(result: TimingResult): string {
    switch (result) {
        case 'perfect': return 'text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]';
        case 'early': return 'text-neon-green drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]';
        case 'late': return 'text-neon-purple drop-shadow-[0_0_10px_rgba(188,19,254,0.8)]';
        case 'too_early': return 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]';
        case 'too_late': return 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]';
    }
}
