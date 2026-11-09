import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/base44Client", () => ({ base44: {} }));
import { hasActivePremium } from "../src/lib/usePremium.js";

const NOW = Date.parse("2026-11-09T12:00:00Z");
const sub = (o) => ({ status: "active", plan: "premium", expires_at: "2026-12-01T00:00:00Z", ...o });

describe("hasActivePremium", () => {
  it("accepts an active paid plan", () => expect(hasActivePremium([sub()], NOW)).toBe(true));
  it("rejects free, cancelled and expired plans", () => {
    expect(hasActivePremium([sub({ plan: "free" })], NOW)).toBe(false);
    expect(hasActivePremium([sub({ status: "cancelled" })], NOW)).toBe(false);
    expect(hasActivePremium([sub({ expires_at: "2026-11-01T00:00:00Z" })], NOW)).toBe(false);
  });
  it("accepts a plan without expiry date and handles empty input", () => {
    expect(hasActivePremium([sub({ expires_at: undefined })], NOW)).toBe(true);
    expect(hasActivePremium(undefined, NOW)).toBe(false);
  });
});
