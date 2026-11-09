// Sends a chat message. The sender is taken from the login token (not from the
// request), the caller must be a participant, and the message gets the chat's
// participant list so the Message read rule can restrict who sees it.

const MAX_LENGTH = 2000;
const TYPES = ["text", "image", "video", "audio"];
const STICKER_PREFIX = "__sticker__";

/** Validates and normalizes the message text. Returns null if it is not sendable. */
export function cleanContent(content) {
  if (typeof content !== "string") return null;
  const text = content.trim();
  if (!text || text.length > MAX_LENGTH) return null;
  return text;
}

/** Stickers are a Premium feature; admins are exempt. */
export function canSendSticker(subs, isAdmin, now = Date.now()) {
  if (isAdmin) return true;
  return (subs || []).some(
    (s) => s.status === "active" && s.plan && s.plan !== "free" && (!s.expires_at || new Date(s.expires_at).getTime() > now)
  );
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

  const { chatId, content, messageType } = await req.json();
  const text = cleanContent(content);
  const type = TYPES.includes(messageType) ? messageType : "text";
  if (typeof chatId !== "string" || !text) return Response.json({ error: "Ungültige Nachricht" }, { status: 400 });

  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;
  const chat = await db.Chat.get(chatId).catch(() => null);
  if (!chat || !(chat.participants || []).includes(me.id) || chat.status === "rejected") {
    return Response.json({ error: "Kein Zugriff auf diesen Chat" }, { status: 403 });
  }

  if (text.startsWith(STICKER_PREFIX)) {
    const subs = await db.Subscription.filter({ user_id: me.id, status: "active" }, "-created_date", 10);
    if (!canSendSticker(subs, me.role === "admin")) {
      return Response.json({ error: "Sticker sind nur für Premium-Mitglieder." }, { status: 403 });
    }
  }

  const message = await db.Message.create({
    chat_id: chatId,
    sender_id: me.id,
    sender_name: me.full_name || "Ich",
    content: text,
    message_type: type,
    participants: chat.participants,
    read_by: [me.id],
  });
  await db.Chat.update(chatId, {
    last_message: text.startsWith(STICKER_PREFIX) ? text.slice(STICKER_PREFIX.length) : text.slice(0, 200),
    last_message_time: new Date().toISOString(),
  });
  return Response.json({ message });
}
