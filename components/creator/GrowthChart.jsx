
import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { tooltipStyle, axisTick, gridStroke, COLOR_VIDEO, COLOR_MUSIC } from "@/components/creator/chartConfig";

export default function GrowthChart({ data }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={15} className="text-primary" />
        <p className="text-sm font-semibold">Kumulatives Wachstum</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="day" tick={axisTick} interval="preserveStartEnd" />
          <YAxis tick={axisTick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="Aufrufe" name="Video-Aufrufe" stroke={COLOR_VIDEO} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Plays" name="Musik-Plays" stroke={COLOR_MUSIC} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}


