// Marks all messages of one chat as read for the signed-in user and keeps each
// message's `participants` list in sync with the chat. The list is what the
// Message read rule checks, so old messages (written before the rule existed)
// or messages from before somebody joined become visible again here.

/** Ids of the messages that still lack this reader in `read_by`. */
export function messagesToMarkRead(messages, userId) {
  return messages.filter((m) => m.sender_id !== userId && !(m.read_by || []).includes(userId));
}

/** True if the stored participant list differs from the chat's. */
export function participantsOutOfSync(message, participants) {
  const a = [...(message.participants || [])].sort().join("|");
  const b = [...participants].sort().join("|");
  return a !== b;
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

  const { chatId } = await req.json();
  if (typeof chatId !== "string") return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;
  const chat = await db.Chat.get(chatId).catch(() => null);
  if (!chat || !(chat.participants || []).includes(me.id)) {
    return Response.json({ error: "Kein Zugriff auf diesen Chat" }, { status: 403 });
  }

  const messages = await db.Message.filter({ chat_id: chatId }, "-created_date", 500);
  const toRead = new Set(messagesToMarkRead(messages, me.id).map((m) => m.id));
  let updated = 0;
  for (const m of messages) {
    const patch = {};
    if (participantsOutOfSync(m, chat.participants)) patch.participants = chat.participants;
    if (toRead.has(m.id)) patch.read_by = [...(m.read_by || []), me.id];
    if (Object.keys(patch).length) {
      await db.Message.update(m.id, patch);
      updated += 1;
    }
  }
  return Response.json({ marked: toRead.size, updated });
}
