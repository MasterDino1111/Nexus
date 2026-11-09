
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { onlyPublished } from "@/lib/published";
import { loadForYou } from "@/lib/recommendations";
import VideoCard from "@/components/video/VideoCard";
import ShortsCard from "@/components/video/ShortsCard";
import { Search, TrendingUp, Flame, Gamepad2, GraduationCap, Music2, Trophy, Tv, PlusCircle, CalendarClock, AlertCircle, Video, Zap, History, Bookmark, Users, Sparkles } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import moment from "moment";

const categories = [
  { label: "Alle", value: null, icon: Flame },
  { label: "Für dich", value: "for_you", icon: Sparkles },
  { label: "Trending", value: "trending", icon: TrendingUp },
  { label: "Abos", value: "following", icon: Users },
  { label: "Musik", value: "music", icon: Music2 },
  { label: "Gaming", value: "gaming", icon: Gamepad2 },
  { label: "Bildung", value: "education", icon: GraduationCap },
  { label: "Sport", value: "sports", icon: Trophy },
  { label: "Unterhaltung", value: "entertainment", icon: Tv },
  { label: "Shorts", value: "shorts_page", icon: Zap },
  { label: "Später", value: "watch_later", icon: Bookmark },
  { label: "Historie", value: "history", icon: History },
];

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scheduled, setScheduled] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (category === "shorts_page") { navigate("/shorts"); return; }
    loadVideos();
  }, [category]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      let data;
      if (category === "for_you") {
        if (!me) { setVideos([]); setScheduled([]); setLoading(false); return; }
        data = await loadForYou(me);
      } else if (category === "history") {
        // Load user's watch history
        if (!me) { setVideos([]); setScheduled([]); setLoading(false); return; }
        const history = await base44.entities.VideoHistory.filter({ user_id: me.id }, "-created_date", 50);
        data = history.map(h => ({
          id: h.video_id,
          title: h.video_title,
          thumbnail_url: h.video_thumbnail,
          channel_name: h.video_channel,
          created_date: h.created_date,
        })).filter(h => h.id);
      } else if (category === "watch_later") {
        if (!me) { setVideos([]); setScheduled([]); setLoading(false); return; }
        const saved = await base44.entities.WatchLater.filter({ user_id: me.id }, "-created_date", 50);
        data = saved.map(h => ({
          id: h.video_id,
          title: h.video_title,
          thumbnail_url: h.video_thumbnail,
          channel_name: h.video_channel,
          created_date: h.created_date,
        })).filter(h => h.id);
      } else if (category === "following") {
        // Newest videos & shorts from channels the user follows
        if (!me) { setVideos([]); setScheduled([]); setLoading(false); return; }
        const subs = await base44.entities.ChannelSubscription.filter({ subscriber_id: me.id }, "-created_date", 100);
        const names = [...new Set(subs.map(s => s.channel_name).filter(Boolean))];
        data = names.length
          ? await base44.entities.Video.filter({ channel_name: { $in: names } }, "-created_date", 50)
          : [];
      } else if (category && category !== "trending") {
        data = await base44.entities.Video.filter({ category }, "-created_date", 50);
      } else {
        // Shorts belong to the Shorts feed only, never to the video grid
        const page = await base44.entities.Video.filter({ category: { $ne: "shorts" } }, { sort: "-created_date", limit: 50 });
        data = page.items;
      }
      setVideos(onlyPublished(data));
      if (me) {
        const mine = await base44.entities.Video.filter({ uploader_id: me.id }, "-created_date", 50);
        const now = Date.now();
        const upcoming = mine
          .filter(v => v.scheduled_publish_time)
          .filter(v => new Date(v.scheduled_publish_time).getTime() <= now + 24 * 60 * 60 * 1000)
          .sort((a, b) => new Date(a.scheduled_publish_time) - new Date(b.scheduled_publish_time));
        setScheduled(upcoming);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredVideos = searchQuery
    ? videos.filter(v => v.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : videos;

  const followedVideos = category === "following" ? filteredVideos.filter(v => v.category !== "shorts") : [];
  const followedShorts = category === "following" ? filteredVideos.filter(v => v.category === "shorts") : [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            UniStream
          </h1>
          <div className="flex items-center gap-1">
            <Link to="/upload" className="p-2 hover:bg-secondary rounded-full transition-colors">
              <PlusCircle size={20} />
            </Link>
            <NotificationBell />
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Videos suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map(({ label, value, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setCategory(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                category === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scheduled publish reminders */}
      {scheduled.length > 0 && (
        <div className="px-4 pt-4">
          <div className="bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <CalendarClock size={14} /> Geplante Veröffentlichungen
            </p>
            <div className="space-y-2">
              {scheduled.slice(0, 3).map(v => {
                const pubTime = new Date(v.scheduled_publish_time).getTime();
                const isLive = pubTime <= Date.now();
                return (
                  <Link
                    key={v.id}
                    to={`/video/${v.id}`}
                    className="flex items-center gap-3 p-2 bg-secondary/50 hover:bg-secondary rounded-xl transition-colors"
                  >
                    <div className="w-10 h-7 rounded bg-secondary overflow-hidden flex-shrink-0">
                      {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Video size={12} className="text-muted-foreground m-auto" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{v.title}</p>
                      <p className={`text-[10px] ${isLive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                        {isLive ? "🔴 Jetzt live!" : `Geplant: ${moment(v.scheduled_publish_time).format("DD.MM. HH:mm")}`}
                      </p>
                    </div>
                    {isLive && <AlertCircle size={14} className="text-primary flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className="pt-4 pb-4">
        {category === "for_you" && !loading && filteredVideos.length > 0 && (
          <p className="px-4 pb-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles size={12} className="text-primary" /> Basierend auf deiner Historie und gelikten Inhalten
          </p>
        )}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="space-y-3 animate-pulse">
                <div className="aspect-video bg-secondary rounded-lg" />
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-secondary rounded w-3/4" />
                    <div className="h-2 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{category === "following" ? "📺" : category === "for_you" ? "✨" : "🎬"}</div>
            <h2 className="text-lg font-semibold">
              {category === "following" ? "Noch keine Inhalte" : category === "for_you" ? "Noch keine Empfehlungen" : "Keine Videos gefunden"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {category === "following"
                ? "Folge Kanälen, um hier ihre neuesten Videos und Shorts zu sehen."
                : category === "for_you"
                ? "Schau dir Videos an oder like Inhalte – dann findest du hier passende Empfehlungen."
                : "Lade ein Video hoch, um loszulegen!"}
            </p>
          </div>
        ) : category === "following" ? (
          <div className="space-y-6">
            {followedVideos.length > 0 && (
              <div>
                <h2 className="px-4 mb-3 text-sm font-semibold flex items-center gap-2">
                  <Video size={15} className="text-primary" /> Neueste Videos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4">
                  {followedVideos.map((video, i) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <VideoCard video={video} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {followedShorts.length > 0 && (
              <div>
                <h2 className="px-4 mb-3 text-sm font-semibold flex items-center gap-2">
                  <Zap size={15} className="text-primary" /> Neueste Shorts
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4">
                  {followedShorts.map((video, i) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <ShortsCard video={video} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : category === "shorts" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4">
            {filteredVideos.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <ShortsCard video={video} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4">
            {filteredVideos.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <VideoCard video={video} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


