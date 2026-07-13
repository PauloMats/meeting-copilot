# SaaS architecture

## Trust boundaries

```text
Web browser / Electron desktop
        | TLS + user access token
        v
Meeting Copilot API (authoritative policy boundary)
        |-- PostgreSQL: identity, ownership, subscriptions, usage, ledger
        |-- Stripe: payment source of truth; Test Mode only during Phase 4
        `-- OpenAI: transcription and answer generation
```

The renderer, desktop main process, and browser are untrusted clients. They may present an entitlement but cannot grant it. The API derives `userId` from a validated session and applies ownership in the database query itself.

## Core domains

- **Identity:** users, password credentials, sessions, rotating refresh tokens, devices, and device authorization codes.
- **Catalog:** stable internal plan codes and entitlements. Stripe price IDs are deployment configuration, not domain identifiers.
- **Billing projection:** Stripe customer and subscription state synchronized by signed, idempotent webhooks.
- **Usage:** measured provider units linked to a user, feature, model, request, and period without transcript content.
- **Credits:** append-only signed entries. Balance is the sum of committed entries, never a mutable counter.

## Request policy

Operational routes require an individual access session. `DESKTOP_API_KEY` can remain as an optional installation-level defense, but it is not an identity. Health, registration, login, refresh, device initiation/polling, plan catalog, and Stripe webhook routes are the only deliberate public surfaces.

## Phase dependency note

The schema contains meeting/transcript tables, but the runtime persistence, retention worker, redaction, history, and export/delete experience expected from Phase 3 are not fully wired. Phase 4 does not falsely mark them complete. SaaS billing telemetry must never become an accidental content archive.
