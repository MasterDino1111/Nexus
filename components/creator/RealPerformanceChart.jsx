
import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Activity, Eye, Music2 } from "lucide-react";
import { tooltipStyle, axisTick, gridStroke, COLOR_VIDEO, COLOR_MUSIC } from "@/components/creator/chartConfig";

export default function RealPerformanceChart({ data, range, loading }) {
  const totalViews = data.reduce((s, d) => s + d.Aufrufe, 0);
  const totalPlays = data.reduce((s, d) => s + d.Plays, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-primary" />
          <p className="text-sm font-semibold">Wiedergaben pro Tag ({range} Tage)</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Eye size={11} className="text-accent" /> <b className="text-foreground">{totalViews}</b>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Music2 size={11} className="text-primary" /> <b className="text-foreground">{totalPlays}</b>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-[180px] flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="rpViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLOR_VIDEO} stopOpacity={0.5} />
                <stop offset="95%" stopColor={COLOR_VIDEO} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rpPlays" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLOR_MUSIC} stopOpacity={0.5} />
                <stop offset="95%" stopColor={COLOR_MUSIC} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="day" tick={axisTick} interval="preserveStartEnd" />
            <YAxis tick={axisTick} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(0 0% 95%)" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="Aufrufe" name="Video-Aufrufe" stroke={COLOR_VIDEO} fill="url(#rpViews)" strokeWidth={2} />
            <Area type="monotone" dataKey="Plays" name="Musik-Plays" stroke={COLOR_MUSIC} fill="url(#rpPlays)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <p className="text-[10px] text-muted-foreground mt-2">
        Echte Wiedergaben im gewählten Zeitraum – Video-Aufrufe und Musik-Plays werden beim Abspielen erfasst.
      </p>
    </>
  );
}


