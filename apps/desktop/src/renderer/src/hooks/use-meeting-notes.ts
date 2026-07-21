import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type CaptureState,
  type MeetingSummary
} from "@meeting-copilot/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioCapture, SystemAudioUnavailableError, type AudioLevels } from "../lib/audio-capture";

const EMPTY_AUDIO_LEVELS: AudioLevels = { system: 0, microphone: null };

export function useMeetingNotes() {
  const [state, setState] = useState<CaptureState>("idle");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<AudioLevels>(EMPTY_AUDIO_LEVELS);
  const capture = useRef(new AudioCapture());
  const transcriptRef = useRef("");
  const startedAt = useRef<string | null>(null);
  const startInFlight = useRef(false);
  const transcriptFrame = useRef<number | null>(null);
  const finalizationStarted = useRef(false);
  const finalizationTimer = useRef<number | null>(null);

  useEffect(() => {
    void window.copilot.settings.get().then(setSettings);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

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
      setState("thinking");
      let draftSaved = false;
      try {
        const saved = await window.copilot.meetingNotes.save({
          transcript: trimmed,
          summary: null,
          language: settings.language,
          startedAt: recordingStartedAt,
          endedAt
        });
        setSavedPath(saved.filePath);
        draftSaved = true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save the transcript");
      }

      try {
        const response = await window.copilot.backend.generateMeetingSummary({
          transcript: trimmed,
          intelligenceLevel: settings.intelligenceLevel,
          language: settings.language
        });
        setSummary(response.summary);
        const saved = await window.copilot.meetingNotes.save({
          transcript: trimmed,
          summary: response.summary,
          language: settings.language,
          startedAt: recordingStartedAt,
          endedAt
        });
        setSavedPath(saved.filePath);
        setError(null);
        setState("idle");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Meeting summary failed";
        setError(draftSaved ? `${message} The transcript was saved.` : message);
        setState("error");
      }
    },
    [settings.intelligenceLevel, settings.language]
  );

  const startRecording = useCallback(async () => {
    if (startInFlight.current || isRecording || state === "thinking") return;
    startInFlight.current = true;
    setState("transcribing");
    setIsRecording(true);
    setElapsedSeconds(0);
    setTranscript("");
    transcriptRef.current = "";
    setSummary(null);
    setSavedPath(null);
    setError(null);
    setAudioLevels({
      system: 0,
      microphone: settings.includeMicrophone ? 0 : null
    });
    finalizationStarted.current = false;
    startedAt.current = new Date().toISOString();
    try {
      await window.copilot.capture.start();
      await capture.current.start(
        settings.includeMicrophone,
        (chunk) => window.copilot.capture.sendAudioChunk(chunk),
        setAudioLevels
      );
    } catch (cause) {
      await capture.current.stop();
      await window.copilot.capture.cancel();
      setIsRecording(false);
      setState("error");
      setError(
        cause instanceof SystemAudioUnavailableError
          ? settings.language === "pt"
            ? "Nenhuma trilha de áudio do PC foi encontrada. Selecione outra tela ou janela e confirme que o som está saindo pelo dispositivo padrão do Windows."
            : "No system audio track was found. Select another screen or window and confirm that audio is playing through the default Windows output device."
          : cause instanceof Error
            ? cause.message
            : "Could not start recording"
      );
    } finally {
      startInFlight.current = false;
    }
  }, [isRecording, settings.includeMicrophone, settings.language, state]);

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
    setState("transcribing");
    await capture.current.stop();
    await window.copilot.capture.stop();
    finalizationTimer.current = window.setTimeout(() => {
      void finalize(transcriptRef.current);
    }, 8000);
  }, [finalize, isRecording]);

  const cancel = useCallback(async () => {
    await capture.current.stop();
    await window.copilot.capture.cancel();
    setIsRecording(false);
    setState("idle");
  }, []);

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
    error,
    savedPath,
    isRecording,
    elapsedSeconds,
    audioLevels,
    startRecording,
    stopRecording,
    cancel,
    updateSettings
  };
}
