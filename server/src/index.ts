import express from 'express';
import cors from 'cors';
import { audioRouter } from './routes/audio.js';
import { YtdlpService } from './services/ytdlp.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Create ytdlp service for health checks
const ytdlpService = new YtdlpService();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
}));
app.use(express.json());

// Serve cached audio files with cache headers
const cacheDir = path.join(__dirname, '..', 'cache');
app.use('/audio', express.static(cacheDir, {
    maxAge: '1d',  // Cache for 1 day
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Set content type for mp3 files
        if (filePath.endsWith('.mp3')) {
            res.set('Content-Type', 'audio/mpeg');
        }
        // Add cache control headers
        res.set('Cache-Control', 'public, max-age=86400');
    }
}));

// Routes
app.use('/api/audio', audioRouter);

// Health check with dependency status
app.get('/api/health', (req, res) => {
    const dependencies = ytdlpService.getDependencyStatus();
    const cacheStats = ytdlpService.getCacheStats();

    const healthy = dependencies.python && dependencies.ytdlp;

    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        dependencies: {
            python: dependencies.python ? 'available' : 'missing',
            ytdlp: dependencies.ytdlp ? 'available' : 'missing (pip install yt-dlp)'
        },
        cache: {
            files: cacheStats.fileCount,
            sizeMB: cacheStats.totalSizeMB
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎵 Lyric Karaoke Server running on http://localhost:${PORT}`);
    console.log(`📁 Audio cache directory: ${cacheDir}`);

    const deps = ytdlpService.getDependencyStatus();
    if (!deps.python) {
        console.log('⚠️  Python is not available - YouTube downloads will not work');
    }
    if (!deps.ytdlp) {
        console.log('⚠️  yt-dlp is not available - run: pip install yt-dlp');
    }
});
