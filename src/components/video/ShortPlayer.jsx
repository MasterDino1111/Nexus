
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { callFunction } from "@/lib/callFunction";
import { Heart, MessageCircle, Share2, Send, Bookmark, Eye, Volume2, VolumeX, Crown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import SendToDialog from "@/components/share/SendToDialog";
import ShortCommentsDialog from "@/components/video/ShortCommentsDialog";
import { notifyLike } from "@/lib/notifyLike";

function formatCount(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function ShortPlayer({ video, isActive, me, liked, saved, onLikedChange, onSavedChange }) {
  const videoRef = useRef(null);
  const [likeCount, setLikeCount] = useState(video.likes || 0);
  const [muted, setMuted] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const counted = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [isActive]);

  // Count one view per short and keep it in the viewer's history (never for the uploader)
  useEffect(() => {
    if (!isActive || !me || counted.current) return;
    counted.current = true;
    if (video.uploader_id === me.id) return;
    base44.entities.Video.update(video.id, { views: (video.views || 0) + 1 }).catch(() => {});
    base44.entities.VideoHistory.create({
      user_id: me.id,
      video_id: video.id,
      video_title: video.title,
      video_thumbnail: video.thumbnail_url,
      video_channel: video.channel_name,
    }).catch(() => {});
  }, [isActive]);

  const handleLike = async () => {
    if (!me) return;
    const next = !liked;
    onLikedChange(video.id, next);
    const { ok, data } = await callFunction("reactVideo", { videoId: video.id, reaction: next ? "like" : "none" })
      .catch(() => ({ ok: false, data: {} }));
    if (!ok) {
      onLikedChange(video.id, !next);
      return;
    }
    setLikeCount(data.likes);
    if (next && data.previous !== "like") {
      notifyLike({
        ownerId: video.uploader_id,
        actor: me,
        kind: "short",
        contentId: video.id,
        contentTitle: video.title,
        contentThumbnail: video.thumbnail_url,
        link: `/video/${video.id}`,
      }).catch(() => {});
    }
  };

  const toggleSave = async () => {
    if (!me) return;
    try {
      if (saved) {
        const items = await base44.entities.WatchLater.filter({ user_id: me.id, video_id: video.id }, "-created_date", 1);
        if (items[0]) await base44.entities.WatchLater.delete(items[0].id);
        onSavedChange(video.id, false);
        toast({ title: "Aus 'Später ansehen' entfernt" });
      } else {
        await base44.entities.WatchLater.create({
          user_id: me.id,
          video_id: video.id,
          video_title: video.title,
          video_thumbnail: video.thumbnail_url,
          video_channel: video.channel_name,
        });
        onSavedChange(video.id, true);
        toast({ title: "Zu 'Später ansehen' hinzugefügt" });
      }
    } catch {}
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/video/${video.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: video.title, text: `Schau dir "${video.title}" an!`, url: shareUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link kopiert!" });
    }
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      <SendToDialog open={showSend} onOpenChange={setShowSend} video={video} />
      <ShortCommentsDialog open={showComments} onOpenChange={setShowComments} video={video} me={me} />

      {video.video_url ? (
        <video
          ref={videoRef}
          src={video.video_url}
          poster={video.thumbnail_url}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onClick={() => setMuted(m => !m)}
        />
      ) : video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt="" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-background">
          <span className="text-6xl">⚡</span>
        </div>
      )}

      {/* Top overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {video.is_premium && (
          <span className="bg-amber-500/90 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-semibold">
            <Crown size={11} /> Premium
          </span>
        )}
        <button
          onClick={() => setMuted(m => !m)}
          className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
          title={muted ? "Ton an" : "Ton aus"}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 text-white">
          <Heart size={26} className={liked ? "fill-red-500 text-red-500" : ""} />
          <span className="text-[11px] font-medium">{formatCount(likeCount)}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 text-white">
          <MessageCircle size={26} />
          <span className="text-[11px] font-medium">Kommentare</span>
        </button>
        <button onClick={() => setShowSend(true)} className="flex flex-col items-center gap-1 text-white">
          <Send size={24} />
          <span className="text-[11px] font-medium">Senden</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white">
          <Share2 size={24} />
          <span className="text-[11px] font-medium">Teilen</span>
        </button>
        <button onClick={toggleSave} className="flex flex-col items-center gap-1 text-white">
          <Bookmark size={24} className={saved ? "fill-primary text-primary" : ""} />
          <span className="text-[11px] font-medium">{saved ? "Gespeichert" : "Später"}</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-0 right-16 bottom-6 px-4 space-y-2">
        <Link
          to={`/channel/video/${encodeURIComponent(video.channel_name || "Unbekannt")}`}
          className="flex items-center gap-2 w-fit"
        >
          <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0">
            {video.channel_avatar ? (
              <img src={video.channel_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">
                {(video.channel_name || "U")[0]}
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-white">@{video.channel_name || "Unbekannt"}</span>
        </Link>
        <Link to={`/video/${video.id}`} className="block text-sm font-medium text-white line-clamp-2">
          {video.title}
        </Link>
        {video.description && (
          <p className="text-xs text-white/70 line-clamp-2">{video.description}</p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-white/80">
          <span className="flex items-center gap-1"><Eye size={11} /> {formatCount(video.views)} Aufrufe</span>
          {video.duration > 0 && <span>• {video.duration}s</span>}
        </div>
      </div>
    </div>
  );
}


