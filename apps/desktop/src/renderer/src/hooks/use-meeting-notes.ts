import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type CaptureState,
  type MeetingContext,
  type MeetingResult,
  type MeetingType,
  type SavedMeetingNoteEntry
} from "@meeting-copilot/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioCapture,
  AudioSourceStartError,
  SystemAudioUnavailableError,
  type AudioLevels
} from "../lib/audio-capture";

const EMPTY_AUDIO_LEVELS: AudioLevels = { system: 0, microphone: null };
const EMPTY_MEETING_SETUP: MeetingRecordingSetup = {
  meetingType: "general_meeting",
  meetingName: "",
  meetingDate: "",
  orderedParticipants: [],
  speakerHints: []
};

export type MeetingRecordingSetup = MeetingContext & {
  meetingType: MeetingType;
};

export function useMeetingNotes() {
  const [state, setState] = useState<CaptureState>("idle");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<MeetingResult | null>(null);
  const [summaryExportReady, setSummaryExportReady] = useState(false);
  const [summaryMeetingType, setSummaryMeetingType] = useState<MeetingType>("general_meeting");
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<AudioLevels>(EMPTY_AUDIO_LEVELS);
  const [savedNotes, setSavedNotes] = useState<SavedMeetingNoteEntry[]>([]);
  const [isLoadingSavedNotes, setIsLoadingSavedNotes] = useState(true);
  const [retryingPath, setRetryingPath] = useState<string | null>(null);
  const capture = useRef(new AudioCapture());
  const transcriptRef = useRef("");
  const startedAt = useRef<string | null>(null);
  const startInFlight = useRef(false);
  const transcriptFrame = useRef<number | null>(null);
  const finalizationStarted = useRef(false);
  const finalizationTimer = useRef<number | null>(null);
  const meetingSetupRef = useRef<MeetingRecordingSetup>(EMPTY_MEETING_SETUP);

  const refreshSavedNotes = useCallback(async () => {
    setIsLoadingSavedNotes(true);
    try {
      setSavedNotes(await window.copilot.meetingNotes.list());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load saved transcripts");
    } finally {
      setIsLoadingSavedNotes(false);
    }
  }, []);

  useEffect(() => {
    void window.copilot.settings.get().then(setSettings);
    void refreshSavedNotes();
  }, [refreshSavedNotes]);

  useEffect(() => {
    if (!isRecording || isPaused) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isPaused, isRecording]);

  const finalize = useCallback(
    async (value: string) => {
      if (finalizationStarted.current) return;
      finalizationStarted.current = true;
      if (finalizationTimer.current !== null) {
        window.clearTimeout(finalizationTimer.current);
        finalizationTimer.current = null;
      }
      const trimmed = value.trim();
      const recordingStartedAt = startedAt.current;
      if (!trimmed || !recordingStartedAt) {
        setError("No speech was detected in this recording.");
        setState("error");
        return;
      }

      const endedAt = new Date().toISOString();
      const meetingSetup = meetingSetupRef.current;
      setState("thinking");
      let draftSaved = false;
      try {
        const saved = await window.copilot.meetingNotes.save({
          transcript: trimmed,
          summary: null,
          ...meetingSetup,
          language: settings.language,
          startedAt: recordingStartedAt,
          endedAt
        });
        setSavedPath(saved.filePath);
        setSavedNoticeVisible(true);
        draftSaved = true;
        await refreshSavedNotes();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save the transcript");
      }

      try {
        const response = await window.copilot.backend.generateMeetingSummary({
          transcript: trimmed,
          intelligenceLevel: settings.intelligenceLevel,
          language: settings.language,
          ...meetingSetup
        });
        setSummary(response.summary);
        setSummaryMeetingType(response.meetingType);
        setSummaryExportReady(false);
        const saved = await window.copilot.meetingNotes.save({
          transcript: trimmed,
          summary: response.summary,
          ...meetingSetup,
          language: settings.language,
          startedAt: recordingStartedAt,
          endedAt
        });
        setSavedPath(saved.filePath);
        setSavedNoticeVisible(true);
        setSummaryExportReady(true);
        await refreshSavedNotes();
        setError(null);
        setState("idle");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Meeting summary failed";
        setError(draftSaved ? `${message} The transcript was saved.` : message);
        setState("error");
      }
    },
    [refreshSavedNotes, settings.intelligenceLevel, settings.language]
  );

  const startRecording = useCallback(
    async (meetingSetup: MeetingRecordingSetup) => {
      if (startInFlight.current || isRecording || state === "thinking") return;
      startInFlight.current = true;
      setState("transcribing");
      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      setTranscript("");
      transcriptRef.current = "";
      setSummary(null);
      setSummaryExportReady(false);
      setSummaryMeetingType(meetingSetup.meetingType);
      setSavedPath(null);
      setSavedNoticeVisible(false);
      setError(null);
      setAudioLevels({
        system: 0,
        microphone: settings.includeMicrophone ? 0 : null
      });
      finalizationStarted.current = false;
      startedAt.current = new Date().toISOString();
      meetingSetupRef.current = meetingSetup;
      try {
        await window.copilot.capture.start();
        await capture.current.start(
          settings.includeMicrophone,
          (chunk) => window.copilot.capture.sendAudioChunk(chunk),
          setAudioLevels,
          (message) => {
            setIsRecording(false);
            setIsPaused(false);
            setError(message);
            void capture.current.stop();
            void window.copilot.capture.stop();
          }
        );
      } catch (cause) {
        await capture.current.stop();
        await window.copilot.capture.cancel();
        setIsRecording(false);
        setIsPaused(false);
        setState("error");
        setError(audioStartErrorMessage(cause, settings.language));
      } finally {
        startInFlight.current = false;
      }
    },
    [isRecording, settings.includeMicrophone, settings.language, state]
  );

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    if (startInFlight.current) {
      const waitForStart = window.setInterval(() => {
        if (!startInFlight.current) {
          window.clearInterval(waitForStart);
          void stopRecording();
        }
      }, 25);
      return;
    }
    setIsRecording(false);
    setIsPaused(false);
    setState("transcribing");
    await capture.current.stop();
    await window.copilot.capture.stop();
    finalizationTimer.current = window.setTimeout(() => {
      void finalize(transcriptRef.current);
    }, 8000);
  }, [finalize, isRecording]);

  const pauseRecording = useCallback(async () => {
    if (!isRecording || isPaused || startInFlight.current) return;
    try {
      await capture.current.pause();
      setIsPaused(true);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not pause recording");
    }
  }, [isPaused, isRecording]);

  const resumeRecording = useCallback(async () => {
    if (!isRecording || !isPaused || startInFlight.current) return;
    try {
      await capture.current.resume();
      setIsPaused(false);
      setError(null);
    } catch (cause) {
      setError(audioStartErrorMessage(cause, settings.language));
    }
  }, [isPaused, isRecording, settings.language]);

  const cancel = useCallback(async () => {
    await capture.current.stop();
    await window.copilot.capture.cancel();
    setIsRecording(false);
    setIsPaused(false);
    setState("idle");
  }, []);

  const retrySavedNote = useCallback(
    async (entry: SavedMeetingNoteEntry) => {
      if (isRecording || retryingPath || state === "thinking") return;
      setRetryingPath(entry.filePath);
      setState("thinking");
      setSummary(null);
      setSummaryExportReady(false);
      setSavedPath(entry.filePath);
      setSavedNoticeVisible(false);
      setError(null);
      try {
        const saved = await window.copilot.meetingNotes.read(entry.filePath);
        setTranscript(saved.transcript);
        transcriptRef.current = saved.transcript;
        const response = await window.copilot.backend.generateMeetingSummary({
          transcript: saved.transcript,
          intelligenceLevel: settings.intelligenceLevel,
          language: saved.language,
          meetingType: saved.meetingType,
          meetingName: saved.meetingName,
          meetingDate: saved.meetingDate,
          orderedParticipants: saved.orderedParticipants,
          speakerHints: saved.speakerHints
        });
        await window.copilot.meetingNotes.update(entry.filePath, {
          transcript: saved.transcript,
          summary: response.summary,
          meetingType: saved.meetingType,
          meetingName: saved.meetingName,
          meetingDate: saved.meetingDate,
          orderedParticipants: saved.orderedParticipants,
          speakerHints: saved.speakerHints,
          language: saved.language,
          startedAt: saved.startedAt,
          endedAt: saved.endedAt
        });
        setSummary(response.summary);
        setSummaryMeetingType(response.meetingType);
        setSummaryExportReady(true);
        await refreshSavedNotes();
        setState("idle");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Meeting summary failed";
        setError(
          settings.language === "pt"
            ? `${message} A transcrição continua salva e pode ser reenviada novamente.`
            : `${message} The transcript is still saved and can be retried again.`
        );
        setState("error");
      } finally {
        setRetryingPath(null);
      }
    },
    [
      isRecording,
      refreshSavedNotes,
      retryingPath,
      settings.intelligenceLevel,
      settings.language,
      state
    ]
  );

  useEffect(() => {
    const unsubscribe = [
      window.copilot.events.onSettingsChanged(setSettings),
      window.copilot.events.onStateChanged((next) => {
        if (next !== "ready_to_send") setState(next);
      }),
      window.copilot.events.onTranscriptDelta(({ delta }) => {
        transcriptRef.current += delta;
        if (transcriptFrame.current === null) {
          transcriptFrame.current = window.requestAnimationFrame(() => {
            transcriptFrame.current = null;
            setTranscript(transcriptRef.current);
          });
        }
      }),
      window.copilot.events.onTranscriptFinal(({ transcript: finalTranscript }) => {
        if (transcriptFrame.current !== null) {
          window.cancelAnimationFrame(transcriptFrame.current);
          transcriptFrame.current = null;
        }
        transcriptRef.current = finalTranscript;
        setTranscript(finalTranscript);
        void finalize(finalTranscript);
      }),
      window.copilot.events.onTranscriptionError((message) => {
        setIsRecording(false);
        setIsPaused(false);
        void capture.current.stop();
        if (transcriptRef.current.trim()) {
          setError(`${message} Saving the partial transcript.`);
          void finalize(transcriptRef.current);
        } else {
          setError(message);
          setState("error");
        }
      })
    ];
    return () => {
      if (transcriptFrame.current !== null) {
        window.cancelAnimationFrame(transcriptFrame.current);
      }
      if (finalizationTimer.current !== null) {
        window.clearTimeout(finalizationTimer.current);
      }
      unsubscribe.forEach((dispose) => dispose());
    };
  }, [finalize]);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const next = await window.copilot.settings.update(patch);
    setSettings(next);
  };

  return {
    state,
    settings,
    transcript,
    summary,
    summaryExportReady,
    summaryMeetingType,
    error,
    savedPath,
    savedNoticeVisible,
    isRecording,
    isPaused,
    elapsedSeconds,
    audioLevels,
    savedNotes,
    isLoadingSavedNotes,
    retryingPath,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    retrySavedNote,
    refreshSavedNotes,
    dismissSavedPath: () => setSavedNoticeVisible(false),
    cancel,
    updateSettings
  };
}

