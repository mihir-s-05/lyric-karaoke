import type { LyricLine, ParsedLyrics } from '../types';


export function parseLRC(lrcContent: string): ParsedLyrics {
    const lines: LyricLine[] = [];
    const metadata: ParsedLyrics['metadata'] = {};

    const lrcLines = lrcContent.split(/\r?\n/);

    for (const line of lrcLines) {
        if (!line.trim()) continue;

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
                        const durationMatch = value.match(/(\d+):(\d+)/);
                        if (durationMatch) {
                            metadata.duration = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);
                        }
                        break;
                    }
            }
            continue;
        }

        const timestampRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
        const timestamps: number[] = [];
        let match;

        while ((match = timestampRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            let milliseconds = parseInt(match[3]);
            if (match[3].length === 2) {
                milliseconds *= 10;
            }

            const timeMs = (minutes * 60 + seconds) * 1000 + milliseconds;
            timestamps.push(timeMs);
        }

        const lyricsText = line.replace(timestampRegex, '').trim();

        if (!lyricsText) continue;

        for (const time of timestamps) {
            lines.push({
                time,
                text: lyricsText,
            });
        }
    }

    lines.sort((a, b) => a.time - b.time);

    for (let i = 0; i < lines.length; i++) {
        if (i < lines.length - 1) {
            lines[i].endTime = lines[i + 1].time;
        } else {
            lines[i].endTime = lines[i].time + 5000;
        }
    }

    return { lines, metadata };
}


export function getCurrentLineIndex(lines: LyricLine[], currentTimeMs: number): number {
    for (let i = lines.length - 1; i >= 0; i--) {
        if (currentTimeMs >= lines[i].time) {
            return i;
        }
    }
    return -1;
}


export function getTimeRemainingForLine(line: LyricLine, currentTimeMs: number): number {
    if (!line.endTime) return 0;
    return Math.max(0, line.endTime - currentTimeMs);
}


export function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
