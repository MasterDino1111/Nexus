
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, ListMusic, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CreatePlaylistDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const playlist = await base44.entities.Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner_id: me.id,
        song_ids: [],
        is_public: true,
      });
      onCreated?.(playlist);
      setName("");
      setDescription("");
      onClose();
      toast({ title: "Playlist erstellt!" });
    } catch (e) {
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-5 w-full max-w-sm border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <ListMusic size={16} className="text-primary" /> Neue Playlist
          </h2>
          <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
        </div>
        <input
          autoFocus
          type="text"
          placeholder="Playlist-Name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary mb-3"
        />
        <textarea
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary resize-none mb-4"
        />
        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <ListMusic size={15} />}
          Erstellen
        </button>
      </div>
    </div>
  );
}


