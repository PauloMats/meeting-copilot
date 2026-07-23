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
  persistence and overlay settings.
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
3. On the second click, media tracks stop and the transcription buffer is committed.
4. Electron saves a transcript-first Markdown draft under `Documents/Meeting Copilot`.
5. `POST /api/meeting-summaries` selects the matching structured processor. General Meeting
   extracts topics, decisions and action items. Daily produces person-by-person status using
   optional participant order and speaker hints as attribution evidence.
6. Electron rewrites the same Markdown file with the validated summary and full transcript. If the
   provider fails, the transcript-first draft remains available.
7. Meeting type and Daily attribution context are stored as Markdown metadata so retrying a saved
   transcript uses the original processor and inputs.

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
- `glossary`: deterministic normalization.
- `context-profiles`: PostgreSQL repository with an in-memory test fallback.
- `retrieval`: provider interface and implementations.
- `documents`: upload boundary; storage/indexing worker pending.
- `database`: users, settings, sessions, turns, transcripts, answers, documents, chunks and audit.

## IPC surface

- Commands: capture start/stop/cancel, audio chunk, source list/select, settings get/update, answer
  and meeting-summary generation, notes save/reveal, token creation and overlay mode.
- Events: hotkey pressed/released, state changed, transcript delta/final and transcription error.

All channel names are centralized in `IPC_CHANNELS`.

## Privacy and retention

- No automatic capture at startup. Long-form recording only starts after an explicit user click.
- Audio storage disabled by default and absent from the active capture pipeline.
- Smart Meeting Notes stores Markdown text locally but never writes the captured audio to disk.
- Transcript retention defaults to 30 days; audio retention defaults to zero.
- The schema supports expiration timestamps and audit events.
- A scheduled retention worker and user-facing deletion/history screens are required before a
  production release.
