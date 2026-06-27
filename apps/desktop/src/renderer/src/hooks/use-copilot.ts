import {
  DEFAULT_SETTINGS,
  type Answer,
  type AppSettings,
  type CaptureState
} from "@meeting-copilot/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioCapture } from "../lib/audio-capture";

export function useCopilot() {
  const [state, setState] = useState<CaptureState>("idle");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const capture = useRef(new AudioCapture());
  const transcriptRef = useRef("");
  const startInFlight = useRef(false);
  const transcriptFrame = useRef<number | null>(null);

  useEffect(() => {
    void window.copilot.settings.get().then(setSettings);
  }, []);

  const startTurn = useCallback(async () => {
    if (startInFlight.current || state !== "idle") return;
    startInFlight.current = true;
    setTranscript("");
    transcriptRef.current = "";
    setAnswer(null);
    setError(null);
    try {
      await window.copilot.capture.start();
      await capture.current.start(settings.includeMicrophone, (chunk) =>
        window.copilot.capture.sendAudioChunk(chunk)
      );
    } catch (cause) {
      await capture.current.stop();
      await window.copilot.capture.cancel();
      setError(cause instanceof Error ? cause.message : "Could not start capture");
    } finally {
      startInFlight.current = false;
    }
  }, [settings.includeMicrophone, state]);

  const stopTurn = useCallback(async () => {
    if (startInFlight.current) {
      const waitForStart = window.setInterval(() => {
        if (!startInFlight.current) {
          window.clearInterval(waitForStart);
          void stopTurn();
        }
      }, 25);
      return;
    }
    await capture.current.stop();
    await window.copilot.capture.stop();
  }, []);

  const submit = useCallback(
    async (value = transcriptRef.current) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setState("thinking");
      try {
        const response = await window.copilot.backend.generateAnswer({
          transcript: trimmed,
          contextProfileId: settings.selectedContextProfileId,
          meetingMemory: []
        });
        setAnswer(response.answer);
        setState("idle");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Answer generation failed");
        setState("error");
      }
    },
    [settings.selectedContextProfileId]
  );

  useEffect(() => {
    const unsubscribe = [
      window.copilot.events.onHotkeyPressed(() => void startTurn()),
      window.copilot.events.onHotkeyReleased(() => void stopTurn()),
      window.copilot.events.onSettingsChanged(setSettings),
      window.copilot.events.onStateChanged(setState),
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
        if (settings.autoSubmit) void submit(finalTranscript);
      }),
      window.copilot.events.onTranscriptionError((message) => {
        setError(message);
        setState("error");
      })
    ];
    return () => {
      if (transcriptFrame.current !== null) {
        window.cancelAnimationFrame(transcriptFrame.current);
        transcriptFrame.current = null;
      }
      unsubscribe.forEach((dispose) => dispose());
    };
  }, [settings.autoSubmit, startTurn, stopTurn, submit]);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const next = await window.copilot.settings.update(patch);
    setSettings(next);
  };

  const cancel = async () => {
    await capture.current.stop();
    await window.copilot.capture.cancel();
    setTranscript("");
    transcriptRef.current = "";
    setState("idle");
  };

  return {
    state,
    settings,
    transcript,
    answer,
    error,
    startTurn,
    stopTurn,
    submit,
    cancel,
    setTranscript: (value: string) => {
      transcriptRef.current = value;
      setTranscript(value);
    },
    updateSettings
  };
}
