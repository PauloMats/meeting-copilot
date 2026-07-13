# Turn state machine

## States

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> listening: start_capture
  listening --> transcribing: stop_capture
  transcribing --> ready_to_send: final_transcript_manual_review
  transcribing --> thinking: final_transcript_auto_submit
  ready_to_send --> thinking: submit
  ready_to_send --> idle: cancel
  thinking --> answering: answer_started
  thinking --> idle: answer_received
  answering --> idle: answer_received
  listening --> idle: cancel
  transcribing --> idle: cancel
  listening --> error: capture_error
  transcribing --> error: transcription_error
  thinking --> error: answer_error
  error --> idle: reset
```

## Rules

- A turn has one `turnId`.
- A stale answer response must be ignored if it does not match the active or latest submitted turn.
- Cancel stops local capture and provider transcription.
- Review mode pauses at `ready_to_send`.
- Auto-detect can propose a candidate question but must respect deduplication before submitting.
