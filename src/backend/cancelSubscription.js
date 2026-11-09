// Cancels the signed-in user's own subscription (Stripe + database).

async function getUser(req, context) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const { createClient } = await import("@base44/sdk");
    return await createClient({ appId: context.env.APP_ID, token }).auth.me();
  } catch {
    return null;
  }
}

export default async function handler(req, context) {
  const me = await getUser(req, context);
  if (!me) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { subscriptionId } = await req.json();
  const { createClient } = await import("@base44/sdk");
  const db = createClient({ appId: context.env.APP_ID }).asServiceRole.entities;

  const sub = await db.Subscription.get(subscriptionId).catch(() => null);
  if (!sub || sub.user_id !== me.id) return Response.json({ error: "Abo nicht gefunden" }, { status: 404 });

  if (sub.stripe_subscription_id) {
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${context.env.STRIPE_SECRET_KEY}` },
    });
    const result = await response.json();
    if (result.error && result.error.code !== "resource_missing") {
      return Response.json({ error: result.error.message }, { status: 400 });
    }
  }

  await db.Subscription.update(sub.id, { status: "cancelled" });
  return Response.json({ success: true });
}
