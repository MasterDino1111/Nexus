
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, Trash2, Camera, Loader2, Video, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      const myChannels = await base44.entities.CreatorChannel.filter({ owner_id: me.id }, "-created_date", 50);
      setChannels(myChannels);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAvatar = (file) => {
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let avatar_url = "";
      if (avatarFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: avatarFile });
        avatar_url = file_url;
      }
      const channel = await base44.entities.CreatorChannel.create({
        name: name.trim(),
        description: description.trim(),
        avatar_url,
        owner_id: user.id,
      });
      setChannels(prev => [channel, ...prev]);
      setShowCreate(false);
      setName(""); setDescription(""); setAvatarPreview(null); setAvatarFile(null);
      toast({ title: "Kanal erstellt!" });
    } catch (e) {
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.CreatorChannel.delete(id);
    setChannels(prev => prev.filter(c => c.id !== id));
    toast({ title: "Kanal gelöscht" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-full transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">Meine Kanäle</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium">
          <Plus size={16} /> Neu
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Personal channel */}
        <div className="bg-secondary/40 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {(user?.full_name || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{user?.full_name || "Persönlich"}</p>
            <p className="text-xs text-muted-foreground">Persönlicher Kanal (Standard)</p>
          </div>
        </div>

        {channels.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📺</div>
            <p className="font-semibold">Keine zusätzlichen Kanäle</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Erstelle weitere Kanäle, um Inhalte unter verschiedenen Namen zu veröffentlichen.
            </p>
            <button onClick={() => setShowCreate(true)} className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium">
              Kanal erstellen
            </button>
          </div>
        ) : (
          channels.map(ch => (
            <div key={ch.id} className="bg-secondary/40 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                {ch.avatar_url ? (
                  <img src={ch.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-primary text-lg">
                    {ch.name[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{ch.name}</p>
                {ch.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{ch.description}</p>}
              </div>
              <Link to={`/channel/video/${encodeURIComponent(ch.name)}`} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Kanal ansehen">
                <Video size={16} />
              </Link>
              <button onClick={() => handleDelete(ch.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Löschen">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm">Neuer Kanal</h2>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-center">
                <button
                  onClick={() => document.getElementById("ch-avatar-input")?.click()}
                  className="w-16 h-16 rounded-full bg-secondary overflow-hidden flex items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                >
                  {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : <Camera size={20} className="text-muted-foreground" />}
                </button>
                <input id="ch-avatar-input" type="file" accept="image/*" className="hidden" onChange={e => handleAvatar(e.target.files?.[0])} />
              </div>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Kanalname"
                className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Beschreibung (optional)"
                rows={2}
                className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <button
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Wird erstellt...</> : <><Plus size={16} /> Erstellen</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


