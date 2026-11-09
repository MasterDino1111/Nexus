
import React from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { Link } from "react-router-dom";

export default function MiniPlayer() {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong, progress, seekTo } = useMusicPlayer();

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40">
      <div className="bg-card/95 backdrop-blur-xl border-t border-border">
        {/* Progress bar - clickable */}
        <div
          className="h-1 bg-secondary cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            seekTo(pct);
          }}
        >
          <div
            className="h-full bg-primary transition-all duration-500 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-2">
          <Link to="/music/player" className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
              {currentSong.cover_url ? (
                <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-lg">🎵</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={prevSong} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <SkipBack size={18} />
            </button>
            <button onClick={togglePlay} className="p-2 bg-primary rounded-full text-primary-foreground hover:bg-primary/80 transition-colors">
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button onClick={nextSong} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


