import { useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { SongSearch } from './components/SongSearch';
import { GameView } from './components/GameView';
import { AudioUpload } from './components/AudioUpload';
import { DifficultySelector } from './components/DifficultySelector';
import { getTopScores, hasSeenOnboarding, setOnboardingSeen } from './utils/storage';
import './index.css';

type View = 'search' | 'setup' | 'game';

function App() {
  const [view, setView] = useState<View>('search');
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const { currentSong, audioUrl } = useGameStore();
  const topScores = getTopScores(5);

  const handleDismissOnboarding = () => {
    setOnboardingSeen();
    setShowOnboarding(false);
  };

  const handleSongSelected = () => {
    if (currentSong) {
      setView('setup');
    }
  };

  const handleStartGame = () => {
    if (currentSong && audioUrl) {
      setView('game');
    }
  };

  const handleBackToSearch = () => {
    setView('search');
  };

  // Game View takes over full screen
  if (view === 'game') {
    return <GameView onBackToSearch={handleBackToSearch} />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-deep-surface border border-white/10 rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <h2 className="font-display font-bold text-3xl text-white mb-6 text-center">
              HOW TO <span className="text-neon-blue">PLAY</span>
            </h2>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue font-bold">1</div>
                <div>
                  <h3 className="font-bold text-white mb-1">Search for a Song</h3>
                  <p className="text-white/60 text-sm">Type a song name or artist in the search bar to find songs with synced lyrics.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple font-bold">2</div>
                <div>
                  <h3 className="font-bold text-white mb-1">Configure Your Session</h3>
                  <p className="text-white/60 text-sm">Choose difficulty, adjust volume, playback speed, and lyrics offset if needed.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green font-bold">3</div>
                <div>
                  <h3 className="font-bold text-white mb-1">Type the Lyrics</h3>
                  <p className="text-white/60 text-sm">Match the lyrics as they appear. White = correct, Red = incorrect. Type faster for combo bonuses!</p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="font-mono text-xs text-white/40 mb-3 uppercase tracking-wider">Controls</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Esc</kbd>
                    <span className="text-white/60">Pause/Resume</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Enter</kbd>
                    <span className="text-white/60">Clear input</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="font-mono text-xs text-white/40 mb-3 uppercase tracking-wider">Typing Modes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-neon-blue font-bold">Normal:</span>
                    <span className="text-white/60">Standard typing experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold">Strict:</span>
                    <span className="text-white/60">No backspace allowed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">Assist:</span>
                    <span className="text-white/60">Auto-skip punctuation</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDismissOnboarding}
              className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl font-display font-bold text-white tracking-widest hover:scale-[1.02] transition-transform"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* Search & Setup Layout */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-12">

        {/* Header */}
        <header className="text-center py-10 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neon-blue/20 blur-[100px] rounded-full pointer-events-none opacity-50"></div>
          <h1 className="relative text-6xl md:text-8xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 mb-4 animate-glow">
            NEO<span className="text-neon-blue">LYRIC</span>
          </h1>
          <p className="relative font-mono text-neon-purple tracking-[0.3em] uppercase text-sm">
            Rhythm // Typing // Synergy
          </p>

          {/* Help button */}
          <button
            onClick={() => setShowOnboarding(true)}
            className="absolute top-4 right-4 px-3 py-2 rounded-lg text-xs font-mono text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            HOW TO PLAY
          </button>
        </header>

        {view === 'search' && (
          <div className="animate-slide-up space-y-12">

            {/* Main Search Area */}
            <div className="relative z-10">
              <SongSearch />

              {/* Continue Action */}
              {currentSong && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                  <button
                    onClick={handleSongSelected}
                    className="group relative px-12 py-5 bg-white text-deep-bg font-display font-bold text-xl tracking-widest rounded-full hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      INITIATE TRACK "{currentSong.trackName}" <span className="text-2xl">→</span>
                    </span>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                  </button>
                </div>
              )}
            </div>

            {/* Top Scores Footer */}
            <div className="max-w-4xl mx-auto border-t border-white/5 pt-12">
              <h2 className="text-center font-display text-2xl text-white/40 mb-8 tracking-widest">GLOBAL RANKINGS</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topScores.map((score, index) => (
                  <div key={`${score.songId}-${score.date}`} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className={`font-display font-bold text-3xl ${index === 0 ? 'text-amber-400' : 'text-white/20'}`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm truncate max-w-[150px]">{score.trackName}</div>
                      <div className="font-mono text-white/50 text-xs">{(score.score / 1000).toFixed(1)}k PTS</div>
                    </div>
                  </div>
                ))}
                {topScores.length === 0 && (
                  <div className="col-span-full text-center text-white/20 font-mono py-4">
                    NO SCORE DATA RECORDED
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'setup' && currentSong && (
          <div className="max-w-3xl mx-auto w-full animate-slide-up relative z-10">
            <button
              onClick={handleBackToSearch}
              className="mb-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors font-mono text-sm tracking-widest uppercase"
            >
              ← Abort Sequence
            </button>

            <div className="bg-deep-surface border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 blur-[80px] rounded-full pointer-events-none"></div>

              <div className="relative z-10 space-y-12">
                <div className="text-center">
                  <h2 className="font-display font-black text-4xl md:text-5xl text-white mb-2 text-glow">
                    {currentSong.trackName}
                  </h2>
                  <p className="font-mono text-neon-blue tracking-widest uppercase">
                    {currentSong.artistName}
                  </p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest ml-1">Configuration</label>
                    <DifficultySelector />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest ml-1">Audio Source</label>
                    <AudioUpload />
                  </div>
                </div>

                <button
                  onClick={handleStartGame}
                  disabled={!audioUrl}
                  className="w-full relative group overflow-hidden px-8 py-6 bg-white disabled:bg-white/10 text-deep-bg disabled:text-white/20 font-display font-black text-2xl tracking-widest rounded-xl hover:scale-[1.02] transition-all duration-300 disabled:hover:scale-100"
                >
                  <span className="relative z-10">{audioUrl ? 'START ENGINE' : 'AWAITING AUDIO SOURCE'}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-white to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
