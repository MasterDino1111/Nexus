
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Radio, Loader2 } from "lucide-react";

export default function GoLiveDialog({ open, onOpenChange, onStart }) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("50");
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!title.trim()) return;
    setLoading(true);
    await onStart(title.trim(), Number(String(goal).replace(",", ".")) || 0);
    setLoading(false);
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio size={18} className="text-red-500" /> Live gehen
          </DialogTitle>
        </DialogHeader>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel deines Live-Streams"
          className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">Spenden-Ziel (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="z. B. 50"
            className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Deine Kamera startet direkt danach. Zuschauer finden den Stream im Live-Tab.
          Der Fortschrittsbalken zeigt ihnen, wie viel bis zum Ziel fehlt (0 = kein Ziel).
        </p>
        <button
          onClick={start}
          disabled={loading || !title.trim()}
          className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <><Loader2 size={15} className="animate-spin" /> Startet...</> : "Live starten"}
        </button>
      </DialogContent>
    </Dialog>
  );
}


