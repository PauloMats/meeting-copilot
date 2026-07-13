import { AppSettingsSchema, DEFAULT_SETTINGS, type AppSettings } from "@meeting-copilot/contracts";
import Store from "electron-store";

interface SettingsStore {
  settings: AppSettings;
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
}
