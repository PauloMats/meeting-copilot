# Pixel Truth read-only audit

Audited without writes:

- Backend: `pixeltruth/Pixel-Truth-Backend`, `main`, commit `f08373c401feac27e9993ead753ec33098e465ce`.
- Frontend: `pixeltruth/Pixel-Truth-Frontend`, `main`, commit `bccc62b970a74523a581152485f4a2f398340015`.

## Patterns worth adapting

- Backend allowlist mapping from product lookup key to Stripe price.
- Stripe-hosted Checkout and authenticated frontend proxy.
- Raw webhook body and `constructEvent` signature verification.
- Transactional fulfillment and unique provider IDs.
- Product-oriented pricing UI and return URLs.

## Patterns explicitly rejected

- Mutable integer credit counters.
- `isPremium`/string plan as the entitlement source of truth.
- Handling only checkout completion and invoice payment.
- Directly logging user payloads, verification codes, or email addresses.
- JWT secret fallback and sessions without rotation/revocation/device ownership.
- Pixel-specific Resend branding, schemas, lookup keys, customer records, or environment secrets.
- The Pixel catalog entry named for Meeting Copilot; Meeting Copilot receives an independent Stripe catalog.

Pixel Truth uses Prisma/Nest/Next while Meeting Copilot uses Drizzle/Fastify/Vite/Electron. Concepts are adapted, not copied mechanically.
