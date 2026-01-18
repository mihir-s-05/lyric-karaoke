# Lyric Karaoke

Monkeytype-style typing game for song lyrics. It syncs lyrics to YouTube audio, provides character-level feedback, and tracks score/combos.

## Features
- Real-time lyric typing synced to audio
- YouTube search and audio playback with caching
- Character-by-character accuracy feedback
- Combo and high score tracking
- Playback speed control (0.5x to 2.0x)

## Requirements
- Node.js 18+ and npm
- Python 3 with `yt-dlp` installed globally

```bash
pip install yt-dlp
```

## Setup
```bash
git clone <your-repo-url>
cd lyric-karaoke
npm install
cd server
npm install
cd ..
```

## Run
Start both servers:

```bash
# Terminal 1
cd server
npm run dev
```

```bash
# Terminal 2
npm run dev
```

Open `http://localhost:5173`.

## How to Play
1. Search for a song or artist and select a result.
2. Set playback speed before starting.
3. Start the game and type the lyrics as they appear.

Controls:
- `Escape`: pause/resume
- `Space`: resume (when paused)
- `Enter`: clear current line

## Project Layout
```
lyric-karaoke/
  src/          # frontend
  server/       # backend
  public/
  package.json
```

## API (backend)
- `GET /api/health`
- `POST /api/audio/search` (body: `{ query }`)
- `GET /api/audio/search?q=...`
- `POST /api/audio/download` (body: `{ videoId }`)
- `GET /api/audio/status/:id`
- `POST /api/audio/fetch` (body: `{ trackName, artistName }`)
- `GET /audio/:videoId.mp3`

## Notes
- Backend runs on `http://localhost:3001`.
- Cached audio lives in `server/cache/`. Delete to free disk space.

## Troubleshooting
- Missing audio: verify backend is running and `yt-dlp --version` works.
- Playback speed: set it before starting a song.
- Lyric timing issues: try another version of the track.

## License
MIT