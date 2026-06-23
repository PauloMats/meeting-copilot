import {
  IPC_CHANNELS,
  AnswerRequestSchema,
  type AppSettings,
  type CaptureState,
  type DesktopSource,
  RealtimeTokenRequestSchema
} from "@meeting-copilot/contracts";
import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  session,
  type DesktopCapturerSource
} from "electron";
import { join } from "node:path";
import { ApiClient } from "./services/api-client.js";
import { HotkeyService } from "./services/hotkey-service.js";
import { RealtimeTranscriptionService } from "./services/realtime-transcription-service.js";
import { SettingsService } from "./services/settings-service.js";

let mainWindow: BrowserWindow | null = null;
let selectedDesktopSourceId: string | null = null;
const settingsService = new SettingsService();
const apiClient = new ApiClient(process.env.API_BASE_URL ?? "http://127.0.0.1:3333");

function send(channel: string, payload?: unknown): void {
  const window = mainWindow;
  if (window && !window.isDestroyed()) window.webContents.send(channel, payload);
}

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

async function sources(): Promise<DesktopCapturerSource[]> {
  return desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true
  });
}

function registerIpc(): void {
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
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_event, patch: Partial<AppSettings>) =>
    settingsService.update(patch)
  );
  ipcMain.handle(IPC_CHANNELS.realtimeToken, (_event, request: unknown) =>
    apiClient.createRealtimeToken(RealtimeTokenRequestSchema.parse(request))
  );
  ipcMain.handle(IPC_CHANNELS.answerGenerate, (_event, request: unknown) =>
    apiClient.generateAnswer(AnswerRequestSchema.parse(request))
  );
  ipcMain.handle(IPC_CHANNELS.overlaySet, (_event, enabled: boolean) => {
    mainWindow?.setAlwaysOnTop(enabled, "floating");
    if (mainWindow) mainWindow.setSkipTaskbar(enabled);
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 820,
    minHeight: 600,
    show: false,
    backgroundColor: "#090d14",
    title: "Meeting Copilot",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

await app.whenReady();
registerIpc();
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
hotkey.start(settingsService.get().hotkey);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
app.on("before-quit", () => hotkey.stop());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
