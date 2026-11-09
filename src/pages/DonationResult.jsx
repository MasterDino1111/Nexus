
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Heart, X } from "lucide-react";

export default function DonationResult() {
  const [state, setState] = useState("loading");
  const [donation, setDonation] = useState(null);

  useEffect(() => { finish(); }, []);

  // "paid" is set only by the verified Stripe webhook. This page waits for it.
  const finish = async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("donation");
    if (!id || params.get("cancelled")) { setState("cancelled"); return; }

    for (let i = 0; i < 15; i++) {
      const record = await base44.entities.Donation.get(id).catch(() => null);
      setDonation(record);
      if (record?.status === "paid") { setState("done"); return; }
      if (record?.status === "cancelled") { setState("cancelled"); return; }
      await new Promise(r => setTimeout(r, 2000));
    }
    setState("done");
  };

  const isMonthly = donation?.type === "monthly";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${state === "cancelled" ? "bg-secondary" : "bg-gradient-to-br from-primary to-accent"}`}>
        {state === "loading" ? (
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        ) : state === "cancelled" ? (
          <X size={36} className="text-muted-foreground" />
        ) : (
          <Heart size={36} className="text-white fill-white" />
        )}
      </div>

      {state === "done" && (
        <>
          <div>
            <h1 className="text-2xl font-black">Vielen Dank! 💚</h1>
            <p className="text-muted-foreground mt-2">
              Deine {isMonthly ? "monatliche Unterstützung" : "Spende"} von{" "}
              <span className="font-bold text-foreground">{donation?.amount}€</span>
              {isMonthly ? " pro Monat" : ""} an {donation?.creator_name || "den Creator"} {donation?.status === "paid" ? "ist angekommen." : "wird gerade bestätigt."}
              {donation?.message ? " Deine Nachricht wurde übermittelt." : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-sm">
              Zur App
            </Link>
            <Link to="/profile" className="px-6 py-3 bg-secondary rounded-full font-semibold text-sm">
              Mein Profil
            </Link>
          </div>
        </>
      )}

      {state === "cancelled" && (
        <>
          <div>
            <h1 className="text-2xl font-black">Spende abgebrochen</h1>
            <p className="text-muted-foreground mt-2">Es wurde nichts belastet.</p>
          </div>
          <Link to="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-sm">
            Zur App
          </Link>
        </>
      )}
    </div>
  );
}


