# Design principles

1. **Presence is earned.** Idle UI is a small state indicator; content grows only by explicit user action.
2. **Speakable first.** `sayThis` is primary, up to three support points are secondary, detail is collapsed.
3. **Capture is never hidden.** Listening and transcription use persistent text, shape and color indicators.
4. **No focus theft.** New transcript/answer data updates the current surface without showing, focusing or resizing it.
5. **Keyboard complete.** Every meeting action has a discoverable shortcut or reachable control.
6. **Honest progress.** The app never simulates provider streaming; it shows the actual domain state.
7. **Quiet motion.** Short functional transitions only, disabled by reduced-motion preference.
8. **Privacy in the surface.** Source, microphone inclusion and persistence defaults remain visible.

Dark is the primary meeting theme. Light and system themes use the same semantic tokens and state
contrast. State color is always paired with text and an accessible name.
