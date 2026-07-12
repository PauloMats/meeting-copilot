# Runtime evidence

## Commands executed

The following safe validation command was executed in WSL from `/home/paulomats/code/pessoal/meeting-copilot`:

```bash
pnpm check
```

Result: passed.

It ran:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Observed outcomes:

- Lint: 5 packages successful.
- Typecheck: 7 tasks successful.
- Tests: API tests passed, contracts tests passed, packages without tests used `--passWithNoTests`.
- Build: API, desktop, web, contracts, and database build tasks successful.

## Tests observed

- `apps/api/test/app.test.ts`
- `apps/api/test/config.test.ts`
- `apps/api/test/normalizer.test.ts`
- `apps/api/test/realtime-token.test.ts`
- `packages/contracts/src/domain.test.ts`

## What was not executed

- Desktop app was not launched.
- No audio capture was performed.
- No Teams/Meet/Zoom/Discord meeting was tested.
- No OpenAI call was made.
- No Railway/Vercel production endpoint was called.
- No `.env` real secrets were read.
- No database migration was run during this audit pass.

## Static evidence inspected

- README and all `docs/*.md`.
- Root manifests and deployment config.
- Package manifests in apps/packages.
- Electron main/preload/renderer.
- Audio capture implementation.
- Realtime transcription service.
- Fastify API routes/config.
- Answer prompt/service.
- Database schema/migration client.
- Tests and CI config.

## Repository state note

This audit intentionally creates documentation under `docs/audit/`. No application source file, dependency manifest, lockfile, environment file, or deployment config is intentionally modified by the audit.