function audioStartErrorMessage(cause: unknown, language: string): string {
  return cause instanceof SystemAudioUnavailableError
    ? language === "pt"
      ? "Nenhuma trilha de áudio do PC foi encontrada. Selecione outra tela ou janela e confirme que o som está saindo pelo dispositivo padrão do Windows."
      : "No system audio track was found. Select another screen or window and confirm that audio is playing through the default Windows output device."
    : cause instanceof AudioSourceStartError && cause.source === "system"
      ? language === "pt"
        ? `O WASAPI não conseguiu iniciar a saída selecionada. Confirme se ela é a mesma usada pela reunião (por exemplo, JBL Quantum Game ou Chat). Detalhe: ${cause.originalMessage}`
        : `WASAPI could not start the selected output. Confirm it is the same device used by the meeting (for example, JBL Quantum Game or Chat). Detail: ${cause.originalMessage}`
      : cause instanceof AudioSourceStartError
        ? language === "pt"
          ? `O Windows não conseguiu iniciar o microfone. Verifique a permissão ou desative “Incluir microfone” para gravar apenas o áudio do PC. Detalhe: ${cause.originalMessage}`
          : `Windows could not start the microphone. Check its permission or disable “Include microphone” to capture system audio only. Detail: ${cause.originalMessage}`
        : cause instanceof Error
          ? cause.message
          : language === "pt"
            ? "Não foi possível iniciar a gravação"
            : "Could not start recording";
}
