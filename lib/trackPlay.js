
import { base44 } from "@/api/base44Client";

/**
 * Records a play for a song: appends a timestamped entry (used for the
 * time-based analytics in the creator dashboard) and bumps the play counter.
 * Plays by the uploader themselves are not counted.
 */
export async function trackPlay(song) {
  if (!song?.id) return;
  const me = await base44.auth.me().catch(() => null);
  if (me && song.uploader_id && song.uploader_id === me.id) return;
  await base44.entities.SongPlay.create({
    song_id: song.id,
    uploader_id: song.uploader_id || "",
    user_id: me?.id || "",
  });
  await base44.entities.Song.update(song.id, { plays: (song.plays || 0) + 1 });
}


