import {
  IPC_CHANNELS,
  AnswerRequestSchema,
  type AppWindowMode,
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
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
  session,
  shell,
  type DesktopCapturerSource
} from "electron";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ApiClient } from "./services/api-client.js";
import { HotkeyService } from "./services/hotkey-service.js";
import { RealtimeTranscriptionService } from "./services/realtime-transcription-service.js";
import { SettingsService } from "./services/settings-service.js";
import { SessionStore } from "./services/session-store.js";
import { clampBoundsToWorkArea, defaultBoundsForMode } from "./window-state.js";

let mainWindow: BrowserWindow | null = null;
let selectedDesktopSourceId: string | null = null;
let currentSettingsService: SettingsService | null = null;
let currentHotkeyService: HotkeyService | null = null;
let currentWindowMode: AppWindowMode = "main";
let currentCaptureState: CaptureState = "idle";
let currentApiClient: ApiClient | null = null;
let applyingWindowBounds = false;
let persistBoundsTimer: ReturnType<typeof setTimeout> | null = null;

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
  if (
    patch.overlayEnabled !== undefined ||
    patch.overlayMode !== undefined ||
    patch.overlayAlwaysOnTop !== undefined ||
    patch.overlayClickThrough !== undefined
  ) {
    applyWindowMode(next.overlayEnabled ? next.overlayMode : "main", next);
  }
  buildApplicationMenu(next);
  send(IPC_CHANNELS.settingsChanged, next);
  return next;
}

function requestWindowMode(mode: AppWindowMode): AppSettings | null {
  if (
    mode === "hidden" &&
    (currentCaptureState === "listening" || currentCaptureState === "transcribing")
  ) {
    mode = "minimized";
  }
  return mode === "main"
    ? applySettingsPatch({ overlayEnabled: false, overlayClickThrough: false })
    : applySettingsPatch({ overlayEnabled: true, overlayMode: mode });
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
  ipcMain.handle(IPC_CHANNELS.overlaySet, (_event, mode: AppWindowMode) => {
    requestWindowMode(mode);
  });
  ipcMain.handle(IPC_CHANNELS.overlayClickThroughSet, (_event, enabled: boolean) => {
    applySettingsPatch({ overlayClickThrough: enabled });
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
          label: "Show overlay (Ctrl+Shift+O)",
          type: "checkbox",
          checked: settings.overlayEnabled,
          click: () => {
            requestWindowMode(settings.overlayEnabled ? "main" : settings.overlayMode);
          }
        },
        {
          label: "Overlay size",
          submenu: (["minimized", "compact", "expanded"] as const).map((mode) => ({
            label: mode.charAt(0).toUpperCase() + mode.slice(1),
            type: "radio" as const,
            checked: settings.overlayEnabled && settings.overlayMode === mode,
            click: () => requestWindowMode(mode)
          }))
        },
        {
          label: "Always on top",
          type: "checkbox",
          checked: settings.overlayAlwaysOnTop,
          click: () => applySettingsPatch({ overlayAlwaysOnTop: !settings.overlayAlwaysOnTop })
        },
        {
          label: "Click-through",
          type: "checkbox",
          checked: settings.overlayClickThrough,
          enabled: settings.overlayEnabled,
          click: () => applySettingsPatch({ overlayClickThrough: !settings.overlayClickThrough })
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
          label: currentApiClient?.isAuthenticated() ? "Account connected" : "Connect account",
          enabled: !currentApiClient?.isAuthenticated(),
          click: () => void connectAccount()
        },
        { type: "separator" },
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
          checked: settings.submissionMode === "review_before_send" || !settings.autoSubmit,
          click: () => {
            const reviewEnabled =
              settings.submissionMode === "review_before_send" || !settings.autoSubmit;
            applySettingsPatch({
              autoSubmit: reviewEnabled,
              submissionMode: reviewEnabled ? "push_to_talk" : "review_before_send"
            });
          }
        },
        { type: "separator" },
        {
          label: "Submission mode",
          submenu: [
            { label: "Hold and send", value: "push_to_talk" },
            { label: "Detect question", value: "auto_detect" },
            { label: "Review first", value: "review_before_send" }
          ].map(({ label, value }) => ({
            label,
            type: "radio" as const,
            checked: settings.submissionMode === value,
            click: () => {
              applySettingsPatch({
                submissionMode: value as typeof settings.submissionMode,
                autoSubmit: value !== "review_before_send"
              });
            }
          }))
        },
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

function applyWindowMode(mode: AppWindowMode, settings: AppSettings): void {
  const window = mainWindow;
  if (!window || window.isDestroyed()) return;
  currentWindowMode = mode;

  if (mode === "hidden") {
    window.setIgnoreMouseEvents(false);
    window.hide();
    return;
  }

  const overlay = mode !== "main";
  const display = screen.getDisplayMatching(window.getBounds());
  const saved = currentSettingsService?.getWindowBounds(mode);
  const bounds = clampBoundsToWorkArea(
    saved ?? defaultBoundsForMode(mode, display.workArea),
    display.workArea
  );
  applyingWindowBounds = true;
  window.setMinimumSize(
    mode === "main" ? 720 : mode === "minimized" ? 240 : 360,
    mode === "main" ? 560 : 64
  );
  window.setMaximumSize(display.workArea.width, display.workArea.height);
  window.setResizable(mode !== "minimized");
  window.setBounds(bounds, false);
  applyingWindowBounds = false;
  window.setAlwaysOnTop(overlay && settings.overlayAlwaysOnTop, "screen-saver");
  window.setVisibleOnAllWorkspaces(overlay, { visibleOnFullScreen: overlay });
  window.setSkipTaskbar(overlay);
  window.setMenuBarVisibility(!overlay);
  window.setAutoHideMenuBar(overlay);
  window.setIgnoreMouseEvents(overlay && settings.overlayClickThrough, { forward: true });
  window.setOpacity(1);
  window.setBackgroundColor(overlay ? "#00000000" : "#090d14");
  if (!window.isVisible()) {
    if (overlay) window.showInactive();
    else window.show();
  }
}

function persistCurrentBounds(): void {
  if (applyingWindowBounds || currentWindowMode === "hidden" || !mainWindow) return;
  if (persistBoundsTimer) clearTimeout(persistBoundsTimer);
  persistBoundsTimer = setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed() || currentWindowMode === "hidden") return;
    currentSettingsService?.setWindowBounds(currentWindowMode, mainWindow.getBounds());
  }, 250);
}

