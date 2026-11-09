
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { callFunction } from "@/lib/callFunction";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ChevronLeft, Music2, Video, Heart, Users, Eye, ThumbsUp,
  TrendingUp, Disc3, Play, BarChart2, UserPlus, Activity,
} from "lucide-react";
import CountUp from "@/components/CountUp";
import TimeRangeSelector from "@/components/creator/TimeRangeSelector";
import GrowthChart from "@/components/creator/GrowthChart";
import WeeklyPerformanceChart from "@/components/creator/WeeklyPerformanceChart";
import RealPerformanceChart from "@/components/creator/RealPerformanceChart";
import VideoCommentsFeed from "@/components/creator/VideoCommentsFeed";
import DonationsPanel from "@/components/creator/DonationsPanel";

function toDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDayMap(rows) {
  const map = {};
  (rows || []).forEach(r => { map[String(r.created_date).slice(0, 10)] = r.count; });
  return map;
}

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function CreatorDashboard() {
  const [user, setUser] = useState(null);
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState(30);
  const [dailyReal, setDailyReal] = useState([]);
  const [realLoading, setRealLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  // Real per-day performance, reloaded when the range changes or content arrives
  useEffect(() => {
    if (!user) return;
    loadRealPerformance(user, videos, range);
  }, [user, videos, range]);

  const loadRealPerformance = async (me, myVideos, days) => {
    setRealLoading(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const since = start.toISOString();
    try {
      const { ok, data } = await callFunction("creatorStats", { since });
      if (!ok) throw new Error("creatorStats failed");
      const viewAgg = { rows: data.views };
      const playAgg = { rows: data.plays };
      const viewsByDay = toDayMap(viewAgg.rows);
      const playsByDay = toDayMap(playAgg.rows);
      const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        series.push({
          day: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
          Aufrufe: viewsByDay[toDayKey(d)] || 0,
          Plays: playsByDay[toDayKey(d)] || 0,
        });
      }
      setDailyReal(series);
    } catch (e) {
      console.error(e);
      setDailyReal([]);
    }
    setRealLoading(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      const [songData, videoData, subData] = await Promise.all([
        base44.entities.Song.filter({ uploader_id: me.id }, "-plays", 200),
        base44.entities.Video.filter({ uploader_id: me.id }, "-views", 200),
        base44.entities.ChannelSubscription.filter({ channel_user_id: me.id }, "-created_date", 500),
      ]);
      setSongs(songData);
      setVideos(videoData);
      setSubscribers(subData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalPlays = songs.reduce((s, x) => s + (x.plays || 0), 0);
  const totalViews = videos.reduce((s, x) => s + (x.views || 0), 0);
  const totalSongLikes = songs.reduce((s, x) => s + (x.likes || 0), 0);
  const totalVideoLikes = videos.reduce((s, x) => s + (x.likes || 0), 0);
  const totalLikes = totalSongLikes + totalVideoLikes;
  const subscriberCount = subscribers.length;

  // Monthly approximation: plays/views on items created in last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const monthlyListeners = songs
    .filter(s => new Date(s.created_date).getTime() >= thirtyDaysAgo)
    .reduce((sum, s) => sum + (s.plays || 0), 0);
  const monthlyViewers = videos
    .filter(v => new Date(v.created_date).getTime() >= thirtyDaysAgo)
    .reduce((sum, v) => sum + (v.views || 0), 0);

  // Daily performance from real plays and views, over the selected range
  const dailyData = dailyReal;

  // Cumulative growth across the selected range
  let cumViews = 0;
  let cumPlays = 0;
  const cumulativeData = dailyData.map(d => {
    cumViews += d.Aufrufe;
    cumPlays += d.Plays;
    return { day: d.day, Aufrufe: cumViews, Plays: cumPlays };
  });

  // Weekly performance (folded from the daily data)
  const weeklyData = [];
  for (let i = 0; i < dailyData.length; i += 7) {
    const chunk = dailyData.slice(i, i + 7);
    weeklyData.push({
      day: chunk[0].day,
      Aufrufe: chunk.reduce((s, d) => s + d.Aufrufe, 0),
      Plays: chunk.reduce((s, d) => s + d.Plays, 0),
    });
  }

  // Top content by engagement
  const topContent = [
    ...songs.map(s => ({ name: s.title, typ: "Song", value: (s.plays || 0) + (s.likes || 0) })),
    ...videos.map(v => ({ name: v.title, typ: "Video", value: (v.views || 0) + (v.likes || 0) })),
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Likes split for donut
  const likesSplit = [
    { name: "Song Likes", value: totalSongLikes, color: "hsl(142 70% 45%)" },
    { name: "Video Likes", value: totalVideoLikes, color: "hsl(270 60% 55%)" },
  ];

  // Subscriber growth (last 14 days, cumulative)
  const subGrowth = [];
  let cumulative = 0;
  const subDays = 14;
  const sortedSubs = [...subscribers].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  for (let i = subDays - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    cumulative += sortedSubs.filter(s => { const d = new Date(s.created_date); return d >= dayStart && d < dayEnd; }).length;
    subGrowth.push({
      day: dayStart.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      Abos: cumulative,
    });
  }

  const hasContent = songs.length > 0 || videos.length > 0;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/profile" className="p-1 hover:bg-secondary rounded-full transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-base font-bold flex items-center gap-2">
          <BarChart2 size={18} className="text-primary" /> Creator Dashboard
        </h1>
      </div>

      {!hasContent ? (
        <div className="text-center py-24 px-4">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-lg font-semibold">Noch keine Inhalte</h2>
          <p className="text-sm text-muted-foreground mt-1">Lade Songs oder Videos hoch, um deine Statistiken zu sehen.</p>
          <Link to="/upload" className="inline-block mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
            Hochladen
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Live subscriber count-up */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 border border-primary/30 rounded-2xl p-5"
          >
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="relative">
                    <UserPlus size={18} className="text-primary" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />
                  </div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">Live Abonnenten</p>
                </div>
                <CountUp end={subscriberCount} duration={2000} className="text-4xl font-black tabular-nums" />
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Activity size={10} className="text-primary" /> In Echtzeit aktualisiert
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp size={14} />
                  <span className="text-xs font-bold">+{subGrowth.filter(d => d.Abos > 0).length > 0 ? subGrowth[subGrowth.length - 1].Abos - subGrowth[0].Abos : 0}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">in 14 Tagen</p>
              </div>
            </div>
          </motion.div>

          {/* Top stats cards */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-primary" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Monatliche Hörer</p>
              </div>
              <p className="text-3xl font-black"><CountUp end={monthlyListeners} /></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Letzte 30 Tage · {songs.length} Songs</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Eye size={16} className="text-accent" />
                <p className="text-[10px] font-bold text-accent uppercase tracking-wide">Monatliche Zuschauer</p>
              </div>
              <p className="text-3xl font-black"><CountUp end={monthlyViewers} /></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Letzte 30 Tage · {videos.length} Videos</p>
            </motion.div>
          </div>

          {/* Total likes banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-destructive/15 to-amber-400/10 border border-destructive/20 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={18} className="text-destructive fill-destructive" />
                  <p className="text-xs font-bold text-destructive uppercase tracking-wide">Gesamte Likes</p>
                </div>
                <p className="text-4xl font-black"><CountUp end={totalLikes} /></p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <Music2 size={12} className="text-primary" />
                  <span className="text-muted-foreground">Songs:</span>
                  <span className="font-bold">{formatNum(totalSongLikes)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Video size={12} className="text-accent" />
                  <span className="text-muted-foreground">Videos:</span>
                  <span className="font-bold">{formatNum(totalVideoLikes)}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/15 rounded-xl flex items-center justify-center">
                <Disc3 size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-xl font-black"><CountUp end={totalPlays} duration={1200} /></p>
                <p className="text-[10px] text-muted-foreground">Gesamte Plays</p>
              </div>
            </div>
            <div className="bg-secondary/40 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 bg-accent/15 rounded-xl flex items-center justify-center">
                <Play size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-xl font-black"><CountUp end={totalViews} duration={1200} /></p>
                <p className="text-[10px] text-muted-foreground">Gesamte Aufrufe</p>
              </div>
            </div>
          </div>

          {/* Time range selector */}
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" /> Performance über Zeit
            </p>
            <TimeRangeSelector value={range} onChange={setRange} />
          </div>

          {/* Charts + latest video comments side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            <div className="xl:col-span-2 space-y-4">
              {/* Real daily performance */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/30 rounded-2xl p-4"
              >
                <RealPerformanceChart data={dailyData} range={range} loading={realLoading} />
              </motion.div>

              {/* Cumulative growth: videos vs. music */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/30 rounded-2xl p-4"
              >
                <GrowthChart data={cumulativeData} />
              </motion.div>

              {/* Weekly performance: videos vs. music */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/30 rounded-2xl p-4"
              >
                <WeeklyPerformanceChart data={weeklyData} />
              </motion.div>
            </div>

            {/* Latest comments on the creator's videos */}
            <VideoCommentsFeed videos={videos} user={user} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Subscriber growth chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <UserPlus size={15} className="text-primary" />
                <p className="text-sm font-semibold">Abonnenten-Wachstum</p>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={subGrowth} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSubs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 70% 45%)" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="hsl(142 70% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(220 10% 55%)" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(220 10% 55%)" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 18% 7%)", border: "1px solid hsl(220 15% 15%)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="Abos" stroke="hsl(142 70% 45%)" fill="url(#gSubs)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Likes donut chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Heart size={15} className="text-destructive" />
                <p className="text-sm font-semibold">Likes Verteilung</p>
              </div>
              {totalLikes > 0 ? (
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={likesSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                        {likesSplit.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(220 18% 7%)", border: "1px solid hsl(220 15% 15%)", borderRadius: 12, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {likesSplit.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                        <span className="text-xs text-muted-foreground flex-1">{item.name}</span>
                        <span className="text-sm font-bold">{formatNum(item.value)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Gesamt</span>
                      <p className="text-lg font-black">{formatNum(totalLikes)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">Noch keine Likes</div>
              )}
            </motion.div>
          </div>

          {/* Donations from fans */}
          <DonationsPanel user={user} />

          {/* Top content bar chart */}
          {topContent.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-primary" />
                <p className="text-sm font-semibold">Top Inhalte</p>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topContent} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(220 10% 55%)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(220 10% 55%)" }} width={90} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 18% 7%)", border: "1px solid hsl(220 15% 15%)", borderRadius: 12, fontSize: 12 }}
                    cursor={{ fill: "hsl(220 15% 15%)", opacity: 0.3 }}
                  />
                  <Bar dataKey="value" name="Engagement" radius={[0, 6, 6, 0]}>
                    {topContent.map((entry, i) => (
                      <Cell key={i} fill={entry.typ === "Song" ? "hsl(142 70% 45%)" : "hsl(270 60% 55%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 pt-1">
            {[
              { key: "songs", label: "Songs", icon: Music2, count: songs.length },
              { key: "videos", label: "Videos", icon: Video, count: videos.length },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                  tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon size={13} /> {label} ({count})
              </button>
            ))}
          </div>

          {/* List */}
          {tab === "songs" ? (
            songs.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Keine Songs hochgeladen</p>
            ) : (
              <div className="space-y-2">
                {songs.map((song, i) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 bg-secondary/40 rounded-xl p-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music2 size={14} className="text-muted-foreground" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{song.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right flex-shrink-0">
                      <div>
                        <p className="text-sm font-bold flex items-center gap-1"><Play size={11} className="text-muted-foreground" />{formatNum(song.plays || 0)}</p>
                        <p className="text-[9px] text-muted-foreground">Plays</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold flex items-center gap-1"><Heart size={11} className="text-destructive" />{formatNum(song.likes || 0)}</p>
                        <p className="text-[9px] text-muted-foreground">Likes</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            videos.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Keine Videos hochgeladen</p>
            ) : (
              <div className="space-y-2">
                {videos.map((video, i) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 bg-secondary/40 rounded-xl p-3"
                  >
                    <div className="w-14 h-9 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video size={14} className="text-muted-foreground" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{video.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{video.channel_name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right flex-shrink-0">
                      <div>
                        <p className="text-sm font-bold flex items-center gap-1"><Eye size={11} className="text-muted-foreground" />{formatNum(video.views || 0)}</p>
                        <p className="text-[9px] text-muted-foreground">Aufrufe</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold flex items-center gap-1"><ThumbsUp size={11} className="text-primary" />{formatNum(video.likes || 0)}</p>
                        <p className="text-[9px] text-muted-foreground">Likes</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}


