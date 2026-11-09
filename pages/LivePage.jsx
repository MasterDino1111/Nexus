
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Radio, ChevronLeft, Video } from "lucide-react";
import { motion } from "framer-motion";
import LiveCard from "@/components/live/LiveCard";
import GoLiveDialog from "@/components/live/GoLiveDialog";
import { callFunction } from "@/lib/callFunction";
import { usePremium } from "@/lib/usePremium";
import NotificationBell from "@/components/layout/NotificationBell";

export default function LivePage() {
  const [streams, setStreams] = useState([]);
  const [mine, setMine] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [raised, setRaised] = useState({});
  const navigate = useNavigate();
  const { canCreate } = usePremium();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!active) return;
      setUser(me);
      const page = await base44.entities.LiveStream.filter({ status: "live" }, { sort: "-started_at", limit: 30 });
      if (!active) return;
      setStreams(page.items.filter(s => s.host_id !== me?.id));
      setMine(page.items.find(s => s.host_id === me?.id) || null);
      setLoading(false);

      const goalIds = page.items.filter(s => s.donation_goal > 0).map(s => s.id);
      if (goalIds.length) {
        const { data } = await callFunction("streamRaised", { streamIds: goalIds }).catch(() => ({ data: {} }));
        if (!active) return;
        setRaised(data?.raised || {});
      }
    };
    load();
    const unsub = base44.entities.LiveStream.subscribe(() => load());
    return () => { active = false; unsub(); };
  }, []);

  const goLive = async (title, goal) => {
    if (!user) return;
    const record = await base44.entities.LiveStream.create({
      title,
      host_id: user.id,
      host_name: user.full_name || user.email,
      host_avatar: user.avatar_url || "",
      status: "live",
      viewers: 0,
      donation_goal: goal || 0,
      started_at: new Date().toISOString(),
    });
    setDialogOpen(false);
    navigate(`/live/studio/${record.id}`);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="p-1 hover:bg-secondary rounded-full transition-colors">
              <ChevronLeft size={22} />
            </Link>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Radio size={18} className="text-red-500" /> Live
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => (canCreate ? setDialogOpen(true) : navigate('/premium'))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500 text-white text-xs font-bold"
            >
              <Radio size={14} /> Live gehen
            </button>
          </div>
        </div>
      </div>

      {mine && (
        <div className="px-4 pt-4">
          <Link
            to={`/live/studio/${mine.id}`}
            className="flex items-center gap-3 bg-gradient-to-r from-red-500/20 to-accent/10 border border-red-500/30 rounded-2xl p-4"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">Du bist live: {mine.title}</p>
              <p className="text-xs text-muted-foreground">{mine.viewers || 0} Zuschauer · zum Studio</p>
            </div>
          </Link>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-video bg-secondary rounded-2xl" />
                <div className="h-3 bg-secondary rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📡</div>
            <h2 className="text-lg font-semibold">Momentan ist niemand live</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mine ? "Du bist gerade live." : "Starte selbst einen Live-Stream – deine Follower sehen ihn hier."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.map((stream, i) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <LiveCard stream={stream} raised={raised[stream.id] || 0} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <GoLiveDialog open={dialogOpen} onOpenChange={setDialogOpen} onStart={goLive} />
    </div>
  );
}


