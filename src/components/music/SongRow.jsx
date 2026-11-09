
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Pause, Crown, Heart, ListPlus, Share2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useMusicPlayer } from "../../contexts/MusicPlayerContext";
import AddToPlaylistDialog from "./AddToPlaylistDialog";
import { notifyLike } from "@/lib/notifyLike";

function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SongRow({ song, index, songList }) {
  const { currentSong, isPlaying, playSong, togglePlay } = useMusicPlayer();
  const isCurrent = currentSong?.id === song.id;
  const [liked, setLiked] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    base44.auth.me().then(me => {
      if (!me) return;
      base44.entities.Subscription.filter({ user_id: me.id, status: "active" }, "-created_date", 1)
        .then(subs => setIsPremium(subs.length > 0 && subs[0].plan !== "free")).catch(() => {});
      base44.entities.SongLike.filter({ user_id: me.id, song_id: song.id }, "-created_date", 1)
        .then(likes => setLiked(likes.length > 0)).catch(() => {});
    }).catch(() => {});
  }, [song.id]);

  const handleClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, songList);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    const me = await base44.auth.me().catch(() => null);
    if (!me) return;
    const newLiked = !liked;
    setLiked(newLiked);
    const newLikes = (song.likes || 0) + (newLiked ? 1 : -1);
    try {
      if (newLiked) {
        await base44.entities.SongLike.create({ user_id: me.id, song_id: song.id });
        await notifyLike({
          ownerId: song.uploader_id,
          actor: me,
          kind: "song",
          contentId: song.id,
          contentTitle: song.title,
          contentThumbnail: song.cover_url,
          link: "/music",
        }).catch(() => {});
      } else {
        const myLikes = await base44.entities.SongLike.filter({ user_id: me.id, song_id: song.id }, "-created_date", 1);
        if (myLikes[0]) await base44.entities.SongLike.delete(myLikes[0].id);
      }
      await base44.entities.Song.update(song.id, { likes: newLikes });
    } catch {
      setLiked(!newLiked);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/music/player`;
    if (navigator.share) {
      try { await navigator.share({ title: song.title, text: `Hör dir "${song.title}" von ${song.artist} an!`, url: shareUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!song.audio_url) return;
    try {
      const res = await fetch(song.audio_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (song.title || "song").replace(/[^a-zA-Z0-9]/g, "_") + ".mp3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${
          isCurrent
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-secondary"
        }`}
      >
        <div className="w-8 text-center flex-shrink-0">
          {isCurrent && isPlaying ? (
            <div className="flex items-center justify-center gap-0.5">
              <div className="w-0.5 h-3 bg-primary rounded-full animate-pulse" />
              <div className="w-0.5 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground group-hover:hidden">{index + 1}</span>
          )}
          <Play size={14} className="text-foreground hidden group-hover:block mx-auto" />
        </div>

        <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
          {song.cover_url ? (
            <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-sm">🎵</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className={`text-sm font-medium truncate ${isCurrent ? "text-primary" : ""}`}>
            {song.title}
            {song.is_premium && <Crown size={10} className="inline ml-1 text-amber-400" />}
          </p>
          <Link
            to={`/channel/music/${encodeURIComponent(song.artist)}`}
            onClick={e => e.stopPropagation()}
            className="text-xs text-muted-foreground truncate hover:text-primary hover:underline transition-colors"
          >
            {song.artist}
          </Link>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setShowAdd(true); }}
          className="p-1.5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          title="Zur Playlist hinzufügen"
        >
          <ListPlus size={15} />
        </button>
        <button
          onClick={handleShare}
          className="p-1.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          title="Teilen"
        >
          <Share2 size={15} />
        </button>
        {isPremium && (
          <button
            onClick={handleDownload}
            className="p-1.5 text-amber-400 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            title="Download"
          >
            <Download size={15} />
          </button>
        )}
        <button
          onClick={handleLike}
          className={`p-1.5 transition-all flex-shrink-0 ${liked ? "text-destructive" : "text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"}`}
          title="Liken"
        >
          <Heart size={15} className={liked ? "fill-destructive" : ""} />
        </button>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formatDuration(song.duration_seconds)}
        </span>
      </div>
      <AddToPlaylistDialog open={showAdd} onClose={() => setShowAdd(false)} song={song} />
    </>
  );
}


