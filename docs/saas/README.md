# SaaS foundation

This directory is the source of truth for Meeting Copilot Phase 4. The implementation is developed on `phase-4-saas-foundation`; `main` remains production-only.

## Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md): trust boundaries and component design.
- [AUTH.md](./AUTH.md): user, web session, desktop device, and token lifecycle.
- [BILLING.md](./BILLING.md): Stripe Test Mode integration and subscription projection.
- [CREDITS.md](./CREDITS.md): immutable ledger and usage accounting.
- [PLANS.md](./PLANS.md): product catalog, entitlements, and model tiers.
- [UNIT_ECONOMICS.md](./UNIT_ECONOMICS.md): explicit assumptions and cost scenarios.
- [PIXEL_TRUTH_AUDIT.md](./PIXEL_TRUTH_AUDIT.md): read-only reference audit.
- [SECURITY.md](./SECURITY.md): security baseline and threat controls.
- [MIGRATION.md](./MIGRATION.md): pilot-data migration and rollback.
- [DEPLOYMENT.md](./DEPLOYMENT.md): Railway/Vercel configuration and release gates.
- [STATUS.md](./STATUS.md): implemented, pending, blocked, and verification evidence.

## Non-negotiable rules

1. Stripe remains in Test Mode until a human production approval.
2. The backend is authoritative for identity, ownership, entitlements, usage, and billing state.
3. A Stripe price, product, or customer from Pixel Truth is never reused.
4. Content is not stored in billing or usage telemetry.
5. Credits are changed only by append-only ledger entries with idempotency keys.
