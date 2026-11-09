// Daily views and plays for the signed-in creator's own videos and songs.
// Runs on the server because viewing history and play records belong to the
// viewers and are no longer readable by other users.

/** Counts records per calendar day: [{ created_date: "YYYY-MM-DD", count }]. */
export function bucketByDay(records) {
  const counts = {};
  for (const r of records) {
    const day = String(r.created_date).slice(0, 10);
    counts[day] = (counts[day] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([created_date, count]) => ({ created_date, count }))
    .sort((a, b) => a.created_date.localeCompare(b.created_date));
}

export default async function handler(req, context) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { createClient } = await import("@base44/sdk");
  let me;
  try {
    me = await createClient({ appId: context.env.APP_ID, token }).auth.me();
  } catch {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { since } = await req.json();
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) return Response.json({ error: "Ungültiges Datum" }, { status: 400 });
  const from = sinceDate.toISOString();

  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;
  const videos = await db.Video.filter({ uploader_id: me.id }, "-created_date", 500);
  const ids = videos.map((v) => v.id);
  const [history, plays] = await Promise.all([
    ids.length
      ? db.VideoHistory.filter({ video_id: { $in: ids }, created_date: { $gte: from } }, "-created_date", 5000)
      : Promise.resolve([]),
    db.SongPlay.filter({ uploader_id: me.id, created_date: { $gte: from } }, "-created_date", 5000),
  ]);
  return Response.json({ views: bucketByDay(history), plays: bucketByDay(plays) });
}
