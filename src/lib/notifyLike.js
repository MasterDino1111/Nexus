
import { base44 } from "@/api/base44Client";

const LABELS = {
  video: "Video",
  short: "Short",
  song: "Song",
};

/**
 * Creates a notification for the owner of a piece of content that was just liked.
 * Never notifies users about their own likes.
 */
export async function notifyLike({ ownerId, actor, kind, contentId, contentTitle, contentThumbnail, link }) {
  if (!ownerId || !actor?.id || ownerId === actor.id) return;
  const label = LABELS[kind] || "Inhalt";
  const actorName = actor.full_name || "Jemand";
  await base44.entities.Notification.create({
    user_id: ownerId,
    type: `${kind}_like`,
    message: `${actorName} gefällt dein ${label} „${contentTitle || ""}“`,
    actor_name: actorName,
    content_id: contentId || "",
    content_title: contentTitle || "",
    content_thumbnail: contentThumbnail || "",
    link: link || "",
    read: false,
  });
}


