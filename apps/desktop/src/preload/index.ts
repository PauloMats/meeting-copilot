import {
  IPC_CHANNELS,
  type CopilotApi,
  type AppSettings,
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
  systemAudio: {
    listDevices: () => ipcRenderer.invoke(IPC_CHANNELS.listAudioDevices),
    select: (id) => ipcRenderer.invoke(IPC_CHANNELS.selectAudioDevice, id),
    start: (includeMicrophone) =>
      ipcRenderer.invoke(IPC_CHANNELS.nativeAudioStart, includeMicrophone),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.nativeAudioStop)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    update: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, patch)
  },
  backend: {
    createRealtimeToken: (request) => ipcRenderer.invoke(IPC_CHANNELS.realtimeToken, request),
    generateAnswer: (request) => ipcRenderer.invoke(IPC_CHANNELS.answerGenerate, request),
    generateMeetingSummary: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.meetingSummaryGenerate, request)
  },
  meetingNotes: {
    save: (request) => ipcRenderer.invoke(IPC_CHANNELS.meetingNotesSave, request),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.meetingNotesList),
    read: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.meetingNotesRead, filePath),
    update: (filePath, request) =>
      ipcRenderer.invoke(IPC_CHANNELS.meetingNotesUpdate, filePath, request),
    reveal: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.meetingNotesReveal, filePath),
    exportPdf: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.meetingNotesExportPdf, filePath),
    exportHtml: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.meetingNotesExportHtml, filePath),
    copyFormatted: (filePath) =>
      ipcRenderer.invoke(IPC_CHANNELS.meetingNotesCopyFormatted, filePath)
  },
  window: {
    setOverlay: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.overlaySet, enabled),
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
    toggleMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose)
  },
  events: {
    onHotkeyPressed: (listener) => subscribeSignal(IPC_CHANNELS.hotkeyPressed, listener),
    onHotkeyReleased: (listener) => subscribeSignal(IPC_CHANNELS.hotkeyReleased, listener),
    onSettingsChanged: (listener) => subscribe<AppSettings>(IPC_CHANNELS.settingsChanged, listener),
    onStateChanged: (listener) => subscribe<CaptureState>(IPC_CHANNELS.stateChanged, listener),
    onTranscriptDelta: (listener) =>
      subscribe<TranscriptDelta>(IPC_CHANNELS.transcriptDelta, listener),
    onTranscriptFinal: (listener) =>
      subscribe<TranscriptFinal>(IPC_CHANNELS.transcriptFinal, listener),
    onTranscriptionError: (listener) =>
      subscribe<string>(IPC_CHANNELS.transcriptionError, listener),
    onNativeAudioChunk: (listener) =>
      subscribe<ArrayBuffer>(IPC_CHANNELS.nativeAudioChunk, listener),
    onNativeAudioLevels: (listener) => subscribe(IPC_CHANNELS.nativeAudioLevels, listener),
    onNativeAudioError: (listener) => subscribe<string>(IPC_CHANNELS.nativeAudioError, listener)
  }
};

contextBridge.exposeInMainWorld("copilot", api);
