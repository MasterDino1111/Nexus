
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Bell, ThumbsUp, Zap, Music, Trash2, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";

const TYPE_META = {
  video_like: { icon: ThumbsUp, color: "text-accent" },
  short_like: { icon: Zap, color: "text-primary" },
  song_like: { icon: Music, color: "text-primary" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, []);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      const data = await base44.entities.Notification.filter({ user_id: me.id }, "-created_date", 50);
      setNotifications(data);
      // Persist as read, but keep the original flags so new ones stay highlighted this visit
      if (data.some(n => !n.read)) {
        await base44.entities.Notification.updateMany({ user_id: me.id, read: false }, { $set: { read: true } });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const openNotification = (n) => {
    if (n.link) navigate(n.link);
  };

  const removeNotification = async (e, id) => {
    e.stopPropagation();
    await base44.entities.Notification.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = async () => {
    const me = await base44.auth.me();
    await base44.entities.Notification.deleteMany({ user_id: me.id });
    setNotifications([]);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="p-1.5 hover:bg-secondary rounded-full transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold flex items-center gap-2 flex-1">
          <Bell size={18} className="text-primary" /> Benachrichtigungen
        </h1>
        {notifications.length > 0 && (
          <button onClick={clearAll} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Alle löschen">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="text-primary animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24 px-6">
          <div className="text-5xl mb-4">🔔</div>
          <h2 className="text-lg font-semibold">Noch keine Benachrichtigungen</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sobald jemand deine Videos, Shorts oder Songs liked, erfährst du es hier.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.video_like;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                onClick={() => openNotification(n)}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${n.link ? "cursor-pointer hover:bg-secondary/50" : ""} ${!n.read ? "bg-primary/5" : ""}`}
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{n.message}</p>
                  {n.content_title && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{n.content_title}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">{moment(n.created_date).fromNow()}</p>
                </div>
                {n.content_thumbnail && (
                  <img src={n.content_thumbnail} alt="" className="w-9 h-12 rounded-lg object-cover flex-shrink-0" />
                )}
                <button
                  onClick={(e) => removeNotification(e, n.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  title="Löschen"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


