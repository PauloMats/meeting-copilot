# Redesign readiness

## Overall classification

**Parcialmente pronta.**

The app should not receive a broad visual redesign before core meeting behavior is stabilized. The current UI can support pilot use, but the product workflow needs stronger runtime semantics: question detection, latency metrics, compact/minimized modes, actionable errors, and privacy controls.

## Readiness by area

| Area | Rating | Reason |
| --- | --- | --- |
| Architecture | Pronta com riscos | Good separation of desktop/API/contracts; runtime persistence and auth incomplete. |
| Audio | Parcialmente pronta | Windows loopback implemented; cross-platform audio and diagnostics incomplete. |
| Transcription | Parcialmente pronta | Realtime streaming exists; metrics/retry/item isolation incomplete. |
| IA | Pronta com riscos | Structured answers and model levels exist; no streaming/cancel/retry. |
| Latency | Parcialmente pronta | Low-latency choices exist; no measurement or SLO. |
| Security | Parcialmente pronta | Strong Electron boundary; shared API key not enough for SaaS. |
| Privacy | Parcialmente pronta | Audio not saved; deletion/retention/redaction missing. |
| Frontend | Parcialmente pronta | Functional and polished; not yet optimized for minimized live meeting usage. |
| Accessibility | Não pronta | Some basics exist; no systematic audit or reduced-motion/focus strategy. |
| Testability | Parcialmente pronta | Unit/API tests pass; no E2E/audio/provider fixtures. |
| Deploy | Pronta com riscos | Railway/Vercel config exists; SaaS entitlement not complete. |

## Stabilize before redesign

1. Define official platform support: Windows first, macOS/Linux later only if audio path is proven.
2. Define latency targets and add metrics.
3. Implement turn IDs and concurrency handling.
4. Add question extraction/dedup.
5. Add privacy/history/delete model.
6. Add actionable error taxonomy.
7. Add E2E test path with synthetic audio/provider mocks.

## Can improve immediately without redesign

1. Answer schema prompt: add spoken phrase first.
2. Add copy/dismiss buttons.
3. Add "API offline/no mic/no source audio" states.
4. Add simple dedup hash for repeated transcript.
5. Add basic latency logging visible only in diagnostics.

## Pending decisions

1. Which platforms are official?
2. Is captured audio system, microphone, or both by default?
3. Is transcription remote, local, or hybrid?
4. What is the target latency from question end to usable answer?
5. Are questions automatic, manual, or both?
6. Will the app have compact, expanded, and minimized modes?
7. Will history be persisted?
8. For how long?
9. What content may be sent to AI?
10. Can users choose context by project?
11. Should answers be spoken phrase, bullets, or both?
12. What is the cost model per hour/user?
13. Is offline mode required?
14. How is active capture communicated?
15. Which metrics define success?

