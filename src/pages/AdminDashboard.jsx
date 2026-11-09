
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Video, Music, MessageCircle, Crown, Trash2,
  ShieldCheck, BarChart2, RefreshCw, LogOut, Ban, Gift, X, TrendingUp, UserCheck, Lightbulb, ChevronLeft, Flag,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// Optional owner fallback via VITE_ADMIN_EMAIL. Real permissions are enforced by
// the entity rules on the server; this check only hides the page.
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const navigate = useNavigate();

  const [stats, setStats] = useState({ videos: 0, songs: 0, chats: 0, subscriptions: 0, activeUsers: 0 });
  const [videos, setVideos] = useState([]);
  const [songs, setSongs] = useState([]);
  const [subs, setSubs] = useState([]);
  const [users, setUsers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [reports, setReports] = useState([]);

  // Ban dialog
  const [banTarget, setBanTarget] = useState(null); // user object
  const [banReason, setBanReason] = useState("");

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      if (!(ADMIN_EMAIL && me.email === ADMIN_EMAIL) && me.role !== "admin") { navigate("/"); return; }
      setUser(me);
      await loadAll();
    } catch { navigate("/"); }
    setLoading(false);
  };

  const loadAll = async () => {
    const [videoData, songData, chatData, subData, userData, bannedData, feedbackData, reportData] = await Promise.all([
      base44.entities.Video.list("-created_date", 100),
      base44.entities.Song.list("-created_date", 100),
      base44.entities.Chat.list("-created_date", 100),
      base44.entities.Subscription.list("-created_date", 100),
      base44.entities.User.list("-created_date", 200),
      base44.entities.BannedUser.list("-created_date", 100),
      base44.entities.Feedback.list("-created_date", 100),
      base44.entities.Report.list("-created_date", 100).catch(() => []),
    ]);
    setVideos(videoData);
    setSongs(songData);
    setSubs(subData);
    setUsers(userData);
    setBannedUsers(bannedData);
    setFeedback(feedbackData);
    setReports(reportData);

    // Active users = registered + not banned
    const bannedIds = new Set(bannedData.map(b => b.user_id));
    const activeUsers = userData.filter(u => !bannedIds.has(u.id)).length;
    const payingPremium = subData.filter(s => s.status === "active" && s.plan !== "free").length;

    setStats({
      videos: videoData.length,
      songs: songData.length,
      chats: chatData.length,
      subscriptions: payingPremium,
      activeUsers,
    });
  };

  const deleteVideo = async (id) => {
    await base44.entities.Video.delete(id);
    setVideos(v => v.filter(x => x.id !== id));
    setStats(s => ({ ...s, videos: s.videos - 1 }));
  };

  const deleteSong = async (id) => {
    await base44.entities.Song.delete(id);
    setSongs(v => v.filter(x => x.id !== id));
    setStats(s => ({ ...s, songs: s.songs - 1 }));
  };

  const banUser = async () => {
    if (!banTarget) return;
    await base44.entities.BannedUser.create({
      user_id: banTarget.id,
      user_email: banTarget.email,
      user_name: banTarget.full_name || banTarget.email,
      reason: banReason.trim() || "Kein Grund angegeben",
    });
    setBannedUsers(prev => [...prev, { user_id: banTarget.id, user_email: banTarget.email, user_name: banTarget.full_name, reason: banReason }]);
    setBanTarget(null);
    setBanReason("");
  };

  const unbanUser = async (bannedEntry) => {
    await base44.entities.BannedUser.delete(bannedEntry.id);
    setBannedUsers(prev => prev.filter(b => b.id !== bannedEntry.id));
  };

  const grantPremium = async (targetUser) => {
    // Check if existing sub
    const existing = subs.find(s => s.user_id === targetUser.id && s.status === "active");
    if (existing) {
      await base44.entities.Subscription.update(existing.id, { plan: "premium", status: "active" });
      setSubs(prev => prev.map(s => s.id === existing.id ? { ...s, plan: "premium" } : s));
    } else {
      const newSub = await base44.entities.Subscription.create({
        user_id: targetUser.id,
        plan: "premium",
        status: "active",
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setSubs(prev => [...prev, newSub]);
      setStats(s => ({ ...s, subscriptions: s.subscriptions + 1 }));
    }
  };

  const makeAdmin = async (targetUser) => {
    await base44.entities.User.update(targetUser.id, { role: "admin" });
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: "admin" } : u));
    // Also grant premium automatically
    const existing = subs.find(s => s.user_id === targetUser.id && s.status === "active");
    if (!existing) {
      const newSub = await base44.entities.Subscription.create({
        user_id: targetUser.id,
        plan: "premium",
        status: "active",
        expires_at: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setSubs(prev => [...prev, newSub]);
    }
  };

  const removeAdmin = async (targetUser) => {
    await base44.entities.User.update(targetUser.id, { role: "user" });
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: "user" } : u));
  };

  const revokePremium = async (targetUser) => {
    const existing = subs.find(s => s.user_id === targetUser.id && s.status === "active");
    if (existing) {
      await base44.entities.Subscription.update(existing.id, { status: "cancelled" });
      setSubs(prev => prev.map(s => s.id === existing.id ? { ...s, status: "cancelled" } : s));
      setStats(s => ({ ...s, subscriptions: Math.max(0, s.subscriptions - 1) }));
    }
  };

  const isBanned = (userId) => bannedUsers.some(b => b.user_id === userId);
  const hasPremium = (userId) => subs.some(s => s.user_id === userId && s.status === "active" && s.plan !== "free");
  const isAdmin = (u) => u.role === "admin" || (ADMIN_EMAIL && u.email === ADMIN_EMAIL);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft size={22} />
          </button>
          <ShieldCheck size={20} className="text-primary" />
          <h1 className="text-lg font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => base44.auth.logout("/login")} className="p-2 hover:bg-secondary rounded-full transition-colors text-destructive">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Ban Dialog */}
      {banTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setBanTarget(null)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm flex items-center gap-2"><Ban size={16} className="text-destructive" /> Benutzer bannen</h2>
              <button onClick={() => setBanTarget(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>{banTarget.full_name || banTarget.email}</strong> wird gebannt.
            </p>
            <textarea
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              placeholder="Grund (optional)..."
              rows={3}
              className="w-full px-3 py-2 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-destructive resize-none mb-3"
            />
            <button
              onClick={banUser}
              className="w-full py-2.5 bg-destructive text-white rounded-xl font-semibold text-sm"
            >
              Bannen
            </button>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { icon: Video, label: "Videos", value: stats.videos, color: "text-blue-400" },
            { icon: Music, label: "Songs", value: stats.songs, color: "text-purple-400" },
            { icon: Users, label: "Aktive Nutzer", value: stats.activeUsers, color: "text-green-400" },
            { icon: Crown, label: "Premium", value: stats.subscriptions, color: "text-amber-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-secondary/50 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: "overview", label: "Übersicht", icon: BarChart2 },
            { key: "analytics", label: "Analyse", icon: TrendingUp },
            { key: "users", label: "Nutzer", icon: Users },
            { key: "videos", label: "Videos", icon: Video },
            { key: "songs", label: "Songs", icon: Music },
            { key: "reports", label: `Meldungen${reports.filter(r => r.status !== "resolved").length ? ` (${reports.filter(r => r.status !== "resolved").length})` : ""}`, icon: Flag },
            { key: "feedback", label: "Vorschläge", icon: Lightbulb },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Analytics */}
        {tab === "analytics" && (() => {
          const totalUsers = users.length;
          const bannedCount = bannedUsers.length;
          const activeCount = stats.activeUsers;
          const premiumCount = stats.subscriptions;
          const freeCount = totalUsers - premiumCount;

          const userPieData = [
            { name: "Aktiv", value: activeCount, color: "#22c55e" },
            { name: "Gebannt", value: bannedCount, color: "#ef4444" },
          ];
          const subPieData = [
            { name: "Premium", value: premiumCount, color: "#f59e0b" },
            { name: "Kostenlos", value: Math.max(0, freeCount), color: "#6366f1" },
          ];
          const barData = [
            { name: "Videos", value: stats.videos },
            { name: "Songs", value: stats.songs },
            { name: "Chats", value: stats.chats },
            { name: "Nutzer", value: totalUsers },
            { name: "Premium", value: premiumCount },
          ];

          return (
            <div className="space-y-5">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Aktive Nutzer", value: activeCount, sub: `von ${totalUsers} gesamt`, color: "text-green-400" },
                  { label: "Zahlende Premium", value: premiumCount, sub: `${totalUsers ? Math.round(premiumCount / totalUsers * 100) : 0}% der Nutzer`, color: "text-amber-400" },
                  { label: "Gebannte Nutzer", value: bannedCount, sub: "gesperrt", color: "text-destructive" },
                  { label: "Conversion Rate", value: `${totalUsers ? Math.round(premiumCount / totalUsers * 100) : 0}%`, sub: "Free → Premium", color: "text-primary" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-secondary/40 rounded-2xl p-4">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs font-semibold mt-0.5">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{sub}</p>
                  </div>
                ))}
              </div>

              {/* User status pie */}
              <div className="bg-secondary/30 rounded-2xl p-4">
                <p className="text-sm font-semibold mb-3">Nutzerstatus</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={userPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {userPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(220 18% 7%)", border: "none", borderRadius: 8, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Subscription pie */}
              <div className="bg-secondary/30 rounded-2xl p-4">
                <p className="text-sm font-semibold mb-3">Abonnements</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={subPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {subPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(220 18% 7%)", border: "none", borderRadius: 8, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar overview */}
              <div className="bg-secondary/30 rounded-2xl p-4">
                <p className="text-sm font-semibold mb-3">Plattform-Inhalte</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barData} barSize={28}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(220 18% 7%)", border: "none", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(142 70% 45%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-3">
            <div className="bg-secondary/30 rounded-2xl p-4">
              <p className="text-sm font-semibold mb-1">Admin-Konto</p>
              <p className="text-xs text-muted-foreground">{user?.full_name}</p>
              <p className="text-xs text-primary">{user?.email}</p>
            </div>
            <div className="bg-secondary/30 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold mb-2">Plattform-Übersicht</p>
              {[
                { label: "Gesamt Videos", value: stats.videos },
                { label: "Gesamt Songs", value: stats.songs },
                { label: "Registrierte Nutzer", value: users.length },
                { label: "Gebannte Nutzer", value: bannedUsers.length },
                { label: "Premium-Abos", value: stats.subscriptions },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-bold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Keine Nutzer</p>
            ) : users.map(u => {
              const banned = bannedUsers.find(b => b.user_id === u.id);
              const premium = hasPremium(u.id);
              return (
                <div key={u.id} className={`bg-secondary/30 rounded-xl p-3 ${banned ? "border border-destructive/30" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || "–"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      <div className="flex gap-1 mt-0.5">
                        {isAdmin(u) && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">Admin</span>}
                        {premium && <span className="text-[9px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">Premium</span>}
                        {banned && <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-semibold">Gebannt</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {/* Toggle admin — can't remove the root admin */}
                      {!(ADMIN_EMAIL && u.email === ADMIN_EMAIL) && (
                        isAdmin(u) ? (
                          <button
                            onClick={() => removeAdmin(u)}
                            className="p-1.5 text-primary bg-primary/10 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                            title="Admin entfernen"
                          >
                            <UserCheck size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => makeAdmin(u)}
                            className="p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                            title="Zum Admin machen"
                          >
                            <UserCheck size={15} />
                          </button>
                        )
                      )}
                      {/* Toggle premium */}
                      {!premium ? (
                        <button
                          onClick={() => grantPremium(u)}
                          className="p-1.5 text-muted-foreground hover:bg-amber-400/10 hover:text-amber-400 rounded-lg transition-colors"
                          title="Premium geben"
                        >
                          <Gift size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => revokePremium(u)}
                          className="p-1.5 text-amber-400 bg-amber-400/10 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                          title="Premium entfernen"
                        >
                          <Crown size={15} />
                        </button>
                      )}
                      {/* Ban/unban */}
                      {!banned ? (
                        <button
                          onClick={() => { setBanTarget(u); setBanReason(""); }}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Bannen"
                        >
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => unbanUser(banned)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Entbannen"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  {banned && (
                    <p className="text-[10px] text-destructive mt-1.5 pl-12">Grund: {banned.reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Videos */}
        {tab === "videos" && (
          <div className="space-y-2">
            {videos.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Keine Videos</p>
            ) : videos.map(v => (
              <div key={v.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3">
                <div className="w-12 h-8 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <p className="text-[10px] text-muted-foreground">{v.channel_name} · {v.views || 0} Views</p>
                </div>
                <button onClick={() => deleteVideo(v.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Songs */}
        {tab === "songs" && (
          <div className="space-y-2">
            {songs.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Keine Songs</p>
            ) : songs.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3">
                <div className="w-10 h-10 bg-secondary rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" /> : <Music size={14} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.artist} · {s.plays || 0} Plays</p>
                </div>
                <button onClick={() => deleteSong(s.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Keine Meldungen</p>
            ) : reports.map(r => (
              <div key={r.id} className="bg-secondary/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-destructive/20 text-destructive">{r.reason}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-secondary text-muted-foreground">{r.target_type}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${r.status === "resolved" ? "bg-green-500/20 text-green-400" : r.status === "reviewing" ? "bg-amber-400/20 text-amber-400" : "bg-secondary text-muted-foreground"}`}>
                    {r.status === "resolved" ? "Erledigt" : r.status === "reviewing" ? "In Prüfung" : "Offen"}
                  </span>
                  <button
                    onClick={async () => {
                      const next = r.status === "open" ? "reviewing" : r.status === "reviewing" ? "resolved" : "open";
                      await base44.entities.Report.update(r.id, { status: next });
                      setReports(prev => prev.map(x => x.id === r.id ? { ...x, status: next } : x));
                    }}
                    className="ml-auto text-[10px] text-primary hover:underline"
                  >
                    Status ändern
                  </button>
                  <button
                    onClick={async () => {
                      await base44.entities.Report.delete(r.id);
                      setReports(prev => prev.filter(x => x.id !== r.id));
                    }}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-sm font-semibold">{r.target_title || r.target_id}</p>
                {r.details && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.details}</p>}
                <p className="text-[10px] text-muted-foreground mt-1.5">gemeldet von {r.reporter_name || "Unbekannt"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Feedback */}
        {tab === "feedback" && (
          <div className="space-y-2">
            {feedback.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Keine Vorschläge</p>
            ) : feedback.map(f => (
              <div key={f.id} className="bg-secondary/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${f.type === "feature" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                    {f.type === "feature" ? "Neue Funktion" : "Änderung"}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                    f.status === "done" ? "bg-green-500/20 text-green-400" :
                    f.status === "reviewing" ? "bg-amber-400/20 text-amber-400" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {f.status === "done" ? "Erledigt" : f.status === "reviewing" ? "In Prüfung" : "Offen"}
                  </span>
                  <button
                    onClick={async () => {
                      const next = f.status === "open" ? "reviewing" : f.status === "reviewing" ? "done" : "open";
                      await base44.entities.Feedback.update(f.id, { status: next });
                      setFeedback(prev => prev.map(x => x.id === f.id ? { ...x, status: next } : x));
                    }}
                    className="ml-auto text-[10px] text-primary hover:underline"
                  >
                    Status ändern
                  </button>
                  <button
                    onClick={async () => {
                      await base44.entities.Feedback.delete(f.id);
                      setFeedback(prev => prev.filter(x => x.id !== f.id));
                    }}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{f.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">von {f.user_name || "Unbekannt"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


