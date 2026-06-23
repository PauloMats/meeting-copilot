import { UiohookKey, uIOhook, type UiohookKeyboardEvent } from "uiohook-napi";

const HOTKEY_CODES: Record<string, number> = {
  Space: UiohookKey.Space,
  F8: UiohookKey.F8,
  F9: UiohookKey.F9,
  F10: UiohookKey.F10
};

export class HotkeyService {
  private active = false;
  private keyCode: number = UiohookKey.Space;

  constructor(
    private readonly onPressed: () => void,
    private readonly onReleased: () => void
  ) {}

  start(hotkey: string): void {
    this.keyCode = HOTKEY_CODES[hotkey] ?? UiohookKey.Space;
    uIOhook.on("keydown", this.handleDown);
    uIOhook.on("keyup", this.handleUp);
    uIOhook.start();
  }

  stop(): void {
    uIOhook.off("keydown", this.handleDown);
    uIOhook.off("keyup", this.handleUp);
    uIOhook.stop();
  }

  private readonly handleDown = (event: UiohookKeyboardEvent): void => {
    if (event.keycode !== this.keyCode || this.active) return;
    this.active = true;
    this.onPressed();
  };

  private readonly handleUp = (event: UiohookKeyboardEvent): void => {
    if (event.keycode !== this.keyCode || !this.active) return;
    this.active = false;
    this.onReleased();
  };
}
