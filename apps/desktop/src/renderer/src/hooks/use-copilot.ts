import {
  DEFAULT_SETTINGS,
  RecentQuestionDeduplicator,
  deriveOverlayVisualState,
  detectQuestionCandidate,
  summarizeTurnTiming,
  type Answer,
  type AppSettings,
  type CaptureState,
  type IntelligenceLevel,
  type MeetingMemoryItem,
  type TurnMetrics,
  type TurnTiming,
  type UiError
} from "@meeting-copilot/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioCapture } from "../lib/audio-capture";
import { classifyUiError } from "../lib/ui-errors";

const MAX_MEMORY_ITEMS = 5;
const MAX_HISTORY_ITEMS = 20;
const MAX_PINNED_ITEMS = 3;

export interface RecentTurn {
  turnId: string;
  question: string;
  answer: Answer;
  model: string;
  intelligenceLevel: IntelligenceLevel;
  createdAt: string;
}

export function useCopilot() {
  const [state, setState] = useState<CaptureState>("idle");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [transcript, setTranscript] = useState("");
  const [question, setQuestion] = useState("");
  const [questionWasNormalized, setQuestionWasNormalized] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [answerMeta, setAnswerMeta] = useState<Pick<
    RecentTurn,
    "model" | "intelligenceLevel"
  > | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [lastMetrics, setLastMetrics] = useState<TurnMetrics | null>(null);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pinnedAnswers, setPinnedAnswers] = useState<RecentTurn[]>([]);
  const [history, setHistory] = useState<RecentTurn[]>([]);
  const capture = useRef(new AudioCapture());
  const transcriptRef = useRef("");
  const settingsRef = useRef(settings);
  const stateRef = useRef(state);
  const pausedRef = useRef(false);
  const startInFlight = useRef(false);
  const transcriptFrame = useRef<number | null>(null);
  const activeTurnId = useRef<string | null>(null);
  const submittedTurnId = useRef<string | null>(null);
  const generationVersion = useRef(0);
  const timing = useRef<TurnTiming | null>(null);
  const meetingMemory = useRef<MeetingMemoryItem[]>([]);
  const deduplicator = useRef(new RecentQuestionDeduplicator());

  const updateState = useCallback((next: CaptureState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    void window.copilot.settings.get().then((next) => {
      settingsRef.current = next;
      setSettings(next);
    });
  }, []);

  const markTiming = useCallback((patch: Partial<TurnTiming>) => {
    if (!timing.current) return;
    timing.current = { ...timing.current, ...patch };
  }, []);

  const cancel = useCallback(async () => {
    generationVersion.current += 1;
    submittedTurnId.current = null;
    await capture.current.stop();
    await window.copilot.capture.cancel();
    markTiming({ cancelledAtMs: performance.now() });
    setQuestion("");
    setQuestionWasNormalized(false);
    setAnswer(null);
    setAnswerMeta(null);
    setError(null);
    updateState("idle");
  }, [markTiming, updateState]);

  const startTurn = useCallback(async () => {
    if (
      pausedRef.current ||
      startInFlight.current ||
      (stateRef.current !== "idle" && stateRef.current !== "error")
    ) {
      return;
    }
    startInFlight.current = true;
    const turnId = crypto.randomUUID();
    activeTurnId.current = turnId;
    submittedTurnId.current = null;
    timing.current = { turnId, captureStartedAtMs: performance.now() };
    transcriptRef.current = "";
    setTranscript("");
    setQuestion("");
    setQuestionWasNormalized(false);
    setAnswer(null);
    setAnswerMeta(null);
    setError(null);
    setLastMetrics(null);
    try {
      await window.copilot.capture.start();
      await capture.current.start(settingsRef.current.includeMicrophone, (chunk) => {
        if (!timing.current?.firstAudioChunkAtMs) {
          markTiming({ firstAudioChunkAtMs: performance.now() });
        }
        window.copilot.capture.sendAudioChunk(chunk);
      });
    } catch (cause) {
      await capture.current.stop();
      await window.copilot.capture.cancel();
      markTiming({ failedAtMs: performance.now() });
      setError(classifyUiError(cause));
      updateState("error");
    } finally {
      startInFlight.current = false;
    }
  }, [markTiming, updateState]);

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
      const version = ++generationVersion.current;
      submittedTurnId.current = turnId;
      setQuestion(trimmed);
      markTiming({ answerRequestedAtMs: performance.now() });
      updateState("thinking");
      setError(null);
      try {
        const response = await window.copilot.backend.generateAnswer({
          transcript: trimmed,
          intelligenceLevel: settingsRef.current.intelligenceLevel,
          contextProfileId: settingsRef.current.selectedContextProfileId,
          meetingMemory: meetingMemory.current.slice(-MAX_MEMORY_ITEMS)
        });
        if (version !== generationVersion.current) return;
        if (turnId && submittedTurnId.current !== turnId) return;
        const resolvedTurnId = turnId ?? crypto.randomUUID();
        markTiming({ answerReceivedAtMs: performance.now() });
        if (timing.current) {
          const metrics = summarizeTurnTiming(
            timing.current,
            trimmed.length,
            answerCharacterCount(response.answer)
          );
          setLastMetrics(metrics);
          console.info("meeting-copilot-turn", metrics);
        }
        meetingMemory.current = [
          ...meetingMemory.current,
          { transcript: trimmed, sayThis: response.answer.sayThis }
        ].slice(-MAX_MEMORY_ITEMS);
        const recentTurn: RecentTurn = {
          turnId: resolvedTurnId,
          question: trimmed,
          answer: response.answer,
          model: response.model,
          intelligenceLevel: response.intelligenceLevel,
          createdAt: new Date().toISOString()
        };
        setAnswer(response.answer);
        setAnswerMeta({
          model: response.model,
          intelligenceLevel: response.intelligenceLevel
        });
        setHistory((items) => [recentTurn, ...items].slice(0, MAX_HISTORY_ITEMS));
        updateState("idle");
      } catch (cause) {
        if (version !== generationVersion.current) return;
        markTiming({ failedAtMs: performance.now() });
        setError(classifyUiError(cause));
        updateState("error");
      }
    },
    [markTiming, updateState]
  );

  const copyAnswer = useCallback(async () => {
    if (!answer?.sayThis) return;
    await navigator.clipboard.writeText(answer.sayThis);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [answer]);

  const pinAnswer = useCallback(() => {
    if (!answer || !answerMeta) return;
    const turnId = submittedTurnId.current ?? activeTurnId.current ?? crypto.randomUUID();
    setPinnedAnswers((items) => {
      if (items.some((item) => item.turnId === turnId)) {
        return items.filter((item) => item.turnId !== turnId);
      }
      return [
        {
          turnId,
          question,
          answer,
          model: answerMeta.model,
          intelligenceLevel: answerMeta.intelligenceLevel,
          createdAt: new Date().toISOString()
        },
        ...items
      ].slice(0, MAX_PINNED_ITEMS);
    });
  }, [answer, answerMeta, question]);

  const discard = useCallback(() => {
    generationVersion.current += 1;
    submittedTurnId.current = null;
    transcriptRef.current = "";
    setTranscript("");
    setQuestion("");
    setQuestionWasNormalized(false);
    setAnswer(null);
    setAnswerMeta(null);
    setError(null);
    updateState("idle");
  }, [updateState]);

  const togglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next && stateRef.current !== "idle") void cancel();
  }, [cancel]);

  useEffect(() => {
    const unsubscribe = [
      window.copilot.events.onHotkeyPressed(() => void startTurn()),
      window.copilot.events.onHotkeyReleased(() => void stopTurn()),
      window.copilot.events.onSettingsChanged((next) => {
        settingsRef.current = next;
        setSettings(next);
      }),
      window.copilot.events.onStateChanged(updateState),
      window.copilot.events.onTranscriptDelta(({ delta }) => {
        if (!timing.current?.firstTranscriptDeltaAtMs) {
          markTiming({ firstTranscriptDeltaAtMs: performance.now() });
        }
        transcriptRef.current += delta;
        if (!settingsRef.current.showPartialTranscript) return;
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
        setQuestion(finalTranscript);
        const currentSettings = settingsRef.current;
        const shouldReview =
          currentSettings.submissionMode === "review_before_send" ||
          currentSettings.autoSubmit === false;
        if (shouldReview) {
          updateState("ready_to_send");
          return;
        }
        if (currentSettings.submissionMode === "auto_detect") {
          const detection = detectQuestionCandidate(finalTranscript);
          const duplicate =
            detection.accepted &&
            deduplicator.current.isDuplicate(detection.question, performance.now());
          if (detection.accepted && !duplicate) {
            setQuestion(detection.question);
            setQuestionWasNormalized(detection.question !== finalTranscript.trim());
            void submit(detection.question, turnId);
            return;
          }
          updateState("idle");
          return;
        }
        void submit(finalTranscript, turnId);
      }),
      window.copilot.events.onTranscriptionError((message) => {
        markTiming({ failedAtMs: performance.now() });
        setError(classifyUiError(message));
        updateState("error");
      }),
      window.copilot.events.onAppAction((action) => {
        if (action === "toggle_pause") togglePause();
        if (action === "copy_answer") void copyAnswer();
        if (action === "pin_answer") pinAnswer();
        if (action === "discard") discard();
        if (action === "cancel") void cancel();
      })
    ];
    return () => {
      if (transcriptFrame.current !== null) window.cancelAnimationFrame(transcriptFrame.current);
      unsubscribe.forEach((dispose) => dispose());
    };
  }, [
    cancel,
    copyAnswer,
    discard,
    markTiming,
    pinAnswer,
    startTurn,
    stopTurn,
    submit,
    togglePause,
    updateState
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (answer && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        void copyAnswer();
      }
      if (answer && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        pinAnswer();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (stateRef.current !== "idle") void cancel();
        else discard();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answer, cancel, copyAnswer, discard, pinAnswer]);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const next = await window.copilot.settings.update(patch);
    settingsRef.current = next;
    setSettings(next);
  };

  const isPinned = Boolean(
    (submittedTurnId.current ?? activeTurnId.current) &&
    pinnedAnswers.some((item) => item.turnId === (submittedTurnId.current ?? activeTurnId.current))
  );
  const visualState = deriveOverlayVisualState({
    captureState: state,
    hasAnswer: Boolean(answer),
    paused,
    errorKind: error?.kind
  });

  return {
    state,
    visualState,
    settings,
    transcript,
    question,
    questionWasNormalized,
    answer,
    answerMeta,
    error,
    lastMetrics,
    paused,
    copied,
    pinnedAnswers,
    history,
    isPinned,
    startTurn,
    stopTurn,
    submit,
    cancel,
    copyAnswer,
    pinAnswer,
    discard,
    togglePause,
    unpin: (turnId: string) =>
      setPinnedAnswers((items) => items.filter((item) => item.turnId !== turnId)),
    setTranscript: (value: string) => {
      transcriptRef.current = value;
      setTranscript(value);
      setQuestion(value);
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
