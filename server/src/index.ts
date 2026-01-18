import { createApp } from './app.js';

const PORT = process.env.PORT || 3001;

const { app, cacheDir, ytdlpService } = createApp();

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
