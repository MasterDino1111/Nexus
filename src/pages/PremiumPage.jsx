
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { callFunction } from "@/lib/callFunction";
import { Crown, Check, Zap, Shield, Music2, MonitorPlay, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

const plans = [
  {
    name: "Free",
    price: "0€",
    period: "/Monat",
    textColor: "text-muted-foreground",
    features: ["Videos mit Werbung", "Musik mit Werbung", "Basis-Chat (Text)", "SD Qualität", "1 Playlist"],
    value: "free",
  },
  {
    name: "Premium",
    price: "2,99€",
    period: "/Monat",
    textColor: "text-primary",
    popular: true,
    features: [
      "Werbefreie Videos & Musik",
      "HD Streaming (1080p)",
      "Unbegrenzte Chats mit Emojis & Stickern",
      "Unbegrenzte Playlists",
      "Offline-Modus",
      "Premium-Badge 👑",
      "Hintergrund-Audio (Musik im Chat)",
      "Videos hochladen bis 30 Min.",
    ],
    value: "premium",
  },
  {
    name: "Premium+",
    price: "5,99€",
    period: "/Monat",
    textColor: "text-accent",
    features: [
      "Alles aus Premium",
      "4K Ultra HD Streaming",
      "Exklusive Premium+ Inhalte",
      "Videos hochladen unbegrenzt",
      "Live-Streaming mit RTMP",
      "Prioritäts-Support 24/7",
      "Familien-Sharing (5 Profile)",
      "Früher Zugang zu neuen Features",
      "Spenden-Button für Fans",
    ],
    value: "premium_plus",
  },
];

export default function PremiumPage() {
  const [subscription, setSubscription] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for successful checkout return
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const plan = params.get("plan");
    if (sessionId && plan) {
      // Clean URL
      window.history.replaceState({}, "", "/premium");
      toast({ title: "Zahlung erfolgreich! 🎉", description: "Dein Abo ist jetzt aktiv." });
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const subs = await base44.entities.Subscription.filter(
        { user_id: userData.id, status: "active" }, "-created_date", 1
      );
      setSubscription(subs[0] || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSubscribe = async (plan) => {
    if (!user || plan === "free") return;
    const currentPlan = subscription?.plan;
    if (currentPlan === plan) return;

    setCheckoutLoading(plan);
    try {
      const appUrl = window.location.origin;
      const { data } = await callFunction("createCheckoutSession", {
        plan,
        successUrl: appUrl + "/payment-success",
        cancelUrl: appUrl + "/premium",
      });
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Fehler", description: data.error || "Checkout konnte nicht gestartet werden.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Fehler", description: "Netzwerkfehler. Bitte versuche es erneut.", variant: "destructive" });
    }
    setCheckoutLoading(null);
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      // The server checks ownership, cancels at Stripe and updates the record
      const { data } = await callFunction("cancelSubscription", { subscriptionId: subscription.id });
      if (data.success) {
        setSubscription(null);
        toast({ title: "Abo gekündigt", description: "Du bist jetzt im Free-Plan." });
      } else {
        toast({ title: "Fehler", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Fehler", description: "Kündigung fehlgeschlagen.", variant: "destructive" });
    }
    setCancelLoading(false);
  };

  const currentPlan = subscription?.plan || "free";
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="relative overflow-hidden px-4 pt-8 pb-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="relative w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center pulse-glow"
        >
          <Crown size={32} className="text-white" />
        </motion.div>
        <h1 className="relative text-2xl font-black">Werde Premium</h1>
        <p className="relative text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Echte Zahlungen via Stripe — sicher und einfach
        </p>
      </div>

      {/* Admin free access banner */}
      {isAdmin && (
        <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/20 rounded-2xl flex items-center gap-3">
          <Shield size={20} className="text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-primary">Admin-Zugriff</p>
            <p className="text-xs text-muted-foreground mt-0.5">Alle Premium-Features sind für dich gratis.</p>
          </div>
        </div>
      )}

      {/* Active sub banner */}
      {subscription && currentPlan !== "free" && (
        <div className="mx-4 mb-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-primary flex items-center gap-1.5">
              <Crown size={14} /> {currentPlan === "premium_plus" ? "Premium+" : "Premium"} aktiv
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Läuft bis {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString("de-DE") : "–"}
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={cancelLoading}
            className="flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
          >
            {cancelLoading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            Kündigen
          </button>
        </div>
      )}

      {/* Feature highlights */}
      <div className="px-4 mb-5 grid grid-cols-2 gap-2">
        {[
          { icon: MonitorPlay, label: "Werbefrei" },
          { icon: Music2, label: "Unbegrenzte Playlists" },
          { icon: Shield, label: "Offline-Modus" },
          { icon: Zap, label: "4K Streaming" },
        ].map(({ icon: Icon, label }, i) => (
          <div key={label} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl">
            <Icon size={16} className="text-primary flex-shrink-0" />
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Plans */}
      <div className="px-4 space-y-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`relative bg-card border rounded-2xl p-4 ${
              plan.popular ? "border-primary ring-1 ring-primary" : "border-border"
            }`}
          >
            {plan.popular && (
              <span className="absolute top-0 right-4 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full">
                BELIEBT
              </span>
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold ${plan.textColor}`}>{plan.name}</h3>
                {currentPlan === plan.value && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">AKTIV</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-black">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check size={13} className="text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>

            {plan.value === "free" ? (
              <div className="w-full py-2.5 rounded-xl text-center text-sm text-muted-foreground bg-secondary/50">
                {currentPlan === "free" ? "Aktueller Plan" : "Kostenlos"}
              </div>
            ) : isAdmin ? (
              <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-primary bg-primary/10">
                Gratis (Admin)
              </div>
            ) : (
              <button
                onClick={() => handleSubscribe(plan.value)}
                disabled={currentPlan === plan.value || checkoutLoading !== null}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  currentPlan === plan.value
                    ? "bg-secondary text-muted-foreground cursor-default"
                    : plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                    : "bg-secondary hover:bg-secondary/70 text-foreground"
                }`}
              >
                {checkoutLoading === plan.value ? (
                  <><Loader2 size={15} className="animate-spin" /> Weiterleitung zu Stripe...</>
                ) : currentPlan === plan.value ? (
                  "Aktueller Plan"
                ) : (
                  `Jetzt abonnieren — ${plan.price}`
                )}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-6 px-4">
        Zahlung über Stripe — sicher verschlüsselt. Jederzeit kündbar.
      </p>
    </div>
  );
}


