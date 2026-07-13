# Billing and subscriptions

## Stripe boundaries

- Phase 4 uses Stripe Test Mode only.
- The API rejects a live secret key unless `STRIPE_LIVE_MODE_ENABLED=true`; enabling it requires explicit human approval outside this phase.
- The client sends an internal plan code. The backend maps that code to an allowlisted Stripe Test price ID.
- Checkout and Customer Portal sessions are created server-side for the authenticated user's Meeting Copilot Stripe customer.
- Pixel Truth products, prices, customers, webhooks, and subscriptions are never reused.

## Source of truth

Stripe is authoritative for payment/subscription state. PostgreSQL stores a queryable projection:

- customer mapping;
- subscription status and current period;
- plan code and Stripe price;
- cancellation state;
- processed Stripe events.

The webhook verifies the signature against the raw body. Event IDs are inserted before processing under a unique constraint. Duplicate delivery is acknowledged without repeating effects. Failed events keep their error and attempt count for replay.

## Minimum event set

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Webhook order is not assumed. Projection updates compare provider timestamps and tolerate missing local checkout state.

## Cancellation

The portal handles payment methods, invoices, and cancellation. Entitlements follow the projected subscription state. A subscription canceled at period end remains active until `current_period_end`; immediate termination removes paid entitlements after webhook confirmation.
