
import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, ImagePlus, X, FileVideo, Wand2, Crown, CalendarClock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Field, SubmitBtn } from "@/components/upload/UploadField";

const videoCategories = ["entertainment", "music", "gaming", "education", "sports", "news", "tech", "shorts"];

export default function VideoUploadForm({ isShort = false }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [channels, setChannels] = useState([]);

  const [form, setForm] = useState({
    title: "", description: "", channel_name: "", channel_avatar: "",
    duration: "", category: isShort ? "shorts" : "entertainment", is_premium: false, scheduled_publish_time: "",
  });
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [thumbnailData, setThumbnailData] = useState(null);
  const [thumbnailMode, setThumbnailMode] = useState("none");
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const thumbnailInputRef = useRef(null);
  const [videoFileUrl, setVideoFileUrl] = useState(null);
  const [videoFileName, setVideoFileName] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoFileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(me => {
      base44.entities.CreatorChannel.filter({ owner_id: me.id }, "-created_date", 50).then(setChannels).catch(() => {});
    }).catch(() => {});
  }, []);

  const handleVideoFileSelect = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      if (probe.duration > 24 * 60 * 60) {
        toast({ title: "Video zu lang", description: "Maximal 24 Stunden erlaubt.", variant: "destructive" });
        URL.revokeObjectURL(url);
        return;
      }
      setVideoFileUrl(url);
      setVideoFileName(file.name);
      setVideoDuration(Math.round(probe.duration));
    };
    probe.onerror = () => {
      setVideoFileUrl(url);
      setVideoFileName(file.name);
    };
    probe.src = url;
  };

  const handleImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { setThumbnailPreview(e.target.result); setThumbnailData(e.target.result); };
    reader.readAsDataURL(file);
  };

  const generateThumbnail = async () => {
    if (!form.title) {
      toast({ title: "Bitte zuerst einen Titel eingeben", variant: "destructive" });
      return;
    }
    setGeneratingThumb(true);
    try {
      const res = await base44.integrations.Core.GenerateImage({
        prompt: `Cinematic ${isShort ? "vertical short-video" : "thumbnail for a video"} titled "${form.title}", category: ${form.category}. Eye-catching, high quality, vibrant colors, dramatic lighting, professional style.`,
      });
      setThumbnailPreview(res.url);
      setThumbnailData(res.url);
      setThumbnailMode("ai");
    } catch (e) {
      toast({ title: "Fehler beim Generieren", variant: "destructive" });
    }
    setGeneratingThumb(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !videoFileUrl) {
      toast({ title: "Pflichtfelder fehlen", description: isShort ? "Titel und Short-Video sind erforderlich." : "Titel und Video sind erforderlich.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const user = await base44.auth.me();
    await base44.entities.Video.create({
      ...form,
      category: isShort ? "shorts" : form.category,
      video_url: videoFileUrl,
      thumbnail_url: thumbnailData || "",
      duration: videoDuration,
      views: 0, likes: 0, dislikes: 0,
      uploader_id: user.id,
      channel_name: form.channel_name || user.full_name || "Unbekannt",
      scheduled_publish_time: form.scheduled_publish_time ? new Date(form.scheduled_publish_time).toISOString() : null,
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate(isShort ? "/shorts" : "/"), 1500);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
          <Check size={32} className="text-white" />
        </div>
        <p className="text-lg font-bold">Erfolgreich hochgeladen!</p>
        <p className="text-sm text-muted-foreground">Du wirst weitergeleitet...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Titel *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder={isShort ? "z.B. Mein erster Short" : "z.B. Mein erstes Video"} />

      {/* Media File */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
          {isShort ? "Short-Video (9:16) *" : "Video-Datei *"}
        </label>
        {videoFileUrl ? (
          <div className={`relative rounded-xl overflow-hidden bg-black mx-auto ${isShort ? "w-56" : "w-full"}`}>
            <video src={videoFileUrl} controls className={`w-full object-contain ${isShort ? "aspect-[9/16]" : "max-h-48"}`} />
            <button type="button" onClick={() => { setVideoFileUrl(null); setVideoFileName(null); setVideoDuration(0); }} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full">
              <X size={14} className="text-white" />
            </button>
            <p className="px-3 py-1.5 text-[11px] text-muted-foreground truncate bg-secondary/80">{videoFileName}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoFileInputRef.current?.click()}
            className={`${isShort ? "w-56 mx-auto aspect-[9/16]" : "w-full aspect-video"} rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/40 flex flex-col items-center justify-center gap-2 transition-colors group`}
          >
            <FileVideo size={28} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs text-muted-foreground">{isShort ? "Short-Video auswählen" : "Video auswählen"}</span>
          </button>
        )}
        <input ref={videoFileInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleVideoFileSelect(e.target.files?.[0])} />
      </div>

      {/* Thumbnail */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Titelbild</label>
        {thumbnailPreview ? (
          <div className={`relative rounded-xl overflow-hidden bg-secondary ${isShort ? "w-40 aspect-[9/16]" : "w-full aspect-video"}`}>
            <img src={thumbnailPreview} alt="Vorschau" className="w-full h-full object-cover" />
            <button type="button" onClick={() => { setThumbnailPreview(null); setThumbnailData(null); setThumbnailMode("none"); }} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full">
              <X size={14} className="text-white" />
            </button>
            {thumbnailMode === "ai" && (
              <span className="absolute bottom-2 left-2 text-[10px] bg-accent/90 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <Wand2 size={9} /> KI-generiert
              </span>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-2 gap-2 ${isShort ? "w-64" : ""}`}>
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              className={`${isShort ? "aspect-[9/16]" : "aspect-video"} rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/40 flex flex-col items-center justify-center gap-1.5 transition-colors group`}
            >
              <ImagePlus size={22} className="text-muted-foreground group-hover:text-primary" />
              <span className="text-xs text-muted-foreground">Eigenes Bild</span>
            </button>
            <button
              type="button"
              onClick={generateThumbnail}
              disabled={generatingThumb}
              className={`${isShort ? "aspect-[9/16]" : "aspect-video"} rounded-xl border-2 border-dashed border-accent/40 hover:border-accent bg-accent/5 flex flex-col items-center justify-center gap-1.5 transition-colors group disabled:opacity-50`}
            >
              {generatingThumb ? (
                <Loader2 size={22} className="text-accent animate-spin" />
              ) : (
                <Wand2 size={22} className="text-accent group-hover:scale-110 transition-transform" />
              )}
              <span className="text-xs text-accent font-medium">KI generieren</span>
            </button>
          </div>
        )}
        <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageFile(e.target.files?.[0])} />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Kanal</label>
        <select
          value={form.channel_name || "__personal"}
          onChange={e => {
            const val = e.target.value;
            if (val === "__personal") {
              setForm(f => ({ ...f, channel_name: "", channel_avatar: "" }));
            } else {
              const ch = channels.find(c => c.name === val);
              setForm(f => ({ ...f, channel_name: val, channel_avatar: ch?.avatar_url || "" }));
            }
          }}
          className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="__personal">Persönlicher Kanal</option>
          {channels.map(ch => <option key={ch.id} value={ch.name}>{ch.name}</option>)}
        </select>
        <Link to="/channels" className="text-[11px] text-primary hover:underline mt-1 inline-block">Kanäle verwalten</Link>
      </div>

      {videoDuration > 0 && (
        <div className="px-4 py-2.5 bg-secondary/60 rounded-xl text-sm text-muted-foreground">
          Dauer: <span className="text-primary font-semibold">{Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, "0")}</span> ({videoDuration}s)
        </div>
      )}

      {isShort ? (
        <div className="px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-xl text-xs text-muted-foreground">
          📱 Shorts: Lade ein vertikales Video (9:16) hoch, idealerweise unter 60 Sekunden.
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Kategorie</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary">
              {videoCategories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          {form.category === "shorts" && (
            <div className="px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-xl text-xs text-muted-foreground">
              📱 Shorts: Lade ein vertikales Video (9:16) hoch, idealerweise unter 60 Sekunden.
            </div>
          )}
        </>
      )}

      <Field label="Beschreibung" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Beschreibe dein Video..." textarea />

      {/* Scheduled publish time */}
      <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <CalendarClock size={16} className="text-primary" />
          <div>
            <p className="text-sm font-semibold">Veröffentlichungszeit</p>
            <p className="text-xs text-muted-foreground">Lege fest, wann {isShort ? "der Short" : "das Video"} live geht</p>
          </div>
        </div>
        <input
          type="datetime-local"
          value={form.scheduled_publish_time}
          onChange={e => setForm(f => ({ ...f, scheduled_publish_time: e.target.value }))}
          className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
        />
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
          onClick={() => setForm(f => ({ ...f, is_premium: !f.is_premium }))}
          className={`w-11 h-6 rounded-full transition-colors relative ${form.is_premium ? "bg-amber-400" : "bg-secondary"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_premium ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <SubmitBtn loading={loading} label={isShort ? "Short veröffentlichen" : "Video veröffentlichen"} />
    </form>
  );
}


