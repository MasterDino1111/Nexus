
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { callFunction } from "@/lib/callFunction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, Loader2, Gift, MessageSquare, Repeat } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PRESETS = [3, 5, 10, 25];

const MODES = [
  { key: "one_time", label: "Einmalig", hint: "Einmalige Spende", icon: Gift },
  { key: "message", label: "Mit Nachricht", hint: "Spende + Nachricht", icon: MessageSquare },
  { key: "monthly", label: "Monatlich", hint: "Jeden Monat", icon: Repeat },
];

export default function DonateDialog({ open, onOpenChange, creatorId, creatorName, streamId }) {
  const [mode, setMode] = useState("one_time");
  const [amount, setAmount] = useState("5");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const numeric = Number(String(amount).replace(",", "."));
  const isMonthly = mode === "monthly";

  const submit = async () => {
    if (!creatorId) return;
    if (!numeric || numeric < 1) {
      toast({ title: "Mindestbetrag ist 1€", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const me = await base44.auth.me();
      const donation = await base44.entities.Donation.create({
        creator_id: creatorId,
        creator_name: creatorName || "",
        donor_id: me.id,
        donor_name: me.full_name || me.email,
        amount: numeric,
        type: mode,
        message: mode === "message" ? message : "",
        status: "pending",
        stream_id: streamId || "",
      });

      const origin = window.location.origin;
      const { data } = await callFunction("createDonationCheckout", {
          donationId: donation.id,
          successUrl: `${origin}/donation-success?donation=${donation.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/donation-success?donation=${donation.id}&cancelled=1`,
      });
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast({ title: "Fehler", description: data.error || "Spende konnte nicht gestartet werden.", variant: "destructive" });
    } catch (e) {
      toast({ title: "Fehler", description: "Netzwerkfehler. Bitte erneut versuchen.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart size={18} className="text-destructive fill-destructive" />
            {creatorName ? `${creatorName} unterstützen` : "Unterstützen"}
          </DialogTitle>
        </DialogHeader>

        {/* Art der Unterstützung */}
        <div className="grid grid-cols-3 gap-2">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl text-[11px] font-semibold transition-all ${
                mode === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center -mt-1">
          {MODES.find(m => m.key === mode)?.hint}
        </p>

        {/* Betrag */}
        <div className="flex gap-2">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                numeric === p ? "bg-primary/20 text-primary ring-1 ring-primary" : "bg-secondary text-foreground hover:bg-secondary/70"
              }`}
            >
              {p}€
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 pr-8 bg-secondary rounded-xl text-sm font-semibold outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
        </div>

        {mode === "message" && (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Deine Nachricht an den Creator..."
            className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground"
          />
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 size={15} className="animate-spin" /> Weiterleitung zu Stripe...</>
          ) : (
            <>{isMonthly ? `${numeric || 1}€ pro Monat spenden` : `${numeric || 1}€ spenden`}</>
          )}
        </button>
        <p className="text-[10px] text-center text-muted-foreground">
          Zahlung über Stripe — sicher verschlüsselt{isMonthly ? ", monatlich" : ""}.
        </p>
      </DialogContent>
    </Dialog>
  );
}


