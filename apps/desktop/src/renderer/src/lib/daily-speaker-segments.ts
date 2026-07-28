import type { SpeakerSegment } from "@meeting-copilot/contracts";

export function createSpeakerSegment(position: number): SpeakerSegment {
  return {
    position,
    participant: "",
    transcript: ""
  };
}

export function appendSegmentDelta(
  segments: SpeakerSegment[],
  activeIndex: number,
  delta: string
): SpeakerSegment[] {
  if (!delta || !segments[activeIndex]) return segments;
  return segments.map((segment, index) =>
    index === activeIndex ? { ...segment, transcript: segment.transcript + delta } : segment
  );
}

export function reconcileFinalTranscript(
  segments: SpeakerSegment[],
  finalTranscript: string
): SpeakerSegment[] {
  const current = segments.length ? segments : [createSpeakerSegment(1)];
  const streamed = current.map((segment) => segment.transcript).join("");
  if (!streamed.trim()) {
    const first = current[0] ?? createSpeakerSegment(1);
    return [{ ...first, transcript: finalTranscript }, ...current.slice(1)];
  }
  if (finalTranscript.startsWith(streamed) && finalTranscript.length > streamed.length) {
    const lastIndex = current.length - 1;
    return appendSegmentDelta(current, lastIndex, finalTranscript.slice(streamed.length));
  }
  return current;
}

export function prepareSpeakerSegments(
  segments: SpeakerSegment[],
  portuguese: boolean
): SpeakerSegment[] {
  return segments
    .map((segment, index) => ({
      position: index + 1,
      participant: segment.participant.trim() || `${portuguese ? "Pessoa" : "Person"} ${index + 1}`,
      transcript: segment.transcript.trim()
    }))
    .filter((segment) => Boolean(segment.transcript));
}

export function renderSegmentedTranscript(segments: SpeakerSegment[]): string {
  return segments.map((segment) => `[${segment.participant}]\n${segment.transcript}`).join("\n\n");
}
