
import React from "react";
import { Link } from "react-router-dom";
import { Eye, Radio } from "lucide-react";
import moment from "moment";
import DonationGoalBar from "@/components/live/DonationGoalBar";

export default function LiveCard({ stream, raised = 0 }) {
  return (
    <Link
      to={`/live/${stream.id}`}
      className="block bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors"
    >
      <div className="relative aspect-video bg-gradient-to-br from-secondary to-background flex items-center justify-center">
        {stream.host_avatar ? (
          <img src={stream.host_avatar} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-black text-primary">
            {(stream.host_name || "U")[0]?.toUpperCase()}
          </div>
        )}
        <span className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Radio size={10} /> LIVE
        </span>
        <span className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">
          <Eye size={11} /> {stream.viewers || 0}
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold truncate">{stream.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {stream.host_name || "Unbekannt"} · seit {moment(stream.started_at || stream.created_date).format("HH:mm")}
        </p>
        <DonationGoalBar goal={stream.donation_goal} raised={raised} compact />
      </div>
    </Link>
  );
}


