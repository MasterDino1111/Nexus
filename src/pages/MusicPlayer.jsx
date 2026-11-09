
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { callFunction } from "@/lib/callFunction";
import { useMusicPlayer } from "../contexts/MusicPlayerContext";
import { ChevronDown, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Heart, Share2, ListMusic, Sparkles, Loader2, Download, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { notifyLike } from "@/lib/notifyLike";

export default function MusicPlayer() {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong, progress } = useMusicPlayer();
  const [aiText, setAiText] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [liked, setLiked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(me => {
      if (!me) return;
      base44.entities.Subscription.filter({ user_id: me.id, status: "active" }, "-created_date", 1)
        .then(subs => setIsPremium(subs.length > 0 && subs[0].plan !== "free")).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentSong) { setLiked(false); return; }
    base44.auth.me().then(me => {
      if (!me) return;
      base44.entities.SongLike.filter({ user_id: me.id, song_id: currentSong.id }, "-created_date", 1)
        .then(likes => setLiked(likes.length > 0)).catch(() => {});
    }).catch(() => {});
  }, [currentSong?.id]);

  const handleLike = async () => {
    if (!currentSong) return;
    const me = await base44.auth.me().catch(() => null);
    if (!me) return;
    const newLiked = !liked;
    setLiked(newLiked);
    try {
      const { ok } = await callFunction("songStats", { songId: currentSong.id, action: newLiked ? "like" : "unlike" });
      if (!ok) throw new Error("songStats failed");
      if (newLiked) {
        await notifyLike({
          ownerId: currentSong.uploader_id,
          actor: me,
          kind: "song",
          contentId: currentSong.id,
          contentTitle: currentSong.title,
          contentThumbnail: currentSong.cover_url,
          link: "/music",
        }).catch(() => {});
      }
    } catch {
      setLiked(!newLiked);
    }
  };

  useEffect(() => {
    if (!currentSong) { setAiText(null); return; }
    let cancelled = false;
    setAiText(null);
    setAiLoading(true);
    base44.integrations.Core.InvokeLLM({
      prompt: `Schreibe einen kurzen, interessanten Text (2-3 Sätze) über den Song "${currentSong.title}" von ${currentSong.artist}. Erwähne Stil, Stimmung oder wissenswerte Fakten. Antworte auf Deutsch.`,
    }).then(res => { if (!cancelled) { setAiText(res); setAiLoading(false); } })
      .catch(() => { if (!cancelled) { setAiText("Keine Info verfügbar."); setAiLoading(false); } });
    return () => { cancelled = true; };
  }, [currentSong?.id]);

  const handleDownload = async () => {
    if (!currentSong?.audio_url) {
      toast({ title: "Kein Audio zum Herunterladen", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(currentSong.audio_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (currentSong.title || "song").replace(/[^a-zA-Z0-9]/g, "_") + ".mp3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download gestartet!" });
    } catch {
      toast({ title: "Download fehlgeschlagen", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/music/player`;
    if (navigator.share) {
      try { await navigator.share({ title: currentSong.title, text: `Hör dir "${currentSong.title}" von ${currentSong.artist} an!`, url: shareUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link kopiert!" });
    }
  };

  if (!currentSong) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-5xl mb-4">🎵</div>
        <h2 className="text-lg font-semibold">Kein Song ausgewählt</h2>
        <p className="text-sm text-muted-foreground mt-1">Wähle einen Song aus der Bibliothek</p>
        <Link to="/music" className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
          Zur Musik
        </Link>
      </div>
    );
  }

  const formatTime = (pct) => {
    const duration = currentSong.duration_seconds || 200;
    const secs = Math.floor((pct / 100) * duration);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const totalTime = () => {
    const d = currentSong.duration_seconds || 200;
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/music" className="p-2 hover:bg-secondary rounded-full transition-colors">
          <ChevronDown size={22} />
        </Link>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Läuft gerade</span>
        <button className="p-2 hover:bg-secondary rounded-full transition-colors">
          <ListMusic size={20} />
        </button>
      </div>

      {/* Album Art */}
      <div className="flex-1 flex items-center justify-center px-8 py-6">
        <motion.div
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 shadow-2xl overflow-hidden pulse-glow"
        >
          {currentSong.cover_url ? (
            <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-background/50 flex items-center justify-center">
                <span className="text-4xl">🎵</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Song Info */}
      <div className="px-8 text-center">
        <h2 className="text-xl font-bold truncate">{currentSong.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{currentSong.artist}</p>
        {currentSong.album && (
          <p className="text-xs text-muted-foreground mt-0.5">{currentSong.album}</p>
        )}
      </div>

      {/* Progress */}
      <div className="px-8 mt-6">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>{formatTime(progress)}</span>
          <span>{totalTime()}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 py-6">
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Shuffle size={18} />
        </button>
        <button onClick={prevSong} className="p-3 hover:bg-secondary rounded-full transition-colors">
          <SkipBack size={24} />
        </button>
        <button
          onClick={togglePlay}
          className="p-5 bg-primary text-primary-foreground rounded-full hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
        </button>
        <button onClick={nextSong} className="p-3 hover:bg-secondary rounded-full transition-colors">
          <SkipForward size={24} />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Repeat size={18} />
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-center gap-8 pb-4">
        <button onClick={handleLike} className={`p-2 transition-colors ${liked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
          <Heart size={20} className={liked ? "fill-destructive" : ""} />
        </button>
        <button onClick={handleShare} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Share2 size={20} />
        </button>
        {isPremium ? (
          <button onClick={handleDownload} className="p-2 text-amber-400 hover:text-amber-300 transition-colors" title="Download">
            <Download size={20} />
          </button>
        ) : (
          <Link to="/premium" className="p-2 text-amber-400/50 hover:text-amber-400 transition-colors" title="Premium für Download">
            <Crown size={20} />
          </Link>
        )}
      </div>

      {/* AI-generated text */}
      <div className="px-6 pb-8">
        <div className="bg-secondary/40 rounded-2xl p-4 border border-border">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <Sparkles size={12} /> KI-Info
          </p>
          {aiLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Generiere Info...
            </div>
          ) : (
            <p className="text-sm text-foreground/80 leading-relaxed">{aiText}</p>
          )}
        </div>
      </div>
    </div>
  );
}


