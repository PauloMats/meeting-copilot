# Overlay behavior

## Modes

| Mode      | Purpose                            | Default size | Content                                                            |
| --------- | ---------------------------------- | -----------: | ------------------------------------------------------------------ |
| Hidden    | User explicitly hides idle overlay |         none | Recovery shortcut remains registered                               |
| Minimized | Persistent capture/status pill     |     280 x 72 | state, capture indicator, expand action                            |
| Compact   | Primary meeting surface            |    500 x 380 | state, question preview, `sayThis`, up to 3 points, actions        |
| Expanded  | Deliberate inspection              |    680 x 680 | transcript, details, example, assumptions, follow-ups, diagnostics |

The mode never changes automatically when an answer arrives. Hidden mode is rejected while capture
is active; minimized remains the smallest legal active-capture surface.

## Window rules

- Overlay uses `showInactive()` when recovered and never calls `focus()` for provider events.
- Bounds are persisted per overlay mode after movement/resizing.
- Restored bounds are clamped to the nearest current display work area.
- Always-on-top is configurable and defaults on for overlay modes.
- Click-through is optional, defaults off and is reversible with `Ctrl+Shift+O`.
- The overlay is omitted from the taskbar; the main window remains in it.
- Drag regions exclude buttons, inputs, selectable answer text and scrollable content.

## Progressive answer

The current backend returns a complete structured answer. The UI shows honest `thinking` and
`answer_ready` states and is structured to accept partial fields later. No timer-based fake stream
is used.

Cancellation is latest-wins at the renderer boundary: the cancelled turn is invalidated and any
late response is ignored. Aborting the provider request itself requires a future cancellable
IPC/API contract.
