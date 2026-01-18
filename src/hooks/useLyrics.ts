import { useState, useCallback, useRef } from 'react';
import type { SearchResult } from '../types';

const LRCLIB_BASE_URL = 'https://lrclib.net/api';

interface UseLyricsReturn {
    searchResults: SearchResult[];
    isSearching: boolean;
    searchError: string | null;
    searchSongs: (query: string) => Promise<void>;
    cancelSearch: () => void;
    getSyncedLyrics: (trackName: string, artistName: string, albumName?: string, duration?: number) => Promise<string | null>;
}

export function useLyrics(): UseLyricsReturn {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // AbortController to cancel stale requests
    const abortControllerRef = useRef<AbortController | null>(null);
    // Track the current search query to prevent stale results
    const currentQueryRef = useRef<string>('');

    const cancelSearch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const searchSongs = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            currentQueryRef.current = '';
            return;
        }

        // Cancel any previous in-flight request
        cancelSearch();

        // Create new abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        currentQueryRef.current = query;

        setIsSearching(true);
        setSearchError(null);

        try {
            const response = await fetch(
                `${LRCLIB_BASE_URL}/search?q=${encodeURIComponent(query)}`,
                { signal: abortController.signal }
            );

            // Check if this is still the current query (prevent stale results)
            if (currentQueryRef.current !== query) {
                return;
            }

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();

            // Filter to only include songs with synced lyrics and deduplicate by ID
            const uniqueSongs = new Map();
            data.forEach((song: SearchResult) => {
                if (song.syncedLyrics && !uniqueSongs.has(song.id)) {
                    uniqueSongs.set(song.id, song);
                }
            });
            const songsWithSyncedLyrics = Array.from(uniqueSongs.values());

            setSearchResults(songsWithSyncedLyrics);
        } catch (error) {
            // Ignore abort errors (they're expected when canceling)
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            console.error('Search error:', error);
            setSearchError(error instanceof Error ? error.message : 'Search failed');
            setSearchResults([]);
        } finally {
            // Only update isSearching if this is still the current query
            if (currentQueryRef.current === query) {
                setIsSearching(false);
            }
        }
    }, [cancelSearch]);

    const getSyncedLyrics = useCallback(async (
        trackName: string,
        artistName: string,
        albumName?: string,
        duration?: number
    ): Promise<string | null> => {
        try {
            const params = new URLSearchParams({
                track_name: trackName,
                artist_name: artistName,
            });

            if (albumName) {
                params.append('album_name', albumName);
            }

            if (duration) {
                params.append('duration', duration.toString());
            }

            const response = await fetch(`${LRCLIB_BASE_URL}/get?${params}`);

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`Failed to fetch lyrics: ${response.statusText}`);
            }

            const data = await response.json();
            return data.syncedLyrics || null;
        } catch (error) {
            console.error('Lyrics fetch error:', error);
            return null;
        }
    }, []);

    return {
        searchResults,
        isSearching,
        searchError,
        searchSongs,
        cancelSearch,
        getSyncedLyrics,
    };
}
