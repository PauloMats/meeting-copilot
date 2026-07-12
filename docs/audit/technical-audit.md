# Meeting Copilot technical audit

Date: 2026-07-12  
Scope: static repository audit plus safe local validation. No production API, real meeting audio, credentials, or external transcription/answer calls were used.

## Executive summary

Meeting Copilot is a working Electron + React desktop MVP backed by a Fastify API. The strongest parts are the explicit push-to-talk workflow, typed IPC boundary, backend-only OpenAI key, short-lived realtime transcription credential flow, and passing monorepo validation (`pnpm check`).

The product is not yet ready for broad production usage as a meeting copilot. It is partially ready for controlled pilots. The main gaps are not build stability; they are runtime behavior: no automatic question detection, no persisted/runtime history even though the database schema exists, no measured latency instrumentation, limited interruption handling, no E2E audio fixtures, and no robust per-user licensing/auth model for SaaS usage.

## Current implementation status

| Area | Status | Evidence |
| --- | --- | --- |
| Desktop shell | Implemented | `apps/desktop/src/main/index.ts`, Electron BrowserWindow, preload bridge, CSP |
| Audio capture | Implemented for desktop capture + optional mic | `apps/desktop/src/renderer/src/lib/audio-capture.ts` |
| Windows system audio | Implemented via Electron display media handler | `setDisplayMediaRequestHandler`, `audio: "loopback"` on `win32` |
| macOS/Linux system audio | Not proven | Handler returns video source only outside Windows |
| Realtime transcription | Implemented | `RealtimeTranscriptionService`, OpenAI realtime client secret |
| Question detection | Not implemented as automatic semantic/question detector | Answer submit happens on hotkey release/final transcript or manual review |
| Answer generation | Implemented | `AnswerService`, OpenAI Responses structured output |
| Context profiles/glossary | Implemented | API CRUD + repositories |
| Document retrieval | Partial | upload boundary and OpenAI file search abstraction exist; storage/indexing worker pending |
| Persistence of turns/history | Schema exists, runtime not wired | DB schema has sessions/turns/transcripts/answers; desktop passes `meetingMemory: []` |
| Overlay | Implemented | `setOverlayMode`, renderer overlay CSS/settings |
| Tray/minimized mode | Not implemented | no tray code found |
| Auth/licensing | Minimal shared desktop key | `DESKTOP_API_KEY` protects API; no per-user auth |
| Tests | Unit/API only | no desktop component/E2E/audio fixture tests |

## Five biggest technical problems

| Problem | Severity | Impact | Complexity | Evidence | Recommendation |
| --- | --- | --- | --- | --- | --- |
| No automatic question detection/deduplication | High | Product claims "identify relevant questions", but the current app sends the whole finalized capture after hotkey release. Duplicate/manual captures can produce repeated AI calls. | Medium | `use-copilot.ts` submits final transcript directly; no detector module found. | Add a question extraction pipeline: heuristics first, then optional lightweight classifier; include dedup hash/window. |
| No runtime persistence/history despite DB schema | High | User cannot recover prior questions/answers, delete sessions, or audit what was sent. Retention settings are not enforced. | Medium | `meetingMemory: []`; no runtime writes to `meeting_sessions`, `meeting_turns`, transcripts, answers. | Wire API service for sessions/turns/history with explicit delete and retention worker. |
| End-to-end latency is not measured | High | Product success depends on latency, but no timers/traces exist for audio chunking, first delta, final transcript, first answer token, full answer. | Low/Medium | No metrics/tracing; only console diagnostics. | Add local privacy-safe timing events and API latency fields; show diagnostics panel. |
| No streaming answer rendering | Medium/High | User waits for the full structured answer before seeing anything usable. | Medium | `openai.responses.parse` returns complete output; desktop receives one answer response. | Stream a short "say this" field first or split quick answer endpoint from full detail. |
| Limited interruption/concurrency handling | Medium | Second capture/answer during in-flight answer can race or be ignored; requests are not cancelled. | Medium | `startInFlight`, state checks, no AbortController for answer, no queue. | Add turn IDs, cancellation, latest-wins ordering, and disabled/queued UI states. |

