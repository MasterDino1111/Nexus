
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate } from "react-router-dom";
import { Radio, Users, Link2, Square, Loader2, MonitorUp, MonitorOff } from "lucide-react";
import { createHostConnection, closeConnection, canShareScreen, replaceOutgoingTracks, buildScreenStream } from "@/lib/liveRtc";
import { useToast } from "@/components/ui/use-toast";
import LiveChat from "@/components/live/LiveChat";

export default function LiveStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stream, setStream] = useState(null);
  const [viewers, setViewers] = useState(0);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const videoRef = useRef(null);
  const mediaRef = useRef(null); // what new viewers receive
  const camRef = useRef(null); // camera + microphone
  const displayRef = useRef(null); // screen capture while sharing
  const mixerRef = useRef(null);
  const hostIdRef = useRef(null);
  const peersRef = useRef({});

  useEffect(() => {
    let unsub;
    const start = async () => {
      const me = await base44.auth.me();
      hostIdRef.current = me.id;
      const record = await base44.entities.LiveStream.get(id).catch(() => null);
      if (!record || record.host_id !== me.id) {
        navigate(`/live/${id}`);
        return;
      }
      setStream(record);
      setViewers(record.viewers || 0);

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 } },
          audio: true,
        });
        mediaRef.current = media;
        camRef.current = media;
        if (videoRef.current) videoRef.current.srcObject = media;
        setReady(true);
      } catch (e) {
        setError("Kamera/Mikrofon nicht verfügbar. Bitte erlaube den Zugriff und lade die Seite neu.");
        return;
      }

      unsub = base44.entities.LiveSignal.subscribe(handleSignal);

      // Viewers that were already waiting
      const pending = await base44.entities.LiveSignal.filter({ stream_id: id, kind: "join" }, { sort: "created_date", limit: 20 });
      for (const signal of pending.items) {
        if (signal.from_id !== me.id) connectToViewer(signal);
      }
    };
    start();
    return () => {
      unsub?.();
      Object.values(peersRef.current).forEach(closeConnection);
      peersRef.current = {};
      stopAllMedia();
    };
  }, [id]);

  const stopAllMedia = () => {
    camRef.current?.getTracks().forEach(t => t.stop());
    displayRef.current?.getTracks().forEach(t => t.stop());
    mixerRef.current?.dispose();
    displayRef.current = null;
    mixerRef.current = null;
  };

  // Share the screen: swap the live tracks, viewers stay connected
  const startScreenShare = async () => {
    if (!canShareScreen()) {
      toast({ title: "Nicht unterstützt", description: "Bildschirmfreigabe geht nur im Browser am Computer.", variant: "destructive" });
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      const { stream, dispose } = buildScreenStream(display, camRef.current);
      displayRef.current = display;
      mixerRef.current = { dispose };
      mediaRef.current = stream;
      await replaceOutgoingTracks(Object.values(peersRef.current), stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
      // The browser's own "Stop sharing" button ends it too
      display.getVideoTracks()[0].addEventListener("ended", stopScreenShare);
      setSharing(true);
    } catch (e) {
      if (e?.name !== "NotAllowedError") {
        toast({ title: "Bildschirmfreigabe fehlgeschlagen", variant: "destructive" });
      }
    }
  };

  const stopScreenShare = async () => {
    displayRef.current?.getTracks().forEach(t => t.stop());
    mixerRef.current?.dispose();
    displayRef.current = null;
    mixerRef.current = null;
    if (!camRef.current) return;
    mediaRef.current = camRef.current;
    await replaceOutgoingTracks(Object.values(peersRef.current), camRef.current);
    if (videoRef.current) videoRef.current.srcObject = camRef.current;
    setSharing(false);
  };

  const handleSignal = async (event) => {
    const signal = event.data;
    if (!signal || signal.stream_id !== id || signal.from_id === hostIdRef.current) return;

    if (event.type === "create" && signal.kind === "join" && !peersRef.current[signal.id]) {
      connectToViewer(signal);
      return;
    }
    if (event.type === "update" && signal.kind === "answer") {
      const pc = peersRef.current[signal.id];
      if (pc && pc.signalingState === "have-local-offer" && signal.payload) {
        await pc.setRemoteDescription({ type: "answer", sdp: signal.payload }).catch(() => {});
      }
      return;
    }
    if (event.type === "delete") {
      closeConnection(peersRef.current[signal.id]);
      delete peersRef.current[signal.id];
      refreshViewers();
    }
  };

  const connectToViewer = async (signal) => {
    if (!mediaRef.current) return;
    const { pc, sdp } = await createHostConnection(mediaRef.current);
    peersRef.current[signal.id] = pc;
    await base44.entities.LiveSignal.update(signal.id, { kind: "offer", payload: sdp });
    refreshViewers();
  };

  const refreshViewers = async () => {
    const count = await base44.entities.LiveSignal.count({ stream_id: id }).catch(() => 0);
    setViewers(count);
    await base44.entities.LiveStream.update(id, { viewers: count }).catch(() => {});
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/live/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link kopiert", description: "Teile ihn, damit Zuschauer beitreten." });
    } catch {
      toast({ title: "Link", description: url });
    }
  };

  const endStream = async () => {
    await base44.entities.LiveStream.update(id, {
      status: "ended",
      ended_at: new Date().toISOString(),
      viewers: 0,
    }).catch(() => {});
    await base44.entities.LiveSignal.deleteMany({ stream_id: id }).catch(() => {});
    Object.values(peersRef.current).forEach(closeConnection);
    peersRef.current = {};
    stopAllMedia();
    navigate("/live");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Radio size={18} className="text-red-500 flex-shrink-0" />
          <h1 className="text-sm font-bold truncate">{stream?.title || "Live-Studio"}</h1>
        </div>
        <button
          onClick={endStream}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex-shrink-0"
        >
          <Square size={13} /> Beenden
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-4">
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video lg:col-start-1 lg:row-start-1">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full ${sharing ? "object-contain" : "object-cover"}`}
            style={{ transform: sharing ? "none" : "scaleX(-1)" }}
          />
          {sharing && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/70 text-white text-[11px] px-2.5 py-1 rounded-full">
              <MonitorUp size={12} /> Bildschirm wird geteilt
            </span>
          )}
          <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </span>
          <span className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 text-white text-[11px] px-2.5 py-1 rounded-full">
            <Users size={12} /> {viewers}
          </span>
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-8 text-center">
              {error ? (
                <p className="text-sm text-white/90">{error}</p>
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/80">
                  <Loader2 size={22} className="animate-spin" />
                  <p className="text-xs">Kamera wird gestartet...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-secondary/40 rounded-2xl p-4 space-y-3 lg:col-start-1 lg:row-start-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Zuschauer</p>
              <p className="text-2xl font-black">{viewers}</p>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-xs font-semibold hover:bg-secondary/70"
            >
              <Link2 size={14} /> Link kopieren
            </button>
          </div>
          {canShareScreen() && (
            <button
              onClick={sharing ? stopScreenShare : startScreenShare}
              disabled={!ready}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 ${
                sharing ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {sharing ? <><MonitorOff size={14} /> Bildschirmfreigabe beenden</> : <><MonitorUp size={14} /> Bildschirm teilen</>}
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">
            Dein Stream läuft direkt aus dem Browser zu den Zuschauern. Je mehr Zuschauer gleichzeitig dabei sind,
            desto mehr Bandbreite braucht dein Gerät.
          </p>
        </div>

        <LiveChat
          streamId={id}
          className="h-[420px] rounded-2xl border border-border lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]"
        />
      </div>
    </div>
  );
}


