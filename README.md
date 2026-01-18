# 🎤 Lyric Karaoke

A **Monkeytype-inspired** typing game where you type along to song lyrics in real-time. Features a premium "Neon Rhythm" aesthetic with smooth animations, instant character feedback, and YouTube audio integration.

---

## ✨ Features

- **Real-time Lyric Typing** – Type lyrics as the song plays, synced to the audio
- **YouTube Audio Integration** – Search and play any song from YouTube
- **Monkeytype-style Input** – Instant character-by-character feedback with color coding
- **Early Completion** – Finish a line early and get bonus points
- **Adjustable Speed** – Slow down (0.5x) or speed up (2.0x) playback
- **Combo System** – Build chains for score multipliers
- **High Score Tracking** – Local storage persistence for your best runs
- **Neon Rhythm UI** – Dark theme with vibrant neon accents and glassmorphism

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- **Python 3** with `yt-dlp` installed globally:
  ```bash
  pip install yt-dlp
  ```

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd lyric-karaoke
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

### Running the Application

You need to run **both** the frontend and backend servers:

**Terminal 1 – Backend Server (port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 – Frontend Dev Server (port 5173):**
```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎮 How to Play

1. **Search for a Song** – Type a song name or artist in the search bar
2. **Select a Song** – Click on a result to load it
3. **Adjust Speed** – Use the slider (0.5x – 2.0x) before starting
4. **Click "Initiate Sequence"** – Start the game after the countdown
5. **Type the Lyrics** – Match the lyrics as they appear
   - ✅ White text = correct characters
   - ❌ Red text = incorrect characters
6. **Score Points** – Accuracy + timing = higher scores
7. **Build Combos** – Keep accuracy high to chain combos

### Controls

| Key       | Action                              |
|-----------|-------------------------------------|
| `Escape`  | Pause / Resume                      |
| `Space`   | Resume (when paused)                |
| `Enter`   | Clear input (reset current line)    |

---

## 🛠️ Tech Stack

### Frontend
- **React 19** + TypeScript
- **Vite** – Build tool
- **Tailwind CSS 4** – Styling
- **Zustand** – State management
- **Howler.js** – Audio playback

### Backend
- **Node.js** + Express
- **ytdlp-nodejs** – YouTube audio extraction
- **yt-dlp** – CLI tool for audio downloads

---

## 📁 Project Structure

```
lyric-karaoke/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── stores/         # Zustand state stores
│   ├── types/          # TypeScript interfaces
│   └── utils/          # Helper functions
├── server/
│   ├── src/
│   │   ├── routes/     # Express API routes
│   │   └── index.ts    # Server entry point
│   └── cache/          # Downloaded audio cache
├── public/             # Static assets
└── package.json
```

---

## 🔧 Configuration

### Environment

- **Frontend runs on:** `http://localhost:5173`
- **Backend runs on:** `http://localhost:3001`
- **CORS:** Configured to allow requests from the frontend

### Audio Cache

Downloaded YouTube audio is cached in `server/cache/` to avoid re-downloading. Clear this folder to free disk space.

---

## 📜 API Endpoints

| Method | Endpoint                   | Description                          |
|--------|----------------------------|--------------------------------------|
| GET    | `/api/health`              | Health check with dependency status  |
| POST   | `/api/audio/search`        | Search YouTube (body: `{ query }`)   |
| GET    | `/api/audio/search?q=...`  | Search YouTube (query param)         |
| POST   | `/api/audio/download`      | Download audio (body: `{ videoId }`) |
| GET    | `/api/audio/status/:id`    | Get download status/cache info       |
| POST   | `/api/audio/fetch`         | Auto-fetch (body: `{ trackName, artistName }`) |
| GET    | `/audio/:videoId.mp3`      | Stream cached audio file             |

---

## 🐛 Troubleshooting

### "Audio Source Missing"
- Ensure the backend server is running on port 3001
- Check that `yt-dlp` is installed: `yt-dlp --version`
- Check backend console for errors

### Playback Speed Not Working
- The speed is applied when the audio loads, not live during playback
- Set speed before clicking "Initiate Sequence"

### Lyrics Not Syncing
- Some songs may have inaccurate timing data from the lyrics API
- Try a different version of the song

---

## 📄 License

MIT License – feel free to modify and distribute.