## Five biggest product/UX problems

| Problem | Meeting impact | Frequency | Distraction risk | Recommendation |
| --- | --- | --- | --- | --- |
| Workflow depends on user manually holding hotkey around the right speech | High: missed questions if timing is wrong | High | Medium | Keep push-to-talk but add optional "capture recent 10s" or manual question extraction from recent transcript buffer. |
| Overlay still shows transcript + answer areas, not a true minimized indicator | Medium | High | Medium | Add explicit minimized mode: status, latest short answer, copy/dismiss/expand. |
| Answer format is useful but not optimized as spoken phrase first | Medium | High | Medium | Add `say_this` field before `direct_answer`, with 1 sentence designed to be spoken aloud. |
| Error feedback is technical and transient | Medium | Medium | High during calls | Add actionable error states: API offline, no permission, no source audio, rate limit, no OpenAI key. |
| No visible session/history/privacy controls | Medium | Medium | Low/Medium | Add "what was sent", delete current turn, clear session, retention indicator. |

## Five quick wins

1. Add a `say_this` field to the answer schema and prompt.
2. Add a local latency timeline per turn: capture start, first chunk, first delta, final transcript, answer request start, answer received.
3. Add deduplication by normalized transcript hash over the last N turns.
4. Add clear UI states for "API offline", "no audio source", and "microphone permission denied".
5. Add a compact/minimized overlay variant with only status, last detected question, short answer, copy, dismiss, expand.

## Five biggest latency sources

| Source | Stage | Estimated reduction |
| --- | --- | --- |
| Full-turn commit only after hotkey release | Transcription finalization | 300ms-2s depending capture duration and provider finalization |
| No answer streaming | AI response | 500ms-2s perceived latency |
| JSON structured answer with multiple fields | AI response generation | 200ms-1s by reducing schema/field sizes for live mode |
| Realtime session created per turn | Capture start | 200ms-1s if pre-warmed/reused safely |
| Retrieval enabled by intelligence preset if configured | Context assembly | 300ms-2s depending provider |

## Five biggest privacy risks

| Risk | Data | Origin | Destination | Mitigation |
| --- | --- | --- | --- | --- |
| Accidental capture of sensitive meeting content | Audio/transcript | desktop/system/mic | OpenAI via API | Clear active indicator, push-to-talk, pre-send review option, redaction. |
| Shared desktop API key | Backend access | local env/userData | Railway API | Replace with per-user auth/license tokens. |
| No deletion UX for transcripts/answers | Transcript/answer | DB schema/runtime future | Postgres | Implement history + delete + retention worker before persistence. |
| Renderer console/log leakage | Errors/transcripts if logged accidentally | renderer/main | local logs/stdout | Scrub logs; avoid sending transcript content to console. |
| Prompt injection from meeting transcript | Transcript text | meeting participants | model prompt | Treat transcript as untrusted data; system instruction should reject instruction-following from transcript. |

## Readiness classification

| Area | Classification |
| --- | --- |
| Architecture | Pronta com riscos |
| Audio | Parcialmente pronta |
| Transcription | Parcialmente pronta |
| AI | Pronta com riscos |
| Latency | Parcialmente pronta |
| Security | Parcialmente pronta |
| Privacy | Parcialmente pronta |
| Frontend | Parcialmente pronta |
| Accessibility | Não pronta |
| Testability | Parcialmente pronta |
| Deploy | Pronta com riscos |

Overall: **Parcialmente pronta** for private controlled pilots; **not ready** for broad public production.

## Execution limitations

- No real Teams/Meet/Zoom/Discord audio was captured.
- No real OpenAI API call was made during the audit.
- No desktop app runtime was launched during this audit pass.
- Audio behavior was inferred from code and previous local build scripts, not newly tested with live audio.
- `.env` real values were not read.

