import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Flag, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const REPORT_REASONS = [
  { key: "spam", label: "Spam oder Betrug" },
  { key: "hate", label: "Hass oder Belästigung" },
  { key: "violence", label: "Gewalt" },
  { key: "sexual", label: "Sexuelle Inhalte" },
  { key: "copyright", label: "Urheberrechtsverletzung" },
  { key: "other", label: "Anderes" },
];

/** Lets a user report a video, short, song, comment, user or live stream. */
export default function ReportDialog({ open, onClose, targetType, targetId, targetTitle }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.Report.create({
        target_type: targetType,
        target_id: targetId,
        target_title: targetTitle || "",
        reason,
        details: details.trim(),
        reporter_id: me.id,
        reporter_name: me.full_name || me.email,
        status: "open",
      });
      toast({ title: "Danke für deine Meldung", description: "Wir prüfen den Inhalt so schnell wie möglich." });
      setDetails("");
      onClose();
    } catch {
      toast({ title: "Meldung fehlgeschlagen", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-5 w-full max-w-sm border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm flex items-center gap-2"><Flag size={16} className="text-destructive" /> Inhalt melden</h2>
          <button onClick={onClose} aria-label="Schliessen"><X size={16} className="text-muted-foreground" /></button>
        </div>
        <div className="space-y-1.5 mb-3">
          {REPORT_REASONS.map(r => (
            <button
              key={r.key}
              onClick={() => setReason(r.key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${reason === r.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={e => setDetails(e.target.value.slice(0, 500))}
          placeholder="Weitere Angaben (optional)"
          rows={3}
          className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none resize-none mb-3"
        />
        <button onClick={submit} disabled={saving} className="w-full py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />} Melden
        </button>
      </div>
    </div>
  );
}
