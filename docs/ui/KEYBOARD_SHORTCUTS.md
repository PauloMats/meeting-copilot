# Keyboard shortcuts

## Defaults

| Action                          | Scope  | Default                                 |
| ------------------------------- | ------ | --------------------------------------- |
| Push-to-talk                    | Global | configured `Space`, `F8`, `F9` or `F10` |
| Show/recover overlay            | Global | `Ctrl+Shift+O`                          |
| Toggle compact/expanded         | Global | `Ctrl+Shift+E`                          |
| Pause/resume assisted listening | Global | `Ctrl+Shift+P`                          |
| Submit reviewed question        | Local  | `Ctrl+Enter` or `Enter` in review field |
| Copy `sayThis`                  | Local  | `Ctrl+Shift+C`                          |
| Pin/unpin answer                | Local  | `Ctrl+Shift+K`                          |
| Discard current answer/question | Local  | `Escape`                                |
| Cancel generation/capture       | Local  | `Escape`                                |

Global shortcuts are limited to operational recovery/toggle actions. The app does not register or
log arbitrary keystrokes. Push-to-talk is the only deliberate single-key global action.

Known-conflict and invalid-combination validation is implemented for configurable push-to-talk
presets; a free-form global shortcut recorder is deferred until native conflict reporting is
reliable on Windows.
