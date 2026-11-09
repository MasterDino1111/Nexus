import { callFunction } from "@/lib/callFunction";

const EVENT = "nexus:unread-changed";

/** Unread totals from the server: { total, byChat }. Never throws. */
export async function fetchUnread() {
  const { ok, data } = await callFunction("chatUnread", {}).catch(() => ({ ok: false, data: {} }));
  return ok ? { total: data.total || 0, byChat: data.byChat || {} } : { total: 0, byChat: {} };
}

/** Tell badges and the chat list that read state changed. */
export function notifyUnreadChanged() {
  window.dispatchEvent(new Event(EVENT));
}

/** Subscribe to read-state changes. Returns the unsubscribe function. */
export function onUnreadChanged(callback) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
