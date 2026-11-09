
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Users, Volume2, VolumeX, Heart } from "lucide-react";
import { createViewerConnection, closeConnection } from "@/lib/liveRtc";
import DonateDialog from "@/components/donate/DonateDialog";
import LiveChat from "@/components/live/LiveChat";
import LiveDonationGoal from "@/components/live/LiveDonationGoal";

export default function LiveWatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("connecting");
  const [remote, setRemote] = useState(null);
  const [muted, setMuted] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const signalIdRef = useRef(null);
  const answeredRef = useRef(false);

  useEffect(() => {
    let unsubSignals, unsubStream;
    const start = async () => {
      const me = await base44.auth.me().catch(() => null);
      const record = await base44.entities.LiveStream.get(id).catch(() => null);
      setStream(record);
      setLoading(false);

      if (!record || record.status !== "live") { setStatus("ended"); return; }
      if (me && record.host_id === me.id) { navigate(`/live/studio/${id}`); return; }
      if (!me) { setStatus("ended"); return; }

      unsubStream = base44.entities.LiveStream.subscribe((event) => {
        if (event.data?.id !== id) return;
        setStream(event.data);
        if (event.type === "update" && event.data.status === "ended") setStatus("ended");
      });

      unsubSignals = base44.entities.LiveSignal.subscribe(async (event) => {
        const signal = event.data;
        if (!signal || signal.id !== signalIdRef.current) return;
        if (event.type === "update" && signal.kind === "offer" && signal.payload && !answeredRef.current) {
          answeredRef.current = true;
          await answer(signal);
        }
      });

      // Fresh join record for this viewer
      await base44.entities.LiveSignal.deleteMany({ stream_id: id, from_id: me.id }).catch(() => {});
      const signal = await base44.entities.LiveSignal.create({
        stream_id: id,
        from_id: me.id,
        to_id: record.host_id,
        kind: "join",
      });
      signalIdRef.current = signal.id;
    };
    start();
    return () => {
      unsubSignals?.();
      unsubStream?.();
      if (signalIdRef.current) base44.entities.LiveSignal.delete(signalIdRef.current).catch(() => {});
      closeConnection(pcRef.current);
    };
  }, [id]);

  const answer = async (signal) => {
    try {
      const { pc, sdp } = await createViewerConnection(
        signal.payload,
        (incoming) => setRemote(incoming),
        (state) => { if (state === "failed") setStatus("error"); else if (state === "connected") setStatus("live"); }
      );
      pcRef.current = pc;
      setStatus("live");
      await base44.entities.LiveSignal.update(signal.id, { kind: "answer", payload: sdp });
    } catch (e) {
      setStatus("error");
    }
  };

  useEffect(() => {
    if (videoRef.current && remote) {
      videoRef.current.srcObject = remote;
      videoRef.current.play().catch(() => {});
    }
  }, [remote]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-4 lg:pr-4">
      <div className="relative bg-black aspect-video lg:col-start-1 lg:row-start-1">
        <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-contain" />

        {status === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 bg-black/60">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-xs">Verbindung zum Stream wird aufgebaut...</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 bg-black/70 px-8 text-center">
            <p className="text-sm">Die Verbindung konnte nicht aufgebaut werden. Bitte lade die Seite neu.</p>
          </div>
        )}

        {status === "ended" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 bg-black/80 px-8 text-center">
            <p className="text-lg font-bold text-white">Stream beendet</p>
            <Link to="/live" className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              Andere Live-Streams
            </Link>
          </div>
        )}

        {status === "live" && (
          <>
            <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
            <span className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 text-white text-[11px] px-2.5 py-1 rounded-full">
              <Users size={12} /> {stream?.viewers || 0}
            </span>
            <button
              onClick={() => setMuted(m => !m)}
              className="absolute bottom-3 right-3 p-2.5 rounded-full bg-black/70 text-white"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </>
        )}
      </div>

      <div className="p-4 space-y-3 lg:col-start-1 lg:row-start-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate">{stream?.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{stream?.host_name || "Unbekannt"}</p>
          </div>
          <button
            onClick={() => setDonateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-destructive/15 text-destructive text-xs font-bold flex-shrink-0"
          >
            <Heart size={14} className="fill-destructive" /> Spenden
          </button>
        </div>

        {stream?.donation_goal > 0 && (
          <LiveDonationGoal streamId={id} goal={stream.donation_goal} />
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMuted(m => !m)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-xs font-semibold"
          >
            {muted ? <><VolumeX size={14} /> Ton an</> : <><Volume2 size={14} /> Ton aus</>}
          </button>
          <Link to="/live" className="text-xs text-muted-foreground hover:text-foreground">
            Alle Live-Streams
          </Link>
        </div>
      </div>

      <LiveChat
        streamId={id}
        className="h-[420px] border-t border-border lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:rounded-2xl lg:border"
      />

      <DonateDialog
        open={donateOpen}
        onOpenChange={setDonateOpen}
        creatorId={stream?.host_id}
        creatorName={stream?.host_name}
        streamId={id}
      />
    </div>
  );
}


