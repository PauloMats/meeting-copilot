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
    return AppSettingsSchema.parse(this.store.get("settings"));
  }

  update(patch: Partial<AppSettings>): AppSettings {
    const next = AppSettingsSchema.parse({ ...this.get(), ...patch });
    this.store.set("settings", next);
    return next;
  }
}
