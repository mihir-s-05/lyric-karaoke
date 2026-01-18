import { useState, useCallback, useEffect, useRef } from 'react';
import { useLyrics } from '../hooks/useLyrics';
import { useGameStore } from '../stores/gameStore';
import { parseLRC } from '../utils/lrcParser';
import type { SearchResult } from '../types';

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate a deterministic gradient based on string (for consistent "cover art")
function getGradient(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = Math.abs(hash % 360);
    const c2 = Math.abs((hash + 40) % 360);
    return `linear-gradient(135deg, hsl(${c1}, 70%, 20%) 0%, hsl(${c2}, 70%, 15%) 100%)`;
}

export function SongSearch() {
    const [query, setQuery] = useState('');
    const { searchResults, isSearching, searchError, searchSongs } = useLyrics();
    const { setSong, currentSong } = useGameStore();
    const debounceRef = useRef<number | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim()) {
            debounceRef.current = window.setTimeout(() => searchSongs(query), 300);
        }
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, searchSongs]);

    const handleSelectSong = useCallback((song: SearchResult) => {
        if (!song.syncedLyrics) return;
        const lyrics = parseLRC(song.syncedLyrics);
        setSong({
            id: song.id,
            name: song.name,
            trackName: song.trackName,
            artistName: song.artistName,
            albumName: song.albumName,
            duration: song.duration,
            instrumental: song.instrumental,
            syncedLyrics: song.syncedLyrics,
        }, lyrics);
    }, [setSong]);

    return (
        <div className="w-full max-w-5xl mx-auto px-4">
            {/* Search Header */}
            <div className="relative mb-12 text-center">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="SEARCH SONG DATABASE..."
                    className="w-full max-w-2xl px-8 py-5 text-xl font-display tracking-widest bg-deep-surface border-2 border-white/10 rounded-full focus:border-neon-blue focus:box-glow outline-none transition-all placeholder:text-white/20 text-white uppercase"
                />
                <div className="absolute right-[calc(50%-18rem)] top-1/2 -translate-y-1/2 text-neon-blue">
                    {isSearching ? (
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-6 w-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {searchError && (
                <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/50 rounded-lg text-rose-400 text-center font-mono">
                    ERROR: {searchError}
                </div>
            )}

            {/* Song Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((song) => (
                    <button
                        key={song.id}
                        onClick={() => handleSelectSong(song)}
                        className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:box-glow ${currentSong?.id === song.id
                                ? 'ring-2 ring-neon-blue ring-offset-4 ring-offset-deep-bg scale-[1.02]'
                                : 'hover:ring-1 hover:ring-white/20'
                            }`}
                    >
                        {/* Background "Cover Art" */}
                        <div
                            className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                            style={{ background: getGradient(song.trackName + song.artistName) }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-deep-bg via-deep-bg/80 to-transparent" />

                        {/* Content */}
                        <div className="relative p-6 h-48 flex flex-col justify-end text-left">
                            <div className="mb-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-2 group-hover:translate-y-0">
                                {song.syncedLyrics && (
                                    <span className="inline-block px-3 py-1 text-[10px] font-bold tracking-wider rounded-full bg-neon-green/20 text-neon-green border border-neon-green/30 uppercase">
                                        Sync Ready
                                    </span>
                                )}
                            </div>

                            <h3 className="font-display font-bold text-xl text-white mb-1 line-clamp-1 group-hover:text-neon-blue transition-colors text-glow">
                                {song.trackName}
                            </h3>
                            <p className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                                {song.artistName}
                            </p>

                            <div className="flex items-center gap-4 text-xs font-mono text-white/40 border-t border-white/10 pt-3">
                                <span>⏱ {formatDuration(song.duration)}</span>
                                {song.albumName && <span className="truncate max-w-[120px]">{song.albumName}</span>}
                            </div>
                        </div>

                        {/* Selection Indicator */}
                        {currentSong?.id === song.id && (
                            <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-neon-blue shadow-[0_0_10px_#00f3ff] animate-pulse"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Empty States */}
            {query && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-20 opacity-50">
                    <div className="font-display text-4xl mb-2 text-white/20">NO DATA FOUND</div>
                    <p className="text-white/40 font-mono">Query returned 0 results</p>
                </div>
            )}

            {!query && (
                <div className="text-center py-32 opacity-30 animate-pulse-fast">
                    <div className="font-display text-6xl mb-4 tracking-tighter">WAITING FOR INPUT</div>
                    <p className="font-mono text-neon-blue">/// ENTER TRACK IDENTIFIER TO INITIALIZE SCAN</p>
                </div>
            )}
        </div>
    );
}
