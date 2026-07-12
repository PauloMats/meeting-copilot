# UI/UX findings

## Product direction

The app is visually polished and relatively compact, but it still behaves like a two-panel dashboard. For live meetings, the ideal experience should prioritize operational states:

1. minimized indicator,
2. compact answer,
3. expanded diagnostics/settings only when needed.

## Current strengths

- Clear push-to-talk mental model.
- Status indicator is visible and text-based.
- Overlay exists and can be always-on-top.
- Review-before-send mode exists.
- Controls use native form elements and are easy to understand.
- UI states are simple, not overloaded with analytics.

## Current UX risks

| Finding | Impact during meeting | Recommendation |
| --- | --- | --- |
| No minimized mode | App occupies more attention than necessary | Add tiny always-on-top pill with status and hotkey. |
| Direct answer is not explicitly "phrase to say" | User may need to mentally rewrite answer | Add `say_this` field and display it first. |
| No copy/dismiss actions | Hard to manage answer during call | Add copy direct answer, dismiss current answer, expand detail. |
| Errors are generic | User cannot recover quickly | Map errors to actionable messages. |
| No question detected state | User cannot tell if app understood the question | Add "captured question" preview before answer. |
| No audio diagnostics | User may think app is listening while source is silent | Add source activity meter/indicator. |

## Recommended UI modes

### Minimized

- State dot + text.
- Hotkey.
- API/audio status.
- Click/shortcut to compact.

### Compact

- Last detected question.
- One sentence answer.
- Copy.
- Dismiss.
- Expand.
- Processing indicator.

### Expanded

- Transcript recent buffer.
- History of questions/answers.
- Settings.
- Diagnostics and privacy controls.

## Answer format recommendation

For live mode:

1. "Say this": one spoken sentence.
2. Three support bullets.
3. Optional detail/example collapsed.

Avoid long default open details in overlay.

## Accessibility priorities

1. Keyboard-only operation for all controls.
2. Focus management when toggling overlay.
3. Reduced motion media query.
4. Larger click targets in overlay.
5. Text labels for status beyond color.
6. Announce errors and answer-ready events accessibly.

