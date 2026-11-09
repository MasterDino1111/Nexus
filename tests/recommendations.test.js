import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/base44Client", () => ({ base44: {} }));
import { rankVideos, recencyBoost, popularityBoost, diversify } from "../src/lib/recommendations.js";

const NOW = new Date("2026-11-09T12:00:00Z").getTime();
const day = (n) => new Date(NOW - n * 86400000).toISOString();
const v = (id, o = {}) => ({ id, category: "music", channel_name: "A", views: 0, likes: 0, created_date: day(1), ...o });

describe("recencyBoost", () => {
  it("halves every 14 days", () => {
    expect(recencyBoost(day(0), NOW)).toBeCloseTo(1);
    expect(recencyBoost(day(14), NOW)).toBeCloseTo(0.5);
  });
});

describe("popularityBoost", () => {
  it("is capped at 1 and grows with engagement", () => {
    expect(popularityBoost({ views: 0 })).toBe(0);
    expect(popularityBoost({ views: 1000 })).toBeLessThan(popularityBoost({ views: 100000 }));
    expect(popularityBoost({ views: 1e12 })).toBe(1);
  });
});

describe("diversify", () => {
  it("limits videos per channel", () => {
    const items = [1, 2, 3, 4, 5].map((i) => v(String(i)));
    expect(diversify(items, 3)).toHaveLength(3);
  });
});

describe("rankVideos", () => {
  it("prefers liked categories and channels, hides seen videos", () => {
    const pool = [
      v("seen", { category: "gaming", channel_name: "G" }),
      v("match", { category: "gaming", channel_name: "G2" }),
      v("other", { category: "news", channel_name: "N" }),
    ];
    const out = rankVideos({
      pool,
      history: [{ video_id: "seen", video_channel: "G" }],
      likes: [{ video_id: "seen" }],
      now: NOW,
    });
    expect(out.map((x) => x.id)).toEqual(["match"]);
  });

  it("falls back to trending for new users", () => {
    const pool = [v("old", { views: 10, created_date: day(60) }), v("hot", { views: 100000, created_date: day(1) })];
    const out = rankVideos({ pool, history: [], likes: [], now: NOW });
    expect(out[0].id).toBe("hot");
  });
});
