import type { Answer, DailySummary, MeetingSummary } from "@meeting-copilot/contracts";
import type { OpenAI } from "openai";
import { describe, expect, it, vi } from "vitest";
import { AnswerService } from "../src/modules/answering/service.js";
import { MeetingSummaryService } from "../src/modules/meeting-summary/service.js";

const answer: Answer = {
  direct_answer: "Use low for the basic model.",
  detailed_explanation: "The basic model does not support minimal reasoning effort.",
  example: "reasoning: { effort: low }",
  assumptions: [],
  follow_up_questions: [],
  confidence: "high"
};

const summary: MeetingSummary = {
  title: "Reasoning effort fix",
  overview: "The basic preset now uses a supported effort.",
  key_topics: [],
  decisions: [],
  action_items: [],
  next_steps: [],
  open_questions: []
};

const generalMeetingContext = {
  meetingType: "general_meeting" as const,
  meetingName: "",
  meetingDate: "",
  orderedParticipants: [],
  speakerHints: []
};

const dailySummary: DailySummary = {
  title: "Daily",
  overview: "The team shared status updates.",
  participant_updates: [],
  team_blockers: [],
  team_next_steps: [],
  absent_participants: [],
  unresolved_attributions: []
};

function createOpenAI(output: Answer | MeetingSummary | DailySummary) {
  const parse = vi.fn().mockResolvedValue({ output_parsed: output });
  return {
    client: { responses: { parse } } as unknown as OpenAI,
    parse
  };
}

describe("basic reasoning effort", () => {
  it("uses low when generating a meeting summary", async () => {
    const { client, parse } = createOpenAI(summary);
    const service = new MeetingSummaryService(
      client,
      { basic: "gpt-5.4-nano", balanced: "gpt-5.4-mini", advanced: "gpt-5.4" },
      520
    );

    await service.generate({
      transcript: "We agreed to use the supported reasoning effort.",
      intelligenceLevel: "basic",
      language: "en",
      ...generalMeetingContext
    });

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.4-nano",
        max_output_tokens: 2000,
        reasoning: { effort: "low" }
      })
    );
  });

  it("retries a truncated meeting summary once with compact instructions", async () => {
    const parse = vi
      .fn()
      .mockRejectedValueOnce(new SyntaxError("Unterminated string in JSON at position 4899"))
      .mockResolvedValueOnce({ output_parsed: summary });
    const service = new MeetingSummaryService(
      { responses: { parse } } as unknown as OpenAI,
      { basic: "gpt-5.4-nano", balanced: "gpt-5.4-mini", advanced: "gpt-5.4" },
      520
    );

    await service.generate({
      transcript: "A longer meeting transcript that needs a compact retry.",
      intelligenceLevel: "basic",
      language: "en",
      ...generalMeetingContext
    });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        max_output_tokens: 2000,
        input: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("A previous structured response was truncated")
          })
        ])
      })
    );
  });

  it("does not retry unrelated meeting summary failures", async () => {
    const providerError = new Error("Provider unavailable");
    const parse = vi.fn().mockRejectedValue(providerError);
    const service = new MeetingSummaryService(
      { responses: { parse } } as unknown as OpenAI,
      { basic: "gpt-5.4-nano", balanced: "gpt-5.4-mini", advanced: "gpt-5.4" },
      520
    );

    await expect(
      service.generate({
        transcript: "A meeting transcript.",
        intelligenceLevel: "basic",
        language: "en",
        ...generalMeetingContext
      })
    ).rejects.toBe(providerError);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("uses the daily processor, attribution context, and daily retry instructions", async () => {
    const parse = vi
      .fn()
      .mockRejectedValueOnce(new SyntaxError("Unexpected end of JSON input"))
      .mockResolvedValueOnce({ output_parsed: dailySummary });
    const service = new MeetingSummaryService(
      { responses: { parse } } as unknown as OpenAI,
      { basic: "gpt-5.4-nano", balanced: "gpt-5.4-mini", advanced: "gpt-5.4" },
      520
    );

    await service.generate({
      transcript: "Igor is waiting for Victor to publish a route.",
      intelligenceLevel: "balanced",
      language: "pt-BR",
      meetingType: "daily",
      meetingName: "Daily Dourado",
      meetingDate: "2026-07-23",
      orderedParticipants: ["Igor", "Rafaela"],
      speakerHints: [
        {
          participant: "Igor",
          evidence: "The first update starts after Igor, pode começar."
        }
      ]
    });

    expect(parse).toHaveBeenCalledTimes(2);
    const retryRequest = parse.mock.calls[1]?.[0];
    expect(retryRequest).toEqual(
      expect.objectContaining({
        input: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining(
              "A previous structured daily report was truncated or invalid"
            )
          }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining('"ordered_participants":["Igor","Rafaela"]')
          })
        ]),
        text: expect.objectContaining({
          format: expect.objectContaining({ name: "daily_status_report" })
        })
      })
    );
  });

  it("uses low when generating a copilot answer", async () => {
    const { client, parse } = createOpenAI(answer);
    const service = new AnswerService(
      client,
      { basic: "gpt-5.4-nano", balanced: "gpt-5.4-mini", advanced: "gpt-5.4" },
      {
        findProfile: vi.fn().mockResolvedValue(null),
        listGlossaryTerms: vi.fn().mockResolvedValue([])
      },
      { search: vi.fn().mockResolvedValue([]) },
      { maxOutputTokens: 520, contextChars: 6000, retrievalLimit: 0 }
    );

    await service.generate({
      transcript: "Which reasoning effort should the basic model use?",
      intelligenceLevel: "basic",
      contextProfileId: null,
      meetingMemory: []
    });

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.4-nano",
        reasoning: { effort: "low" }
      })
    );
  });
});
