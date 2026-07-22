import type { Answer, MeetingSummary } from "@meeting-copilot/contracts";
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

function createOpenAI(output: Answer | MeetingSummary) {
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
      language: "en"
    });

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.4-nano",
        reasoning: { effort: "low" }
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
