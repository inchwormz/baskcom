# Bask checkout setup

John, 12 October 2026: “just build it all for now, can do that later, get all steps and apges done first”. The cart and checkout pages are complete. Payments stay unavailable until the Bask Stripe account and fulfilment choices are supplied.

## Pages and behavior

- `/shop/` and homepage: all 58 product cards add to cart. The 52 catalogue products are authoritative in `live-site/products.json`; prices use integer NZ cents.
- `/cart/`: saved browser cart, quantities, remove, per-line totals, subtotal and checkout link.
- `/checkout/`: review, pickup/delivery selection, Stripe redirect, loading/retry and cancellation.
- `/checkout/success/`: server checks Stripe payment status before confirming. Only the purchased quantities are removed from the saved cart; objects added during payment remain.
- `/api/checkout/`: public availability/options on GET; validated server-priced Stripe Checkout Session on POST.
- `/api/order/`: retrieves a Stripe Session and confirms paid Bask/NZD payments. No customer email, phone or address is exposed in this response.

## Connect later

Choose the Bask Stripe account with John. Add the secret through Vercel's protected environment-variable UI for the `baskobjects` project; never put it in source, browser code or chat.

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Bask account key. Test key in Preview; live key in Production. |
| `BASK_CHECKOUT_ENABLED` | Set `true` when ready to enable payment. |
| `BASK_PICKUP_ENABLED` | Set `true` only if Auckland pickup is offered. |
| `BASK_DELIVERY_CENTS` | Confirmed flat New Zealand delivery charge in cents; omit to exclude delivery. `0` means free delivery and must be explicitly chosen. |
| `BASK_SITE_URL` | Optional canonical origin. Production defaults to `https://baskobjects.co.nz`; Preview defaults to its Vercel URL. |

Confirm product prices, GST treatment, stock and the pickup arrangement/delivery charge with John before enabling payment. The implementation uses the existing displayed NZD catalogue amounts and adds only the selected delivery charge. It does not guess tax or freight. Large quantities are directed to Bask (20 per line / 100 total).

After configuration, publish via a GitHub merge. In Preview, complete a real Stripe test-card journey, verify the charged total, pickup and delivery paths, cancellation, confirmation and retry. Then use live credentials in Production and verify availability without submitting a real charge unless John authorizes it.

Card payment only is enabled initially, so a confirmed successful payment is available synchronously. Orders, customer contact details and delivery addresses remain in the Bask Stripe Dashboard for manual fulfilment. Configure Stripe receipts and payment notifications for that account. This release does not provide an inventory system, automatic fulfilment, an order database or webhook processing. Add those before promising automated order handling or enabling delayed payment methods. Stripe's documented fulfilment guidance: https://docs.stripe.com/payments/checkout/fulfill-orders.

## Verification

`node scripts/verify-bask-shopping.cjs`: authoritative price validation, cart bounds, shipping parameter construction, invalid/unconfigured payment routes, eight page layouts at four widths, cart persistence/cross-tab synchronization, About wording, BASK marquee, carousel controls/interruption/reduced motion. A controlled frontend-only configuration response exercises delivery selection and payment-error retry; it does not claim a real Stripe transaction.

`node scripts/verify-bask-nav-hover.cjs`: shared navigation, 58 hover panels, animated/leave/focus states, caption fit, room links, touch readability and reduced motion.

Set `BASK_PREVIEW_URL` and `BASK_QA_OUTPUT` for local, hosted or live verification. Chromium/simulated touch only; no physical phone, Safari or Firefox claim.
