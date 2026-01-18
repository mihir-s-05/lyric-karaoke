import { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

interface YouTubeResult {
    id: string;
    title: string;
    duration: number;
    channel: string;
    thumbnail: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';
const API_ORIGIN = API_BASE.startsWith('/')
    ? (window.location.origin === 'null' ? 'http://localhost:3001' : window.location.origin)
    : new URL(API_BASE).origin;

export function AudioUpload() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [youtubeResults, setYoutubeResults] = useState<YouTubeResult[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<YouTubeResult | null>(null);
    const downloadPollRef = useRef<number | null>(null);

    const { setAudioSource, audioSource, currentSong, youtubeInfo, setYoutubeInfo } = useGameStore();

    const handleFile = useCallback((file: File) => {
        const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/aac'];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm|m4a|aac)$/i)) {
            alert('Please upload a valid audio file (MP3, WAV, OGG, M4A, AAC)');
            return;
        }

        const url = URL.createObjectURL(file);
        setAudioSource({ type: 'file', file, url }, url);
        setYoutubeResults([]);
        setSelectedVideo(null);
    }, [setAudioSource]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleClick = () => fileInputRef.current?.click();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    useEffect(() => {
        return () => {
            if (downloadPollRef.current) {
                clearInterval(downloadPollRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const autoFetchAudio = async () => {
            if (!currentSong || audioSource || isDownloading) return;

            setIsSearching(true);
            try {
                const response = await fetch(`${API_BASE}/audio/fetch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trackName: currentSong.trackName,
                        artistName: currentSong.artistName,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.audioUrl) {
                        const fullUrl = `${API_ORIGIN}${data.audioUrl}`;
                        setAudioSource({
                            type: 'youtube',
                            videoId: data.videoId,
                            url: fullUrl
                        }, fullUrl);

                        setYoutubeInfo({
                            videoId: data.videoId,
                            videoTitle: data.videoTitle,
                            videoDuration: data.videoDuration,
                            videoChannel: data.videoChannel,
                        });
                        return;
                    }
                }
            } catch (error) {
                console.error('Auto-fetch failed:', error);
            } finally {
                setIsSearching(false);
            }
        };

        autoFetchAudio();
    }, [currentSong, audioSource, isDownloading, setAudioSource, setYoutubeInfo]);

    const handleYouTubeSearch = async () => {
        if (!currentSong) return;

        setIsSearching(true);
        setSearchError(null);
        setYoutubeResults([]);

        try {
            const query = `${currentSong.artistName} - ${currentSong.trackName} audio`;

            const response = await fetch(`${API_BASE}/audio/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Search failed');
            }

            const data = await response.json();

            const uniqueResults = (data.results || []).filter((item: YouTubeResult, index: number, self: YouTubeResult[]) =>
                index === self.findIndex((t) => t.id === item.id)
            );

            setYoutubeResults(uniqueResults);

            if (uniqueResults.length === 0) {
                setSearchError('No results found. Try uploading an audio file instead.');
            }
        } catch (error) {
            console.error('YouTube search error:', error);
            setSearchError(
                error instanceof Error
                    ? error.message
                    : 'Failed to search YouTube. Make sure the server is running.'
            );
        } finally {
            setIsSearching(false);
        }
    };

    const pollDownloadProgress = useCallback((videoId: string) => {
        downloadPollRef.current = window.setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/audio/status/${videoId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.cached) {
                        if (downloadPollRef.current) {
                            clearInterval(downloadPollRef.current);
                            downloadPollRef.current = null;
                        }
                        setDownloadProgress(100);
                    } else if (data.downloading) {
                        setDownloadProgress(data.progress || 0);
                    }
                }
            } catch (error) {
                console.error('Progress poll error:', error);
            }
        }, 500);
    }, []);

    const handleDownload = async (video: YouTubeResult) => {
        if (isDownloading) return;

        setIsDownloading(true);
        setSelectedVideo(video);
        setSearchError(null);
        setDownloadProgress(0);

        pollDownloadProgress(video.id);

        try {
            const response = await fetch(`${API_BASE}/audio/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: video.id,
                    trackName: currentSong?.trackName,
                    artistName: currentSong?.artistName,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Download failed');
            }

            const data = await response.json();

            if (downloadPollRef.current) {
                clearInterval(downloadPollRef.current);
                downloadPollRef.current = null;
            }

            const audioUrl = `${API_ORIGIN}${data.audioUrl}`;
            setAudioSource({ type: 'youtube', videoId: video.id, url: audioUrl }, audioUrl);

            setYoutubeInfo({
                videoId: video.id,
                videoTitle: video.title,
                videoDuration: video.duration,
                videoChannel: video.channel,
            });

            setYoutubeResults([]);
        } catch (error) {
            if (downloadPollRef.current) {
                clearInterval(downloadPollRef.current);
                downloadPollRef.current = null;
            }

            console.error('Download error:', error);
            setSearchError(
                error instanceof Error
                    ? error.message
                    : 'Failed to download audio. Try another result or upload manually.'
            );
            setSelectedVideo(null);
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!currentSong) return null;

    return (
        <div className="w-full space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleInputChange}
                className="hidden"
            />


            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
          relative p-6 rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-300
          ${isDragging
                        ? 'border-blue-400 bg-blue-500/10'
                        : audioSource?.type === 'file'
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
                    }
        `}
            >
                <div className="text-center">
                    {audioSource?.type === 'file' ? (
                        <>
                            <div className="text-4xl mb-2">🎵</div>
                            <p className="text-emerald-400 font-medium">{audioSource.file.name}</p>
                            <p className="text-sm text-slate-400 mt-1">Click to change audio file</p>
                        </>
                    ) : (
                        <>
                            <div className="text-4xl mb-2">📁</div>
                            <p className="text-slate-300 font-medium">Drop audio file here or click to browse</p>
                            <p className="text-sm text-slate-500 mt-1">Supports MP3, WAV, OGG, M4A, AAC</p>
                        </>
                    )}
                </div>
            </div>


            <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-700"></div>
                <span className="text-slate-500 text-sm">OR</span>
                <div className="flex-1 h-px bg-slate-700"></div>
            </div>


            <button
                onClick={handleYouTubeSearch}
                disabled={isSearching || isDownloading}
                className="w-full p-4 rounded-xl glass glass-hover border border-slate-600 hover:border-red-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="flex items-center justify-center gap-3">
                    {isSearching ? (
                        <svg className="animate-spin h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                    )}
                    <span className="text-slate-300">
                        {isSearching ? 'Searching YouTube...' : 'Search YouTube for Audio'}
                    </span>
                </div>
            </button>


            {audioSource?.type === 'youtube' && youtubeInfo && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/50">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-emerald-400 font-medium truncate text-sm">{youtubeInfo.videoTitle || 'YouTube Audio'}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                {youtubeInfo.videoChannel && <span className="truncate">{youtubeInfo.videoChannel}</span>}
                                {youtubeInfo.videoDuration && (
                                    <>
                                        <span className="text-slate-600">•</span>
                                        <span>{formatDuration(youtubeInfo.videoDuration)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                Ready
                            </span>
                        </div>
                    </div>
                </div>
            )}


            {isDownloading && selectedVideo && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/50">
                    <div className="flex items-center gap-3 mb-2">
                        <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div className="flex-1 min-w-0">
                            <p className="text-blue-400 font-medium truncate text-sm">{selectedVideo.title}</p>
                            <p className="text-xs text-slate-400">Downloading audio...</p>
                        </div>
                        <span className="text-sm font-mono text-blue-400">{Math.round(downloadProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}


            {searchError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/50 text-rose-300 text-sm">
                    {searchError}
                </div>
            )}


            {youtubeResults.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm text-slate-400">Select a result to download:</p>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                        {youtubeResults.map((video) => (
                            <button
                                key={video.id}
                                onClick={() => handleDownload(video)}
                                disabled={isDownloading}
                                className={`w-full p-3 rounded-lg glass glass-hover text-left transition-all duration-300 flex items-center gap-3 disabled:opacity-50 ${isDownloading && selectedVideo?.id === video.id
                                    ? 'border border-blue-500/50'
                                    : ''
                                    }`}
                            >

                                {video.thumbnail && (
                                    <img
                                        src={video.thumbnail}
                                        alt=""
                                        className="w-16 h-12 object-cover rounded"
                                    />
                                )}


                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate text-sm">
                                        {video.title}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {video.channel} • {formatDuration(video.duration)}
                                    </p>
                                </div>


                                {isDownloading && selectedVideo?.id === video.id ? (
                                    <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}


            <p className="text-xs text-slate-600 text-center">
                YouTube audio requires the backend server running on port 3001
            </p>
        </div>
    );
}
