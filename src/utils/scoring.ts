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


export function removePunctuation(text: string): string {
    return text.replace(/[.,!?;:'"()\-???{}]/g, '').replace(/\[|\]/g, '');
}


function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[a.length][b.length];
}


export function calculateCharacterAccuracy(typed: string, expected: string): number {
    if (!expected) return typed ? 0 : 1;
    if (!typed) return 0;

    const normalizedTyped = removePunctuation(typed.toLowerCase().trim());
    const normalizedExpected = removePunctuation(expected.toLowerCase().trim());

    if (normalizedTyped === normalizedExpected) return 1;

    const distance = levenshteinDistance(normalizedTyped, normalizedExpected);
    const maxLength = Math.max(normalizedTyped.length, normalizedExpected.length);

    return Math.max(0, 1 - distance / maxLength);
}


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


export function calculateLineScore(
    typed: string,
    expected: string,
    typedTimeMs: number,
    expectedTimeMs: number,
    combo: number,
    difficulty: Difficulty
): LineResult {
    const settings = DIFFICULTY_SETTINGS[difficulty];

    const characterAccuracy = calculateCharacterAccuracy(typed, expected);


    const timingResult = calculateTimingResult(typedTimeMs, expectedTimeMs, settings);
    const timingScore = getTimingMultiplier(timingResult, settings);

    const isPerfect = characterAccuracy >= 0.95 && timingResult === 'perfect';
    const newCombo = isPerfect ? combo + 1 : 0;
    const comboBonus = 1 + (combo * (settings.comboMultiplier - 1) * 0.1);

    const baseScore = 1000;

    const accuracyComponent = characterAccuracy * 0.6;
    const timingComponent = timingScore * 0.3;
    const comboComponent = Math.min(comboBonus, 2) * 0.1;

    const score = Math.round(
        baseScore *
        (accuracyComponent + timingComponent + comboComponent) *
        settings.baseScoreMultiplier
    );

    return {
        lineIndex: 0,
        typedText: typed,
        expectedText: expected,
        characterAccuracy,
        timingResult,
        timingScore,
        score,
        combo: newCombo
    };
}


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
    const goodLines = lineResults.filter(r =>
        (r.score > 500 && r.timingResult !== 'perfect') || (r.timingResult === 'perfect' && r.characterAccuracy < 0.95)
    ).length;
    const missedLines = lineResults.filter(r => r.score <= 500).length;

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


export function getTimingLabel(result: TimingResult): string {
    switch (result) {
        case 'perfect': return 'PERFECT';
        case 'early': return 'EARLY';
        case 'late': return 'LATE';
        case 'too_early': return 'TOO EARLY';
        case 'too_late': return 'TOO LATE';
    }
}


export function getTimingClass(result: TimingResult): string {
    switch (result) {
        case 'perfect': return 'text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]';
        case 'early': return 'text-neon-green drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]';
        case 'late': return 'text-neon-purple drop-shadow-[0_0_10px_rgba(188,19,254,0.8)]';
        case 'too_early': return 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]';
        case 'too_late': return 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]';
    }
}
