# SaaS deployment

## Railway API

Required production variables include `DATABASE_URL`, `OPENAI_API_KEY`, `AUTH_REQUIRED=true`, token pepper secrets, public web/API URLs, and allowed CORS origins. Stripe variables must initially be Test Mode values: `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, and one Test price ID per enabled plan.

`STRIPE_LIVE_MODE_ENABLED` must remain absent/false. `API_HOST` is forced to `0.0.0.0` on Railway and Railway owns `PORT`.

Run additive migrations before startup. Health checks must verify process/database readiness without disclosing provider keys or customer state.

## Vercel web

Configure only public values such as `VITE_API_BASE_URL`. Stripe secret keys, webhook secrets, token peppers, and OpenAI keys belong only in Railway.

## Release gates

- lint, typecheck, unit/integration tests, build;
- migration against an empty database and a sanitized pilot snapshot;
- Stripe CLI Test Mode webhook tests, including duplicates and out-of-order events;
- ownership tests with two users;
- device revoke and refresh-token reuse tests;
- no live Stripe credentials and no real charges;
- documented rollback image and database backup.
