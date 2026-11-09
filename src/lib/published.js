/** A video with a future scheduled publish time is not public yet. */
export function isPublished(video, now = Date.now()) {
  if (!video?.scheduled_publish_time) return true;
  const t = new Date(video.scheduled_publish_time).getTime();
  return Number.isNaN(t) || t <= now;
}

/** Keeps only videos that are already public. */
export function onlyPublished(videos, now = Date.now()) {
  return (videos || []).filter((v) => isPublished(v, now));
}
