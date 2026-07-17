# MVP delivery checklist

## Implemented

- [x] Electron secure shell and typed preload bridge
- [x] React main window and layered answer card
- [x] Global hold/release hotkey
- [x] Desktop source selection
- [x] Optional microphone mixing
- [x] PCM16 mono 24 kHz conversion
- [x] Realtime transcription token endpoint
- [x] Manual append/commit flow and `item_id` tracking
- [x] Auto-submit and review-before-submit modes
- [x] Structured answer schema and Responses API integration
- [x] Glossary normalization preserving raw text
- [x] Context profile and glossary CRUD
- [x] PostgreSQL/pgvector schema and migration
- [x] OpenAI file search and pgvector provider abstractions
- [x] Audio persistence disabled by default
- [x] Overlay/always-on-top mode
- [x] Mode picker for Meeting Copilot and Smart Meeting Notes
- [x] Click-to-start/click-to-finish long-form transcription
- [x] Structured meeting summary, decisions and action-item extraction
- [x] Transcript-first local Markdown persistence
- [x] Unit/API tests and CI workflow

## Required before public production release

- [ ] Exercise end-to-end transcription with a funded OpenAI project and real meeting apps
- [ ] Sign and package native Windows and macOS builds
- [ ] Add macOS Screen Recording and microphone permission onboarding
- [ ] Add Windows audio-device failure diagnostics
- [ ] Implement authentication/session management for multi-device use
- [ ] Finish document object storage, extraction, chunking, embeddings and indexing worker
- [ ] Implement pgvector embedding query repository
- [ ] Stream structured answer fields progressively to the renderer
- [ ] Add transcript/session history and delete actions
- [ ] Add scheduled retention enforcement and audited deletion
- [ ] Persist meeting turns, normalized transcripts and answers through runtime services
- [ ] Add reconnect/backoff, offline state and provider circuit breaking
- [ ] Add OpenTelemetry metrics/traces and crash reporting with privacy scrubbing
- [ ] Add Playwright/Electron end-to-end tests and audio fixtures
- [ ] Threat-model review, dependency audit and external security review
