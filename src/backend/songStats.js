// Song likes and plays on the server. The client may no longer write the
// counters of a Song itself, so numbers cannot be inflated by hand.
// Likes are recounted from the SongLike records (one per user and song).

const ACTIONS = ["like", "unlike", "play"];

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

  const { songId, action } = await req.json();
  if (typeof songId !== "string" || !ACTIONS.includes(action)) {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;
  const song = await db.Song.get(songId).catch(() => null);
  if (!song) return Response.json({ error: "Song nicht gefunden" }, { status: 404 });

  if (action === "play") {
    if (song.uploader_id === me.id) return Response.json({ counted: false, plays: song.plays || 0 });
    await db.SongPlay.create({ song_id: songId, uploader_id: song.uploader_id || "", user_id: me.id });
    const plays = (song.plays || 0) + 1;
    await db.Song.update(songId, { plays });
    return Response.json({ counted: true, plays });
  }

  const mine = await db.SongLike.filter({ user_id: me.id, song_id: songId }, "-created_date", 20);
  if (action === "like" && !mine.length) await db.SongLike.create({ user_id: me.id, song_id: songId });
  if (action === "unlike") for (const r of mine) await db.SongLike.delete(r.id);

  const likes = await db.SongLike.count({ song_id: songId });
  await db.Song.update(songId, { likes });
  return Response.json({ liked: action === "like", likes });
}
