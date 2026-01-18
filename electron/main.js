import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../server/dist/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_PORT = Number(process.env.ELECTRON_API_PORT) || 3001;

let server;

async function startBackend() {
    const cacheDir = path.join(app.getPath('userData'), 'cache');
    const { app: expressApp } = createApp({
        cacheDir,
        corsOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173', 'null']
    });

    return new Promise((resolve, reject) => {
        const httpServer = expressApp.listen(SERVER_PORT, () => {
            console.log(`Backend running on http://localhost:${SERVER_PORT}`);
            resolve(httpServer);
        });

        httpServer.on('error', (error) => {
            reject(error);
        });
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        backgroundColor: '#0b0f1a',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
        win.loadURL(rendererUrl);
    } else {
        const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
        win.loadFile(indexPath);
    }
}

app.whenReady().then(async () => {
    server = await startBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (server?.close) {
            server.close();
        }
        app.quit();
    }
});
