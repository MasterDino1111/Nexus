
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SongRow from "@/components/music/SongRow";
import CreatePlaylistDialog from "@/components/music/CreatePlaylistDialog";
import { Search, ListMusic, Disc3, Music2, PlusCircle, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const genres = [
  { label: "Alle", value: null },
  { label: "Pop", value: "pop" },
  { label: "Rock", value: "rock" },
  { label: "Hip-Hop", value: "hiphop" },
  { label: "Electronic", value: "electronic" },
  { label: "Jazz", value: "jazz" },
  { label: "R&B", value: "rnb" },
  { label: "Klassik", value: "classical" },
];

export default function MusicPage() {
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("songs");
  const [user, setUser] = useState(null);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadData();
  }, [genre]);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      let songData;
      if (genre) {
        songData = await base44.entities.Song.filter({ genre }, "-created_date", 50);
      } else {
        songData = await base44.entities.Song.list("-created_date", 50);
      }
      setSongs(songData);
      const playlistData = await base44.entities.Playlist.list("-created_date", 20);
      setPlaylists(playlistData);
      if (me) {
        const mine = await base44.entities.Playlist.filter({ owner_id: me.id }, "-created_date", 50);
        setMyPlaylists(mine);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredSongs = searchQuery
    ? songs.filter(s =>
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.artist?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : songs;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Disc3 size={22} className="text-primary" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Musik</span>
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCreate(true)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              title="Playlist erstellen"
            >
              <Plus size={20} />
            </button>
            <Link to="/upload" className="p-2 hover:bg-secondary rounded-full transition-colors">
              <PlusCircle size={20} />
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Songs & Künstler suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          <button
            onClick={() => setTab("songs")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === "songs" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Music2 size={14} /> Songs
          </button>
          <button
            onClick={() => setTab("playlists")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === "playlists" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <ListMusic size={14} /> Playlists
          </button>
        </div>

        {/* Genre filter for songs */}
        {tab === "songs" && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {genres.map(g => (
              <button
                key={g.label}
                onClick={() => setGenre(g.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  genre === g.value
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <CreatePlaylistDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(pl) => { setMyPlaylists(prev => [pl, ...prev]); setPlaylists(prev => [pl, ...prev]); }}
      />

      {/* My Playlists */}
      {myPlaylists.length > 0 && (
        <div className="px-4 pt-4">
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5">
            <ListMusic size={15} className="text-primary" /> Meine Playlists
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {myPlaylists.map(pl => (
              <Link
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className="flex-shrink-0 w-28 group"
              >
                <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden mb-1.5">
                  {pl.cover_url ? (
                    <img src={pl.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <ListMusic size={28} className="text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs font-semibold truncate">{pl.name}</p>
                <p className="text-[10px] text-muted-foreground">{pl.song_ids?.length || 0} Songs</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-4 bg-secondary rounded" />
                <div className="w-10 h-10 bg-secondary rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-secondary rounded w-2/3" />
                  <div className="h-2 bg-secondary rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : tab === "songs" ? (
          filteredSongs.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🎵</div>
              <h2 className="text-lg font-semibold">Keine Songs gefunden</h2>
              <p className="text-sm text-muted-foreground mt-1">Füge Songs hinzu, um Musik zu hören!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSongs.map((song, i) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <SongRow song={song} index={i} songList={filteredSongs} />
                </motion.div>
              ))}
            </div>
          )
        ) : (
          playlists.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📀</div>
              <h2 className="text-lg font-semibold">Keine Playlists</h2>
              <p className="text-sm text-muted-foreground mt-1">Erstelle deine erste Playlist!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {playlists.map(pl => (
                <Link
                  key={pl.id}
                  to={`/playlist/${pl.id}`}
                  className="bg-secondary/50 rounded-xl p-3 hover:bg-secondary transition-colors group"
                >
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-2 overflow-hidden">
                    {pl.cover_url ? (
                      <img src={pl.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <ListMusic size={32} className="text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-semibold truncate">{pl.name}</p>
                  <p className="text-xs text-muted-foreground">{pl.song_ids?.length || 0} Songs</p>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}


