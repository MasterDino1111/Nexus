
import React from "react";
import { Heart } from "lucide-react";

export default function DonationGoalBar({ goal, raised = 0, compact = false }) {
  const target = Number(goal) || 0;
  if (target <= 0) return null;

  const collected = Number(raised) || 0;
  const percent = Math.min(100, Math.round((collected / target) * 100));
  const reached = collected >= target;
  const missing = Math.max(0, target - collected);

  return (
    <div className={compact ? "mt-3 space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
          <Heart size={11} className="text-destructive fill-destructive" /> Spenden-Ziel
        </span>
        <span className="font-bold">{collected}€ / {target}€</span>
      </div>
      <div className="h-2 rounded-full bg-background overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            reached ? "bg-primary" : "bg-gradient-to-r from-destructive to-accent"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          {reached
            ? "🎉 Ziel erreicht – danke für die Unterstützung!"
            : `Noch ${missing}€ bis zum Ziel – jede Spende hilft!`}
        </p>
      )}
    </div>
  );
}


