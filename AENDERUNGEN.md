# NEXUS – Änderungen

## Muss du in Base44 / Stripe noch einstellen
1. Stripe → Webhooks: Endpoint `/api/stripeWebhook`, Events `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`. Das Signing-Secret als Umgebungsvariable `STRIPE_WEBHOOK_SECRET` speichern.
2. Entity-Regeln (`rls` in `base44/entities/*.jsonc`) im Base44-Dashboard prüfen. Syntax und Platzhalter `{{user.id}}` bitte gegenprüfen.
3. Optional: `VITE_ADMIN_EMAIL` (Besitzer-Fallback) und für Live-Streams `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`.

## Sicherheit
- stripeWebhook: Signaturprüfung (HMAC, 5 Min. Toleranz), idempotent, `invoice.paid` verlängert Abos. SDK-Import korrigiert.
- createCheckoutSession / createDonationCheckout / cancelSubscription: Nutzer kommt aus dem Token, nicht aus dem Request. Spendenbetrag kommt aus dem Datensatz, Rücksprung-URLs nur gleicher Origin.
- PaymentSuccess / DonationResult schalten nichts mehr selbst frei, sie warten auf den Webhook.
- Entity-Regeln für Subscription, Donation, BannedUser, Feedback, Notification, Report.
- Sperren (BannedUser) werden jetzt durchgesetzt (Sperrbildschirm).
- Admin-E-Mail nicht mehr im Code.

## Stabilität
- Aufrufe serverseitig (`trackView`), 1 Aufruf je Nutzer/Video/30 Min.
- Live: TURN konfigurierbar, Verbindungsüberwachung.
- Seiten per Lazy Loading, Tests (`npm test`).
- Doppelt kodierte Umlaute/Emojis im Export repariert.

## Chancen
- Melden-Funktion + Admin-Tab «Meldungen».
- Empfehlungen: Aktualität, Beliebtheit, max. 3 Videos je Kanal, Trending für neue Nutzer.
- PWA (installierbar, Offline-Hülle), SEO-Meta.

## Nachtrag: Premium für Creator + Bildschirmfreigabe
- Creator-Dashboard, Upload und Live-Studio sind nur mit aktivem Premium (oder als Admin) erreichbar (`PremiumGate`, `usePremium`). «Live gehen» leitet ohne Premium auf die Premium-Seite.
- Live-Studio: Button «Bildschirm teilen». Bildschirm ersetzt die Kamera, Mikrofon bleibt (mit System-/Tab-Ton gemischt, falls der Browser ihn liefert). Zuschauer bleiben verbunden. Nur am Computer-Browser.
- Neue Server-Funktion `streamRaised`: Spendenziel im Live-Stream für Zuschauer (wegen der neuen Donation-Zugriffsregel nötig). Aktualisiert alle 8 Sekunden.
