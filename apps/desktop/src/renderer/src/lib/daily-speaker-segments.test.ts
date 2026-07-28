import { describe, expect, it } from "vitest";
import {
  appendSegmentDelta,
  createSpeakerSegment,
  prepareSpeakerSegments,
  reconcileFinalTranscript,
  renderSegmentedTranscript
} from "./daily-speaker-segments";

describe("daily speaker segments", () => {
  it("assigns streaming deltas to the active person", () => {
    const segments = [createSpeakerSegment(1), createSpeakerSegment(2)];
    const next = appendSegmentDelta(segments, 1, "Trabalhei no checkout.");

    expect(next[0]?.transcript).toBe("");
    expect(next[1]?.transcript).toBe("Trabalhei no checkout.");
  });

  it("adds an unmatched final suffix to the last person", () => {
    const segments = [
      { position: 1, participant: "", transcript: "Primeiro trecho. " },
      { position: 2, participant: "", transcript: "Segundo" }
    ];

    expect(
      reconcileFinalTranscript(segments, "Primeiro trecho. Segundo trecho.")[1]?.transcript
    ).toBe("Segundo trecho.");
  });

  it("uses reviewed names and explicit labels in the AI transcript", () => {
    const prepared = prepareSpeakerSegments(
      [
        { position: 1, participant: " Bianca ", transcript: " Entreguei a API. " },
        { position: 2, participant: "", transcript: "Estou no frontend." }
      ],
      true
    );

    expect(prepared.map((segment) => segment.participant)).toEqual(["Bianca", "Pessoa 2"]);
    expect(renderSegmentedTranscript(prepared)).toBe(
      "[Bianca]\nEntreguei a API.\n\n[Pessoa 2]\nEstou no frontend."
    );
  });
});
