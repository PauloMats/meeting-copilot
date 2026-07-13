# Phase 2 UI plan

## Goal

Make the desktop app nearly invisible while idle and immediately useful when a question or answer
needs attention. The overlay is an operational surface, not a copy of the main window.

## Baseline

- One `BrowserWindow` is used for both the application and overlay.
- Overlay is a boolean setting and a compact CSS variant of the same two-panel layout.
- Position and size are not persisted per mode.
- No minimized or expanded overlay modes exist.
- Answers cannot be copied, pinned, discarded, or cancelled from the UI.
- Review uses the transcript textarea and does not steal focus.
- State labels exist, but audio/API errors are raw strings.
- No desktop component/E2E tests exist.

## Milestones

1. Inventory, baseline, design principles, visual states, accessibility and shortcut contracts.
2. Typed presentation model derived from `CaptureState`.
3. Semantic design tokens and system/light/dark themes.
4. Hidden, minimized, compact and expanded overlay modes.
5. Quick-answer actions, pinned answers and non-modal review.
6. Electron bounds persistence, display recovery, always-on-top and reversible click-through.
7. Compact main-window navigation and honest empty/diagnostic states.
8. Pure unit tests, validation and Windows manual-test checklist.

## Acceptance gates

- Capture state remains visible in every rendered overlay mode.
- Answer arrival never calls `focus()` or changes overlay mode automatically.
- `sayThis` is the dominant content in compact mode.
- Position is clamped to a current display work area after a monitor change.
- Hidden/click-through overlay always has a global recovery shortcut.
- No raw provider error or transcript appears in technical diagnostics.
- Lint, typecheck, tests and build pass.

## Explicit dependencies

- Real progressive answers require backend streaming or a fast-lane endpoint; timers will not fake it.
- Persisted history and deletion require the Phase 1 runtime persistence milestone.
- Real audio levels/device diagnostics require audio-pipeline instrumentation.
- Windows loopback, DPI, focus and multi-monitor behavior require a native Windows test.
