import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/** True if one of the subscriptions is active, paid (not "free") and not expired. */
export function hasActivePremium(subs, now = Date.now()) {
  return (subs || []).some(
    (s) =>
      s.status === "active" &&
      s.plan &&
      s.plan !== "free" &&
      (!s.expires_at || new Date(s.expires_at).getTime() > now)
  );
}

/** Creators (upload, creator dashboard, going live) need Premium. Admins are exempt. */
export function usePremium() {
  const [state, setState] = useState({ loading: true, user: null, isPremium: false, isAdmin: false, canCreate: false });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        const subs = await base44.entities.Subscription.filter({ user_id: me.id, status: "active" }, "-created_date", 10);
        const isPremium = hasActivePremium(subs);
        const isAdmin = me.role === "admin";
        if (active) setState({ loading: false, user: me, isPremium, isAdmin, canCreate: isPremium || isAdmin });
      } catch {
        if (active) setState({ loading: false, user: null, isPremium: false, isAdmin: false, canCreate: false });
      }
    })();
    return () => { active = false; };
  }, []);

  return state;
}
