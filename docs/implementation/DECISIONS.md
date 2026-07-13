# Phase 1 decisions

## D1 — Branching

`main` is production. Phase 1 work happens on `phase-1-low-latency-pilot`, based on `dev`.

## D2 — Default interaction mode

Default remains `push_to_talk`. Automatic question detection is optional because false positives are worse than one extra key press during a pilot.

## D3 — Answer shape

The application uses a speakable answer contract:

```ts
type MeetingAnswer = {
  sayThis: string;
  keyPoints: string[];
  details?: string;
  example?: string;
  assumptions?: string[];
  confidence?: "low" | "medium" | "high";
  followUps?: string[];
};
```

This prioritizes an immediate phrase the user can say out loud, with details kept secondary.

## D4 — Telemetry content

Telemetry stores timings, state transitions, turn IDs, model names, and coarse sizes. It must not store raw audio, transcript text, answer text, API keys, or PII by default.

## D5 — Concurrency

Only one active capture turn is allowed. If answer generation is in progress and a new capture starts, the UI should prefer the newest turn and ignore stale responses.

## D6 — Persistence scope

Runtime persistence starts with safe metadata. Transcript and audio persistence require explicit user settings and retention enforcement.

## D7 — Overlay scope

Overlay is a compact operational view, not a duplicate of the dashboard. It should show only status, transcript, and answer.
