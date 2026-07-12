# Screen and surface inventory

## Desktop main window

| Surface | Purpose | Actions | Data | States | Issues |
| --- | --- | --- | --- | --- | --- |
| Topbar | Branding and status | none except status display | capture state | all capture states | Hero/header is less useful during live meeting than compact controls. |
| Control panel | Configure capture/session | source, language, hotkey, accuracy, intelligence, mic, review, overlay | settings | loaded from electron-store | No mic device selector; no offline/API status. |
| Settings details | Overlay visual settings | opacity, text theme, shadow | settings | expanded/collapsed | Good for tuning, but not a full settings screen. |
| Transcript panel | Live/final transcript | edit in review mode, Enter send, Escape cancel | transcript/error | empty, streaming, final, error | No item/turn history; no clear button outside cancel/review. |
| Answer panel | Answer display | details expand/collapse native | answer | empty/answer | No copy, dismiss, pin, or "say this" action. |
| Footer | Privacy/security hints | none | static copy | normal mode only | Useful but not interactive. |

## Overlay window

| Surface | Purpose | Actions | Data | States | Issues |
| --- | --- | --- | --- | --- | --- |
| Overlay status | Keep capture visible | exit overlay | state, hotkey | all states | No minimized micro-state; still uses transcript + answer panels. |
| Overlay transcript | Recent transcript | read/edit if review | transcript | empty/final/error | Can still occupy visual attention. |
| Overlay answer | Compact answer | details native | answer | empty/answer | No copy/dismiss; details may be too much during meeting. |

## Native menu

Menus expose File/Edit/Tools/View/Window/Help. Tools includes microphone, review, intelligence, language, hotkey. File includes overlay toggle. This is useful for Windows app conventions.

## Web landing page

Static Vite page for product marketing/download. It is not the operational meeting UI.

## Accessibility notes

- `StateIndicator` uses `aria-live="polite"`, positive.
- State dot uses color; label text also exists, positive.
- Many controls are native select/input, positive.
- No explicit focus management around overlay transitions.
- No reduced-motion handling for pulse/visual effects found.
- No screen-reader-specific labeling for audio source diagnostics.
- No keyboard shortcut discovery beyond hotkey display.

## Missing screens/states

- Dedicated settings screen.
- Microphone/audio diagnostics.
- History/session screen.
- Delete/clear data screen.
- Authentication/license screen.
- Offline mode/API unavailable.
- Rate limit state.
- Permission denied state.
- No-audio-detected state.
- Tray/minimized state.

