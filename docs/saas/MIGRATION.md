# Pilot migration

## Goals

Preserve current pilot context, glossary, settings, meeting, transcript, answer, document, and audit rows while introducing individual identity and billing.

## Sequence

1. Back up PostgreSQL and record row counts.
2. Deploy additive schema only; do not drop or rewrite content tables.
3. Resolve/create the existing `APP_USER_EMAIL` bootstrap user.
4. Confirm every current owned row references a valid user.
5. Create the internal plan catalog and a one-time pilot entitlement/grant with deterministic idempotency keys.
6. Ask the pilot user to verify email and create a password/device session.
7. Enable `AUTH_REQUIRED=true` after successful login validation.
8. Remove bootstrap bypass in a later release after the transition window.

## Rollback

Application rollback points to the previous image while retaining additive tables. No destructive down migration runs automatically. Stripe remains authoritative, so webhook ingestion must continue or events must be replayed after recovery.

## Verification

- pre/post row counts;
- no orphaned ownership;
- duplicate ledger/event idempotency keys rejected;
- pilot context/glossary visible only to the migrated user;
- old desktop receives an explicit upgrade-required response, not another user's data.
