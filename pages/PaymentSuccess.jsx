import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Crown } from "lucide-react";
import { Link } from "react-router-dom";

// The plan is activated only by the verified Stripe webhook. This page just
// waits until the subscription shows up and never grants anything itself.
const POLL_MS = 2000;
const MAX_TRIES = 15;

export default function PaymentSuccess() {
  const [state, setState] = useState("waiting"); // waiting | active | pending

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const check = async () => {
      try {
        const me = await base44.auth.me();
        const subs = await base44.entities.Subscription.filter({ user_id: me.id, status: "active" }, "-created_date", 1);
        if (subs[0] && subs[0].plan !== "free") { if (!cancelled) setState("active"); return; }
      } catch (e) {
        console.error(e);
      }
      if (++tries >= MAX_TRIES) { if (!cancelled) setState("pending"); return; }
      setTimeout(() => !cancelled && check(), POLL_MS);
    };
    check();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
        {state === "waiting" ? <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <Crown size={36} className="text-white" />}
      </div>
      {state === "waiting" && <p className="text-muted-foreground">Zahlung wird bestätigt…</p>}
      {state === "active" && (
        <div>
          <h1 className="text-2xl font-black">Willkommen bei Premium! 🎉</h1>
          <p className="text-muted-foreground mt-2">Dein Abo ist jetzt aktiv. Geniesse alle Vorteile!</p>
        </div>
      )}
      {state === "pending" && (
        <div>
          <h1 className="text-2xl font-black">Zahlung erhalten</h1>
          <p className="text-muted-foreground mt-2">Die Bestätigung dauert etwas länger. Dein Abo erscheint in Kürze unter «Premium».</p>
        </div>
      )}
      {state !== "waiting" && (
        <Link to="/" className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold">Zur App</Link>
      )}
    </div>
  );
}
