import { describe, it, expect } from "vitest";
import { isUnread, unreadByChat } from "../src/backend/chatUnread.js";
import { messagesToMarkRead, participantsOutOfSync } from "../src/backend/markChatRead.js";
import { cleanContent, canSendSticker } from "../src/backend/sendMessage.js";
import { bucketByDay } from "../src/backend/creatorStats.js";
import { isPublished, onlyPublished } from "../src/lib/published.js";

describe("unread messages", () => {
  const msgs = [
    { id: "1", chat_id: "a", sender_id: "other" },
    { id: "2", chat_id: "a", sender_id: "me" },
    { id: "3", chat_id: "a", sender_id: "other", read_by: ["me"] },
    { id: "4", chat_id: "b", sender_id: "other", read_by: ["x"] },
  ];
  it("never counts own messages", () => expect(isUnread(msgs[1], "me")).toBe(false));
  it("is unread without read_by", () => expect(isUnread(msgs[0], "me")).toBe(true));
  it("is read once the user is in read_by", () => expect(isUnread(msgs[2], "me")).toBe(false));
  it("counts per chat", () => expect(unreadByChat(msgs, "me")).toEqual({ a: 1, b: 1 }));
  it("marks only the unread messages of others", () => {
    expect(messagesToMarkRead(msgs.slice(0, 3), "me").map((m) => m.id)).toEqual(["1"]);
  });
});

describe("participants sync", () => {
  it("detects legacy messages without participants", () => expect(participantsOutOfSync({}, ["a"])).toBe(true));
  it("ignores order", () => expect(participantsOutOfSync({ participants: ["b", "a"] }, ["a", "b"])).toBe(false));
  it("detects a new member", () => expect(participantsOutOfSync({ participants: ["a"] }, ["a", "b"])).toBe(true));
});

describe("sendMessage rules", () => {
  it("rejects empty and non-string content", () => {
    expect(cleanContent("   ")).toBeNull();
    expect(cleanContent(5)).toBeNull();
  });
  it("rejects messages over 2000 characters", () => expect(cleanContent("x".repeat(2001))).toBeNull());
  it("trims valid content", () => expect(cleanContent("  hi ")).toBe("hi"));
  it("stickers need premium unless admin", () => {
    expect(canSendSticker([], false)).toBe(false);
    expect(canSendSticker([], true)).toBe(true);
    expect(canSendSticker([{ status: "active", plan: "premium" }], false)).toBe(true);
    expect(canSendSticker([{ status: "active", plan: "free" }], false)).toBe(false);
    expect(canSendSticker([{ status: "active", plan: "premium", expires_at: "2000-01-01" }], false)).toBe(false);
  });
});

describe("creator stats", () => {
  it("buckets records per day, sorted", () => {
    const rows = bucketByDay([
      { created_date: "2026-11-02T10:00:00Z" },
      { created_date: "2026-11-01T23:00:00Z" },
      { created_date: "2026-11-02T01:00:00Z" },
    ]);
    expect(rows).toEqual([
      { created_date: "2026-11-01", count: 1 },
      { created_date: "2026-11-02", count: 2 },
    ]);
  });
});

describe("scheduled videos", () => {
  const now = new Date("2026-11-09T12:00:00Z").getTime();
  it("hides future videos", () => expect(isPublished({ scheduled_publish_time: "2026-11-10T00:00:00Z" }, now)).toBe(false));
  it("shows past and unscheduled videos", () => {
    expect(isPublished({ scheduled_publish_time: "2026-11-09T00:00:00Z" }, now)).toBe(true);
    expect(isPublished({}, now)).toBe(true);
  });
  it("filters lists", () => {
    expect(onlyPublished([{ id: 1 }, { id: 2, scheduled_publish_time: "2027-01-01T00:00:00Z" }], now)).toEqual([{ id: 1 }]);
  });
});
