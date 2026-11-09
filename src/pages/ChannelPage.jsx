
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { onlyPublished } from "@/lib/published";
import { callFunction } from "@/lib/callFunction";
import SongRow from "@/components/music/SongRow";
import VideoCard from "@/components/video/VideoCard";
import { ChevronLeft, Music2, Video, Heart, Users, Eye, ThumbsUp, Disc3, Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import DonateDialog from "@/components/donate/DonateDialog";

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function ChannelPage() {
  const { type, name } = useParams();
  const decodedName = decodeURIComponent(name);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState({});
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [donateOpen, setDonateOpen] = useState(false);

  const isMusic = type === "music";

  useEffect(() => { loadData(); }, [type, name]);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      if (isMusic) {
        const data = await base44.entities.Song.filter({ artist: decodedName }, "-plays", 100);
        setItems(data);
      } else {
        // Shorts live in the Shorts feed only, never in the video list
        const data = await base44.entities.Video.filter({ channel_name: decodedName, category: { $ne: "shorts" } }, "-views", 100);
        setItems(onlyPublished(data));
        const [mySubs, count] = await Promise.all([
          me
            ? base44.entities.ChannelSubscription.filter({ subscriber_id: me.id, channel_name: decodedName }, "-created_date", 1)
            : Promise.resolve([]),
          base44.entities.ChannelSubscription.count({ channel_name: decodedName }),
        ]);
        setFollowing(mySubs.length > 0);
        setFollowers(count);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleLikeSong = async (song) => {
    const isLiked = likedSongs[song.id];
    setLikedSongs(prev => ({ ...prev, [song.id]: !isLiked }));
    const { ok, data } = await callFunction("songStats", { songId: song.id, action: isLiked ? "unlike" : "like" })
      .catch(() => ({ ok: false, data: {} }));
    if (!ok) {
      setLikedSongs(prev => ({ ...prev, [song.id]: !!isLiked }));
      return;
    }
    setItems(prev => prev.map(s => s.id === song.id ? { ...s, likes: data.likes } : s));
  };

  // Owner stats
  const isOwner = isMusic
    ? items.some(s => s.uploader_id && s.uploader_id === user?.id)
    : items.some(v => v.uploader_id && v.uploader_id === user?.id);

  const totalPlays = items.reduce((sum, s) => sum + (s.plays || 0), 0);
  const totalLikes = items.reduce((sum, s) => sum + (s.likes || 0), 0);
  const totalViews = items.reduce((sum, v) => sum + (v.views || 0), 0);

  // Follow is only available for video channels the user does not own
  const channelOwnerId = isMusic ? null : items.find(v => v.uploader_id)?.uploader_id;
  const canFollow = Boolean(channelOwnerId) && channelOwnerId !== user?.id;

  const toggleFollow = async () => {
    if (!user || !canFollow) return;
    if (following) {
      const mine = await base44.entities.ChannelSubscription.filter({ subscriber_id: user.id, channel_name: decodedName }, "-created_date", 1);
      if (mine[0]) await base44.entities.ChannelSubscription.delete(mine[0].id);
      setFollowing(false);
      setFollowers(c => Math.max(0, c - 1));
    } else {
      await base44.entities.ChannelSubscription.create({
        subscriber_id: user.id,
        channel_user_id: channelOwnerId,
        channel_name: decodedName,
      });
      setFollowing(true);
      setFollowers(c => c + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to={isMusic ? "/music" : "/"} className="p-1 hover:bg-secondary rounded-full transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-base font-bold flex items-center gap-2">
          {isMusic ? <Disc3 size={18} className="text-primary" /> : <Video size={18} className="text-primary" />}
          {decodedName}
        </h1>
      </div>

      {/* Channel header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-3">
          <span className="text-3xl font-black text-primary">{decodedName[0]?.toUpperCase()}</span>
        </div>
        <h2 className="text-xl font-black">{decodedName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isMusic ? "Musikkünstler" : "Video-Kanal"} · {items.length} {isMusic ? "Songs" : "Videos"}
        </p>
        {!isMusic && (
          <div className="flex items-center justify-center gap-3 mt-3">
            {canFollow && (
              <button
                onClick={toggleFollow}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  following ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground"
                }`}
              >
                {following ? <><Check size={15} /> Gefolgt</> : <><Plus size={15} /> Folgen</>}
              </button>
            )}
            <span className="text-xs text-muted-foreground">{formatNum(followers)} Abonnenten</span>
            {channelOwnerId && channelOwnerId !== user?.id && (
              <button
                onClick={() => setDonateOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80"
              >
                <Heart size={15} className="text-destructive" /> Spenden
              </button>
            )}
          </div>
        )}
      </div>

      {/* Owner stats dashboard */}
      {isOwner && (
        <div className="px-4 mb-4">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-primary mb-3 flex items-center gap-1.5">
              <Users size={14} /> Deine Kanal-Statistiken
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black">{formatNum(isMusic ? totalPlays : totalViews)}</p>
                <p className="text-[10px] text-muted-foreground">{isMusic ? "Monatliche Hörer" : "Aufrufe"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black flex items-center justify-center gap-1">
                  <ThumbsUp size={14} className="text-primary" /> {formatNum(totalLikes)}
                </p>
                <p className="text-[10px] text-muted-foreground">Likes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black">{items.length}</p>
                <p className="text-[10px] text-muted-foreground">{isMusic ? "Songs" : "Videos"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="px-4 space-y-1">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{isMusic ? "🎵" : "🎬"}</div>
            <p className="font-semibold">Noch keine {isMusic ? "Songs" : "Videos"}</p>
          </div>
        ) : isMusic ? (
          items.map((song, i) => (
            <div key={song.id} className="flex items-center gap-1">
              <div className="flex-1"><SongRow song={song} index={i} songList={items} /></div>
              <button
                onClick={() => handleLikeSong(song)}
                className={`p-2 transition-colors ${likedSongs[song.id] ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
              >
                <Heart size={15} className={likedSongs[song.id] ? "fill-destructive" : ""} />
              </button>
            </div>
          ))
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((video, i) => (
              <motion.div key={video.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <VideoCard video={video} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <DonateDialog
        open={donateOpen}
        onOpenChange={setDonateOpen}
        creatorId={channelOwnerId}
        creatorName={decodedName}
      />
    </div>
  );
}


