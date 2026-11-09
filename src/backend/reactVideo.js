// Sets the signed-in user's reaction (like / dislike / none) to a video and
// recalculates the counters from the real records. This avoids drifting counts,
// duplicate likes and unlimited dislikes that came from client-side arithmetic.

const REACTIONS = ["like", "dislike", "none"];

/** The reaction a user currently has, derived from their records for one video. */
export function currentReaction(records) {
  if (!records.length) return "none";
  return records.some((r) => r.type === "dislike") ? "dislike" : "like";
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

  const { videoId, reaction } = await req.json();
  if (typeof videoId !== "string" || !REACTIONS.includes(reaction)) {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;
  const video = await db.Video.get(videoId).catch(() => null);
  if (!video) return Response.json({ error: "Video nicht gefunden" }, { status: 404 });

  const mine = await db.VideoLike.filter({ user_id: me.id, video_id: videoId }, "-created_date", 20);
  const previous = currentReaction(mine);

  if (previous !== reaction) {
    for (const record of mine) await db.VideoLike.delete(record.id);
    if (reaction !== "none") {
      await db.VideoLike.create({ user_id: me.id, video_id: videoId, type: reaction });
    }
  }

  const [likes, dislikes] = await Promise.all([
    db.VideoLike.count({ video_id: videoId, type: { $ne: "dislike" } }),
    db.VideoLike.count({ video_id: videoId, type: "dislike" }),
  ]);
  await db.Video.update(videoId, { likes, dislikes });

  return Response.json({ previous, reaction, likes, dislikes });
}
