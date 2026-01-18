import { Router, Request, Response } from 'express';
import { YtdlpService } from '../services/ytdlp.js';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function isValidYouTubeId(id: string): boolean {
    return typeof id === 'string' && YOUTUBE_ID_REGEX.test(id);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

interface ErrorResponse {
    error: string;
    code: string;
    message?: string;
}

function errorResponse(res: Response, status: number, error: string, code: string, message?: string): void {
    const response: ErrorResponse = { error, code };
    if (message) response.message = message;
    res.status(status).json(response);
}

interface SearchRequest {
    query: string;
}

interface DownloadRequest {
    videoId: string;
    trackName: string;
    artistName: string;
}

interface FetchRequest {
    trackName: string;
    artistName: string;
}

export function createAudioRouter(ytdlpService: YtdlpService): Router {
    const audioRouter = Router();

    audioRouter.use((req, res, next) => {
        console.log(`\n📨 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        console.log(`   Body:`, JSON.stringify(req.body, null, 2));
        next();
    });

    audioRouter.post('/search', async (req: Request<Record<string, never>, Record<string, never>, SearchRequest>, res: Response) => {
        try {
            const { query } = req.body;

            if (!isNonEmptyString(query)) {
                console.log('❌ Search error: Query is required');
                errorResponse(res, 400, 'Query is required', 'INVALID_QUERY');
                return;
            }

            if (query.length > 200) {
                console.log('❌ Search error: Query too long');
                errorResponse(res, 400, 'Query too long (max 200 characters)', 'QUERY_TOO_LONG');
                return;
            }

            console.log(`🔍 Searching YouTube for: "${query}"`);
            const startTime = Date.now();

            const results = await ytdlpService.searchYouTube(query);

            console.log(`✅ Search completed in ${Date.now() - startTime}ms`);
            console.log(`   Found ${results.length} results`);
            results.forEach((r, i) => console.log(`   ${i + 1}. ${r.title} (${r.duration}s)`));

            res.json({ results });
        } catch (error) {
            console.error('❌ Search error:', error);
            errorResponse(res, 500, 'Failed to search YouTube', 'SEARCH_FAILED',
                error instanceof Error ? error.message : 'Unknown error');
        }
    });

    audioRouter.get('/search', async (req: Request, res: Response) => {
        try {
            const query = req.query.q as string;

            if (!isNonEmptyString(query)) {
                console.log('❌ Search error: Query is required');
                errorResponse(res, 400, 'Query parameter "q" is required', 'INVALID_QUERY');
                return;
            }

            if (query.length > 200) {
                console.log('❌ Search error: Query too long');
                errorResponse(res, 400, 'Query too long (max 200 characters)', 'QUERY_TOO_LONG');
                return;
            }

            console.log(`🔍 Searching YouTube for: "${query}"`);
            const startTime = Date.now();

            const results = await ytdlpService.searchYouTube(query);

            console.log(`✅ Search completed in ${Date.now() - startTime}ms`);
            console.log(`   Found ${results.length} results`);

            res.json({ results });
        } catch (error) {
            console.error('❌ Search error:', error);
            errorResponse(res, 500, 'Failed to search YouTube', 'SEARCH_FAILED',
                error instanceof Error ? error.message : 'Unknown error');
        }
    });

    audioRouter.post('/download', async (req: Request<Record<string, never>, Record<string, never>, DownloadRequest>, res: Response) => {
        try {
            const { videoId, trackName, artistName } = req.body;

            if (!isNonEmptyString(videoId)) {
                console.log('❌ Download error: Video ID is required');
                errorResponse(res, 400, 'Video ID is required', 'INVALID_VIDEO_ID');
                return;
            }

            if (!isValidYouTubeId(videoId)) {
                console.log('❌ Download error: Invalid video ID format');
                errorResponse(res, 400, 'Invalid YouTube video ID format', 'INVALID_VIDEO_ID_FORMAT');
                return;
            }

            console.log(`📥 Download request for video: ${videoId}`);
            console.log(`   Track: ${trackName}, Artist: ${artistName}`);

            const cachedPath = ytdlpService.getCachedAudioPath(videoId);
            if (cachedPath) {
                console.log(`✅ Found in cache: ${cachedPath}`);
                res.json({
                    success: true,
                    audioUrl: `/audio/${videoId}.mp3`,
                    cached: true
                });
                return;
            }

            console.log('⏳ Downloading audio (not in cache)...');
            const startTime = Date.now();

            const audioPath = await ytdlpService.downloadAudio(videoId, trackName, artistName);

            console.log(`✅ Download completed in ${Date.now() - startTime}ms`);
            console.log(`   Saved to: ${audioPath}`);

            res.json({
                success: true,
                audioUrl: `/audio/${videoId}.mp3`,
                cached: false
            });
        } catch (error) {
            console.error('❌ Download error:', error);
            errorResponse(res, 500, 'Failed to download audio', 'DOWNLOAD_FAILED',
                error instanceof Error ? error.message : 'Unknown error');
        }
    });

    audioRouter.get('/status/:videoId', async (req: Request, res: Response) => {
        try {
            const { videoId } = req.params;

            if (!isValidYouTubeId(videoId)) {
                console.log('❌ Status error: Invalid video ID format');
                errorResponse(res, 400, 'Invalid YouTube video ID format', 'INVALID_VIDEO_ID_FORMAT');
                return;
            }

            console.log(`🔍 Checking cache status for: ${videoId}`);

            const cachedPath = ytdlpService.getCachedAudioPath(videoId);
            const downloadStatus = ytdlpService.getDownloadStatus(videoId);

            if (cachedPath) {
                console.log(`✅ Found in cache`);
                res.json({
                    cached: true,
                    downloading: false,
                    audioUrl: `/audio/${videoId}.mp3`
                });
            } else if (downloadStatus) {
                console.log(`⏳ Download in progress: ${downloadStatus.progress}%`);
                res.json({
                    cached: false,
                    downloading: true,
                    progress: downloadStatus.progress,
                    startedAt: downloadStatus.startedAt
                });
            } else {
                console.log(`❌ Not in cache`);
                res.json({ cached: false, downloading: false });
            }
        } catch (error) {
            console.error('❌ Status check error:', error);
            errorResponse(res, 500, 'Failed to check status', 'STATUS_CHECK_FAILED');
        }
    });

    audioRouter.post('/fetch', async (req: Request<Record<string, never>, Record<string, never>, FetchRequest>, res: Response) => {
        try {
            const { trackName, artistName } = req.body;

            if (!isNonEmptyString(trackName) || !isNonEmptyString(artistName)) {
                console.log('❌ Fetch error: Track name and artist name are required');
                errorResponse(res, 400, 'Track name and artist name are required', 'INVALID_REQUEST');
                return;
            }

            if (trackName.length > 200 || artistName.length > 200) {
                console.log('❌ Fetch error: Track/artist name too long');
                errorResponse(res, 400, 'Track or artist name too long (max 200 characters)', 'INPUT_TOO_LONG');
                return;
            }

            const query = `${artistName} - ${trackName} audio`;
            console.log(`🎵 Auto-fetching: ${query}`);

            const results = await ytdlpService.searchYouTube(query);

            if (results.length === 0) {
                console.log('❌ No results found on YouTube');
                errorResponse(res, 404, 'No results found on YouTube', 'NO_RESULTS');
                return;
            }

            const bestMatch = results[0];
            console.log(`✅ Best match: ${bestMatch.title}`);

            const cachedPath = ytdlpService.getCachedAudioPath(bestMatch.id);
            if (cachedPath) {
                console.log(`✅ Found in cache: ${bestMatch.id}`);
                res.json({
                    success: true,
                    audioUrl: `/audio/${bestMatch.id}.mp3`,
                    videoId: bestMatch.id,
                    videoTitle: bestMatch.title,
                    videoDuration: bestMatch.duration,
                    videoChannel: bestMatch.channel,
                    cached: true
                });
                return;
            }

            console.log('⏳ Downloading...');
            await ytdlpService.downloadAudio(bestMatch.id, trackName, artistName);

            console.log('✅ Auto-fetch completed');
            res.json({
                success: true,
                audioUrl: `/audio/${bestMatch.id}.mp3`,
                videoId: bestMatch.id,
                videoTitle: bestMatch.title,
                videoDuration: bestMatch.duration,
                videoChannel: bestMatch.channel,
                cached: false
            });
        } catch (error) {
            console.error('❌ Fetch error:', error);
            errorResponse(res, 500, 'Failed to fetch audio', 'FETCH_FAILED',
                error instanceof Error ? error.message : 'Unknown error');
        }
    });

    return audioRouter;
}
