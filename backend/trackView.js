// Counts a video view on the server. One view per user and video per 30
// minutes, never for the uploader. The client cannot write `views` itself.

const WINDOW_MS = 30 * 60 * 1000;

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

  const { videoId } = await req.json();
  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;
  const video = await db.Video.get(videoId).catch(() => null);
  if (!video) return Response.json({ error: "Video nicht gefunden" }, { status: 404 });
  if (video.uploader_id === me.id) return Response.json({ counted: false, views: video.views || 0 });

  const recent = await db.VideoHistory.filter({ user_id: me.id, video_id: videoId }, "-created_date", 1);
  if (recent[0] && Date.now() - new Date(recent[0].created_date).getTime() < WINDOW_MS) {
    return Response.json({ counted: false, views: video.views || 0 });
  }

  const views = (video.views || 0) + 1;
  await db.Video.update(videoId, { views });
  return Response.json({ counted: true, views });
}
