
import React from "react";

const OPTIONS = [7, 30, 90];

export default function TimeRangeSelector({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            value === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {d} T
        </button>
      ))}
    </div>
  );
}


