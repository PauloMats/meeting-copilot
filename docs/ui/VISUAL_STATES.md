# Visual states

Presentation state is derived from the domain `CaptureState` plus connection/error information.

| Domain state             | Visual state                           | Label intent                                 |
| ------------------------ | -------------------------------------- | -------------------------------------------- |
| `idle` with answer       | `answer_ready`                         | Response available; capture inactive         |
| `idle` without answer    | `idle`                                 | Ready for explicit capture                   |
| `listening`              | `listening`                            | Audio is actively being captured             |
| `transcribing`           | `transcribing`                         | Capture stopped; provider is finalizing text |
| `ready_to_send`          | `question_detected`                    | Review is required; nothing sent yet         |
| `thinking` / `answering` | `thinking`                             | Answer request is in progress                |
| `error`                  | typed `offline`, `no_audio` or `error` | Recovery guidance is shown                   |
| paused preference        | `paused`                               | Assisted capture is disabled                 |

No state depends only on color. Provider error text is classified into safe categories before it
is rendered.
