
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SongRow from "@/components/music/SongRow";
import { ChevronLeft, ListMusic, Play, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useToast } from "@/components/ui/use-toast";

export default function PlaylistDetail() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [saving, setSaving] = useState(false);
  const { playSong } = useMusicPlayer();
  const { toast } = useToast();

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pl, me] = await Promise.all([
        base44.entities.Playlist.get(id),
        base44.auth.me(),
      ]);
      setPlaylist(pl);
      setUser(me);
      if (pl.song_ids?.length) {
        const allSongs = await base44.entities.Song.list("-created_date", 200);
        setSongs(allSongs.filter(s => pl.song_ids.includes(s.id)));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const isOwner = user?.id === playlist?.owner_id;

  const handlePlayAll = () => {
    if (songs.length) playSong(songs[0], songs);
  };

  const startEdit = () => {
    setNameInput(playlist.name || "");
    setDescInput(playlist.description || "");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      const updated = await base44.entities.Playlist.update(id, {
        name: nameInput.trim(),
        description: descInput.trim(),
      });
      setPlaylist(updated);
      setEditing(false);
      toast({ title: "Playlist aktualisiert!" });
    } catch (e) {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleRemove = async (songId) => {
    const newIds = (playlist.song_ids || []).filter(sid => sid !== songId);
    await base44.entities.Playlist.update(id, { song_ids: newIds });
    setPlaylist(p => ({ ...p, song_ids: newIds }));
    setSongs(prev => prev.filter(s => s.id !== songId));
    toast({ title: "Entfernt" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Playlist nicht gefunden</p>
        <Link to="/music" className="mt-4 text-primary text-sm">Zur Musik</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/music" className="p-1 hover:bg-secondary rounded-full transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-base font-bold flex items-center gap-2">
          <ListMusic size={18} className="text-primary" /> Playlist
        </h1>
      </div>

      <div className="px-4 pt-6 pb-4 text-center">
        <div className="w-40 h-40 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden mb-4">
          {playlist.cover_url ? (
            <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ListMusic size={48} className="text-muted-foreground" />
          )}
        </div>
        {editing ? (
          <div className="max-w-xs mx-auto space-y-2 text-left">
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Playlist-Name"
              className="w-full px-3 py-2 bg-secondary rounded-xl text-sm font-bold text-center outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              value={descInput}
              onChange={e => setDescInput(e.target.value)}
              placeholder="Beschreibung (optional)"
              rows={2}
              className="w-full px-3 py-2 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !nameInput.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Speichern
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-secondary rounded-full text-sm font-medium flex items-center gap-1.5"
              >
                <X size={14} /> Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-black">{playlist.name}</h2>
              {isOwner && (
                <button
                  onClick={startEdit}
                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                  title="Playlist umbenennen"
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
            {playlist.description && <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">{songs.length} Songs</p>
            {songs.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold flex items-center gap-2 mx-auto hover:bg-primary/80 transition-colors"
              >
                <Play size={16} /> Abspielen
              </button>
            )}
          </>
        )}
      </div>

      <div className="px-4 space-y-1">
        {songs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🎵</div>
            <p className="font-semibold">Keine Songs in dieser Playlist</p>
            <Link to="/music" className="text-sm text-primary mt-1 inline-block">Songs hinzufügen</Link>
          </div>
        ) : (
          songs.map((song, i) => (
            <div key={song.id} className="flex items-center gap-1">
              <div className="flex-1"><SongRow song={song} index={i} songList={songs} /></div>
              {isOwner && (
                <button
                  onClick={() => handleRemove(song.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


