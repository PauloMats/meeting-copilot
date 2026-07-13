# Latency budget

## Target

For a short technical question in Portuguese or English:

- Audio capture start: under 300 ms.
- First transcription progress: under 1.5 s after speech starts.
- Final transcript after key release: under 2.0 s.
- First useful answer: under 4.0 s after final transcript.
- Complete basic answer: under 6.0 s after final transcript.

## Budget by stage

| Stage                      |       Target | Notes                                                      |
| -------------------------- | -----------: | ---------------------------------------------------------- |
| Hotkey to capture active   |       300 ms | Includes Electron IPC and media stream start.              |
| Audio chunking             | 100 ms/chunk | Current worklet chunk size is already around this target.  |
| Transcription finalization |     2,000 ms | Provider-dependent; keep delay at `minimal` for fast mode. |
| Question detection/dedup   |        20 ms | Must be local and deterministic.                           |
| Backend request overhead   |       500 ms | API should be warm in production.                          |
| Answer model               |     3,500 ms | Basic mode must use short output and minimal reasoning.    |
| UI render/update           |       100 ms | Avoid heavy layout and large answer blocks in overlay.     |

## Measurement rules

- Use monotonic browser time (`performance.now`) in the renderer.
- Do not log transcript or answer content.
- Use per-turn marks: capture start, first audio chunk, first transcript delta, transcript final, answer requested, answer received, error/cancel.
