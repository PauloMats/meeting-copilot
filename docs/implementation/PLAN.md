# Phase 1 implementation plan

## Goal

Make Meeting Copilot reliable enough for a controlled pilot by improving low-latency flow, question handling, state management, privacy guardrails, and measurable runtime behavior.

## Milestones

1. Baseline executable and validation evidence.
2. Turn telemetry with monotonic timings.
3. Explicit turn state machine.
4. Optional question detection modes: `push_to_talk`, `auto_detect`, `review_before_send`.
5. Question deduplication.
6. Recent context memory.
7. Speakable answer contract.
8. Low-latency answer strategy.
9. Concurrency and interruption rules.
10. Runtime persistence design and first wiring.
11. Retention and redaction rules.
12. User-facing error states.
13. Minimal overlay behavior.
14. Shortcut behavior.
15. Automated tests.
16. Observability without sensitive content.

## Implementation order

### Slice A — foundation

- Add implementation docs and baseline status.
- Add contract types for turn state, telemetry, answer payload, submission mode, question detection, and deduplication.
- Add tests for deterministic state/detection/dedup behavior.

### Slice B — desktop runtime

- Wire renderer to track a current turn ID and timing marks.
- Keep a small recent memory buffer for prior transcript/answer pairs.
- Use the new speakable answer contract in the UI.
- Add UI mode control for push-to-talk, auto-detect, and review-before-send.

### Slice C — backend answer path

- Update answer generation prompt and structured output to `sayThis`, `keyPoints`, `details`, and optional extras.
- Keep output short for basic mode and preserve model-level options.
- Avoid storing transcripts/audio unless retention settings explicitly require it in a later slice.

### Slice D — persistence and observability

- Persist runtime events and turn metadata without sensitive transcript text by default.
- Add retention/redaction workers after the metadata path is stable.
- Add desktop-level smoke tests once UI behavior is stable.

## Out of scope

- SaaS authentication, billing, and checkout.
- Full redesign.
- Large dependency upgrades.
- Full document indexing.
- Cross-platform loopback guarantees beyond Windows pilot behavior.
