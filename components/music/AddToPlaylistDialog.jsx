
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, ListMusic, Plus, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AddToPlaylistDialog({ open, onClose, song }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) loadPlaylists();
  }, [open]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      const data = await base44.entities.Playlist.filter({ owner_id: me.id }, "-created_date", 50);
      setPlaylists(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (!open) return null;

  const handleAdd = async (playlist) => {
    if (playlist.song_ids?.includes(song.id)) return;
    setAdding(playlist.id);
    try {
      const updated = await base44.entities.Playlist.update(playlist.id, {
        song_ids: [...(playlist.song_ids || []), song.id],
      });
      setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, song_ids: updated.song_ids } : p));
      toast({ title: "Zur Playlist hinzugefügt!" });
    } catch (e) {
      toast({ title: "Fehler", variant: "destructive" });
    }
    setAdding(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-5 w-full max-w-sm border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <ListMusic size={16} className="text-primary" /> Zur Playlist hinzufügen
          </h2>
          <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-3 truncate">Song: {song?.title}</p>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-primary" /></div>
        ) : playlists.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Keine Playlists vorhanden. Erstelle zuerst eine Playlist.</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {playlists.map(pl => {
              const has = pl.song_ids?.includes(song.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => handleAdd(pl)}
                  disabled={has || adding === pl.id}
                  className="w-full flex items-center gap-3 p-2.5 bg-secondary/50 hover:bg-secondary rounded-xl transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                    {pl.cover_url ? <img src={pl.cover_url} alt="" className="w-full h-full object-cover rounded-lg" /> : <ListMusic size={16} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pl.name}</p>
                    <p className="text-[10px] text-muted-foreground">{pl.song_ids?.length || 0} Songs</p>
                  </div>
                  {has ? <Check size={16} className="text-primary" /> : adding === pl.id ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} className="text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


