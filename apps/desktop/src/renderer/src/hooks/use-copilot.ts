import {
  DEFAULT_SETTINGS,
  RecentQuestionDeduplicator,
  detectQuestionCandidate,
  summarizeTurnTiming,
  type Answer,
  type AppSettings,
  type CaptureState,
  type MeetingMemoryItem,
  type TurnMetrics,
  type TurnTiming
} from "@meeting-copilot/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioCapture } from "../lib/audio-capture";

const MAX_MEMORY_ITEMS = 5;

export function useCopilot() {
  const [state, setState] = useState<CaptureState>("idle");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMetrics, setLastMetrics] = useState<TurnMetrics | null>(null);
  const capture = useRef(new AudioCapture());
  const transcriptRef = useRef("");
  const startInFlight = useRef(false);
  const transcriptFrame = useRef<number | null>(null);
  const activeTurnId = useRef<string | null>(null);
  const submittedTurnId = useRef<string | null>(null);
  const timing = useRef<TurnTiming | null>(null);
  const meetingMemory = useRef<MeetingMemoryItem[]>([]);
  const deduplicator = useRef(new RecentQuestionDeduplicator());

  useEffect(() => {
    void window.copilot.settings.get().then(setSettings);
  }, []);

  const markTiming = useCallback((patch: Partial<TurnTiming>) => {
    if (!timing.current) return;
    timing.current = { ...timing.current, ...patch };
  }, []);

  const startTurn = useCallback(async () => {
    if (startInFlight.current || state !== "idle") return;
    startInFlight.current = true;
    const turnId = crypto.randomUUID();
    activeTurnId.current = turnId;
    submittedTurnId.current = null;
    timing.current = {
      turnId,
      captureStartedAtMs: performance.now()
    };
    setTranscript("");
    transcriptRef.current = "";
    setAnswer(null);
    setError(null);
    setLastMetrics(null);
    try {
      await window.copilot.capture.start();
      await capture.current.start(settings.includeMicrophone, (chunk) => {
        if (!timing.current?.firstAudioChunkAtMs) {
          markTiming({ firstAudioChunkAtMs: performance.now() });
        }
        window.copilot.capture.sendAudioChunk(chunk);
      });
    } catch (cause) {
      await capture.current.stop();
      await window.copilot.capture.cancel();
      markTiming({ failedAtMs: performance.now() });
      setError(cause instanceof Error ? cause.message : "Could not start capture");
    } finally {
      startInFlight.current = false;
    }
  }, [markTiming, settings.includeMicrophone, state]);

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
    async (value = transcriptRef.current, turnId = activeTurnId.current) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      submittedTurnId.current = turnId;
      markTiming({ answerRequestedAtMs: performance.now() });
      setState("thinking");
      try {
        const response = await window.copilot.backend.generateAnswer({
          transcript: trimmed,
          intelligenceLevel: settings.intelligenceLevel,
          contextProfileId: settings.selectedContextProfileId,
          meetingMemory: meetingMemory.current.slice(-MAX_MEMORY_ITEMS)
        });
        if (turnId && submittedTurnId.current !== turnId) return;
        const answerChars = answerCharacterCount(response.answer);
        markTiming({ answerReceivedAtMs: performance.now() });
        if (timing.current) {
          const metrics = summarizeTurnTiming(timing.current, trimmed.length, answerChars);
          setLastMetrics(metrics);
          console.info("meeting-copilot-turn", metrics);
        }
        meetingMemory.current = [
          ...meetingMemory.current,
          { transcript: trimmed, sayThis: response.answer.sayThis }
        ].slice(-MAX_MEMORY_ITEMS);
        setAnswer(response.answer);
        setState("idle");
      } catch (cause) {
        markTiming({ failedAtMs: performance.now() });
        setError(cause instanceof Error ? cause.message : "Answer generation failed");
        setState("error");
      }
    },
    [markTiming, settings.intelligenceLevel, settings.selectedContextProfileId]
  );

  useEffect(() => {
    const unsubscribe = [
      window.copilot.events.onHotkeyPressed(() => void startTurn()),
      window.copilot.events.onHotkeyReleased(() => void stopTurn()),
      window.copilot.events.onSettingsChanged(setSettings),
      window.copilot.events.onStateChanged(setState),
      window.copilot.events.onTranscriptDelta(({ delta }) => {
        if (!timing.current?.firstTranscriptDeltaAtMs) {
          markTiming({ firstTranscriptDeltaAtMs: performance.now() });
        }
        transcriptRef.current += delta;
        if (transcriptFrame.current === null) {
          transcriptFrame.current = window.requestAnimationFrame(() => {
            transcriptFrame.current = null;
            setTranscript(transcriptRef.current);
          });
        }
      }),
      window.copilot.events.onTranscriptFinal(({ transcript: finalTranscript }) => {
        const turnId = activeTurnId.current;
        if (transcriptFrame.current !== null) {
          window.cancelAnimationFrame(transcriptFrame.current);
          transcriptFrame.current = null;
        }
        markTiming({ transcriptFinalAtMs: performance.now() });
        transcriptRef.current = finalTranscript;
        setTranscript(finalTranscript);
        const shouldReview =
          settings.submissionMode === "review_before_send" || settings.autoSubmit === false;
        if (shouldReview) {
          setState("ready_to_send");
          return;
        }
        if (settings.submissionMode === "auto_detect") {
          const detection = detectQuestionCandidate(finalTranscript);
          const duplicate =
            detection.accepted &&
            deduplicator.current.isDuplicate(detection.question, performance.now());
          if (detection.accepted && !duplicate) {
            void submit(detection.question, turnId);
            return;
          }
          setState("idle");
          return;
        }
        void submit(finalTranscript, turnId);
      }),
      window.copilot.events.onTranscriptionError((message) => {
        markTiming({ failedAtMs: performance.now() });
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
  }, [markTiming, settings.autoSubmit, settings.submissionMode, startTurn, stopTurn, submit]);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const next = await window.copilot.settings.update(patch);
    setSettings(next);
  };

  const cancel = async () => {
    await capture.current.stop();
    await window.copilot.capture.cancel();
    markTiming({ cancelledAtMs: performance.now() });
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
    lastMetrics,
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

function answerCharacterCount(answer: Answer): number {
  return [
    answer.sayThis,
    ...answer.keyPoints,
    answer.details ?? "",
    answer.example ?? "",
    ...(answer.assumptions ?? []),
    ...(answer.followUps ?? [])
  ].reduce((total, value) => total + value.length, 0);
}
