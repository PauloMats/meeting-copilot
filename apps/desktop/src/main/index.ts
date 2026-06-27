import {
  IPC_CHANNELS,
  AnswerRequestSchema,
  type AppSettings,
  type CaptureState,
  type DesktopSource,
  RealtimeTokenRequestSchema
} from "@meeting-copilot/contracts";
import { config as loadEnvironment } from "dotenv";
import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  Menu,
  screen,
  session,
  type DesktopCapturerSource
} from "electron";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ApiClient } from "./services/api-client.js";
import { HotkeyService } from "./services/hotkey-service.js";
import { RealtimeTranscriptionService } from "./services/realtime-transcription-service.js";
import { SettingsService } from "./services/settings-service.js";

let mainWindow: BrowserWindow | null = null;
let selectedDesktopSourceId: string | null = null;
let normalWindowBounds: Electron.Rectangle | null = null;
let currentSettingsService: SettingsService | null = null;
let currentHotkeyService: HotkeyService | null = null;

function send(channel: string, payload?: unknown): void {
  const window = mainWindow;
  if (window && !window.isDestroyed()) window.webContents.send(channel, payload);
}

function isMac(): boolean {
  return process.platform === "darwin";
}

function applySettingsPatch(patch: Partial<AppSettings>): AppSettings | null {
  const settingsService = currentSettingsService;
  if (!settingsService) return null;

  const previous = settingsService.get();
  const next = settingsService.update(patch);
  if (next.hotkey !== previous.hotkey && currentHotkeyService) {
    currentHotkeyService.stop();
    currentHotkeyService.start(next.hotkey);
  }
  if (patch.overlayEnabled !== undefined) setOverlayMode(next.overlayEnabled);
  buildApplicationMenu(next);
  send(IPC_CHANNELS.settingsChanged, next);
  return next;
}

function loadDesktopEnvironment(): void {
  const candidates = [
    process.env.MEETING_COPILOT_ENV_FILE,
    resolve(dirname(app.getPath("exe")), ".env"),
    resolve(app.getPath("userData"), ".env"),
    process.resourcesPath ? resolve(process.resourcesPath, ".env") : undefined,
    resolve(import.meta.dirname, "../../../../.env")
  ].filter((path): path is string => Boolean(path));

  const envFile = candidates.find((path) => existsSync(path));
  if (envFile) loadEnvironment({ path: envFile });
}

async function sources(): Promise<DesktopCapturerSource[]> {
  return desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true
  });
}

function registerIpc(
  settingsService: SettingsService,
  transcription: RealtimeTranscriptionService,
  hotkey: HotkeyService,
  apiClient: ApiClient
): void {
  ipcMain.handle(IPC_CHANNELS.captureStart, () => transcription.start(settingsService.get()));
  ipcMain.handle(IPC_CHANNELS.captureStop, () => transcription.commit());
  ipcMain.handle(IPC_CHANNELS.captureCancel, () => transcription.cancel());
  ipcMain.on(IPC_CHANNELS.audioChunk, (_event, chunk: ArrayBuffer) => transcription.append(chunk));
  ipcMain.handle(
    IPC_CHANNELS.listDesktopSources,
    async (): Promise<DesktopSource[]> =>
      (await sources()).map((source) => ({
        id: source.id,
        name: source.name,
        thumbnailDataUrl: source.thumbnail.toDataURL()
      }))
  );
  ipcMain.handle(IPC_CHANNELS.selectDesktopSource, (_event, id: string) => {
    selectedDesktopSourceId = id;
  });
  ipcMain.handle(IPC_CHANNELS.settingsGet, () => settingsService.get());
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_event, patch: Partial<AppSettings>) => {
    const next = applySettingsPatch(patch);
    if (!next) throw new Error("Settings service is not available");
    return next;
  });
  ipcMain.handle(IPC_CHANNELS.realtimeToken, (_event, request: unknown) =>
    apiClient.createRealtimeToken(RealtimeTokenRequestSchema.parse(request))
  );
  ipcMain.handle(IPC_CHANNELS.answerGenerate, (_event, request: unknown) =>
    apiClient.generateAnswer(AnswerRequestSchema.parse(request))
  );
  ipcMain.handle(IPC_CHANNELS.overlaySet, (_event, enabled: boolean) => {
    setOverlayMode(enabled);
  });
}

