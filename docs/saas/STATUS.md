# Phase 4 status

Last updated: 2026-07-12.

## Baseline verified

- Branch: `phase-4-saas-foundation`, based on Phase 2 commit `c8c7cb4`.
- `main` was not modified.
- Baseline lint, typecheck, tests (27 total), and build passed.
- Baseline Prettier check reported 16 pre-existing formatting differences.
- Pixel Truth repositories were audited read-only.

## Implemented in this phase

- Architecture, auth/device, billing, credit-ledger, plan, security, migration, deployment, and unit-economics decisions.
- Opaque 15-minute access sessions, 30-day rotating refresh tokens, password scrypt hashing, family reuse revocation, and production auth fail-closed configuration.
- One-use desktop device authorization, plan device limits, device listing/revocation, and Electron `safeStorage` persistence.
- User-scoped context/glossary access and plan gates for answer tier, context profiles, documents, and realtime credit availability.
- Immutable microcredit ledger schema, idempotent Trial/period grants, answer reservations/releases, and measured desktop transcription usage.
- Stripe Test Mode Checkout, Customer Portal, signed raw-body webhooks, event idempotency, out-of-order subscription protection, and allowlisted price mapping.
- Web registration/login/account, pricing, checkout/portal entry points, device approval, device revocation, and refresh-cookie rotation.
- Additive Drizzle migration preserving pilot tables and seeding the plan catalog.
- Global and sensitive-route API rate limiting plus expanded secret/content log redaction.
- Lint, typecheck, 36 tests, and all API/web/desktop builds pass.

## Pending before public launch

- Execute the additive migration against an empty PostgreSQL instance and a backed-up sanitized pilot snapshot. Docker Desktop was unavailable during this verification run.
- Integrate production email delivery for verification and password recovery; token storage exists but delivery/routes are not yet enabled.
- Add Stripe CLI integration tests for duplicate, invalid-signature, and out-of-order events against PostgreSQL.
- Reserve realtime transcription credits before provider token issuance; the current guard checks positive balance and settles measured usage after completion, leaving a concurrency/abuse window.
- Add a scheduled expiry/reconciliation worker for period credits and failed Stripe events.
- Replace the account's diagnostic JSON summary with finalized product copy and add password/recovery UX.
- Complete Phase 3 privacy runtime and perform account deletion/export drills.

## Known prerequisite gap

Phase 3 runtime persistence, retention/redaction worker, history, export, and account deletion are not fully implemented. Their database tables do not prove operational completion. Public launch remains blocked until those privacy paths are verified.

## Blocked outside code

- Stripe Test products/prices/webhook secrets.
- Production email provider credentials and sender/domain approval.
- Final commercial pricing and legal/privacy approval.
- Explicit human approval for any future Stripe Live Mode activation.
