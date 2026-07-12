# Security and privacy audit

## Positive defaults

- Push-to-talk only; no capture at startup.
- Renderer has `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- CSP is present in renderer HTML.
- Provider API key lives in backend, not renderer.
- Desktop gets short-lived transcription credentials.
- OpenAI answer/retrieval calls use `store: false`.
- Audio is not written to disk by the active capture pipeline.
- Fastify logs redact authorization headers and audio fields.
- Optional `DESKTOP_API_KEY` protects backend endpoints except health.

## Data locations

| Data | Current location | Persistence |
| --- | --- | --- |
| App settings | `electron-store` settings file | local persisted |
| OpenAI API key | backend env | process env/provider only |
| Desktop API key | desktop env/userData `.env` or process env | local plaintext if stored in `.env` |
| Realtime client secret | main process memory | short-lived |
| Raw audio | renderer/main memory + provider stream | not persisted by current code |
| Transcript | renderer state; sent to backend/OpenAI | not persisted by current runtime |
| Answer | renderer state | not persisted by current runtime |
| Context profiles/glossary | Postgres when `DATABASE_URL` exists | persisted |
| Meeting sessions/turns/transcripts/answers | schema exists | runtime not wired |

## Key risks

1. Shared `DESKTOP_API_KEY` is not user-level auth and can be copied.
2. No user-facing deletion/history controls before transcript persistence is enabled.
3. No redaction of secrets/PII from transcripts before sending to OpenAI.
4. Logs can include renderer console messages; future transcript logs would be risky.
5. No consent/onboarding policy inside the app for meeting participants.
6. No encryption for local settings.
7. No retention worker despite retention settings/schema.

## Capture transparency

The UI has state indicators and text saying audio is not saved. Overlay mode keeps status visible. This is good, but errors are not differentiated enough. Discreet UI must not mean hidden recording; keep clear active listening/transcribing indicators in all modes.

## Recommendations before persistence/SaaS

- Implement per-user auth/license validation.
- Add "what was sent" history view and delete controls.
- Add local redaction for likely secrets (`sk-`, JWTs, passwords, tokens).
- Add retention worker and tested deletion.
- Add privacy-safe telemetry only after explicit policy.
- Add onboarding copy: user is responsible for meeting consent/legal compliance.

