# SaaS security baseline

- Authentication is required by default in production.
- Password, reset, verification, access, refresh, and device-code secrets are hashed at rest.
- Refresh rotation and family revocation limit replay.
- All owned-resource queries include the authenticated `userId` predicate.
- Stripe webhook signatures use the exact raw request body.
- Checkout accepts only backend allowlisted plan codes.
- Live Stripe keys are rejected by default.
- Logs redact authorization, cookies, API keys, audio, prompts, transcripts, answers, and token values.
- Rate limits are required for registration, login, recovery, device polling, answer, and realtime-token endpoints before public launch.
- Billing and usage telemetry excludes meeting content.
- Device names and last-seen metadata are visible and revocable by the owner.

## Launch blockers

- Email verification and reset delivery must be production-integrated.
- CSRF protection must accompany cookie-authenticated mutation routes.
- Abuse throttling and IP hashing salt rotation need deployment configuration.
- Dependency, secret, and container scanning must pass.
- A restore drill and Stripe event replay drill must be completed.
