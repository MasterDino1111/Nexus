
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadCount();
    const unsub = base44.entities.Notification.subscribe(() => loadCount());
    return unsub;
  }, []);

  const loadCount = async () => {
    try {
      const me = await base44.auth.me();
      setCount(await base44.entities.Notification.count({ user_id: me.id, read: false }));
    } catch {}
  };

  return (
    <Link to="/notifications" className="relative p-2 hover:bg-secondary rounded-full transition-colors">
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center leading-none font-bold">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}


