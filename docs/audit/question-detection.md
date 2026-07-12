# Question detection audit

## Current behavior

There is no automatic question detector in the current runtime. The system decides to ask the AI based on user capture flow:

1. User holds the hotkey.
2. Audio is transcribed.
3. On hotkey release, the input buffer is committed.
4. On final transcript, if `autoSubmit` is true, the full final transcript is sent to `/api/answers`.
5. If `autoSubmit` is false, the user can edit/review and press Enter/send.

Evidence:

- `apps/desktop/src/renderer/src/hooks/use-copilot.ts` calls `submit(finalTranscript)` on `onTranscriptFinal` when `settings.autoSubmit`.
- No regex/classifier/question module was found.
- Search found "question" only in placeholder copy.

## Mechanisms present

| Mechanism | Present? | Notes |
| --- | --- | --- |
| Punctuation `?` | No | Not used for routing. |
| Interrogative words | No | No heuristic module found. |
| Regex | No | No detector module found. |
| Classifier/model | No | No lightweight classifier or AI detector. |
| Silence | No | Provider turn detection disabled; no local VAD. |
| Hotkey manual | Yes | Primary mechanism. |
| Button/manual review | Yes | Review mode allows manual send. |
| Semantic detection | No | Not implemented. |
| Deduplication | No | No hash/window found. |

## Conceptual scenario results

| Scenario | Current expected behavior | Risk |
| --- | --- | --- |
| "Você sabe como isso funciona?" | Sent only if captured and auto-submit/review send occurs | Works manually, not automatic. |
| "Qual seria a melhor abordagem?" | Same | Works if user captures entire question. |
| "Eu não sei se devemos fazer assim." | Sent if captured despite not being a question | False positive in auto-submit. |
| "Alguém tem alguma dúvida?" | Sent if captured | Likely irrelevant false positive. |
| User asks their own question | Sent if mic included and captured | No speaker separation. |
| Another person asks question | Sent if system audio captured | Works manually on Windows. |
| Rhetorical question | Sent if captured | No semantic filtering. |
| Incomplete question | Sent if hotkey release/commit occurs early | Low-quality answer risk. |
| Multiple questions | Sent as one transcript | Answer may address only part. |
| Question followed by extra context | Sent if captured | Good if full context captured; no segmentation. |
| Technical question with code/acronyms | Sent; glossary may normalize known terms | No code-specific transcript correction. |
| Mixed PT/EN | Sent; prompt asks same language as transcript | Could mix languages; no explicit multilingual handling beyond provider language. |

## Product implication

The current product is better described as **push-to-talk transcription + answer generation**, not yet as automatic question detection. This is acceptable for a controlled MVP if expectations are explicit.

## Recommended detector roadmap

1. **MVP detector:** heuristic extraction from final transcript using punctuation + interrogative phrases in PT/EN.
2. **Dedup:** normalized transcript hash and Levenshtein/embedding similarity window over last 5-10 turns.
3. **Context window:** capture final question plus previous 1-2 utterances.
4. **User control:** allow "manual only", "suggest questions", and "auto-answer".
5. **Classifier:** optional low-latency model/classifier only after enough real examples.

