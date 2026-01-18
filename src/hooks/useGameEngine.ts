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

    useEffect(() => {
        if (audio.isPlaying) {
            updateCurrentTime(audio.currentTime);
        }
    }, [audio.currentTime, audio.isPlaying, updateCurrentTime]);

    useEffect(() => {
        if (status !== 'playing' || !lyrics) return;

        const adjustedTime = audio.currentTime + lyricsOffset;
        const newIndex = getCurrentLineIndex(lyrics.lines, adjustedTime);

        if (newIndex !== currentLineIndex && newIndex >= 0) {
            if (currentLineIndex >= 0 && currentLineIndex < lyrics.lines.length) {
                const currentLine = lyrics.lines[currentLineIndex];

                const alreadySubmitted = lineResults.some(r => r.lineIndex === currentLineIndex);
                if (!alreadySubmitted) {
                    const result = calculateLineScore(
                        typedText,
                        currentLine.text,
                        audio.currentTime,
                        currentLine.time,
                        combo,
                        difficulty
                    );

                    submitLine({
                        ...result,
                        lineIndex: currentLineIndex,
                    });

                    setShowAutoSubmitNotification(true);
                }
            }

            setCurrentLineIndex(newIndex);
        }
    }, [audio.currentTime, status, lyrics, currentLineIndex, typedText, combo, difficulty, lineResults, lyricsOffset, submitLine, setCurrentLineIndex, setShowAutoSubmitNotification]);

    useEffect(() => {
        if (typedText.length === 0) {
            lastTypedTextRef.current = '';
        }
    }, [typedText]);

    useEffect(() => {
        lastTypedTextRef.current = '';
    }, [currentLineIndex]);

    useEffect(() => {
        if (status !== 'playing' || !lyrics || !audio.duration) return;

        const lastLineIndex = lyrics.lines.length - 1;
        const lastLine = lyrics.lines[lastLineIndex];

        if (audio.currentTime >= (lastLine.endTime || audio.duration)) {
            let resultsForStats = lineResults;

            const alreadySubmitted = lineResults.some(r => r.lineIndex === lastLineIndex);
            if (!alreadySubmitted && currentLineIndex === lastLineIndex) {
                const result = calculateLineScore(
                    typedText,
                    lastLine.text,
                    audio.currentTime,
                    lastLine.time,
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

        if (useGameStore.getState().isLineCompleted) return;

        const currentLine = lyrics.lines[currentLineIndex];
        let processedText = text;

        if (typingMode === 'strict') {
            if (text.length < lastTypedTextRef.current.length) {
                processedText = lastTypedTextRef.current;
            }
        }

        if (typingMode === 'assist' && processedText.length > 0) {
            const punctuation = /[.,!?;:'"()[\]{}\-–—…]/;
            const expectedText = currentLine.text;

            let alignedText = '';
            let typedIdx = 0;
            let expectedIdx = 0;

            while (typedIdx < processedText.length && expectedIdx < expectedText.length) {
                const typedChar = processedText[typedIdx];
                const expectedChar = expectedText[expectedIdx];

                if (punctuation.test(expectedChar) && typedChar !== expectedChar) {
                    alignedText += expectedChar;
                    expectedIdx++;
                } else {
                    alignedText += typedChar;
                    typedIdx++;
                    expectedIdx++;
                }
            }

            while (expectedIdx < expectedText.length && punctuation.test(expectedText[expectedIdx])) {
                alignedText += expectedText[expectedIdx];
                expectedIdx++;
            }

            processedText = alignedText;
        }

        lastTypedTextRef.current = processedText;
        setTypedText(processedText);

        const normalizedTyped = removePunctuation(processedText).toLowerCase();
        const normalizedTarget = removePunctuation(currentLine.text).toLowerCase();

        if (normalizedTyped === normalizedTarget && normalizedTyped.length > 0) {
            useGameStore.getState().setIsLineCompleted(true);

            const currentAudioTime = audio.getCurrentTime();
            const result = calculateLineScore(
                processedText,
                currentLine.text,
                currentAudioTime,
                currentLine.time,
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
            if (state.isLineCompleted) return;

            setTypedText('');
        }
    }, [status, setTypedText]);

    const handleSubmitLine = useCallback(() => {
        if (status !== 'playing' || !lyrics || currentLineIndex < 0) return;

        const currentLine = lyrics.lines[currentLineIndex];

        const alreadySubmitted = lineResults.some(r => r.lineIndex === currentLineIndex);
        if (alreadySubmitted) return;

        const currentAudioTime = audio.getCurrentTime();
        const result = calculateLineScore(
            typedText,
            currentLine.text,
            currentAudioTime,
            currentLine.time,
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

        audio.loadAudio(audioUrl);

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
