import { create } from 'zustand';
import type {
    GameState,
    Difficulty,
    LineResult,
    SongInfo,
    ParsedLyrics,
    AudioSource,
} from '../types';
import { getSettings, saveSettings } from '../utils/storage';

export type TypingMode = 'normal' | 'strict' | 'assist';

interface GameStore extends GameState {
    currentSong: SongInfo | null;
    lyrics: ParsedLyrics | null;
    audioSource: AudioSource | null;
    audioUrl: string | null;

    lyricsOffset: number;
    typingMode: TypingMode;

    youtubeInfo: {
        videoId?: string;
        videoTitle?: string;
        videoDuration?: number;
        videoChannel?: string;
    } | null;

    showAutoSubmitNotification: boolean;

    setDifficulty: (difficulty: Difficulty) => void;
    setSong: (song: SongInfo, lyrics: ParsedLyrics) => void;
    setAudioSource: (source: AudioSource, url: string) => void;
    setYoutubeInfo: (info: { videoId?: string; videoTitle?: string; videoDuration?: number; videoChannel?: string } | null) => void;
    setLyricsOffset: (offset: number) => void;
    setTypingMode: (mode: TypingMode) => void;
    setShowAutoSubmitNotification: (show: boolean) => void;
    startGame: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
    updateCurrentTime: (time: number) => void;
    setCurrentLineIndex: (index: number) => void;
    setIsLineCompleted: (completed: boolean) => void;
    setTypedText: (text: string) => void;
    submitLine: (result: LineResult) => void;
    finishGame: () => void;
    resetGame: () => void;
}

const initialState: GameState = {
    status: 'idle',
    difficulty: getSettings().difficulty,
    currentLineIndex: -1,
    typedText: '',
    score: 0,
    combo: 0,
    maxCombo: 0,
    isLineCompleted: false,
    lineResults: [],
    startTime: null,
    currentTime: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
    ...initialState,
    currentSong: null,
    lyrics: null,
    audioSource: null,
    audioUrl: null,
    lyricsOffset: 0,
    typingMode: 'normal',
    youtubeInfo: null,
    showAutoSubmitNotification: false,

    setDifficulty: (difficulty) => {
        saveSettings({ difficulty });
        set({ difficulty });
    },

    setSong: (song, lyrics) => {
        set({
            currentSong: song,
            lyrics,
            status: 'idle',
            audioSource: null,
            audioUrl: null,
            youtubeInfo: null,
        });
    },

    setAudioSource: (source, url) => {
        set({
            audioSource: source,
            audioUrl: url,
            status: 'idle',
        });
    },

    setYoutubeInfo: (info) => {
        set({ youtubeInfo: info });
    },

    setLyricsOffset: (offset) => {
        const clampedOffset = Math.max(-2000, Math.min(2000, offset));
        set({ lyricsOffset: clampedOffset });
    },

    setTypingMode: (mode) => {
        set({ typingMode: mode });
    },

    setShowAutoSubmitNotification: (show) => {
        set({ showAutoSubmitNotification: show });
    },

    startGame: () => {
        set({
            status: 'countdown',
            currentLineIndex: -1,
            typedText: '',
            score: 0,
            combo: 0,
            maxCombo: 0,
            isLineCompleted: false,
            lineResults: [],
            startTime: null,
            currentTime: 0,
        });
    },

    pauseGame: () => {
        if (get().status === 'playing') {
            set({ status: 'paused' });
        }
    },

    resumeGame: () => {
        if (get().status === 'paused') {
            set({ status: 'playing' });
        }
    },

    updateCurrentTime: (time) => {
        const state = get();
        if (state.startTime === null && state.status === 'playing') {
            set({ startTime: Date.now(), currentTime: time });
        } else {
            set({ currentTime: time });
        }
    },

    setCurrentLineIndex: (index) => {
        set({
            currentLineIndex: index,
            isLineCompleted: false,
            typedText: '',
        });
    },

    setIsLineCompleted: (completed) => {
        set({ isLineCompleted: completed });
    },

    setTypedText: (text) => {
        set({ typedText: text });
    },

    submitLine: (result) => {
        const state = get();
        const newMaxCombo = Math.max(state.maxCombo, result.combo);
        set({
            lineResults: [...state.lineResults, result],
            score: state.score + result.score,
            combo: result.combo,
            maxCombo: newMaxCombo,
            typedText: '',
        });
    },

    finishGame: () => {
        set({ status: 'finished' });
    },

    resetGame: () => {
        set({
            ...initialState,
            difficulty: get().difficulty,
            currentSong: null,
            lyrics: null,
            audioSource: null,
            audioUrl: null,
            lyricsOffset: 0,
            typingMode: 'normal',
            youtubeInfo: null,
            showAutoSubmitNotification: false,
        });
    },
}));
