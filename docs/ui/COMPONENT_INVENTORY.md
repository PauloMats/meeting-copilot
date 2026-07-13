# Component and surface inventory

## Current surfaces before Phase 2

| Surface            | Purpose                           | Focus / topmost              | Data/actions                         | Baseline issue                          |
| ------------------ | --------------------------------- | ---------------------------- | ------------------------------------ | --------------------------------------- |
| Main BrowserWindow | Capture controls and current turn | normal focus, normal z-order | settings, transcript, answer         | two-panel dashboard; no navigation      |
| Boolean overlay    | Compact variant of main renderer  | always-on-top, no menu       | status, transcript, answer           | no explicit modes or bounds persistence |
| Settings details   | Overlay appearance                | inside main window           | opacity, text color/shadow           | incomplete settings surface             |
| Native menu        | Conventional app controls         | menu focus                   | mic, review, model, language, hotkey | no answer/window actions                |
| Source picker      | Desktop screen/window selection   | renderer control             | capturer source names                | no empty/error/refresh state            |
| Review textarea    | Edit final transcript             | local focus only             | submit/cancel                        | Enter behavior is implicit              |

No tray, separate diagnostics window, onboarding window, persisted history or context/glossary
editor exists. At 125–200% DPI the old 820 px main minimum and two-column grid can become cramped.
The old overlay always targets the primary display instead of the display nearest the current
window.

## Phase 2 component structure

```text
ApplicationShell
├─ MeetingView
├─ HistoryView (in-memory current session)
├─ ContextView (current selection/status)
├─ AudioView (source and safe diagnostics)
├─ SettingsView
└─ DiagnosticsView

OverlayShell
├─ OverlayStatus / CaptureIndicator
├─ QuestionPreview / ReviewSurface
├─ QuickAnswer / SayThis / KeyPoints
├─ PinnedAnswer
└─ ExpandableDetails
```

Shared primitives remain domain-oriented: `AsyncIconButton`, `StatusBadge`, `EmptyState`,
`ErrorState`, `InlineAlert`, `Section`, `SettingsRow` and `DiagnosticItem`.

Implemented in this slice: `OverlayShell`, `OverlayStatus`, `AsyncIconButton`, `QuickAnswer`,
`ReviewSurface` and `ErrorState`. `CaptureIndicator` is represented inside `OverlayStatus` to avoid
an abstraction with no independent behavior. Main-window empty, settings, shortcut and diagnostic
rows remain local components until reuse justifies extraction.
