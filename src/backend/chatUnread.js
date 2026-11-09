// Returns the signed-in user's unread message counts, in total and per chat.
// A message is unread for a user if somebody else wrote it and the user's id is
// not in its `read_by` list. Computed on the server so it cannot be faked and
// does not depend on the client being allowed to read every message.

/** True if `msg` is still unread for `userId`. */
export function isUnread(msg, userId) {
  if (!msg || msg.sender_id === userId) return false;
  return !(msg.read_by || []).includes(userId);
}

/** Counts unread messages per chat id. */
export function unreadByChat(messages, userId) {
  const byChat = {};
  for (const m of messages) {
    if (isUnread(m, userId)) byChat[m.chat_id] = (byChat[m.chat_id] || 0) + 1;
  }
  return byChat;
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

  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;
  const chats = (await db.Chat.filter({ participants: { $elemMatch: { $eq: me.id } } }, "-last_message_time", 200))
    .filter((c) => c.status !== "rejected");
  if (!chats.length) return Response.json({ total: 0, byChat: {} });

  const messages = await db.Message.filter({ chat_id: { $in: chats.map((c) => c.id) } }, "-created_date", 1000);
  const byChat = unreadByChat(messages, me.id);
  const total = Object.values(byChat).reduce((a, b) => a + b, 0);
  return Response.json({ total, byChat });
}
