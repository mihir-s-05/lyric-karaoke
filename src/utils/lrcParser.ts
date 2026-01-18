import type { LyricLine, ParsedLyrics } from '../types';

/**
 * Parse LRC format lyrics into structured data
 * LRC format example:
 * [00:12.00]Hello, it's me
 * [00:17.50]I was wondering if after all these years
 */
export function parseLRC(lrcContent: string): ParsedLyrics {
    const lines: LyricLine[] = [];
    const metadata: ParsedLyrics['metadata'] = {};

    // Split by newlines and process each line
    const lrcLines = lrcContent.split(/\r?\n/);

    for (const line of lrcLines) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Check for metadata tags like [ar:Artist] [ti:Title] [al:Album]
        const metadataMatch = line.match(/^\[([a-z]+):(.+)\]$/i);
        if (metadataMatch) {
            const [, tag, value] = metadataMatch;
            switch (tag.toLowerCase()) {
                case 'ar':
                    metadata.artist = value.trim();
                    break;
                case 'ti':
                    metadata.title = value.trim();
                    break;
                case 'al':
                    metadata.album = value.trim();
                    break;
                case 'length':
                    {
                        // Parse duration in mm:ss format
                        const durationMatch = value.match(/(\d+):(\d+)/);
                        if (durationMatch) {
                            metadata.duration = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);
                        }
                        break;
                    }
            }
            continue;
        }

        // Parse timestamp and lyrics: [mm:ss.xx]lyrics
        // Supports multiple timestamps on same line: [00:12.00][00:24.00]lyrics
        const timestampRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
        const timestamps: number[] = [];
        let match;

        while ((match = timestampRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            // Handle both .xx (centiseconds) and .xxx (milliseconds) formats
            let milliseconds = parseInt(match[3]);
            if (match[3].length === 2) {
                milliseconds *= 10; // Convert centiseconds to milliseconds
            }

            const timeMs = (minutes * 60 + seconds) * 1000 + milliseconds;
            timestamps.push(timeMs);
        }

        // Extract the lyrics text (everything after the timestamps)
        const lyricsText = line.replace(timestampRegex, '').trim();

        // Skip lines with no text (instrumental markers, etc.)
        if (!lyricsText) continue;

        // Create a lyric line for each timestamp
        for (const time of timestamps) {
            lines.push({
                time,
                text: lyricsText,
            });
        }
    }

    // Sort by time
    lines.sort((a, b) => a.time - b.time);

    // Calculate end times based on next line's start time
    for (let i = 0; i < lines.length; i++) {
        if (i < lines.length - 1) {
            lines[i].endTime = lines[i + 1].time;
        } else {
            // Last line: estimate end time as 5 seconds after start
            lines[i].endTime = lines[i].time + 5000;
        }
    }

    return { lines, metadata };
}

/**
 * Find the current lyric line index based on playback time
 */
export function getCurrentLineIndex(lines: LyricLine[], currentTimeMs: number): number {
    // Find the last line that has started
    for (let i = lines.length - 1; i >= 0; i--) {
        if (currentTimeMs >= lines[i].time) {
            return i;
        }
    }
    return -1; // Before first line
}

/**
 * Calculate time remaining for the current line
 */
export function getTimeRemainingForLine(line: LyricLine, currentTimeMs: number): number {
    if (!line.endTime) return 0;
    return Math.max(0, line.endTime - currentTimeMs);
}

/**
 * Format milliseconds to mm:ss display
 */
export function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
