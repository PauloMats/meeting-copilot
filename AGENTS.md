# Meeting Copilot agent guide

## Repository safety

- `main` is production. Do not commit or push directly to `main`.
- Use `dev` for integration and feature branches for implementation work.
- For phase 2, use `phase-2-operational-overlay`, based on `phase-1-low-latency-pilot`.
- Before any implementation, capture a validation baseline and record it in `docs/implementation/STATUS.md`.

## Development environment

- Primary project path: `/home/paulomats/code/pessoal/meeting-copilot`.
- Preferred shell inside WSL2 Ubuntu: `/usr/bin/zsh`.
- Run project commands from the WSL path, not the Windows UNC path.
- The real desktop loopback audio path must still be validated on Windows because Electron loopback capture is platform-specific.

## Validation commands

- Prefer non-mutating checks before code changes.
- Use `pnpm exec prettier --check .` for baseline formatting checks. Do not run full-repo formatting unless the task explicitly includes formatting cleanup.
- Standard checks:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Privacy and secrets

- Never commit `.env`, API keys, client secrets, recordings, transcripts with real customer data, or local Electron settings.
- Do not send synthetic or real meeting audio to provider APIs unless a safe test environment and explicit API credentials are configured.
- Logs and telemetry must avoid transcript text, raw audio, API keys, and PII. Use turn IDs, durations, byte counts, state transitions, and error codes.

## Product constraints for phase 2

- Optimize for short technical answers, low latency, predictable behavior, and pilot reliability.
- Default mode remains push-to-talk.
- Auto question detection is optional and must be disableable.
- Overlay modes must remain operational and discreet: minimized status, compact question/answer, and expanded optional detail.
- Visual state must derive from the domain turn state. Do not create a parallel capture state machine in React.
- Active capture must always have a visible text-and-color indicator. Never add hidden capture.
- Overlay changes must not focus the window when an answer arrives.
- Keep transcript and answer content out of technical logs, diagnostics, screenshots, and telemetry.
- Renderer tests should prefer pure presentation/state helpers where Electron or DOM infrastructure is unavailable.
- SaaS billing, user login, and full document indexing are out of scope for this phase.
