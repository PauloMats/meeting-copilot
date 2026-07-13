# Accessibility

- Native controls and semantic buttons are used for actions.
- Icon-only buttons have `aria-label`, `title` and visible focus states.
- Capture state is text plus color and uses a polite live region.
- Only answer-ready, review-ready, paused and error events are announced.
- Transcript deltas are not live-announced.
- Tab order follows visual order; temporary detail regions close with Escape.
- `prefers-reduced-motion` disables transitions and processing animation.
- System zoom remains enabled through Electron's View menu.
- High-contrast/forced-colors uses system colors where supported.
- Minimum interactive target is 36 px in compact surfaces and 40 px in the main window.

Manual Windows checks remain required with Narrator, 200% scaling, keyboard-only navigation and
high-contrast mode.
