import { describe, expect, it } from "vitest";
import {
  appendSegmentDelta,
  createPlannedSpeakerSegments,
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

  it("creates the complete planned speaking order before recording", () => {
    expect(createPlannedSpeakerSegments([" Bianca ", "Igor", "Rafaela"])).toEqual([
      { position: 1, participant: "Bianca", transcript: "" },
      { position: 2, participant: "Igor", transcript: "" },
      { position: 3, participant: "Rafaela", transcript: "" }
    ]);
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

  it("keeps a final suffix with the active planned speaker", () => {
    const segments = createPlannedSpeakerSegments(["Bianca", "Igor", "Rafaela"]);
    segments[0] = { ...segments[0]!, transcript: "Primeiro trecho. " };
    segments[1] = { ...segments[1]!, transcript: "Segundo" };

    const result = reconcileFinalTranscript(segments, "Primeiro trecho. Segundo trecho.", 1);

    expect(result[1]?.transcript).toBe("Segundo trecho.");
    expect(result[2]?.transcript).toBe("");
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
