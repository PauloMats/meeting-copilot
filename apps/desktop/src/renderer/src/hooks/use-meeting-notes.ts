import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type CaptureState,
  type CloudMeetingEntry,
  type MeetingContext,
  type MeetingNotePayload,
  type MeetingResult,
  type MeetingType,
  type SavedMeetingNoteEntry,
  type SpeakerSegment
} from "@meeting-copilot/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioCapture,
  AudioSourceStartError,
  SystemAudioUnavailableError,
  type AudioLevels
} from "../lib/audio-capture";
import {
  appendSegmentDelta,
  createSpeakerSegment,
  prepareSpeakerSegments,
  reconcileFinalTranscript,
  renderSegmentedTranscript
} from "../lib/daily-speaker-segments";

const EMPTY_AUDIO_LEVELS: AudioLevels = { system: 0, microphone: null };
const EMPTY_MEETING_SETUP: MeetingRecordingSetup = {
  meetingType: "general_meeting",
  meetingName: "",
  meetingDate: "",
  orderedParticipants: [],
  speakerHints: [],
  speakerSegments: []
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
  const [cloudMeetings, setCloudMeetings] = useState<CloudMeetingEntry[]>([]);
  const [isLoadingCloudMeetings, setIsLoadingCloudMeetings] = useState(false);
  const [restoringCloudMeetingId, setRestoringCloudMeetingId] = useState<string | null>(null);
  const [retryingPath, setRetryingPath] = useState<string | null>(null);
  const [dailySegments, setDailySegments] = useState<SpeakerSegment[]>([]);
  const [isDailyReviewPending, setIsDailyReviewPending] = useState(false);
  const [isPostMeetingDecisionPending, setIsPostMeetingDecisionPending] = useState(false);
  const capture = useRef(new AudioCapture());
  const transcriptRef = useRef("");
  const startedAt = useRef<string | null>(null);
  const startInFlight = useRef(false);
  const transcriptFrame = useRef<number | null>(null);
  const finalizationStarted = useRef(false);
  const finalizationTimer = useRef<number | null>(null);
  const meetingSetupRef = useRef<MeetingRecordingSetup>(EMPTY_MEETING_SETUP);
  const dailySegmentsRef = useRef<SpeakerSegment[]>([]);
  const activeDailySegmentRef = useRef(0);
  const endedAtRef = useRef<string | null>(null);
  const clientMeetingIdRef = useRef<string | null>(null);

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

  const refreshCloudMeetings = useCallback(async () => {
    setIsLoadingCloudMeetings(true);
    try {
      setCloudMeetings(await window.copilot.backend.listCloudMeetings());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load cloud meetings");
    } finally {
      setIsLoadingCloudMeetings(false);
    }
  }, []);

  useEffect(() => {
    void window.copilot.settings.get().then(setSettings);
    void refreshSavedNotes();
  }, [refreshSavedNotes]);

  useEffect(() => {
    if (settings.cloudSyncEnabled) void refreshCloudMeetings();
    else setCloudMeetings([]);
  }, [refreshCloudMeetings, settings.cloudSyncEnabled]);

  useEffect(() => {
    if (!isRecording || isPaused) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isPaused, isRecording]);

  const preparePostMeetingDecision = useCallback(
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
        setError(
          settings.language === "pt"
            ? "Nenhuma fala foi detectada nesta gravação."
            : "No speech was detected in this recording."
        );
        setState("error");
        return;
      }

      const endedAt = new Date().toISOString();
      endedAtRef.current = endedAt;
      const isDaily = meetingSetupRef.current.meetingType === "daily";
      if (isDaily) {
        const reconciled = reconcileFinalTranscript(dailySegmentsRef.current, value)
          .map((segment) => ({ ...segment, transcript: segment.transcript.trim() }))
          .filter((segment) => Boolean(segment.transcript));
        const reviewSegments = reconciled.length
          ? reconciled.map((segment, index) => ({ ...segment, position: index + 1 }))
          : [{ ...createSpeakerSegment(1), transcript: trimmed }];
        dailySegmentsRef.current = reviewSegments;
        setDailySegments(reviewSegments);
        setIsDailyReviewPending(true);
      }
      setIsPostMeetingDecisionPending(true);

      const payload = buildMeetingPayload({
        transcript: trimmed,
        summary: null,
        setup: meetingSetupRef.current,
        segments: dailySegmentsRef.current,
        clientMeetingId: clientMeetingIdRef.current,
        language: settings.language,
        startedAt: recordingStartedAt,
        endedAt
      });
      meetingSetupRef.current = meetingSetupFromPayload(payload);

      try {
        const saved = await window.copilot.meetingNotes.save({
          ...payload
        });
        setSavedPath(saved.filePath);
        setSavedNoticeVisible(true);
        await refreshSavedNotes();
        setError(null);
        setState("ready_to_send");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save the transcript");
        setState("ready_to_send");
      }
    },
    [refreshSavedNotes, settings.language]
  );

  const completeRecording = useCallback(
    (value: string) => preparePostMeetingDecision(value),
    [preparePostMeetingDecision]
  );

  const saveTranscriptOnly = useCallback(async () => {
    if (!isPostMeetingDecisionPending || state === "thinking") return;
    const recordingStartedAt = startedAt.current;
    const endedAt = endedAtRef.current;
    if (!recordingStartedAt || !endedAt) return;
    const payload = buildMeetingPayload({
      transcript: transcriptRef.current,
      summary: null,
      setup: meetingSetupRef.current,
      segments: dailySegmentsRef.current,
      clientMeetingId: clientMeetingIdRef.current,
      language: settings.language,
      startedAt: recordingStartedAt,
      endedAt
    });
    setState("thinking");
    setError(null);

    try {
      const saved = savedPath
        ? await window.copilot.meetingNotes.update(savedPath, payload)
        : await window.copilot.meetingNotes.save(payload);
      setSavedPath(saved.filePath);
      setSavedNoticeVisible(true);
      let cloudError: string | null = null;
      if (settings.cloudSyncEnabled && payload.clientMeetingId) {
        try {
          await window.copilot.backend.upsertCloudMeeting({
            ...payload,
            clientMeetingId: payload.clientMeetingId
          });
          await refreshCloudMeetings();
        } catch (cause) {
          cloudError = cause instanceof Error ? cause.message : "Cloud sync failed";
        }
      }
      setSummary(null);
      setSummaryExportReady(false);
      setIsDailyReviewPending(false);
      setIsPostMeetingDecisionPending(false);
      await refreshSavedNotes();
      setError(cloudError);
      setState("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the transcript");
      setState("ready_to_send");
    }
  }, [
    isPostMeetingDecisionPending,
    refreshCloudMeetings,
    refreshSavedNotes,
    savedPath,
    settings.cloudSyncEnabled,
    settings.language,
    state
  ]);

  const submitMeetingSummary = useCallback(async () => {
    if (!isPostMeetingDecisionPending || state === "thinking") return;
    const recordingStartedAt = startedAt.current;
    const endedAt = endedAtRef.current;
    if (!recordingStartedAt || !endedAt) return;

    const draft = buildMeetingPayload({
      transcript: transcriptRef.current,
      summary: null,
      setup: meetingSetupRef.current,
      segments: dailySegmentsRef.current,
      clientMeetingId: clientMeetingIdRef.current,
      language: settings.language,
      startedAt: recordingStartedAt,
      endedAt
    });
    if (!draft.transcript.trim()) {
      setError(settings.language === "pt" ? "Revise a transcrição." : "Review the transcript.");
      return;
    }
    meetingSetupRef.current = meetingSetupFromPayload(draft);
    setState("thinking");
    setError(null);

    try {
      const localDraft = savedPath
        ? await window.copilot.meetingNotes.update(savedPath, draft)
        : await window.copilot.meetingNotes.save(draft);
      setSavedPath(localDraft.filePath);
      setSavedNoticeVisible(true);

      let cloudError: string | null = null;
      if (settings.cloudSyncEnabled && draft.clientMeetingId) {
        try {
          await window.copilot.backend.upsertCloudMeeting({
            ...draft,
            clientMeetingId: draft.clientMeetingId
          });
        } catch (cause) {
          cloudError = cause instanceof Error ? cause.message : "Cloud sync failed";
        }
      }

      const response = await window.copilot.backend.generateMeetingSummary({
        transcript: draft.transcript,
        intelligenceLevel: settings.intelligenceLevel,
        language: settings.language,
        meetingType: draft.meetingType,
        meetingName: draft.meetingName,
        meetingDate: draft.meetingDate,
        orderedParticipants: draft.orderedParticipants,
        speakerHints: draft.speakerHints,
        speakerSegments: draft.speakerSegments
      });
      const completed = { ...draft, summary: response.summary };
      await window.copilot.meetingNotes.update(localDraft.filePath, completed);
      if (settings.cloudSyncEnabled && completed.clientMeetingId) {
        try {
          await window.copilot.backend.upsertCloudMeeting({
            ...completed,
            clientMeetingId: completed.clientMeetingId
          });
          await refreshCloudMeetings();
          cloudError = null;
        } catch (cause) {
          cloudError = cause instanceof Error ? cause.message : "Cloud sync failed";
        }
      }
      setSummary(response.summary);
      setSummaryMeetingType(response.meetingType);
      setSummaryExportReady(true);
      setIsDailyReviewPending(false);
      setIsPostMeetingDecisionPending(false);
      await refreshSavedNotes();
      setError(cloudError);
      setState("idle");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Meeting summary failed";
      setError(
        settings.language === "pt"
          ? `${message} A transcrição continua salva localmente.`
          : `${message} The transcript remains saved locally.`
      );
      setState("ready_to_send");
    }
  }, [
    isPostMeetingDecisionPending,
    refreshCloudMeetings,
    refreshSavedNotes,
    savedPath,
    settings.cloudSyncEnabled,
    settings.intelligenceLevel,
    settings.language,
    state
  ]);

  const discardMeeting = useCallback(async () => {
    if (!isPostMeetingDecisionPending || state === "thinking") return;
    setState("thinking");
    setError(null);
    const currentPath = savedPath;
    const clientMeetingId = clientMeetingIdRef.current;
    try {
      if (currentPath) await window.copilot.meetingNotes.delete(currentPath);
      if (clientMeetingId && settings.cloudSyncEnabled) {
        await window.copilot.backend.deleteCloudMeeting(clientMeetingId);
      }
      transcriptRef.current = "";
      dailySegmentsRef.current = [];
      clientMeetingIdRef.current = null;
      startedAt.current = null;
      endedAtRef.current = null;
      setTranscript("");
      setDailySegments([]);
      setSummary(null);
      setSummaryExportReady(false);
      setSavedPath(null);
      setSavedNoticeVisible(false);
      setIsDailyReviewPending(false);
      setIsPostMeetingDecisionPending(false);
      await refreshSavedNotes();
      if (settings.cloudSyncEnabled) await refreshCloudMeetings();
      setState("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the meeting");
      setState("ready_to_send");
    }
  }, [
    isPostMeetingDecisionPending,
    refreshCloudMeetings,
    refreshSavedNotes,
    savedPath,
    settings.cloudSyncEnabled,
    state
  ]);

  const startRecording = useCallback(
    async (meetingSetup: MeetingRecordingSetup) => {
      if (
        startInFlight.current ||
        isRecording ||
        isPostMeetingDecisionPending ||
        state === "thinking"
      ) {
        return;
      }
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
      setIsDailyReviewPending(false);
      setIsPostMeetingDecisionPending(false);
      setError(null);
      setAudioLevels({
        system: 0,
        microphone: settings.includeMicrophone ? 0 : null
      });
      finalizationStarted.current = false;
      startedAt.current = new Date().toISOString();
      endedAtRef.current = null;
      clientMeetingIdRef.current = window.crypto.randomUUID();
      const initialDailySegments =
        meetingSetup.meetingType === "daily" ? [createSpeakerSegment(1)] : [];
      dailySegmentsRef.current = initialDailySegments;
      activeDailySegmentRef.current = 0;
      setDailySegments(initialDailySegments);
      meetingSetupRef.current = {
        ...meetingSetup,
        speakerSegments: initialDailySegments
      };
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
    [
      isPostMeetingDecisionPending,
      isRecording,
      settings.includeMicrophone,
      settings.language,
      state
    ]
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
      void completeRecording(transcriptRef.current);
    }, 8000);
  }, [completeRecording, isRecording]);

  const nextDailySpeaker = useCallback(() => {
    if (
      !isRecording ||
      meetingSetupRef.current.meetingType !== "daily" ||
      dailySegmentsRef.current.length >= 30
    ) {
      return;
    }
    const active = dailySegmentsRef.current[activeDailySegmentRef.current];
    if (!active?.transcript.trim()) return;

    const next = [
      ...dailySegmentsRef.current,
      createSpeakerSegment(dailySegmentsRef.current.length + 1)
    ];
    dailySegmentsRef.current = next;
    activeDailySegmentRef.current = next.length - 1;
    setDailySegments(next);
  }, [isRecording]);

  const updateDailySegment = useCallback(
    (index: number, patch: Partial<Pick<SpeakerSegment, "participant" | "transcript">>) => {
      if (!isDailyReviewPending) return;
      const next = dailySegmentsRef.current.map((segment, segmentIndex) =>
        segmentIndex === index ? { ...segment, ...patch } : segment
      );
      dailySegmentsRef.current = next;
      setDailySegments(next);
    },
    [isDailyReviewPending]
  );

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
    setIsDailyReviewPending(false);
    setIsPostMeetingDecisionPending(false);
    clientMeetingIdRef.current = null;
    dailySegmentsRef.current = [];
    setDailySegments([]);
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
        const clientMeetingId = saved.clientMeetingId ?? window.crypto.randomUUID();
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
          speakerHints: saved.speakerHints,
          speakerSegments: saved.speakerSegments
        });
        const completed = {
          clientMeetingId,
          transcript: saved.transcript,
          summary: response.summary,
          meetingType: saved.meetingType,
          meetingName: saved.meetingName,
          meetingDate: saved.meetingDate,
          orderedParticipants: saved.orderedParticipants,
          speakerHints: saved.speakerHints,
          speakerSegments: saved.speakerSegments,
          language: saved.language,
          startedAt: saved.startedAt,
          endedAt: saved.endedAt
        };
        await window.copilot.meetingNotes.update(entry.filePath, completed);
        if (settings.cloudSyncEnabled) {
          await window.copilot.backend.upsertCloudMeeting(completed);
          await refreshCloudMeetings();
        }
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
      refreshCloudMeetings,
      refreshSavedNotes,
      retryingPath,
      settings.cloudSyncEnabled,
      settings.intelligenceLevel,
      settings.language,
      state
    ]
  );

  const restoreCloudMeeting = useCallback(
    async (entry: CloudMeetingEntry) => {
      if (
        isRecording ||
        isPostMeetingDecisionPending ||
        restoringCloudMeetingId ||
        state === "thinking"
      ) {
        return;
      }
      setRestoringCloudMeetingId(entry.id);
      setState("thinking");
      setError(null);
      try {
        const cloud = await window.copilot.backend.readCloudMeeting(entry.id);
        const payload: MeetingNotePayload = {
          clientMeetingId: cloud.clientMeetingId,
          transcript: cloud.transcript,
          summary: cloud.summary,
          meetingType: cloud.meetingType,
          meetingName: cloud.meetingName,
          meetingDate: cloud.meetingDate,
          orderedParticipants: cloud.orderedParticipants,
          speakerHints: cloud.speakerHints,
          speakerSegments: cloud.speakerSegments,
          language: cloud.language,
          startedAt: cloud.startedAt,
          endedAt: cloud.endedAt
        };
        const saved = await window.copilot.meetingNotes.save(payload);
        setSavedPath(saved.filePath);
        setSavedNoticeVisible(true);
        setTranscript(cloud.transcript);
        transcriptRef.current = cloud.transcript;
        setSummary(cloud.summary);
        setSummaryMeetingType(cloud.meetingType);
        setSummaryExportReady(cloud.summary !== null);
        await refreshSavedNotes();
        setState("idle");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not restore cloud meeting");
        setState("error");
      } finally {
        setRestoringCloudMeetingId(null);
      }
    },
    [isPostMeetingDecisionPending, isRecording, refreshSavedNotes, restoringCloudMeetingId, state]
  );

  useEffect(() => {
    const unsubscribe = [
      window.copilot.events.onSettingsChanged(setSettings),
      window.copilot.events.onStateChanged((next) => {
        if (next !== "ready_to_send") setState(next);
      }),
      window.copilot.events.onTranscriptDelta(({ delta }) => {
        transcriptRef.current += delta;
        if (meetingSetupRef.current.meetingType === "daily") {
          const next = appendSegmentDelta(
            dailySegmentsRef.current,
            activeDailySegmentRef.current,
            delta
          );
          dailySegmentsRef.current = next;
        }
        if (transcriptFrame.current === null) {
          transcriptFrame.current = window.requestAnimationFrame(() => {
            transcriptFrame.current = null;
            setTranscript(transcriptRef.current);
            if (meetingSetupRef.current.meetingType === "daily") {
              setDailySegments(dailySegmentsRef.current);
            }
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
        void completeRecording(finalTranscript);
      }),
      window.copilot.events.onTranscriptionError((message) => {
        setIsRecording(false);
        setIsPaused(false);
        void capture.current.stop();
        if (transcriptRef.current.trim()) {
          setError(`${message} Saving the partial transcript.`);
          void completeRecording(transcriptRef.current);
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
  }, [completeRecording]);

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
    cloudMeetings,
    isLoadingCloudMeetings,
    restoringCloudMeetingId,
    retryingPath,
    dailySegments,
    activeDailySegmentIndex: activeDailySegmentRef.current,
    isDailyReviewPending,
    isPostMeetingDecisionPending,
    startRecording,
    stopRecording,
    nextDailySpeaker,
    updateDailySegment,
    saveTranscriptOnly,
    submitMeetingSummary,
    discardMeeting,
    pauseRecording,
    resumeRecording,
    retrySavedNote,
    restoreCloudMeeting,
    refreshSavedNotes,
    refreshCloudMeetings,
    dismissSavedPath: () => setSavedNoticeVisible(false),
    cancel,
    updateSettings
  };
}

function buildMeetingPayload({
  transcript,
  summary,
  setup,
  segments,
  clientMeetingId,
  language,
  startedAt,
  endedAt
}: {
  transcript: string;
  summary: MeetingResult | null;
  setup: MeetingRecordingSetup;
  segments: SpeakerSegment[];
  clientMeetingId: string | null;
  language: string;
  startedAt: string;
  endedAt: string;
}): MeetingNotePayload {
  if (setup.meetingType !== "daily") {
    return {
      clientMeetingId,
      transcript: transcript.trim(),
      summary,
      ...setup,
      language,
      startedAt,
      endedAt
    };
  }

  const preparedSegments = prepareSpeakerSegments(segments, language === "pt");
  return {
    clientMeetingId,
    transcript: preparedSegments.length
      ? renderSegmentedTranscript(preparedSegments)
      : transcript.trim(),
    summary,
    ...setup,
    orderedParticipants: preparedSegments.map((segment) => segment.participant),
    speakerHints: [],
    speakerSegments: preparedSegments,
    language,
    startedAt,
    endedAt
  };
}

function meetingSetupFromPayload(payload: MeetingNotePayload): MeetingRecordingSetup {
  return {
    meetingType: payload.meetingType,
    meetingName: payload.meetingName,
    meetingDate: payload.meetingDate,
    orderedParticipants: payload.orderedParticipants,
    speakerHints: payload.speakerHints,
    speakerSegments: payload.speakerSegments
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
