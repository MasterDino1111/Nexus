
import React, { useState, useEffect } from "react";
import { callFunction } from "@/lib/callFunction";
import DonationGoalBar from "@/components/live/DonationGoalBar";

export default function LiveDonationGoal({ streamId, goal }) {
  const [raised, setRaised] = useState(0);

  useEffect(() => {
    if (!streamId) return;
    let active = true;

    const load = async () => {
      const { data } = await callFunction("streamRaised", { streamIds: [streamId] }).catch(() => ({ data: {} }));
      if (active) setRaised(data?.raised?.[streamId] || 0);
    };

    // Viewers cannot subscribe to other people's donations, so refresh regularly
    load();
    const timer = setInterval(load, 8000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [streamId]);

  return (
    <div className="bg-secondary/40 rounded-2xl p-3">
      <DonationGoalBar goal={goal} raised={raised} />
    </div>
  );
}


