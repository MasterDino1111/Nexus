import { base44 } from "@/api/base44Client";

const HISTORY_LIMIT = 40;
const LIKE_LIMIT = 50;
const POOL_LIMIT = 120;
const RESULT_LIMIT = 30;
const MAX_PER_CHANNEL = 3;
const HALF_LIFE_DAYS = 14;

/** Newer videos weigh more: 1 today, 0.5 after 14 days, and so on. */
export function recencyBoost(createdDate, now = Date.now()) {
  const t = new Date(createdDate).getTime();
  if (!t) return 0.5;
  const days = Math.max(0, (now - t) / 86400000);
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

/** Small bonus for popular videos, capped so it never beats a real interest match. */
export function popularityBoost(video) {
  const engagement = (video.views || 0) + (video.likes || 0) * 10;
  return Math.min(1, Math.log10(1 + engagement) / 6);
}

/** At most `max` videos per channel so one creator cannot fill the whole feed. */
export function diversify(items, max = MAX_PER_CHANNEL) {
  const count = {};
  return items.filter(v => {
    const key = v.channel_name || v.uploader_id || v.id;
    count[key] = (count[key] || 0) + 1;
    return count[key] <= max;
  });
}

/**
 * Pure scoring step (no network), so it can be tested.
 * Interests come from the watch history (weight 1) and likes (weight 3).
 * A light recency and popularity boost orders videos with similar interest scores.
 */
export function rankVideos({ pool, history, likes, now = Date.now(), limit = RESULT_LIMIT }) {
  const seenIds = new Set(history.map(h => h.video_id).filter(Boolean));
  const likedIds = new Set(likes.map(l => l.video_id).filter(Boolean));

  const catScore = {};
  const chanScore = {};
  history.forEach(h => {
    if (h.video_channel) chanScore[h.video_channel] = (chanScore[h.video_channel] || 0) + 1;
  });
  pool.forEach(v => {
    const liked = likedIds.has(v.id);
    if (!liked && !seenIds.has(v.id)) return;
    const weight = liked ? 3 : 1;
    if (v.category) catScore[v.category] = (catScore[v.category] || 0) + weight;
    if (v.channel_name) chanScore[v.channel_name] = (chanScore[v.channel_name] || 0) + weight;
  });

  const fresh = pool.filter(v => !seenIds.has(v.id) && !likedIds.has(v.id));
  const scored = fresh
    .map(v => {
      const interest = (catScore[v.category] || 0) * 2 + (chanScore[v.channel_name] || 0) * 3;
      return { video: v, interest, score: interest + recencyBoost(v.created_date, now) + popularityBoost(v) };
    })
    .filter(x => x.interest > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) return diversify(scored.map(x => x.video)).slice(0, limit);

  // Cold start: trending = popular and recent
  return diversify(
    fresh
      .map(v => ({ v, s: popularityBoost(v) + recencyBoost(v.created_date, now) }))
      .sort((a, b) => b.s - a.s)
      .map(x => x.v)
  ).slice(0, limit);
}

/** Builds a personalised feed from what the user recently watched and liked. */
export async function loadForYou(me) {
  const [history, likes, pool] = await Promise.all([
    base44.entities.VideoHistory.filter({ user_id: me.id }, "-created_date", HISTORY_LIMIT),
    base44.entities.VideoLike.filter({ user_id: me.id }, "-created_date", LIKE_LIMIT),
    // Shorts are recommended inside the Shorts feed, not in the video grid
    base44.entities.Video.filter({ category: { $ne: "shorts" } }, { sort: "-created_date", limit: POOL_LIMIT }).then(page => page.items),
  ]);
  return rankVideos({ pool, history, likes });
}
