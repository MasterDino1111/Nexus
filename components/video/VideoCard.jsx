
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Eye, Clock, Crown, Bookmark } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function formatDuration(secs) {
  if (!secs || isNaN(secs)) return "";
  const s = Math.floor(Number(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VideoCard({ video }) {
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(me => {
      if (me) base44.entities.WatchLater.filter({ user_id: me.id, video_id: video.id }, "-created_date", 1)
        .then(items => setSaved(items.length > 0)).catch(() => {});
    }).catch(() => {});
  }, [video.id]);

  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const me = await base44.auth.me();
      if (!me) return;
      if (saved) {
        const items = await base44.entities.WatchLater.filter({ user_id: me.id, video_id: video.id }, "-created_date", 1);
        if (items[0]) await base44.entities.WatchLater.delete(items[0].id);
        setSaved(false);
        toast({ title: "Aus 'Später ansehen' entfernt" });
      } else {
        await base44.entities.WatchLater.create({
          user_id: me.id,
          video_id: video.id,
          video_title: video.title,
          video_thumbnail: video.thumbnail_url,
          video_channel: video.channel_name,
        });
        setSaved(true);
        toast({ title: "Zu 'Später ansehen' hinzugefügt" });
      }
    } catch {}
  };

  return (
    <Link to={`/video/${video.id}`} className="group block">
      <div className="relative overflow-hidden bg-secondary aspect-video">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-background">
            <span className="text-4xl">🎬</span>
          </div>
        )}
        {video.duration ? (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            {formatDuration(video.duration)}
          </span>
        ) : null}
        {video.is_premium && (
          <span className="absolute top-2 right-2 bg-amber-500/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
            <Crown size={10} /> Premium
          </span>
        )}
        <button
          onClick={toggleSave}
          className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-sm transition-all ${
            saved ? "bg-primary text-primary-foreground" : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
          }`}
          title={saved ? "Aus 'Später ansehen' entfernen" : "Später ansehen"}
        >
          <Bookmark size={14} className={saved ? "fill-current" : ""} />
        </button>
      </div>
      <div className="flex gap-3 mt-3">
        <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0 overflow-hidden">
          {video.channel_avatar ? (
            <img src={video.channel_avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">
              {(video.channel_name || "U")[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{video.channel_name || "Unbekannt"}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Eye size={11} /> {formatViews(video.views)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}


