import { useRef, useCallback, useEffect, useState } from 'react';
import { Howl } from 'howler';

// Throttle interval for store updates (reduces React re-renders)
const STORE_UPDATE_INTERVAL_MS = 150;

interface UseAudioSyncReturn {
    isLoading: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    error: string | null;
    playbackRate: number;
    volume: number;
    isMuted: boolean;
    // Direct access to current time without causing re-renders (for progress bar)
    getCurrentTime: () => number;
    loadAudio: (url: string) => void;
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    setPlaybackRate: (rate: number) => void;
    unload: () => void;
}

export function useAudioSync(): UseAudioSyncReturn {
    const howlRef = useRef<Howl | null>(null);
    const rafRef = useRef<number | null>(null);
    const playbackRateRef = useRef<number>(1.0);
    const lastUpdateTimeRef = useRef<number>(0);
    const currentTimeRef = useRef<number>(0);

    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [playbackRate, setPlaybackRateState] = useState(1.0);
    const [volume, setVolumeState] = useState(0.7);
    const [isMuted, setIsMuted] = useState(false);

    // Get current time directly without triggering re-render (for progress bar)
    const getCurrentTime = useCallback(() => {
        if (howlRef.current) {
            return (howlRef.current.seek() as number) * 1000;
        }
        return currentTimeRef.current;
    }, []);

    // Update current time using requestAnimationFrame but throttle state updates
    const updateTime = useCallback(function updateTime() {
        if (howlRef.current && howlRef.current.playing()) {
            const time = (howlRef.current.seek() as number) * 1000; // Convert to milliseconds
            currentTimeRef.current = time;

            // Only update React state every STORE_UPDATE_INTERVAL_MS to reduce re-renders
            const now = Date.now();
            if (now - lastUpdateTimeRef.current >= STORE_UPDATE_INTERVAL_MS) {
                setCurrentTime(time);
                lastUpdateTimeRef.current = now;
            }

            rafRef.current = requestAnimationFrame(updateTime);
        }
    }, []);

    const loadAudio = useCallback((url: string) => {
        // Unload previous audio
        if (howlRef.current) {
            howlRef.current.unload();
        }
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        setIsLoading(true);
        setError(null);
        setCurrentTime(0);
        setDuration(0);

        howlRef.current = new Howl({
            src: [url],
            html5: true, // Use HTML5 audio for better streaming support
            preload: true,
            volume: isMuted ? 0 : volume,
            onload: () => {
                setIsLoading(false);
                setDuration((howlRef.current?.duration() || 0) * 1000);
                // Apply the stored playback rate to the newly loaded audio
                if (howlRef.current && playbackRateRef.current !== 1.0) {
                    howlRef.current.rate(playbackRateRef.current);
                }
            },
            onloaderror: (_, err) => {
                setIsLoading(false);
                setError(`Failed to load audio: ${err}`);
            },
            onplay: () => {
                setIsPlaying(true);
                rafRef.current = requestAnimationFrame(updateTime);
            },
            onpause: () => {
                setIsPlaying(false);
                if (rafRef.current) {
                    cancelAnimationFrame(rafRef.current);
                }
            },
            onstop: () => {
                setIsPlaying(false);
                setCurrentTime(0);
                if (rafRef.current) {
                    cancelAnimationFrame(rafRef.current);
                }
            },
            onend: () => {
                setIsPlaying(false);
                if (rafRef.current) {
                    cancelAnimationFrame(rafRef.current);
                }
            },
        });
    }, [isMuted, updateTime, volume]);

    const play = useCallback(() => {
        if (howlRef.current && !isLoading) {
            howlRef.current.play();
        }
    }, [isLoading]);

    const pause = useCallback(() => {
        if (howlRef.current) {
            howlRef.current.pause();
        }
    }, []);

    const seek = useCallback((timeMs: number) => {
        if (howlRef.current) {
            howlRef.current.seek(timeMs / 1000);
            setCurrentTime(timeMs);
        }
    }, []);

    const setVolume = useCallback((vol: number) => {
        setVolumeState(vol);
        if (howlRef.current) {
            howlRef.current.volume(isMuted ? 0 : vol);
        }
    }, [isMuted]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newMuted = !prev;
            if (howlRef.current) {
                howlRef.current.volume(newMuted ? 0 : volume);
            }
            return newMuted;
        });
    }, [volume]);

    const setPlaybackRate = useCallback((rate: number) => {
        setPlaybackRateState(rate);
        playbackRateRef.current = rate;
        if (howlRef.current) {
            howlRef.current.rate(rate);
        }
    }, []);

    const unload = useCallback(() => {
        if (howlRef.current) {
            howlRef.current.unload();
            howlRef.current = null;
        }
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (howlRef.current) {
                howlRef.current.unload();
            }
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return {
        isLoading,
        isPlaying,
        currentTime,
        duration,
        error,
        playbackRate,
        volume,
        isMuted,
        getCurrentTime,
        loadAudio,
        play,
        pause,
        seek,
        setVolume,
        toggleMute,
        setPlaybackRate,
        unload,
    };
}
