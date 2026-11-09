
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Play, Music, User, Crown, Radio } from "lucide-react";
import { base44 } from "@/api/base44Client";

function Badge({ count }) {
  if (!count || count === 0) return null;
  const label = count > 999 ? "999+" : count;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center leading-none font-bold">
      {label}
    </span>);

}

export default function BottomNav() {
  const location = useLocation();
  const [unreadChats, setUnreadChats] = useState(0);
  const [newVideos, setNewVideos] = useState(0);

  useEffect(() => {
    loadBadges();
    // Subscribe to new messages for live badge update
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.type === "create") {
        setUnreadChats((c) => Math.min(c + 1, 1000));
      }
    });
    return unsub;
  }, []);

  // Reset chat badge when visiting chats
  useEffect(() => {
    if (location.pathname.startsWith("/chats") || location.pathname.startsWith("/chat")) {
      setUnreadChats(0);
    }
    if (location.pathname === "/") {
      setNewVideos(0);
    }
  }, [location.pathname]);

  const loadBadges = async () => {
    try {
      const [messages, videos] = await Promise.all([
      base44.entities.Message.filter({ read: false }, "-created_date", 100),
      base44.entities.Video.list("-created_date", 5)]
      );
      setUnreadChats(messages.length);
      // Show badge for videos uploaded in the last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      setNewVideos(videos.filter((v) => v.created_date > oneDayAgo).length);
    } catch {}
  };

  const badges = {
    "/": newVideos,
    "/chats": unreadChats
  };

  const navItems = [
  { path: "/", icon: Play, label: "Videos" },
  { path: "/music", icon: Music, label: "Musik" },
  { path: "/live", icon: Radio, label: "Live" },
  { path: "/chats", icon: MessageCircle, label: "Chats" },
  { path: "/premium", icon: Crown, label: "Premium" },
  { path: "/profile", icon: User, label: "Profil" }];


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === "/" ?
          location.pathname === "/" :
          location.pathname.startsWith(path);
          const badgeCount = badges[path] || 0;
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
              isActive ?
              "text-primary" :
              "text-muted-foreground hover:text-foreground"}`
              }>
              
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <Badge count={badgeCount} />
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>);

        })}
      </div>
    </nav>);

}


