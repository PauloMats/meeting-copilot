# Meeting Copilot

Privacy-first desktop AI copilot and smart meeting-notes app. Use push-to-talk for a technical
answer, or record a full meeting to save its transcript and generate structured notes with topics,
decisions, action items, owners, deadlines, next steps, and open questions.

## Current MVP

- Electron + React + TypeScript with `contextIsolation`, sandbox, CSP, and a typed preload bridge.
- Global push-to-talk keydown/keyup capture (default: `Space`).
- Native Windows WASAPI loopback with explicit output-device selection and optional microphone mixing.
- 24 kHz mono PCM streaming to an OpenAI Realtime transcription session.
- Manual audio commit and transcript correlation by provider `item_id`.
- Auto-submit on hotkey release or optional transcript review with Enter/Escape.
- Structured answer generation through the Responses API.
- Context profiles, glossary normalization, PostgreSQL schema, and pgvector retrieval abstraction.
- Audio storage disabled by default. The current capture path never writes audio to disk.
- Optional always-on-top compact behavior.
- Home screen for choosing between Meeting Copilot and Smart Meeting Notes.
- Click-to-start/click-to-finish meeting transcription with an elapsed-time indicator.
- Explicit General Meeting or Daily / Team Status processing before recording.
- A person-by-person Daily report with attribution confidence, blockers, dependencies, and next steps.
- Optional ordered participants and speaker hints to improve Daily attribution.
- Dedicated structured AI prompts that do not invent owners, deadlines, decisions, or updates.
- Automatic Markdown notes under the user's `Documents/Meeting Copilot` directory.
- Transcript-first persistence: the raw transcript remains saved if AI summarization fails.
- Saved transcripts retain their meeting type and attribution context for safe retry.

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
native/
  windows-audio-capture/  Self-contained WASAPI capture helper (C# + NAudio)
docs/
  architecture.md      Flows, boundaries and service map
  development.md       Windows + WSL2 setup
  delivery-checklist.md
  deployment.md        Railway/backend deployment notes
  model-strategy.md    OpenAI model defaults and override strategy
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
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-windows-desktop.ps1
```

Electron launched inside WSL cannot use the native Windows WASAPI helper. The Windows checkout is
required for system-audio capture; the API and PostgreSQL can remain in WSL/Docker Desktop. See
[docs/development.md](docs/development.md).

## Windows executable

Generate the desktop executable from the native Windows checkout, not from WSL:

```powershell
cd $env:USERPROFILE\code\meeting-copilot
pnpm install
.\scripts\build-windows-release.ps1
```

The script installs a local .NET 8 build toolchain when needed, publishes the self-contained WASAPI
helper, generates both the portable executable and NSIS installer, validates the project, and
copies both artifacts to `Documents\Meeting Copilot\Builds`. End users do not need .NET installed.
The original artifacts remain under `apps\desktop\release\`. Set `API_BASE_URL` and
`DESKTOP_API_KEY` for the Railway backend, or keep the local WSL API/PostgreSQL running:

```bash
cd /home/paulomats/code/pessoal/meeting-copilot
docker compose up -d
pnpm dev:api
```

## Validation

```bash
pnpm check
```

## Security defaults

- Capture is always user-initiated: push-to-talk for the copilot or click-to-record for notes.
- Provider API key exists only in the backend.
- Desktop receives a short-lived Realtime client secret from the backend.
- No Node.js integration or direct remote content in the renderer.
- IPC request payloads are validated at the main-process boundary.
- Audio is held in memory and not persisted.
- Smart Meeting Notes persists text only; the audio capture is still discarded after transcription.
- OpenAI Responses calls use `store: false`.
- Logs redact authorization headers, tokens, and audio fields.

## API

- `GET /api/health`
- `POST /api/realtime/token`
- `POST /api/answers`
- `POST /api/meeting-summaries`
- `GET|POST|PUT|DELETE /api/context-profiles`
- `GET|POST|PUT|DELETE /api/glossary`
- `POST /api/documents/upload`

See [.env.example](.env.example) for configuration.
