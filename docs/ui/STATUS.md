# Phase 2 UI status

## Branch

- Working branch: `phase-2-operational-overlay`
- Base: `phase-1-low-latency-pilot`
- Production branch: `main` (must not receive direct phase commits)

## Baseline — 2026-07-12

| Check                          | Result                                                  |
| ------------------------------ | ------------------------------------------------------- |
| `pnpm exec prettier --check .` | Failed on 16 pre-existing files                         |
| `pnpm lint`                    | Passed                                                  |
| `pnpm typecheck`               | Passed                                                  |
| `pnpm test`                    | Passed (10 contract and 11 API tests; no desktop tests) |
| `pnpm build`                   | Passed                                                  |

## Runtime evidence

The Windows app was not launched during baseline capture. Existing screenshots and the static code
inventory show the main window and boolean overlay, but they are not accepted as post-change
evidence. Native Windows evidence remains required for loopback capture, focus behavior, DPI and
multi-monitor acceptance.

## Phase 1 verification

Implemented: turn IDs, timing marks, local question heuristics, deduplication, recent in-memory
context and the `sayThis` answer contract. First-pass stale-response filtering exists. Still not
complete: request cancellation, runtime persistence, retention enforcement, typed user-facing
errors, streaming answers and desktop E2E/audio fixtures.

## Implementation status

| Area                   | Status                                               | Evidence                                                                 |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Typed visual state     | Implemented                                          | `packages/contracts/src/presentation.ts` and tests                       |
| Semantic tokens/themes | Implemented                                          | system, dark and light tokens in renderer CSS                            |
| Overlay modes          | Implemented                                          | hidden, minimized, compact and expanded                                  |
| Capture visibility     | Implemented                                          | listening is always text + dot + `REC`; active capture cannot be hidden  |
| Answer hierarchy       | Implemented                                          | `sayThis`, up to 3 support points, collapsed detail                      |
| Answer actions         | Implemented                                          | copy, pin/unpin, discard, expand and local cancellation                  |
| Review mode            | Implemented                                          | compact inline editor; no timeout/auto-send/focus request                |
| Bounds persistence     | Implemented                                          | per-mode bounds in `electron-store`                                      |
| Display recovery       | Implemented and unit tested                          | bounds clamp on display removal/metric change                            |
| Click-through          | Implemented                                          | opt-in and recoverable with `Ctrl+Shift+O`                               |
| Main navigation        | Implemented                                          | meeting, local history, context, audio, settings, diagnostics            |
| Error taxonomy         | First pass implemented                               | offline, timeout, rate limit, permission and no-audio guidance           |
| Audio diagnostics      | Partial                                              | missing-track detection and source retry; live RMS/device events pending |
| Progressive response   | Prepared, backend pending                            | honest thinking/full-answer states; no fake streaming                    |
| Persisted history      | Backend pending                                      | current session remains memory-only                                      |
| Configurable shortcuts | Partial                                              | push-to-talk configurable; operational combinations fixed and listed     |
| Accessibility          | Static implementation complete; manual audit pending | labels, focus, live regions, reduced motion, forced colors               |

## Validation after implementation — 2026-07-12

| Check              | Result                                          |
| ------------------ | ----------------------------------------------- |
| `pnpm lint`        | Passed                                          |
| `pnpm typecheck`   | Passed                                          |
| `pnpm test`        | Passed: 12 contract, 4 desktop and 11 API tests |
| `pnpm build`       | Passed                                          |
| `git diff --check` | Passed                                          |

Desktop development launch built main/preload/renderer successfully, then Electron itself failed to
start in WSL because `libnss3.so` is not installed. No code-level renderer crash was observed, but
this is not visual acceptance evidence.

## Evidence and limitations

- No post-change screenshots were produced because Electron could not launch in this WSL image.
- Native Windows validation remains mandatory for focus, loopback audio, 100/125/150/200% DPI,
  multiple monitors, click-through recovery and always-on-top behavior.
- E2E Electron tests are not present; pure tests cover presentation mapping, bounds recovery and
  safe error classification.
- Cancelling an answer invalidates the local turn and ignores a late result. The current IPC/API
  contract cannot abort the already running provider request.
- Russian, French, Spanish and Italian retain the existing core translations; some new diagnostics
  and secondary operational copy still use English fallback text.
- Streaming/fast-lane answer rendering, persisted sessions, deletion, redaction status and live
  audio levels depend on backend/audio milestones not implemented in this UI-focused phase.

## Security and privacy confirmation

- Overlay mode never starts capture; only the configured explicit capture hotkey does.
- No hidden capture path was added.
- Audio remains memory-only and is not written to disk.
- Safe diagnostic reports contain states, settings flags and timings, never transcript/answer text.
- The OpenAI key remains backend-only and is not added to contracts, preload or renderer.
