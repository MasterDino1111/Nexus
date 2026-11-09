// Returns the paid donation total per live stream. Viewers cannot read other
// people's Donation records, so the sums are computed here with service rights.
// Only totals are returned, no names or messages.

export default async function handler(req, context) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { createClient } = await import("@base44/sdk");
  try {
    await createClient({ appId: context.env.APP_ID, token }).auth.me();
  } catch {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { streamIds } = await req.json();
  const ids = (Array.isArray(streamIds) ? streamIds : []).filter((x) => typeof x === "string").slice(0, 50);
  if (!ids.length) return Response.json({ raised: {} });

  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;
  const { rows } = await db.Donation.aggregate({
    query: { stream_id: { $in: ids }, status: "paid" },
    groupBy: "stream_id",
    sum: "amount",
  });
  return Response.json({ raised: Object.fromEntries(rows.map((r) => [r.stream_id, r.sum_amount || 0])) });
}
