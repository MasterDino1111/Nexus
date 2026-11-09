import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "../src/backend/stripeWebhook.js";

const secret = "whsec_test";
const body = JSON.stringify({ type: "checkout.session.completed" });
const now = 1_800_000_000_000;
const sign = (t, b = body, s = secret) => createHmac("sha256", s).update(`${t}.${b}`).digest("hex");

describe("verifyStripeSignature", () => {
  const t = Math.floor(now / 1000);
  it("accepts a valid signature", async () => {
    expect(await verifyStripeSignature(body, `t=${t},v1=${sign(t)}`, secret, now)).toBe(true);
  });
  it("accepts any of several v1 signatures (secret rotation)", async () => {
    expect(await verifyStripeSignature(body, `t=${t},v1=deadbeef,v1=${sign(t)}`, secret, now)).toBe(true);
  });
  it("rejects a tampered body", async () => {
    expect(await verifyStripeSignature(body + " ", `t=${t},v1=${sign(t)}`, secret, now)).toBe(false);
  });
  it("rejects the wrong secret", async () => {
    expect(await verifyStripeSignature(body, `t=${t},v1=${sign(t, body, "other")}`, secret, now)).toBe(false);
  });
  it("rejects old timestamps (replay)", async () => {
    const old = t - 3600;
    expect(await verifyStripeSignature(body, `t=${old},v1=${sign(old)}`, secret, now)).toBe(false);
  });
  it("rejects missing header or secret", async () => {
    expect(await verifyStripeSignature(body, null, secret, now)).toBe(false);
    expect(await verifyStripeSignature(body, `t=${t},v1=${sign(t)}`, "", now)).toBe(false);
  });
});
