# Model strategy

This strategy is based on the attached limits snapshot `openai_model_limits_organized.json` and
the product goal: low-latency answers for live technical meetings.

## Runtime defaults

```env
OPENAI_ANSWER_MODEL=gpt-5.4-nano
OPENAI_ANSWER_MODEL_BASIC=gpt-5.4-nano
OPENAI_ANSWER_MODEL_BALANCED=gpt-5.4-mini
OPENAI_ANSWER_MODEL_ADVANCED=gpt-5.4
OPENAI_ANSWER_MAX_OUTPUT_TOKENS=520
OPENAI_ANSWER_CONTEXT_CHARS=6000
OPENAI_RETRIEVAL_LIMIT=0
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-realtime-whisper
```

Rationale:

- `gpt-5.4-nano` is the production fast-answer default. It is intended for short, practical
  answers where latency and cost matter more than exhaustive reasoning.
- `gpt-5.4-mini` is the quality/cost fallback for answers that need a little more precision.
- `gpt-realtime-whisper` stays as the realtime transcription model because the desktop app uses
  Realtime transcription sessions and live deltas.
- Retrieval is disabled by default for speed. Enable it only when project-specific knowledge is
  worth the extra API latency.

## Desktop intelligence levels

The desktop app sends an `intelligenceLevel` with every answer request:

| Level | Default model | Behavior |
| --- | --- | --- |
| Basic | `gpt-5.4-nano` | Lowest latency/cost, shortest context, no retrieval unless globally enabled. Best for live meetings. |
| Balanced | `gpt-5.4-mini` | Better answer quality, more context, enables small retrieval when retrieval is configured. |
| Advanced | `gpt-5.4` | Highest quality preset, larger answer/context budget, medium reasoning effort. Use when speed is less important. |

The environment variables below can override the model behind each level without requiring a new
desktop build:

```env
OPENAI_ANSWER_MODEL_BASIC=gpt-5.4-nano
OPENAI_ANSWER_MODEL_BALANCED=gpt-5.4-mini
OPENAI_ANSWER_MODEL_ADVANCED=gpt-5.4
```

## Recommended overrides

For higher answer quality:

```env
OPENAI_ANSWER_MODEL=gpt-5.4-mini
OPENAI_ANSWER_MAX_OUTPUT_TOKENS=700
OPENAI_RETRIEVAL_LIMIT=3
```

For deeper reasoning:

```env
OPENAI_ANSWER_MODEL=gpt-5.4
OPENAI_ANSWER_MAX_OUTPUT_TOKENS=900
OPENAI_RETRIEVAL_LIMIT=3
```

For long documents:

```env
OPENAI_ANSWER_MODEL=gpt-5.5-long-context
OPENAI_ANSWER_CONTEXT_CHARS=20000
OPENAI_RETRIEVAL_LIMIT=6
```
