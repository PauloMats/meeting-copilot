import {
  AppSettingsSchema,
  DEFAULT_SETTINGS,
  type AppSettings,
  type AppWindowMode
} from "@meeting-copilot/contracts";
import Store from "electron-store";
import type { RectangleLike } from "../window-state.js";

interface SettingsStore {
  settings: AppSettings;
  windowBounds?: Partial<Record<Exclude<AppWindowMode, "hidden">, RectangleLike>>;
}

export class SettingsService {
  private readonly store = new Store<SettingsStore>({
    name: "settings",
    defaults: { settings: DEFAULT_SETTINGS },
    clearInvalidConfig: false
  });

  get(): AppSettings {
    const parsed = AppSettingsSchema.parse(this.store.get("settings"));
    if (!parsed.autoSubmit && parsed.submissionMode === "push_to_talk") {
      return { ...parsed, submissionMode: "review_before_send" };
    }
    return parsed;
  }

  update(patch: Partial<AppSettings>): AppSettings {
    const next = AppSettingsSchema.parse({ ...this.get(), ...patch });
    this.store.set("settings", next);
    return next;
  }

  getWindowBounds(mode: Exclude<AppWindowMode, "hidden">): RectangleLike | null {
    return this.store.get("windowBounds")?.[mode] ?? null;
  }

  setWindowBounds(mode: Exclude<AppWindowMode, "hidden">, bounds: RectangleLike): void {
    this.store.set("windowBounds", {
      ...this.store.get("windowBounds"),
      [mode]: bounds
    });
  }
}
