
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Lightbulb, Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function FeedbackDialog({ open, onClose, onSubmitted }) {
  const [type, setType] = useState("feature");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!open) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const fb = await base44.entities.Feedback.create({
        user_id: me.id,
        user_name: me.full_name || me.email,
        title: title.trim(),
        content: content.trim(),
        type,
        status: "open",
      });
      onSubmitted?.(fb);
      setTitle("");
      setContent("");
      setType("feature");
      onClose();
      toast({ title: "Danke für deinen Vorschlag!" });
    } catch (e) {
      toast({ title: "Fehler beim Senden", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-5 w-full max-w-sm border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Lightbulb size={16} className="text-primary" /> Vorschlag einreichen
          </h2>
          <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setType("feature")}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${type === "feature" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Neue Funktion
          </button>
          <button
            onClick={() => setType("change")}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${type === "change" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Änderung
          </button>
        </div>

        <input
          autoFocus
          type="text"
          placeholder="Kurzer Titel"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary mb-3"
        />
        <textarea
          placeholder="Beschreibe, was hinzugefügt oder geändert werden sollte..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary resize-none mb-4"
        />
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || saving}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Absenden
        </button>
      </div>
    </div>
  );
}


