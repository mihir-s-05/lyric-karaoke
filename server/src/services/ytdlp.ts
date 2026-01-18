import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync, spawn, ChildProcess } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YTDLP_TIMEOUT_MS = 5 * 60 * 1000;
const SEARCH_TIMEOUT_MS = 30 * 1000;

export interface YouTubeSearchResult {
    id: string;
    title: string;
    duration: number;
    channel: string;
    thumbnail: string;
}

export interface DownloadStatus {
    videoId: string;
    progress: number;
    startedAt: number;
    process?: ChildProcess;
}

export interface YtdlpServiceOptions {
    cacheDir?: string;
}

export class YtdlpService {
    private cacheDir: string;
    private tempDir: string;
    private ytdlpAvailable: boolean = false;
    private pythonAvailable: boolean = false;

    private downloadLocks: Map<string, Promise<string>> = new Map();
    private downloadProgress: Map<string, DownloadStatus> = new Map();

    constructor(options: YtdlpServiceOptions = {}) {
        this.cacheDir = options.cacheDir ?? path.join(__dirname, '..', '..', 'cache');
        this.tempDir = path.join(this.cacheDir, '.temp');

        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
            console.log(`📁 Created cache directory: ${this.cacheDir}`);
        }
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
            console.log(`📁 Created temp directory: ${this.tempDir}`);
        }

        this.checkDependencies();
    }


    private checkDependencies(): void {
        try {
            execSync('python --version', { encoding: 'utf-8', timeout: 5000 });
            this.pythonAvailable = true;
            console.log('✅ Python is available');
        } catch {
            console.log('⚠️ Python not found in PATH');
            this.pythonAvailable = false;
        }

        if (this.pythonAvailable) {
            try {
                execSync('python -m yt_dlp --version', { encoding: 'utf-8', timeout: 5000 });
                this.ytdlpAvailable = true;
                console.log('✅ yt-dlp module is available');
            } catch {
                console.log('⚠️ yt-dlp module not available (pip install yt-dlp)');
                this.ytdlpAvailable = false;
            }
        }
    }


    getDependencyStatus(): { python: boolean; ytdlp: boolean } {
        return {
            python: this.pythonAvailable,
            ytdlp: this.ytdlpAvailable
        };
    }


    getDownloadStatus(videoId: string): DownloadStatus | null {
        return this.downloadProgress.get(videoId) || null;
    }


    private async execYtdlp(
        args: string[],
        options: { timeout?: number; onProgress?: (progress: number) => void } = {}
    ): Promise<{ stdout: string; stderr: string }> {
        const timeout = options.timeout || YTDLP_TIMEOUT_MS;

        if (!this.ytdlpAvailable) {
            throw new Error('yt-dlp is not available. Please install it with: pip install yt-dlp');
        }

        return new Promise((resolve, reject) => {
            const command = 'python';
            const fullArgs = ['-m', 'yt_dlp', ...args];
            console.log(`🔧 Running: ${command} ${fullArgs.map(a => `"${a}"`).join(' ')}`);

            const proc = spawn(command, fullArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const timeoutId = setTimeout(() => {
                timedOut = true;
                proc.kill('SIGTERM');
                reject(new Error(`yt-dlp operation timed out after ${timeout / 1000} seconds`));
            }, timeout);

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;

                if (options.onProgress) {
                    const progressMatch = chunk.match(/(\d+\.?\d*)%/);
                    if (progressMatch) {
                        options.onProgress(parseFloat(progressMatch[1]));
                    }
                }
            });

            proc.on('close', (code) => {
                clearTimeout(timeoutId);
                if (timedOut) return;

                console.log(`   Exit code: ${code}`);
                if (stderr) {
                    console.log(`   Stderr: ${stderr.substring(0, 200)}`);
                }
                if (code === 0 || stdout.trim()) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
                }
            });

            proc.on('error', (err) => {
                clearTimeout(timeoutId);
                if (timedOut) return;
                console.error(`   Process error: ${err.message}`);
                reject(err);
            });
        });
    }


    async searchYouTube(query: string, maxResults: number = 5): Promise<YouTubeSearchResult[]> {
        try {
            console.log(`🔍 YtdlpService.searchYouTube("${query}", ${maxResults})`);

            const searchUrl = `ytsearch${maxResults}:${query}`;

            const { stdout } = await this.execYtdlp([
                searchUrl,
                '--dump-json',
                '--flat-playlist',
                '--no-warnings',
            ], { timeout: SEARCH_TIMEOUT_MS });

            console.log(`   Raw output length: ${stdout.length} chars`);

            const lines = stdout.trim().split('\n').filter((line: string) => line.trim());
            console.log(`   Found ${lines.length} JSON lines`);

            const results: YouTubeSearchResult[] = [];

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data && data.id) {
                        results.push({
                            id: data.id || '',
                            title: data.title || 'Unknown Title',
                            duration: data.duration || 0,
                            channel: data.channel || data.uploader || 'Unknown Channel',
                            thumbnail: data.thumbnail || (data.thumbnails?.[0]?.url) || '',
                        });
                    }
                } catch {
                    console.log(`   ⚠️ Failed to parse line: ${line.substring(0, 50)}...`);
                }
            }

            console.log(`   Parsed ${results.length} valid results`);
            return results;
        } catch (error) {
            console.error('❌ YouTube search error:', error);
            throw new Error(`Failed to search YouTube: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }


    async downloadAudio(videoId: string, trackName?: string, artistName?: string): Promise<string> {
        const outputPath = path.join(this.cacheDir, `${videoId}.mp3`);

        if (trackName || artistName) {
            const label = [trackName, artistName].filter(Boolean).join(' - ');
            if (label) {
                console.log(`Download request metadata: ${label}`);
            }
        }

        if (fs.existsSync(outputPath)) {
            console.log(`✅ Audio already cached: ${outputPath}`);
            return outputPath;
        }

        const existingDownload = this.downloadLocks.get(videoId);
        if (existingDownload) {
            console.log(`⏳ Download already in progress for ${videoId}, waiting...`);
            return existingDownload;
        }

        const downloadPromise = this.performDownload(videoId, outputPath);
        this.downloadLocks.set(videoId, downloadPromise);

        try {
            const result = await downloadPromise;
            return result;
        } finally {
            this.downloadLocks.delete(videoId);
            this.downloadProgress.delete(videoId);
        }
    }


    private async performDownload(videoId: string, outputPath: string): Promise<string> {
        const tempPath = path.join(this.tempDir, `${videoId}_${Date.now()}.mp3`);
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        console.log(`📥 Downloading: ${videoUrl}`);
        console.log(`📁 Temp: ${tempPath}`);
        console.log(`📁 Final: ${outputPath}`);

        this.downloadProgress.set(videoId, {
            videoId,
            progress: 0,
            startedAt: Date.now()
        });

        try {
            await this.execYtdlp([
                videoUrl,
                '-x',
                '--audio-format', 'mp3',
                '--audio-quality', '0',
                '-o', tempPath,
                '--no-playlist',
                '--newline',
            ], {
                onProgress: (progress) => {
                    const status = this.downloadProgress.get(videoId);
                    if (status) {
                        status.progress = progress;
                    }
                }
            });

            if (!fs.existsSync(tempPath)) {
                throw new Error('Download completed but temp file not found');
            }

            const stats = fs.statSync(tempPath);
            console.log(`✅ Downloaded successfully: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

            fs.renameSync(tempPath, outputPath);
            console.log(`✅ Moved to final location: ${outputPath}`);

            return outputPath;
        } catch (error) {
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                    console.log(`🧹 Cleaned up partial temp file: ${tempPath}`);
                } catch (cleanupErr) {
                    console.error(`⚠️ Failed to clean up temp file: ${cleanupErr}`);
                }
            }

            console.error('❌ Download error:', error);
            throw new Error(`Failed to download audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }


    cancelDownload(videoId: string): boolean {
        const status = this.downloadProgress.get(videoId);
        if (status?.process) {
            status.process.kill('SIGTERM');
            this.downloadProgress.delete(videoId);
            this.downloadLocks.delete(videoId);
            console.log(`🛑 Cancelled download for ${videoId}`);
            return true;
        }
        return false;
    }


    getCachedAudioPath(videoId: string): string | null {
        const mp3Path = path.join(this.cacheDir, `${videoId}.mp3`);

        if (fs.existsSync(mp3Path)) {
            return mp3Path;
        }

        return null;
    }


    getCacheStats(): { fileCount: number; totalSizeMB: number } {
        try {
            const files = fs.readdirSync(this.cacheDir);
            let totalSize = 0;

            for (const file of files) {
                const filePath = path.join(this.cacheDir, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            }

            return {
                fileCount: files.length,
                totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
            };
        } catch {
            return { fileCount: 0, totalSizeMB: 0 };
        }
    }
}