function buildApplicationMenu(settings: AppSettings): void {
  const languageOptions: Array<{ label: string; language: string }> = [
    { label: "Português (Brasil)", language: "pt" },
    { label: "English", language: "en" },
    { label: "Español", language: "es" },
    { label: "Русский", language: "ru" },
    { label: "Français", language: "fr" },
    { label: "Italiano", language: "it" }
  ];
  const intelligenceOptions: Array<{ label: string; value: AppSettings["intelligenceLevel"] }> = [
    { label: "Basic - fastest / cheapest", value: "basic" },
    { label: "Balanced - better answers", value: "balanced" },
    { label: "Advanced - highest quality", value: "advanced" }
  ];
  const hotkeys = ["Space", "F8", "F9", "F10"];
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac()
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "quit" as const }
            ]
          }
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Toggle Overlay",
          accelerator: "CommandOrControl+Shift+O",
          type: "checkbox",
          checked: settings.overlayEnabled,
          click: () => {
            applySettingsPatch({ overlayEnabled: !settings.overlayEnabled });
          }
        },
        { type: "separator" },
        isMac() ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "Tools",
      submenu: [
        {
          label: "Include microphone",
          type: "checkbox",
          checked: settings.includeMicrophone,
          click: () => {
            applySettingsPatch({ includeMicrophone: !settings.includeMicrophone });
          }
        },
        {
          label: "Review before sending",
          type: "checkbox",
          checked: !settings.autoSubmit,
          click: () => {
            applySettingsPatch({ autoSubmit: !settings.autoSubmit });
          }
        },
        { type: "separator" },
        {
          label: "Intelligence",
          submenu: intelligenceOptions.map(({ label, value }) => ({
            label,
            type: "radio" as const,
            checked: settings.intelligenceLevel === value,
            click: () => {
              applySettingsPatch({ intelligenceLevel: value });
            }
          }))
        },
        {
          label: "Language",
          submenu: languageOptions.map(({ label, language }) => ({
            label,
            type: "radio" as const,
            checked: settings.language === language,
            click: () => {
              applySettingsPatch({ language });
            }
          }))
        },
        {
          label: "Hotkey",
          submenu: hotkeys.map((hotkey) => ({
            label: hotkey,
            type: "radio" as const,
            checked: settings.hotkey === hotkey,
            click: () => {
              applySettingsPatch({ hotkey });
            }
          }))
        }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Health check",
          click: () => {
            mainWindow?.webContents.send(
              IPC_CHANNELS.transcriptionError,
              "Check /api/health in the backend logs."
            );
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setOverlayMode(enabled: boolean): void {
  const window = mainWindow;
  if (!window || window.isDestroyed()) return;

  if (enabled) {
    normalWindowBounds = window.getBounds();
    const { workArea } = screen.getPrimaryDisplay();
    const width = Math.min(620, workArea.width - 48);
    const height = Math.min(430, workArea.height - 48);
    window.setBounds({
      width,
      height,
      x: workArea.x + workArea.width - width - 24,
      y: workArea.y + 24
    });
    window.setAlwaysOnTop(true, "screen-saver");
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setSkipTaskbar(true);
    window.setResizable(true);
    window.setMenuBarVisibility(false);
    window.setAutoHideMenuBar(true);
    window.setOpacity(1);
    window.setBackgroundColor("#00000000");
    return;
  }

  window.setAlwaysOnTop(false);
  window.setVisibleOnAllWorkspaces(false);
  window.setSkipTaskbar(false);
  window.setMenuBarVisibility(true);
  window.setAutoHideMenuBar(false);
  window.setOpacity(1);
  window.setBackgroundColor("#090d14");
  if (normalWindowBounds) window.setBounds(normalWindowBounds);
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 820,
    minHeight: 600,
    show: true,
    transparent: true,
    backgroundColor: "#00000000",
    title: "Meeting Copilot",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("console-message", (_event, level, message) => {
    const writer = level >= 2 ? console.error : console.log;
    writer("Renderer console", message);
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("Preload failed", { preloadPath, error });
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("Renderer process exited", details);
  });
  mainWindow.webContents.on("did-finish-load", () => {
    void mainWindow?.webContents
      .executeJavaScript(
        `({
          hasCopilotApi: typeof window.copilot === "object",
          rootChildren: document.querySelector("#root")?.childElementCount ?? -1
        })`
      )
      .then((diagnostics) => console.log("Renderer loaded", diagnostics))
      .catch((error: unknown) => console.error("Renderer diagnostics failed", error));
  });
  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedUrl) => {
      console.error("Renderer failed to load", { errorCode, errorDescription, validatedUrl });
    }
  );

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

async function bootstrap(): Promise<void> {
  loadDesktopEnvironment();

  const settingsService = new SettingsService();
  currentSettingsService = settingsService;
  const apiClient = new ApiClient(
    process.env.API_BASE_URL ?? "http://127.0.0.1:3333",
    process.env.DESKTOP_API_KEY
  );
  const transcription = new RealtimeTranscriptionService(apiClient, {
    state: (state: CaptureState) => send(IPC_CHANNELS.stateChanged, state),
    delta: (event) => send(IPC_CHANNELS.transcriptDelta, event),
    final: (event) => send(IPC_CHANNELS.transcriptFinal, event),
    error: (message) => send(IPC_CHANNELS.transcriptionError, message)
  });
  const hotkey = new HotkeyService(
    () => send(IPC_CHANNELS.hotkeyPressed),
    () => send(IPC_CHANNELS.hotkeyReleased)
  );
  currentHotkeyService = hotkey;

  registerIpc(settingsService, transcription, hotkey, apiClient);
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    void sources()
      .then((available) => {
        const source =
          available.find((candidate) => candidate.id === selectedDesktopSourceId) ?? available[0];
        if (!source) {
          callback({});
          return;
        }
        callback(
          process.platform === "win32" ? { video: source, audio: "loopback" } : { video: source }
        );
      })
      .catch(() => callback({}));
  });
  await createWindow();
  const initialSettings = settingsService.get();
  buildApplicationMenu(initialSettings);
  setOverlayMode(initialSettings.overlayEnabled);
  hotkey.start(initialSettings.hotkey);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
  app.on("before-quit", () => hotkey.stop());
}

void app.whenReady().then(bootstrap).catch(console.error);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
