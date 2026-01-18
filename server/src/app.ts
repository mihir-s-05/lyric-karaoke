import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAudioRouter } from './routes/audio.js';
import { YtdlpService } from './services/ytdlp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
    cacheDir?: string;
    corsOrigins?: string[];
}

export function createApp(options: ServerOptions = {}) {
    const app = express();
    const cacheDir = options.cacheDir ?? path.join(__dirname, '..', 'cache');
    const ytdlpService = new YtdlpService({ cacheDir });

    const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'null'];
    const allowedOrigins = new Set([
        ...defaultOrigins,
        ...(options.corsOrigins ?? [])
    ]);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (allowedOrigins.has(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST'],
    }));
    app.use(express.json());

    app.use('/audio', express.static(cacheDir, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.mp3')) {
                res.set('Content-Type', 'audio/mpeg');
            }
            res.set('Cache-Control', 'public, max-age=86400');
        }
    }));

    app.use('/api/audio', createAudioRouter(ytdlpService));

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

    return { app, cacheDir, ytdlpService };
}
