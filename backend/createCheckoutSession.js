// Starts a Stripe checkout for a premium plan. The user is taken from the
// access token, never from the request body.

const PLANS = ["premium", "premium_plus"];

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

// Redirect targets must live on the same origin as the request
function sameOriginUrl(url, req) {
  try {
    const origin = req.headers.get("origin") || new URL(req.headers.get("referer") || "").origin;
    const u = new URL(url);
    return u.origin === origin ? u.toString() : null;
  } catch {
    return null;
  }
}

export default async function handler(req, context) {
  const me = await getUser(req, context);
  if (!me) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { plan, successUrl, cancelUrl } = await req.json();
  if (!PLANS.includes(plan)) return Response.json({ error: "Ungültiger Plan" }, { status: 400 });

  const success = sameOriginUrl(successUrl, req);
  const cancel = sameOriginUrl(cancelUrl, req);
  if (!success || !cancel) return Response.json({ error: "Ungültige Rücksprung-URL" }, { status: 400 });

  const priceId = plan === "premium_plus" ? context.env.STRIPE_PREMIUM_PLUS_PRICE_ID : context.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId || !context.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe ist nicht konfiguriert" }, { status: 400 });
  }

  const params = new URLSearchParams({
    "payment_method_types[]": "card",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    mode: "subscription",
    success_url: success,
    cancel_url: cancel,
    "metadata[user_id]": me.id,
    "metadata[plan]": plan,
    customer_email: me.email,
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${context.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const session = await response.json();
  if (session.error) return Response.json({ error: session.error.message }, { status: 400 });
  return Response.json({ url: session.url });
}