function recoverWindowToCurrentDisplays(): void {
  const window = mainWindow;
  const settings = currentSettingsService?.get();
  if (!window || window.isDestroyed() || !settings || currentWindowMode === "hidden") return;
  const display = screen.getDisplayMatching(window.getBounds());
  const next = clampBoundsToWorkArea(window.getBounds(), display.workArea);
  applyingWindowBounds = true;
  window.setBounds(next, false);
  applyingWindowBounds = false;
  currentSettingsService?.setWindowBounds(currentWindowMode, next);
}

function registerOperationalShortcuts(): void {
  globalShortcut.register("CommandOrControl+Shift+O", () => {
    if (currentWindowMode === "main" || currentWindowMode === "hidden") {
      requestWindowMode("compact");
      return;
    }
    requestWindowMode(
      currentCaptureState === "listening" || currentCaptureState === "transcribing"
        ? "minimized"
        : "hidden"
    );
  });
  globalShortcut.register("CommandOrControl+Shift+E", () => {
    requestWindowMode(currentWindowMode === "expanded" ? "compact" : "expanded");
  });
  globalShortcut.register("CommandOrControl+Shift+P", () => {
    send(IPC_CHANNELS.appAction, "toggle_pause");
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 820,
    minHeight: 600,
    show: false,
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

  mainWindow.on("move", persistCurrentBounds);
  mainWindow.on("resize", persistCurrentBounds);

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
  const sessionStore = new SessionStore();
  const apiClient = new ApiClient(
    process.env.API_BASE_URL ?? "http://127.0.0.1:3333",
    process.env.DESKTOP_API_KEY,
    sessionStore
  );
  currentApiClient = apiClient;
  const transcription = new RealtimeTranscriptionService(apiClient, {
    state: (state: CaptureState) => {
      currentCaptureState = state;
      if (currentWindowMode === "hidden" && (state === "listening" || state === "transcribing")) {
        requestWindowMode("minimized");
      }
      send(IPC_CHANNELS.stateChanged, state);
    },
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
  applyWindowMode(
    initialSettings.overlayEnabled ? initialSettings.overlayMode : "main",
    initialSettings
  );
  hotkey.start(initialSettings.hotkey);
  registerOperationalShortcuts();
  screen.on("display-removed", recoverWindowToCurrentDisplays);
  screen.on("display-metrics-changed", recoverWindowToCurrentDisplays);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
  app.on("before-quit", () => {
    hotkey.stop();
    globalShortcut.unregisterAll();
  });
}

async function connectAccount(): Promise<void> {
  const apiClient = currentApiClient;
  if (!apiClient) return;
  try {
    const authorization = await apiClient.startDeviceAuthorization(
      process.env.COMPUTERNAME ?? "Windows PC",
      process.platform
    );
    const verificationUrl = new URL(authorization.verificationUri);
    verificationUrl.searchParams.set("code", authorization.userCode);
    await shell.openExternal(verificationUrl.toString());
    void dialog.showMessageBox({
      type: "info",
      title: "Connect Meeting Copilot",
      message: `Enter code ${authorization.userCode} in your browser.`,
      detail: "This code expires in 10 minutes. The app will connect automatically after approval."
    });
    const deadline = Date.now() + authorization.expiresInSeconds * 1_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, authorization.intervalSeconds * 1_000));
      const result = await apiClient.pollDeviceAuthorization(authorization.deviceCode);
      if (result.status === "pending") continue;
      if (result.status === "authorized") {
        apiClient.completeDeviceAuthorization(result.session);
        buildApplicationMenu(currentSettingsService?.get() ?? new SettingsService().get());
        await dialog.showMessageBox({
          type: "info",
          title: "Meeting Copilot connected",
          message: `Connected as ${result.session.user.email}.`
        });
        return;
      }
      throw new Error(`Device authorization ended with status: ${result.status}`);
    }
    throw new Error("Device authorization expired");
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      title: "Could not connect account",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

void app.whenReady().then(bootstrap).catch(console.error);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
