import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useAudioSync } from './useAudioSync';
import { getCurrentLineIndex } from '../utils/lrcParser';
import { calculateLineScore, removePunctuation } from '../utils/scoring';
import { saveHighScore, isHighScore } from '../utils/storage';
import { calculateGameStats } from '../utils/scoring';

interface UseGameEngineReturn {
    audio: ReturnType<typeof useAudioSync>;
    handleTyping: (text: string) => void;
    handleInputKey: (key: string) => void;
    handleSubmitLine: () => void;
    startPlaying: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
}

export function useGameEngine(): UseGameEngineReturn {
    const audio = useAudioSync();
    const countdownRef = useRef<number | null>(null);
    const lastTypedTextRef = useRef<string>('');

    const {
        status,
        difficulty,
        currentSong,
        lyrics,
        audioUrl,
        currentLineIndex,
        typedText,
        combo,
        lineResults,
        lyricsOffset,
        typingMode,
        setCurrentLineIndex,
        setTypedText,
        submitLine,
        finishGame,
        pauseGame: storePause,
        resumeGame: storeResume,
        updateCurrentTime,
        setShowAutoSubmitNotification,
    } = useGameStore();

    // Sync current time with store
    useEffect(() => {
        if (audio.isPlaying) {
            updateCurrentTime(audio.currentTime);
        }
    }, [audio.currentTime, audio.isPlaying, updateCurrentTime]);

    // Track current lyric line based on audio time (with offset)
    useEffect(() => {
        if (status !== 'playing' || !lyrics) return;

        // Apply lyrics offset (positive offset = lyrics appear earlier)
        const adjustedTime = audio.currentTime + lyricsOffset;
        const newIndex = getCurrentLineIndex(lyrics.lines, adjustedTime);

        if (newIndex !== currentLineIndex && newIndex >= 0) {
            // If we're moving to a new line and we haven't submitted the current one
            if (currentLineIndex >= 0 && currentLineIndex < lyrics.lines.length) {
                const currentLine = lyrics.lines[currentLineIndex];

                // Auto-submit the previous line if not already submitted
                // If it was already completed (isLineCompleted), it was submitted then.
                const alreadySubmitted = lineResults.some(r => r.lineIndex === currentLineIndex);
                if (!alreadySubmitted) {
                    const result = calculateLineScore(
                        typedText,
                        currentLine.text,
                        audio.currentTime,
                        currentLine.time,
                        currentLine.endTime || currentLine.time + 5000,
                        combo,
                        difficulty
                    );

                    submitLine({
                        ...result,
                        lineIndex: currentLineIndex,
                    });

                    // Show auto-submit notification
                    setShowAutoSubmitNotification(true);
                }
            }

            setCurrentLineIndex(newIndex);
        }
    }, [audio.currentTime, status, lyrics, currentLineIndex, typedText, combo, difficulty, lineResults, lyricsOffset, submitLine, setCurrentLineIndex, setShowAutoSubmitNotification]);

    // Reset strict-mode guard when the line changes or typed text is cleared
    useEffect(() => {
        if (typedText.length === 0) {
            lastTypedTextRef.current = '';
        }
    }, [typedText]);

    useEffect(() => {
        lastTypedTextRef.current = '';
    }, [currentLineIndex]);

    // Check for game end
    useEffect(() => {
        if (status !== 'playing' || !lyrics || !audio.duration) return;

        // Game ends when we're past all lyrics or audio ends
        const lastLineIndex = lyrics.lines.length - 1;
        const lastLine = lyrics.lines[lastLineIndex];

        if (audio.currentTime >= (lastLine.endTime || audio.duration)) {
            let resultsForStats = lineResults;

            // Submit last line if needed
            const alreadySubmitted = lineResults.some(r => r.lineIndex === lastLineIndex);
            if (!alreadySubmitted && currentLineIndex === lastLineIndex) {
                const result = calculateLineScore(
                    typedText,
                    lastLine.text,
                    audio.currentTime,
                    lastLine.time,
                    lastLine.endTime || lastLine.time + 5000,
                    combo,
                    difficulty
                );

                const finalResult = {
                    ...result,
                    lineIndex: lastLineIndex,
                };

                submitLine(finalResult);
                resultsForStats = [...lineResults, finalResult];
            }

            // Save high score if applicable
            if (currentSong) {
                const stats = calculateGameStats(resultsForStats, audio.duration);
                if (isHighScore(currentSong.id.toString(), difficulty, stats.totalScore)) {
                    saveHighScore({
                        songId: currentSong.id.toString(),
                        trackName: currentSong.trackName,
                        artistName: currentSong.artistName,
                        difficulty,
                        score: stats.totalScore,
                        accuracy: stats.accuracy,
                        maxCombo: stats.maxCombo,
                        date: new Date().toISOString(),
                    });
                }
            }

            audio.pause();
            finishGame();
        }
    }, [audio.currentTime, audio.duration, status, lyrics, currentLineIndex, lineResults, typedText, combo, difficulty, currentSong, audio, submitLine, finishGame]);

    const handleTyping = useCallback((text: string) => {
        if (status !== 'playing' || lyrics?.lines[currentLineIndex] === undefined) return;

        // If line is already completed, ignore input
        if (useGameStore.getState().isLineCompleted) return;

        const currentLine = lyrics.lines[currentLineIndex];
        let processedText = text;

        // Handle strict mode: no backspace allowed
        if (typingMode === 'strict') {
            // If new text is shorter than previous (backspace was pressed), restore previous
            if (text.length < lastTypedTextRef.current.length) {
                processedText = lastTypedTextRef.current;
            }
        }

        // Handle assist mode: punctuation is optional
        // If user types punctuation, validate it; if they skip it, that's also fine
        if (typingMode === 'assist' && processedText.length > 0) {
            const punctuation = /[.,!?;:'"()[\]{}\-–—…]/;
            const expectedText = currentLine.text;

            // Build aligned text by matching typed chars to expected, skipping untyped punctuation
            let alignedText = '';
            let typedIdx = 0;
            let expectedIdx = 0;

            while (typedIdx < processedText.length && expectedIdx < expectedText.length) {
                const typedChar = processedText[typedIdx];
                const expectedChar = expectedText[expectedIdx];

                // If expected char is punctuation and typed char is NOT that punctuation
                if (punctuation.test(expectedChar) && typedChar !== expectedChar) {
                    // Skip the expected punctuation (user didn't type it)
                    alignedText += expectedChar;
                    expectedIdx++;
                    // Don't advance typedIdx - check this typed char against next expected
                } else {
                    // Either matched, or typed something (right or wrong)
                    alignedText += typedChar;
                    typedIdx++;
                    expectedIdx++;
                }
            }

            // Add any remaining punctuation from expected text that user skipped
            while (expectedIdx < expectedText.length && punctuation.test(expectedText[expectedIdx])) {
                alignedText += expectedText[expectedIdx];
                expectedIdx++;
            }

            processedText = alignedText;
        }

        lastTypedTextRef.current = processedText;
        setTypedText(processedText);

        // Check for early completion (Perfect Match)
        const normalizedTyped = removePunctuation(processedText).toLowerCase();
        const normalizedTarget = removePunctuation(currentLine.text).toLowerCase();

        // If perfect match (ignoring punctuation/case)
        if (normalizedTyped === normalizedTarget && normalizedTyped.length > 0) {
            // Lock input
            useGameStore.getState().setIsLineCompleted(true);

            // Auto-submit as perfect
            const currentAudioTime = audio.getCurrentTime();
            const result = calculateLineScore(
                processedText,
                currentLine.text,
                currentAudioTime,
                currentLine.time,
                currentLine.endTime || currentLine.time + 5000,
                combo,
                difficulty
            );

            submitLine({
                ...result,
                lineIndex: currentLineIndex,
            });
        }
    }, [status, lyrics, currentLineIndex, combo, difficulty, typingMode, setTypedText, submitLine, audio]);

    const handleInputKey = useCallback((key: string) => {
        if (status !== 'playing') return;

        if (key === 'Enter') {
            const state = useGameStore.getState();
            // If line is completed, Enter does nothing
            if (state.isLineCompleted) return;

            // If not completed, reset typed text (Feedback for "wrong")
            setTypedText('');
        }
    }, [status, setTypedText]);

    const handleSubmitLine = useCallback(() => {
        if (status !== 'playing' || !lyrics || currentLineIndex < 0) return;

        const currentLine = lyrics.lines[currentLineIndex];

        // Check if already submitted
        const alreadySubmitted = lineResults.some(r => r.lineIndex === currentLineIndex);
        if (alreadySubmitted) return;

        const currentAudioTime = audio.getCurrentTime();
        const result = calculateLineScore(
            typedText,
            currentLine.text,
            currentAudioTime,
            currentLine.time,
            currentLine.endTime || currentLine.time + 5000,
            combo,
            difficulty
        );

        submitLine({
            ...result,
            lineIndex: currentLineIndex,
        });
    }, [audio, status, lyrics, currentLineIndex, typedText, combo, difficulty, lineResults, submitLine]);

    const startPlaying = useCallback(() => {
        if (!audioUrl || !lyrics) return;

        // Load and start audio
        audio.loadAudio(audioUrl);

        // Start countdown, then play
        useGameStore.setState({ status: 'countdown' });

        let count = 3;
        countdownRef.current = window.setInterval(() => {
            count--;
            if (count <= 0) {
                if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                }
                useGameStore.setState({ status: 'playing' });
                audio.play();
            }
        }, 1000);
    }, [audioUrl, lyrics, audio]);

    const pauseGame = useCallback(() => {
        audio.pause();
        storePause();
    }, [audio, storePause]);

    const resumeGame = useCallback(() => {
        audio.play();
        storeResume();
    }, [audio, storeResume]);

    // Cleanup countdown on unmount
    useEffect(() => {
        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, []);

    return {
        audio,
        handleTyping,
        handleInputKey,
        handleSubmitLine,
        startPlaying,
        pauseGame,
        resumeGame,
    };
}
