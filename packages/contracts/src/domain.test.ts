import { describe, expect, it } from "vitest";
import {
  AnswerSchema,
  DailySummarySchema,
  DEFAULT_SETTINGS,
  MeetingNoteDataSchema,
  MeetingSummarySchema
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
      overview: "The team reported progress and one dependency.",
      participant_updates: [
        {
          participant: "Igor",
          attribution_confidence: "high",
          summary: "Igor is waiting for a representatives route.",
          completed: [],
          in_progress: ["Resolve a dashboard issue."],
          blockers: ["The representatives route is unavailable."],
          dependencies: [
            {
              person_or_team: "Victor",
              dependency: "Provide the representatives route."
            }
          ],
          next_steps: ["Finish the task after the route is available."]
        }
      ],
      team_blockers: [],
      team_next_steps: [],
      absent_participants: ["Lúcio"],
      unresolved_attributions: []
    });

    expect(daily.participant_updates[0]?.dependencies[0]?.person_or_team).toBe("Victor");
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
});
