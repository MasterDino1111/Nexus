
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Music, ChevronLeft, Loader2, Check, ImagePlus, X, Wand2, Crown, Video, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import VideoUploadForm from "@/components/upload/VideoUploadForm";
import { Field, SubmitBtn } from "@/components/upload/UploadField";

const songGenres = ["pop", "rock", "hiphop", "electronic", "jazz", "classical", "rnb", "latin", "country"];

export default function UploadPage() {
  const [tab, setTab] = useState("video");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Song form
  const [songForm, setSongForm] = useState({
    title: "", artist: "", album: "", audio_url: "", duration_seconds: "", genre: "pop", is_premium: false,
  });
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverData, setCoverData] = useState(null);
  const [generatingCover, setGeneratingCover] = useState(false);
  const coverInputRef = useRef(null);
  const [audioFileUrl, setAudioFileUrl] = useState(null);
  const [audioFileName, setAudioFileName] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioFileInputRef = useRef(null);

  const handleImageFile = (file, setPreview, setData) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { setPreview(e.target.result); setData(e.target.result); };
    reader.readAsDataURL(file);
  };

  const handleAudioFileSelect = async (file) => {
    if (!file) return;
    setUploadingAudio(true);
    setAudioFileName(file.name);
    // Probe duration
    const url = URL.createObjectURL(file);
    const probe = document.createElement("audio");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      setSongForm(f => ({ ...f, duration_seconds: Math.round(probe.duration) }));
      URL.revokeObjectURL(url);
    };
    probe.src = url;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAudioFileUrl(file_url);
      setSongForm(f => ({ ...f, audio_url: file_url }));
    } catch (e) {
      toast({ title: "Fehler beim Hochladen der Audio-Datei", variant: "destructive" });
    }
    setUploadingAudio(false);
  };

  const generateCover = async () => {
    if (!songForm.title) {
      toast({ title: "Bitte zuerst einen Titel eingeben", variant: "destructive" });
      return;
    }
    setGeneratingCover(true);
    try {
      const res = await base44.integrations.Core.GenerateImage({
        prompt: `Album cover art for a song titled "${songForm.title}" by ${songForm.artist || "unknown artist"}, genre: ${songForm.genre}. Artistic, modern music cover design, square format.`,
      });
      setCoverPreview(res.url);
      setCoverData(res.url);
    } catch (e) {
      toast({ title: "Fehler beim Generieren", variant: "destructive" });
    }
    setGeneratingCover(false);
  };

  const handleSongSubmit = async (e) => {
    e.preventDefault();
    if (!songForm.title || !songForm.artist) {
      toast({ title: "Pflichtfelder fehlen", description: "Titel und Künstler sind erforderlich.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const user = await base44.auth.me();
    await base44.entities.Song.create({
      ...songForm,
      cover_url: coverData || "",
      duration_seconds: Number(songForm.duration_seconds) || 0,
      plays: 0,
      likes: 0,
      uploader_id: user.id,
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/music"), 1500);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
          <Check size={32} className="text-white" />
        </div>
        <p className="text-lg font-bold">Erfolgreich hochgeladen!</p>
        <p className="text-sm text-muted-foreground">Du wirst weitergeleitet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="p-1.5 hover:bg-secondary rounded-full transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold">Hochladen</h1>
      </div>

      <div className="p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          <button onClick={() => setTab("video")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${tab === "video" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Video size={14} /> Video
          </button>
          <button onClick={() => setTab("shorts")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${tab === "shorts" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Zap size={14} /> Shorts
          </button>
          <button onClick={() => setTab("song")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${tab === "song" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Music size={14} /> Song
          </button>
        </div>

        {tab === "song" ? (
          <form onSubmit={handleSongSubmit} className="space-y-4">
            <Field label="Titel *" value={songForm.title} onChange={v => setSongForm(f => ({ ...f, title: v }))} placeholder="z.B. Mein Song" />
            <Field label="Künstler *" value={songForm.artist} onChange={v => setSongForm(f => ({ ...f, artist: v }))} placeholder="Künstlername" />
            <Field label="Album" value={songForm.album} onChange={v => setSongForm(f => ({ ...f, album: v }))} placeholder="Albumname" />
            {/* Audio File */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Audio-Datei</label>
              {audioFileUrl ? (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <Music size={18} className="text-primary flex-shrink-0" />
                  <p className="text-sm truncate flex-1">{audioFileName}</p>
                  <button type="button" onClick={() => { setAudioFileUrl(null); setAudioFileName(null); setSongForm(f => ({ ...f, audio_url: "" })); }} className="p-1 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => audioFileInputRef.current?.click()} disabled={uploadingAudio} className="w-full py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/40 flex flex-col items-center justify-center gap-2 transition-colors group disabled:opacity-50">
                  {uploadingAudio ? <Loader2 size={22} className="text-primary animate-spin" /> : <Music size={22} className="text-muted-foreground group-hover:text-primary" />}
                  <span className="text-xs text-muted-foreground">{uploadingAudio ? "Wird hochgeladen..." : "Audio-Datei auswählen (MP3, WAV, ...)"}</span>
                </button>
              )}
              <input ref={audioFileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => handleAudioFileSelect(e.target.files?.[0])} />
            </div>

            {/* Cover */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Cover-Bild</label>
              {coverPreview ? (
                <div className="relative w-40 aspect-square rounded-xl overflow-hidden bg-secondary">
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setCoverPreview(null); setCoverData(null); }} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="w-28 aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/40 flex flex-col items-center justify-center gap-1 transition-colors group">
                    <ImagePlus size={20} className="text-muted-foreground group-hover:text-primary" />
                    <span className="text-[10px] text-muted-foreground">Eigenes</span>
                  </button>
                  <button type="button" onClick={generateCover} disabled={generatingCover} className="w-28 aspect-square rounded-xl border-2 border-dashed border-accent/40 hover:border-accent bg-accent/5 flex flex-col items-center justify-center gap-1 transition-colors group disabled:opacity-50">
                    {generatingCover ? <Loader2 size={20} className="text-accent animate-spin" /> : <Wand2 size={20} className="text-accent group-hover:scale-110 transition-transform" />}
                    <span className="text-[10px] text-accent font-medium">KI Cover</span>
                  </button>
                </div>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageFile(e.target.files?.[0], setCoverPreview, setCoverData)} />
            </div>

            {songForm.duration_seconds > 0 && (
              <div className="px-4 py-2.5 bg-secondary/60 rounded-xl text-sm text-muted-foreground">
                Dauer: <span className="text-primary font-semibold">{Math.floor(songForm.duration_seconds / 60)}:{(songForm.duration_seconds % 60).toString().padStart(2, "0")}</span> ({songForm.duration_seconds}s)
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Genre</label>
              <select value={songForm.genre} onChange={e => setSongForm(f => ({ ...f, genre: e.target.value }))} className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary">
                {songGenres.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>

            {/* Premium toggle */}
            <div className="flex items-center justify-between px-4 py-3 bg-amber-400/10 border border-amber-400/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Crown size={16} className="text-amber-400" />
                <div>
                  <p className="text-sm font-semibold">Premium-Inhalt</p>
                  <p className="text-xs text-muted-foreground">Nur für Premium-Abonnenten</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSongForm(f => ({ ...f, is_premium: !f.is_premium }))}
                className={`w-11 h-6 rounded-full transition-colors relative ${songForm.is_premium ? "bg-amber-400" : "bg-secondary"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${songForm.is_premium ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <SubmitBtn loading={loading} label="Song hochladen" />
          </form>
        ) : (
          <VideoUploadForm isShort={tab === "shorts"} />
        )}
      </div>
    </div>
  );
}


