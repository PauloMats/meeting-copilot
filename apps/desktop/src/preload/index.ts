import {
  IPC_CHANNELS,
  type CopilotApi,
  type CaptureState,
  type TranscriptDelta,
  type TranscriptFinal
} from "@meeting-copilot/contracts";
import { contextBridge, ipcRenderer } from "electron";

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, payload: T) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

function subscribeSignal(channel: string, listener: () => void): () => void {
  const handler = () => listener();
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: CopilotApi = {
  capture: {
    start: () => ipcRenderer.invoke(IPC_CHANNELS.captureStart),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.captureStop),
    cancel: () => ipcRenderer.invoke(IPC_CHANNELS.captureCancel),
    sendAudioChunk: (chunk) => ipcRenderer.send(IPC_CHANNELS.audioChunk, chunk)
  },
  desktopSources: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.listDesktopSources),
    select: (id) => ipcRenderer.invoke(IPC_CHANNELS.selectDesktopSource, id)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    update: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, patch)
  },
  backend: {
    createRealtimeToken: (request) => ipcRenderer.invoke(IPC_CHANNELS.realtimeToken, request),
    generateAnswer: (request) => ipcRenderer.invoke(IPC_CHANNELS.answerGenerate, request)
  },
  window: {
    setOverlay: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.overlaySet, enabled)
  },
  events: {
    onHotkeyPressed: (listener) => subscribeSignal(IPC_CHANNELS.hotkeyPressed, listener),
    onHotkeyReleased: (listener) => subscribeSignal(IPC_CHANNELS.hotkeyReleased, listener),
    onStateChanged: (listener) => subscribe<CaptureState>(IPC_CHANNELS.stateChanged, listener),
    onTranscriptDelta: (listener) =>
      subscribe<TranscriptDelta>(IPC_CHANNELS.transcriptDelta, listener),
    onTranscriptFinal: (listener) =>
      subscribe<TranscriptFinal>(IPC_CHANNELS.transcriptFinal, listener),
    onTranscriptionError: (listener) => subscribe<string>(IPC_CHANNELS.transcriptionError, listener)
  }
};

contextBridge.exposeInMainWorld("copilot", api);
