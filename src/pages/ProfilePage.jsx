
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  User, Settings, LogOut, Crown, ChevronRight, Video, Music,
  MessageCircle, Pencil, Check, X, Trash2, Radio, Camera, Loader2, ShieldCheck, BarChart2, Lightbulb, Eye, ThumbsUp, Play,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import FeedbackDialog from "@/components/FeedbackDialog";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [myVideos, setMyVideos] = useState([]);
  const [mySongs, setMySongs] = useState([]);
  const [stats, setStats] = useState({ videos: 0, songs: 0, chats: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("videos"); // "videos" | "stream" | "settings"
  const [showFeedback, setShowFeedback] = useState(false);

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const { toast } = useToast();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setAvatarPreview(userData.avatar_url || null);

      const [subs, videos, songs, chats] = await Promise.all([
        base44.entities.Subscription.filter({ user_id: userData.id, status: "active" }, "-created_date", 1),
        base44.entities.Video.filter({ uploader_id: userData.id }, "-created_date", 50),
        base44.entities.Song.filter({ uploader_id: userData.id }, "-created_date", 50),
        base44.entities.Chat.list("-created_date", 100),
      ]);

      if (subs.length > 0) setSubscription(subs[0]);
      setMyVideos(videos);
      setMySongs(songs);
      setStats({ videos: videos.length, songs: songs.length, chats: chats.length });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await base44.entities.User.update(user.id, { full_name: nameInput.trim() });
      setUser(u => ({ ...u, full_name: nameInput.trim() }));
      setEditingName(false);
      toast({ title: "Name gespeichert!" });
    } catch (e) {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
    setSavingName(false);
  };

  const handleAvatarFile = (file) => {
    if (!file) return;
    setPendingAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleConfirmAvatar = async () => {
    if (!pendingAvatarFile) return;
    setSavingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pendingAvatarFile });
      await base44.auth.updateMe({ avatar_url: file_url });
      setUser(u => ({ ...u, avatar_url: file_url }));
      setAvatarPreview(file_url);
      setPendingAvatarFile(null);
      toast({ title: "Profilbild gespeichert!" });
    } catch (e) {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
    setSavingAvatar(false);
  };

  const handleCancelAvatar = () => {
    setAvatarPreview(user?.avatar_url || null);
    setPendingAvatarFile(null);
  };

  const handleDeleteVideo = async (videoId) => {
    await base44.entities.Video.delete(videoId);
    setMyVideos(v => v.filter(x => x.id !== videoId));
    setStats(s => ({ ...s, videos: s.videos - 1 }));
    toast({ title: "Video gelöscht" });
  };

  const handleLogout = () => { base44.auth.logout("/login"); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isPremium = subscription && subscription.plan !== "free";

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 h-36 bg-gradient-to-b from-primary/15 via-accent/5 to-transparent" />
        <div className="relative px-4 pt-8 pb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-white">
                    {(user?.full_name || user?.email || "U")[0].toUpperCase()}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                  <Camera size={18} className="text-white" />
                </div>
              </button>
              {isPremium && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <Crown size={12} className="text-white" />
                </div>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleAvatarFile(e.target.files?.[0])} />
              {pendingAvatarFile && (
                <div className="flex gap-1 mt-1.5 justify-center">
                  <button
                    onClick={handleConfirmAvatar}
                    disabled={savingAvatar}
                    className="w-7 h-7 bg-primary rounded-full flex items-center justify-center disabled:opacity-50"
                  >
                    {savingAvatar ? <Loader2 size={13} className="animate-spin text-white" /> : <Check size={13} className="text-white" />}
                  </button>
                  <button
                    onClick={handleCancelAvatar}
                    className="w-7 h-7 bg-secondary rounded-full flex items-center justify-center"
                  >
                    <X size={13} className="text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSaveName()}
                    className="flex-1 bg-secondary rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={handleSaveName} disabled={savingName} className="text-primary">
                    {savingName ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-muted-foreground"><X size={15} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{user?.full_name || "Benutzer"}</h1>
                  <button
                    onClick={() => { setNameInput(user?.full_name || ""); setEditingName(true); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {isPremium && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                  <Crown size={10} /> {subscription.plan === "premium_plus" ? "Premium+" : "Premium"}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { icon: Video, label: "Videos", value: stats.videos },
              { icon: Music, label: "Songs", value: stats.songs },
              { icon: MessageCircle, label: "Chats", value: stats.chats },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-secondary/50 rounded-xl p-3 text-center">
                <Icon size={18} className="mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mt-2 mb-4">
        {[
          { key: "videos", label: "Meine Videos", icon: Video },
          { key: "music", label: "Meine Musik", icon: Music },
          { key: "stream", label: "Stream", icon: Radio },
          { key: "settings", label: "Einstellungen", icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
              tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* My Videos */}
      {tab === "videos" && (
        <div className="px-4 space-y-3">
          {myVideos.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🎬</div>
              <p className="font-semibold">Noch keine Videos</p>
              <p className="text-sm text-muted-foreground mt-1">Lade dein erstes Video hoch!</p>
              <Link to="/upload" className="inline-block mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                Hochladen
              </Link>
            </div>
          ) : (
            myVideos.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-3 bg-secondary/40 rounded-xl overflow-hidden"
              >
                {/* Thumbnail / Player */}
                <div className="w-28 flex-shrink-0 bg-black">
                  {video.video_url ? (
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover"
                      style={{ aspectRatio: "16/9" }}
                      controls
                      preload="metadata"
                    />
                  ) : video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" style={{ aspectRatio: "16/9" }} />
                  ) : (
                    <div className="w-full flex items-center justify-center bg-secondary" style={{ aspectRatio: "16/9" }}>
                      <Video size={20} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 py-2 pr-2 min-w-0">
                  <p className="text-sm font-semibold truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{video.channel_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Eye size={11} /> {video.views || 0}</span>
                    <span className="flex items-center gap-0.5"><ThumbsUp size={11} /> {video.likes || 0}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link
                      to={`/video/${video.id}`}
                      className="text-[11px] px-2.5 py-1 bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Ansehen
                    </Link>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="text-[11px] px-2.5 py-1 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Löschen
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Music Tab */}
      {tab === "music" && (
        <div className="px-4 space-y-3">
          {mySongs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🎵</div>
              <p className="font-semibold">Noch keine Songs</p>
              <p className="text-sm text-muted-foreground mt-1">Lade deinen ersten Song hoch!</p>
              <Link to="/upload" className="inline-block mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                Hochladen
              </Link>
            </div>
          ) : (
            mySongs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-3 bg-secondary/40 rounded-xl overflow-hidden"
              >
                <div className="w-16 h-16 flex-shrink-0 bg-secondary">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={20} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 py-2 pr-2 min-w-0">
                  <p className="text-sm font-semibold truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Play size={10} /> {song.plays || 0}</span>
                    <span className="flex items-center gap-0.5"><ThumbsUp size={10} /> {song.likes || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Stream Tab */}
      {tab === "stream" && (
        <div className="px-4 space-y-4">
          <div className="bg-secondary/50 rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Radio size={18} className="text-primary" />
              <h2 className="font-bold text-sm">Live Stream</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Verbinde deinen RTMP-Client (z.B. OBS Studio) mit den folgenden Daten, um live zu streamen.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide block mb-1">RTMP Server</label>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <code className="text-xs flex-1 text-primary font-mono break-all">rtmp://live.unistream.app/live</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText("rtmp://live.unistream.app/live"); toast({ title: "Kopiert!" }); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 bg-background rounded"
                  >
                    Kopieren
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide block mb-1">Stream-Key</label>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <code className="text-xs flex-1 text-primary font-mono break-all">
                    {`sk_${(user?.id || "").slice(0, 8)}_${Math.random().toString(36).slice(2, 10)}`}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText("sk_" + (user?.id || "").slice(0, 8)); toast({ title: "Kopiert!" }); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 bg-background rounded"
                  >
                    Kopieren
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-muted-foreground">
              💡 <strong>So gehts:</strong> Öffne OBS → Einstellungen → Stream → Dienst: Benutzerdefiniert → Trage Server & Key ein → Stream starten.
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="px-4 space-y-1">
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl border border-accent/20 hover:border-accent/40 transition-colors mb-2 w-full"
          >
            <Lightbulb size={20} className="text-accent" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Vorschlag einreichen</p>
              <p className="text-xs text-muted-foreground">Was soll hinzugefügt oder geändert werden?</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>

          <Link
            to="/channels"
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl border border-accent/20 hover:border-accent/40 transition-colors mb-2"
          >
            <Video size={20} className="text-accent" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Meine Kanäle</p>
              <p className="text-xs text-muted-foreground">Zusätzliche Creator-Kanäle verwalten</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>

          <Link
            to="/creator"
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors mb-2"
          >
            <BarChart2 size={20} className="text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Creator Dashboard</p>
              <p className="text-xs text-muted-foreground">Hörer, Zuschauer & Likes</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>

          {(user?.email === "dean.mueller@bluewin.ch" || user?.role === "admin") && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors mb-2"
            >
              <ShieldCheck size={20} className="text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Admin Dashboard</p>
                <p className="text-xs text-muted-foreground">Plattform verwalten</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          )}

          {!isPremium && (
            <Link
              to="/premium"
              className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors mb-2"
            >
              <Crown size={20} className="text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Premium holen</p>
                <p className="text-xs text-muted-foreground">Werbefreies Erlebnis</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 transition-colors w-full"
          >
            <div className="w-9 h-9 bg-destructive/10 rounded-xl flex items-center justify-center">
              <LogOut size={18} className="text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive">Abmelden</p>
          </button>
        </div>
      )}

      <FeedbackDialog open={showFeedback} onClose={() => setShowFeedback(false)} />

      <p className="text-center text-[10px] text-muted-foreground mt-8">UniStream v1.0 • Made with ❤️</p>
    </div>
  );
}


