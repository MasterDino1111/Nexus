
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Play, Eye, ThumbsUp, Crown, Send } from "lucide-react";
import SendToDialog from "@/components/share/SendToDialog";

function formatCount(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function ShortsCard({ video }) {
  const [showSend, setShowSend] = useState(false);

  return (
    <>
      <SendToDialog open={showSend} onOpenChange={setShowSend} video={video} />
      <Link to={`/video/${video.id}`} className="block">
        <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-secondary group">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : video.video_url ? (
            <video src={video.video_url} className="w-full h-full object-cover" preload="metadata" muted />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play size={28} className="text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          {video.is_premium && (
            <div className="absolute top-2 right-2 bg-amber-500/90 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-semibold">
              <Crown size={9} /> Premium
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSend(true); }}
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/55 text-white backdrop-blur-sm active:scale-95 transition-transform"
            title="Senden"
          >
            <Send size={12} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{video.title}</p>
            <p className="text-[10px] text-white/70 mt-0.5 truncate">{video.channel_name}</p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-white/80">
              <span className="flex items-center gap-0.5"><Eye size={9} /> {formatCount(video.views)}</span>
              <span className="flex items-center gap-0.5"><ThumbsUp size={9} /> {formatCount(video.likes)}</span>
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}


