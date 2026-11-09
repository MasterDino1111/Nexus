// Stripe webhook. Every request is verified with the Stripe signature
// (STRIPE_WEBHOOK_SECRET) before anything is written. Events are idempotent.

const PLANS = ["premium", "premium_plus"];
const TOLERANCE_SECONDS = 300;
const PERIOD_MS = 31 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyStripeSignature(body, header, secret, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    })
  );
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(now / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
  // Stripe may send several v1 signatures during secret rotation
  const candidates = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!candidates.length) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${body}`)));
  return candidates.some((c) => safeEqual(c, expected));
}

export default async function handler(req, context) {
  const secret = context.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook not configured" }, { status: 500 });

  const body = await req.text();
  const ok = await verifyStripeSignature(body, req.headers.get("stripe-signature"), secret);
  if (!ok) return Response.json({ error: "Invalid signature" }, { status: 400 });

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { createClient } = await import("@base44/sdk");
  const client = createClient({ appId: context.env.APP_ID });
  const db = client.asServiceRole.entities;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;

    if (userId && PLANS.includes(plan)) {
      const already = session.subscription
        ? await db.Subscription.filter({ stripe_subscription_id: session.subscription })
        : [];
      if (already.length === 0) {
        const active = await db.Subscription.filter({ user_id: userId, status: "active" });
        for (const sub of active) await db.Subscription.update(sub.id, { status: "cancelled" });
        await db.Subscription.create({
          user_id: userId,
          plan,
          status: "active",
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          expires_at: new Date(Date.now() + PERIOD_MS).toISOString(),
        });
      }
    }

    const donationId = session.metadata?.donation_id;
    if (donationId) {
      const patch = { status: "paid", stripe_session_id: session.id };
      if (session.subscription) patch.stripe_subscription_id = session.subscription;
      await db.Donation.update(donationId, patch);
    }
  }

  // Renewals: keep the plan running as long as Stripe keeps charging
  if (event.type === "invoice.paid") {
    const subId = event.data.object.subscription;
    if (subId) {
      const subs = await db.Subscription.filter({ stripe_subscription_id: subId });
      for (const sub of subs) {
        await db.Subscription.update(sub.id, {
          status: "active",
          expires_at: new Date(Date.now() + PERIOD_MS).toISOString(),
        });
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const stripeSubId = event.data.object.id;
    const subs = await db.Subscription.filter({ stripe_subscription_id: stripeSubId });
    for (const sub of subs) await db.Subscription.update(sub.id, { status: "cancelled" });
    const donations = await db.Donation.filter({ stripe_subscription_id: stripeSubId });
    for (const d of donations) await db.Donation.update(d.id, { status: "cancelled" });
  }

  return Response.json({ received: true });
}
