
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { BarChart2 } from "lucide-react";
import { tooltipStyle, axisTick, gridStroke, COLOR_VIDEO, COLOR_MUSIC } from "@/components/creator/chartConfig";

export default function WeeklyPerformanceChart({ data }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={15} className="text-primary" />
        <p className="text-sm font-semibold">Wöchentliche Performance</p>
      </div>
      {data.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Noch keine Daten</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="day" tick={axisTick} />
            <YAxis tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridStroke, opacity: 0.3 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Aufrufe" name="Video-Aufrufe" fill={COLOR_VIDEO} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Plays" name="Musik-Plays" fill={COLOR_MUSIC} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}


