import { base44 } from "@/api/base44Client";
import { callFunction } from "@/lib/callFunction";

/**
 * Records a play for a song on the server (songStats). The server skips plays
 * by the uploader and writes the play entry and counter itself.
 */
export async function trackPlay(song) {
  if (!song?.id) return;
  const me = await base44.auth.me().catch(() => null);
  if (!me || (song.uploader_id && song.uploader_id === me.id)) return;
  await callFunction("songStats", { songId: song.id, action: "play" });
}
