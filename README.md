# Meeting Copilot

Privacy-first desktop AI copilot for technical meetings. Hold a global hotkey, capture meeting
audio, see live transcription, and receive a structured technical answer without turning the app
into a continuous recorder.

## Current MVP

- Electron + React + TypeScript with `contextIsolation`, sandbox, CSP, and a typed preload bridge.
- Global push-to-talk keydown/keyup capture (default: `Space`).
- Windows desktop loopback audio and optional microphone mixing.
- 24 kHz mono PCM streaming to an OpenAI Realtime transcription session.
- Manual audio commit and transcript correlation by provider `item_id`.
- Auto-submit on hotkey release or optional transcript review with Enter/Escape.
- Structured answer generation through the Responses API.
- Context profiles, glossary normalization, PostgreSQL schema, and pgvector retrieval abstraction.
- Audio storage disabled by default. The current capture path never writes audio to disk.
- Optional always-on-top compact behavior.

The document ingestion endpoint currently accepts and validates uploads but deliberately does not
claim indexing is complete. A storage/indexing worker is listed in the delivery checklist.

## Repository layout

```text
apps/
  api/                 Fastify backend and application services
  desktop/             Electron main/preload and React renderer
packages/
  contracts/           Zod DTOs, domain types, IPC and API contracts
  database/            Drizzle schema, migrations and PostgreSQL client
docs/
  architecture.md      Flows, boundaries and service map
  development.md       Windows + WSL2 setup
  delivery-checklist.md
```

## Quick start (Windows + WSL2 Ubuntu)

Prerequisites: Docker Desktop with WSL integration, Node.js 22+, pnpm 10, and an OpenAI API key.

```bash
cd /home/paulomats/code/pessoal/meeting-copilot
cp .env.example .env
# Add OPENAI_API_KEY to .env
docker compose up -d postgres
pnpm install
pnpm db:migrate
pnpm dev:api
```

In a second WSL terminal, WSLg can be used for UI-only development:

```bash
cd /home/paulomats/code/pessoal/meeting-copilot
pnpm dev:desktop
```

For the first real audio test, run Electron from a native Windows checkout:

```powershell
.\scripts\run-windows-desktop.ps1
```

Electron launched inside WSL uses Linux capture semantics. The Windows checkout is required for
desktop audio loopback; the API and PostgreSQL can remain in WSL/Docker Desktop. See
[docs/development.md](docs/development.md).

## Validation

```bash
pnpm check
```

## Security defaults

- Explicit push-to-talk; no continuous recording.
- Provider API key exists only in the backend.
- Desktop receives a short-lived Realtime client secret from the backend.
- No Node.js integration or direct remote content in the renderer.
- IPC request payloads are validated at the main-process boundary.
- Audio is held in memory and not persisted.
- OpenAI Responses calls use `store: false`.
- Logs redact authorization headers, tokens, and audio fields.

## API

- `GET /api/health`
- `POST /api/realtime/token`
- `POST /api/answers`
- `GET|POST|PUT|DELETE /api/context-profiles`
- `GET|POST|PUT|DELETE /api/glossary`
- `POST /api/documents/upload`

See [.env.example](.env.example) for configuration.
