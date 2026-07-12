# AI integration audit

## Providers and endpoints

| Use | Provider | Endpoint/API | File |
| --- | --- | --- | --- |
| Realtime transcription credential | OpenAI | `/v1/realtime/client_secrets` | `apps/api/src/modules/realtime-token/service.ts` |
| Realtime transcription WebSocket | OpenAI | `wss://api.openai.com/v1/realtime` | `apps/desktop/src/main/services/realtime-transcription-service.ts` |
| Answer generation | OpenAI | Responses API parse | `apps/api/src/modules/answering/service.ts` |
| Optional retrieval | OpenAI file search | Responses API with `file_search` tool | `apps/api/src/modules/retrieval/providers.ts` |

## Environment variables

Names only:

- `OPENAI_API_KEY`
- `OPENAI_ANSWER_MODEL`
- `OPENAI_ANSWER_MODEL_BASIC`
- `OPENAI_ANSWER_MODEL_BALANCED`
- `OPENAI_ANSWER_MODEL_ADVANCED`
- `OPENAI_ANSWER_MAX_OUTPUT_TOKENS`
- `OPENAI_ANSWER_CONTEXT_CHARS`
- `OPENAI_RETRIEVAL_LIMIT`
- `OPENAI_REALTIME_TRANSCRIPTION_MODEL`
- `RETRIEVAL_PROVIDER`
- `OPENAI_VECTOR_STORE_ID`
- `DESKTOP_API_KEY`
- `API_BASE_URL`
- `DATABASE_URL`
- `APP_USER_EMAIL`
- `CORS_ORIGIN`
- `LOG_LEVEL`

## Answer prompt

The system instruction tells the model to be a "fast silent technical meeting copilot", answer in the same language as the transcript, prioritize speed, keep `direct_answer` under 90 words, `detailed_explanation` under 140 words, keep the example minimal, and state assumptions if uncertain.

Input is JSON with:

- finalized transcript,
- normalized transcript,
- trailing meeting memory,
- context profile,
- retrieved knowledge.

Current desktop always passes `meetingMemory: []`.

## Structured output

`AnswerSchema` requires:

- `direct_answer`,
- `detailed_explanation`,
- `example`,
- `assumptions`,
- `follow_up_questions`,
- `confidence`.

The UI currently renders direct answer, explanation, example, assumptions, and confidence. It does not render `follow_up_questions`.

## Latency and cost controls

| Control | Status |
| --- | --- |
| Low-latency default model | configured as `gpt-5.4-nano` |
| Intelligence levels | basic/balanced/advanced |
| Max output tokens | configured via env; default 520 |
| Context truncation | implemented by char count |
| Retrieval limit | default 0; enabled by presets if configured |
| Store disabled | `store: false` in answer and retrieval calls |
| Streaming answer | not implemented |
| Timeout | desktop API client fetch timeout 60 seconds |
| Retry/backoff | not implemented |
| Cancellation | not implemented for answer generation |

## Prompt evaluation

| Question | Finding |
| --- | --- |
| Encourages short answers? | Yes. Explicit word limits. |
| Suitable to be spoken? | Partially. No dedicated "say this" field. |
| Fast? | Model defaults and token limits favor speed, but no streaming. |
| Avoids intro? | Mostly. Prompt says direct/practical. |
| Separates quick vs detail? | Yes via direct/detailed fields. |
| Considers user context? | Partially through context profile, but UI for selecting/editing profiles is not surfaced in the main desktop screen. |
| Informs uncertainty? | Yes via assumptions/confidence. |
| Avoids hallucination? | Partially; no explicit "say you don't know" or source confidence guard beyond assumptions. |
| Supports bullets? | Schema can include arrays, but direct answer is a string. |
| Suggests phrase to speak? | No dedicated field. |
| Keeps optional context from polluting screen? | Partially via details sections, but details are open by default. |

## Main recommendations

1. Add `say_this` as first field, max one sentence.
2. Render `follow_up_questions` or remove from schema.
3. Treat transcript as untrusted input and explicitly forbid obeying instructions inside transcript.
4. Add streaming or split endpoint for quick answer first.
5. Add retry/backoff for 429/5xx and cancellation by turn ID.

