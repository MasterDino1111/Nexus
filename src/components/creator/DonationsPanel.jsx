
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, Repeat, Gift, MessageSquare } from "lucide-react";
import moment from "moment";
import CountUp from "@/components/CountUp";

const TYPE_META = {
  one_time: { label: "Einmalig", icon: Gift },
  message: { label: "Mit Nachricht", icon: MessageSquare },
  monthly: { label: "Monatlich", icon: Repeat },
};

export default function DonationsPanel({ user }) {
  const [total, setTotal] = useState(0);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [user?.id]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [agg, list] = await Promise.all([
        base44.entities.Donation.aggregate({ query: { creator_id: user.id, status: "paid" }, sum: "amount" }),
        base44.entities.Donation.filter({ creator_id: user.id }, { sort: "-created_date", limit: 20 }),
      ]);
      setTotal(agg.rows?.[0]?.sum_amount || 0);
      setDonations(list.items.filter(d => d.status !== "pending"));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="bg-secondary/30 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Heart size={15} className="text-destructive fill-destructive" /> Spenden
        </p>
        <div className="text-right">
          <p className="text-lg font-black leading-none"><CountUp end={total} duration={1200} />€</p>
          <p className="text-[10px] text-muted-foreground">insgesamt erhalten</p>
        </div>
      </div>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : donations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Noch keine Spenden. Fans können dich über deinen Kanal unterstützen.
        </p>
      ) : (
        <div className="space-y-2">
          {donations.map(d => {
            const meta = TYPE_META[d.type] || TYPE_META.one_time;
            const Icon = meta.icon;
            return (
              <div key={d.id} className="flex items-start gap-3 bg-card/60 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{d.donor_name || "Anonym"}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                      d.status === "paid" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {d.status === "paid" ? meta.label : "Storniert"}
                    </span>
                  </div>
                  {d.message ? (
                    <p className="text-xs text-muted-foreground mt-1 italic">„{d.message}“</p>
                  ) : null}
                  <p className="text-[10px] text-muted-foreground mt-1">{moment(d.created_date).format("DD.MM.YYYY HH:mm")}</p>
                </div>
                <p className="text-sm font-black flex-shrink-0">{d.amount}€{d.type === "monthly" ? <span className="text-[9px] text-muted-foreground">/M</span> : null}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


