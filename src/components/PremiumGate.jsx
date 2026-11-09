import React from "react";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { usePremium } from "@/lib/usePremium";

/** Shows its children only to Premium members (and admins). */
export default function PremiumGate({ children, feature = "Creator-Funktionen" }) {
  const { loading, canCreate } = usePremium();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (canCreate) return children;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
        <Crown size={36} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-black">Nur mit Premium</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          {feature} sind für Creator mit Premium-Abo. Hol dir Premium, um Videos hochzuladen, live zu gehen und dein Creator-Dashboard zu nutzen.
        </p>
      </div>
      <Link to="/premium" className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold">Premium ansehen</Link>
      <Link to="/" className="text-sm text-muted-foreground">Zurück</Link>
    </div>
  );
}
