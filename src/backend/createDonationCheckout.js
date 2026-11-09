// Starts a Stripe checkout for a donation. Amount, type and creator are read
// from the pending Donation record that belongs to the signed-in donor.

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

  const { donationId, successUrl, cancelUrl } = await req.json();
  if (!context.env.STRIPE_SECRET_KEY) return Response.json({ error: "Stripe ist nicht konfiguriert" }, { status: 400 });

  const { createClient } = await import("@base44/sdk");
  const client = createClient({ appId: context.env.APP_ID });
  const donation = await client.asServiceRole.entities.Donation.get(donationId).catch(() => null);
  if (!donation || donation.donor_id !== me.id || donation.status !== "pending") {
    return Response.json({ error: "Spende nicht gefunden" }, { status: 404 });
  }

  const cents = Math.round(Number(donation.amount) * 100);
  if (!cents || cents < 100 || cents > 100000) {
    return Response.json({ error: "Betrag muss zwischen 1 € und 1000 € liegen" }, { status: 400 });
  }

  const success = sameOriginUrl(successUrl, req);
  const cancel = sameOriginUrl(cancelUrl, req);
  if (!success || !cancel) return Response.json({ error: "Ungültige Rücksprung-URL" }, { status: 400 });

  const recurring = donation.type === "monthly";
  const params = new URLSearchParams({
    "payment_method_types[]": "card",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(cents),
    "line_items[0][price_data][product_data][name]": `Spende an ${donation.creator_name || "Creator"}`,
    mode: recurring ? "subscription" : "payment",
    success_url: success,
    cancel_url: cancel,
    customer_email: me.email,
    "metadata[donation_id]": donation.id,
    "metadata[kind]": "donation",
  });
  if (recurring) params.set("line_items[0][price_data][recurring][interval]", "month");

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
