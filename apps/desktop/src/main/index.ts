import {
  IPC_CHANNELS,
  AnswerRequestSchema,
  MeetingSummaryRequestSchema,
  SaveMeetingNoteRequestSchema,
  type AppSettings,
  type CaptureState,
  RealtimeTokenRequestSchema
} from "@meeting-copilot/contracts";
import { config as loadEnvironment } from "dotenv";
import { app, BrowserWindow, ipcMain, Menu, screen, shell } from "electron";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ApiClient } from "./services/api-client.js";
import { HotkeyService } from "./services/hotkey-service.js";
import { MeetingNotesService } from "./services/meeting-notes-service.js";
import { NativeAudioService } from "./services/native-audio-service.js";
import { RealtimeTranscriptionService } from "./services/realtime-transcription-service.js";
import { SettingsService } from "./services/settings-service.js";

let mainWindow: BrowserWindow | null = null;
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

function registerIpc(
  settingsService: SettingsService,
  transcription: RealtimeTranscriptionService,
  hotkey: HotkeyService,
  apiClient: ApiClient,
  meetingNotes: MeetingNotesService,
  nativeAudio: NativeAudioService
): void {
  ipcMain.handle(IPC_CHANNELS.captureStart, () => transcription.start(settingsService.get()));
  ipcMain.handle(IPC_CHANNELS.captureStop, () => transcription.commit());
  ipcMain.handle(IPC_CHANNELS.captureCancel, () => transcription.cancel());
  ipcMain.on(IPC_CHANNELS.audioChunk, (_event, chunk: ArrayBuffer) => transcription.append(chunk));
  ipcMain.handle(IPC_CHANNELS.listAudioDevices, () => nativeAudio.listDevices());
  ipcMain.handle(IPC_CHANNELS.selectAudioDevice, (_event, id: string) => {
    if (typeof id !== "string" || !id) throw new Error("Invalid audio device id");
    nativeAudio.selectDevice(id);
  });
  ipcMain.handle(IPC_CHANNELS.nativeAudioStart, (_event, includeMicrophone: boolean) =>
    nativeAudio.start(Boolean(includeMicrophone))
  );
  ipcMain.handle(IPC_CHANNELS.nativeAudioStop, () => nativeAudio.stop());
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
  ipcMain.handle(IPC_CHANNELS.meetingSummaryGenerate, (_event, request: unknown) =>
    apiClient.generateMeetingSummary(MeetingSummaryRequestSchema.parse(request))
  );
  ipcMain.handle(IPC_CHANNELS.meetingNotesSave, (_event, request: unknown) =>
    meetingNotes.save(SaveMeetingNoteRequestSchema.parse(request))
  );
  ipcMain.handle(IPC_CHANNELS.meetingNotesList, () => meetingNotes.list());
  ipcMain.handle(IPC_CHANNELS.meetingNotesRead, (_event, filePath: string) => {
    if (typeof filePath !== "string") throw new Error("Invalid meeting note path");
    return meetingNotes.read(filePath);
  });
  ipcMain.handle(IPC_CHANNELS.meetingNotesUpdate, (_event, filePath: string, request: unknown) => {
    if (typeof filePath !== "string") throw new Error("Invalid meeting note path");
    return meetingNotes.update(filePath, SaveMeetingNoteRequestSchema.parse(request));
  });
  ipcMain.handle(IPC_CHANNELS.meetingNotesReveal, (_event, filePath: string) => {
    if (typeof filePath !== "string") throw new Error("Invalid meeting note path");
    if (!meetingNotes.isManagedFile(filePath)) throw new Error("Invalid meeting note path");
    shell.showItemInFolder(filePath);
  });
  ipcMain.handle(IPC_CHANNELS.overlaySet, (_event, enabled: boolean) => {
    setOverlayMode(enabled);
  });
  ipcMain.handle(IPC_CHANNELS.windowMinimize, () => mainWindow?.minimize());
  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, () => {
    const window = mainWindow;
    if (!window || window.isDestroyed()) return;
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  ipcMain.handle(IPC_CHANNELS.windowClose, () => mainWindow?.close());
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
  window.setMenuBarVisibility(false);
  window.setAutoHideMenuBar(true);
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
    frame: false,
    autoHideMenuBar: true,
    transparent: true,
    backgroundColor: "#090d14",
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

  const meetingNotes = new MeetingNotesService(app.getPath("documents"));
  const nativeAudioExecutable = app.isPackaged
    ? join(process.resourcesPath, "native-audio", "MeetingCopilot.AudioCapture.exe")
    : resolve(
        app.getAppPath(),
        "../../native/windows-audio-capture/publish/MeetingCopilot.AudioCapture.exe"
      );
  const nativeAudio = new NativeAudioService(nativeAudioExecutable, {
    chunk: (chunk) => send(IPC_CHANNELS.nativeAudioChunk, chunk),
    levels: (levels) => send(IPC_CHANNELS.nativeAudioLevels, levels),
    error: (message) => send(IPC_CHANNELS.nativeAudioError, message)
  });

  registerIpc(settingsService, transcription, hotkey, apiClient, meetingNotes, nativeAudio);
  await createWindow();
  const initialSettings = settingsService.get();
  buildApplicationMenu(initialSettings);
  setOverlayMode(initialSettings.overlayEnabled);
  hotkey.start(initialSettings.hotkey);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
  app.on("before-quit", () => {
    hotkey.stop();
    void nativeAudio.stop();
  });
}

void app.whenReady().then(bootstrap).catch(console.error);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
