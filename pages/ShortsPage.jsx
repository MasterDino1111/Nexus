
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ShortPlayer from "@/components/video/ShortPlayer";
import { ChevronLeft, Zap, PlusCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function ShortsPage() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [me, setMe] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    loadShorts();
  }, []);

  useEffect(() => {
    if (shorts.length === 0) return;
    setActiveId(prev => prev ?? shorts[0].id);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.dataset.shortId);
        });
      },
      { root: containerRef.current, threshold: 0.6 }
    );
    containerRef.current?.querySelectorAll("[data-short-id]").forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [shorts]);

  const loadShorts = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setMe(user);
      const page = await base44.entities.Video.filter({ category: "shorts" }, { sort: "-created_date", limit: 20 });
      setShorts(page.items);
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
      if (user) {
        const [likes, saves] = await Promise.all([
          base44.entities.VideoLike.filter({ user_id: user.id }, "-created_date", 200),
          base44.entities.WatchLater.filter({ user_id: user.id }, "-created_date", 200),
        ]);
        setLikedIds(new Set(likes.map(l => l.video_id)));
        setSavedIds(new Set(saves.map(s => s.video_id)));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Pull in the next page as the viewer approaches the end of the feed
  const loadMore = async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await base44.entities.Video.filter({ category: "shorts" }, { sort: "-created_date", limit: 20, cursor });
      setShorts(prev => [...prev, ...page.items]);
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch (e) {
      console.error(e);
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    if (!activeId || shorts.length === 0) return;
    if (shorts.findIndex(s => s.id === activeId) >= shorts.length - 3) loadMore();
  }, [activeId, shorts]);

  const setLiked = (videoId, liked) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (liked) next.add(videoId); else next.delete(videoId);
      return next;
    });
  };

  const setSaved = (videoId, saved) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (saved) next.add(videoId); else next.delete(videoId);
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="p-1.5 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-1.5">
            <Zap size={18} className="text-primary" /> Shorts
          </h1>
          <Link to="/upload" className="p-2 hover:bg-secondary rounded-full transition-colors">
            <PlusCircle size={20} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="text-primary animate-spin" />
        </div>
      ) : shorts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-lg font-semibold">Noch keine Shorts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Lade vertikale Videos (9:16) hoch — idealerweise unter 60 Sekunden.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
          >
            <PlusCircle size={16} /> Short hochladen
          </Link>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
          {shorts.map(video => (
            <div key={video.id} data-short-id={video.id} className="h-full snap-start snap-always">
              <ShortPlayer
                video={video}
                isActive={activeId === video.id}
                me={me}
                liked={likedIds.has(video.id)}
                saved={savedIds.has(video.id)}
                onLikedChange={setLiked}
                onSavedChange={setSaved}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


