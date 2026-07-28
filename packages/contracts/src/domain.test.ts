import { describe, expect, it } from "vitest";
import {
  AnswerSchema,
  DailySummarySchema,
  DEFAULT_SETTINGS,
  LegacyDailySummarySchema,
  MeetingContextSchema,
  MeetingNoteDataSchema,
  MeetingSummarySchema,
  SpeakerSegmentSchema,
  simplifyDailyResult
} from "./domain.js";

describe("contracts", () => {
  it("uses privacy-first defaults", () => {
    expect(DEFAULT_SETTINGS.doNotSaveAudio).toBe(true);
    expect(DEFAULT_SETTINGS.autoSubmit).toBe(true);
    expect(DEFAULT_SETTINGS.audioRetentionDays).toBe(0);
  });

  it("rejects incomplete answers", () => {
    expect(() => AnswerSchema.parse({ direct_answer: "Use a queue." })).toThrow();
  });

  it("validates structured meeting summaries", () => {
    const summary = MeetingSummarySchema.parse({
      title: "Weekly planning",
      overview: "The team planned the next delivery.",
      key_topics: [{ topic: "Release", summary: "Ship on Friday." }],
      decisions: [{ decision: "Use staged rollout", context: "Reduce risk." }],
      action_items: [
        {
          task: "Prepare the release notes",
          owner: "Ana",
          due_date: "Friday",
          priority: "high"
        }
      ],
      next_steps: ["Review the rollout plan"],
      open_questions: ["Who monitors the weekend?"]
    });

    expect(summary.action_items[0]?.owner).toBe("Ana");
  });

  it("validates person-by-person daily status reports", () => {
    const daily = DailySummarySchema.parse({
      title: "Daily Dourado — 23/07/2026",
      participant_updates: [
        {
          participant: "Igor",
          attribution_confidence: "high",
          updates: ["Está ajustando os testes da funcionalidade de procura."],
          blockers: ["The representatives route is unavailable."],
          next_steps: ["Finish the task after the route is available."]
        }
      ],
      unresolved_attributions: []
    });

    expect(daily.participant_updates[0]?.updates[0]).toContain("testes");
  });

  it("keeps rich v0.5 daily results compatible with the simplified presentation", () => {
    const legacy = LegacyDailySummarySchema.parse({
      title: "Daily Dourado — 24/07/2026",
      overview: "The team reported progress.",
      participant_updates: [
        {
          participant: "Igor",
          attribution_confidence: "high",
          summary: "Igor está ajustando os testes.",
          completed: [],
          in_progress: ["Está ajustando os testes da procura."],
          blockers: ["A rota padrão está com erro."],
          dependencies: [
            {
              person_or_team: "Victor",
              dependency: "Corrigir a rota padrão."
            }
          ],
          next_steps: ["Criará uma subtarefa."]
        }
      ],
      team_blockers: [],
      team_next_steps: [],
      absent_participants: [],
      unresolved_attributions: []
    });

    const simplified = simplifyDailyResult(legacy);
    expect(simplified.participantUpdates[0]).toMatchObject({
      participant: "Igor",
      blockers: ["A rota padrão está com erro.", "Victor: Corrigir a rota padrão."],
      nextSteps: ["Criará uma subtarefa."]
    });
  });

  it("validates the local structured meeting result sidecar", () => {
    const data = MeetingNoteDataSchema.parse({
      schema_version: 1,
      meeting: {
        type: "general_meeting",
        name: "Planejamento",
        date: "2026-07-24",
        language: "pt",
        started_at: "2026-07-24T12:00:00.000Z",
        ended_at: "2026-07-24T12:30:00.000Z",
        ordered_participants: ["Ana"],
        speaker_hints: []
      },
      ai_result: {
        title: "Planejamento",
        overview: "Entrega organizada.",
        key_topics: [],
        decisions: [],
        action_items: [],
        next_steps: [],
        open_questions: []
      }
    });

    expect(data.ai_result?.title).toBe("Planejamento");
  });

  it("validates manually separated daily speaker segments", () => {
    const segment = SpeakerSegmentSchema.parse({
      position: 1,
      participant: "Bianca",
      transcript: "Ontem concluí o endpoint de pagamentos."
    });
    const legacyContext = MeetingContextSchema.parse({});

    expect(segment.participant).toBe("Bianca");
    expect(legacyContext.speakerSegments).toEqual([]);
  });
});
