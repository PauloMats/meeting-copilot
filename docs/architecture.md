# Architecture

## Boundaries

```text
Global keyboard hook
        |
Electron main -------------------- Fastify API ---------------- OpenAI
  | strict typed IPC                 |  |                         | Realtime
  | ephemeral token + WS             |  + PostgreSQL/pgvector     | Responses
  v                                  |
Preload bridge                       + retrieval provider
  |
React renderer -> Web Audio -> PCM 24 kHz mono chunks
```

The renderer never receives the provider API key, filesystem primitives, arbitrary IPC access, or
Node.js integration. It can only call the methods in `CopilotApi`.

## Core domain model

- `CaptureState`: `idle`, `listening`, `transcribing`, `ready_to_send`, `thinking`,
  `answering`, `error`.
- `TranscriptTurn`: provider `itemId`, raw/normalized transcript, lifecycle timestamps and status.
- `AppSettings`: hotkey, microphone inclusion, submission mode, language, delay, retention, audio
  persistence, optional cloud sync and overlay settings.
- `Answer`: direct answer, explanation, example, assumptions, follow-ups and confidence.
- `MeetingSummary`: overview, topics, decisions, action items, next steps and open questions.
- `ContextProfile`: project description, stack and business context.
- `GlossaryTerm`: acronym, project, vendor, codeword or synonym replacement.

Canonical schemas live in `packages/contracts/src`.

## Realtime transcription flow

1. The global native hook emits hotkey down once; key repeat is ignored.
2. The renderer requests a transcription session from Electron main.
3. Main asks `POST /api/realtime/token` for a short-lived transcription-only credential.
4. Main opens the provider WebSocket. The renderer starts desktop capture only after connection.
5. Web Audio mixes selected desktop audio and optional microphone, downsamples to mono 24 kHz
   PCM16, and sends chunks through typed IPC.
6. Main sends `input_audio_buffer.append`.
7. Transcript delta events update UI and remain grouped by `item_id`.
8. On hotkey release, the renderer stops media tracks before main sends
   `input_audio_buffer.commit`.
9. The finalized transcript event transitions to review or answer generation. Partial text is never
   sent to the answer model.

## Answer flow

1. Validate the finalized transcript DTO.
2. Load the selected context profile and glossary.
3. Preserve raw text and produce a separately normalized transcript.
4. Retrieve up to six knowledge snippets through `RetrievalProvider`.
5. Call the Responses API with `store: false` and a Zod-backed structured output.
6. Validate the response again and render it in the required layers.

## Smart meeting-notes flow

1. The user explicitly selects General Meeting or Daily / Team Status and starts a long-form
   capture from the Smart Meeting Notes mode.
2. The existing desktop-audio and optional microphone pipeline streams transcription deltas.
3. During a Daily, transcription deltas are assigned to `Pessoa 1` until the user explicitly
   advances to the next person. Capture continues without interruption.
4. On the second click, media tracks stop and the transcription buffer is committed.
5. Electron saves a transcript-first Markdown draft under `Documents/Meeting Copilot` as crash
   protection. This step does not write to the cloud and does not call the summary model.
6. Daily opens a review where participant names and transcript segments remain editable. General
   Meeting proceeds directly to the same post-meeting decision screen.
7. The user explicitly chooses one outcome: keep only the transcript, call
   `POST /api/meeting-summaries`, or delete everything through a confirmation dialog. Manual Daily
   speaker segments are treated as authoritative attribution evidence by the structured processor.
8. When cloud sync is enabled, a confirmed transcript is upserted by `clientMeetingId` through
   `POST /api/cloud-meetings`. A completed AI summary updates the same row instead of duplicating it.
9. Electron rewrites the same Markdown and JSON files with the validated result. If AI or cloud sync
   fails, the local transcript-first draft remains available for retry.
10. The cloud history lists lightweight metadata and downloads the full transcript/result only when
    the user restores a meeting on the current device.

## Retrieval abstraction

- `NullRetrievalProvider`: no-op and safe default.
- `OpenAIFileSearchProvider`: OpenAI vector store and `file_search`.
- `PgVectorRetrievalProvider`: delegates to a vector search repository.

The database has a 1536-dimensional vector column and HNSW cosine index. Embedding generation and
the document indexing worker remain explicit follow-up work.

## Backend modules

- `realtime-token`: short-lived transcription credentials.
- `answering`: context assembly and structured generation.
- `meeting-summary`: structured meeting notes and action extraction.
- `cloud-meetings`: PostgreSQL-backed transcript/result upsert, history, restore and deletion.
- `glossary`: deterministic normalization.
- `context-profiles`: PostgreSQL repository with an in-memory test fallback.
- `retrieval`: provider interface and implementations.
- `documents`: upload boundary; storage/indexing worker pending.
- `database`: users, settings, sessions, turns, transcripts, cloud meeting notes, answers, documents,
  chunks and audit.

## IPC surface

- Commands: capture start/stop/cancel, audio chunk, source list/select, settings get/update, answer
  and meeting-summary generation, local note save/read/update/delete/export, cloud meeting
  list/read/upsert/delete, token creation and overlay mode.
- Events: hotkey pressed/released, state changed, transcript delta/final and transcription error.

All channel names are centralized in `IPC_CHANNELS`.

## Privacy and retention

- No automatic capture at startup. Long-form recording only starts after an explicit user click.
- Audio storage disabled by default and absent from the active capture pipeline.
- Smart Meeting Notes stores Markdown text locally but never writes the captured audio to disk.
- Cloud meeting storage is disabled by default and persists transcript text plus an optional
  structured AI result only after explicit confirmation.
- The current hosted MVP scopes cloud records to `APP_USER_EMAIL` and protects desktop routes with
  the shared `DESKTOP_API_KEY`. Per-user authentication and tenant isolation are still required
  before a public multi-user launch.
- Transcript retention defaults to 30 days; audio retention defaults to zero.
- The schema supports expiration timestamps and audit events.
- Local and cloud deletion are available for the pending meeting. A scheduled retention worker,
  audited deletion and full account history management are still required before public release.
