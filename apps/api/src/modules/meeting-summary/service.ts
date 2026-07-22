import {
  MeetingSummarySchema,
  type IntelligenceLevel,
  type MeetingSummaryRequest,
  type MeetingSummaryResponse
} from "@meeting-copilot/contracts";
import type { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";

export class MeetingSummaryService {
  constructor(
    private readonly openai: OpenAI,
    private readonly models: Record<IntelligenceLevel, string>,
    private readonly baseMaxOutputTokens: number
  ) {}

  async generate(request: MeetingSummaryRequest): Promise<MeetingSummaryResponse> {
    const preset = getSummaryPreset(request.intelligenceLevel, this.baseMaxOutputTokens);
    const model = this.models[request.intelligenceLevel];
    const response = await this.openai.responses.parse({
      model,
      store: false,
      reasoning: { effort: preset.reasoningEffort },
      max_output_tokens: preset.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "You turn meeting transcripts into accurate, practical meeting notes. Write in the same language as the transcript. " +
            "Separate facts from commitments. Capture the meeting purpose, important context, decisions, action items, owners, deadlines, next steps, and unresolved questions. " +
            "Never invent an owner, deadline, decision, or fact. Use an empty string when an action owner or due date was not stated. " +
            "Consolidate duplicates, ignore transcription noise and small talk, and keep the overview concise but useful."
        },
        {
          role: "user",
          content: JSON.stringify({
            requested_language: request.language,
            meeting_transcript: truncate(request.transcript, preset.maxTranscriptChars)
          })
        }
      ],
      text: {
        format: zodTextFormat(MeetingSummarySchema, "meeting_summary")
      }
    });

    if (!response.output_parsed) {
      throw new Error("Meeting summary model returned no structured output");
    }

    return {
      summary: MeetingSummarySchema.parse(response.output_parsed),
      model,
      intelligenceLevel: request.intelligenceLevel
    };
  }
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

function getSummaryPreset(level: IntelligenceLevel, baseMaxOutputTokens: number) {
  if (level === "advanced") {
    return {
      maxOutputTokens: Math.max(baseMaxOutputTokens, 2000),
      maxTranscriptChars: 120_000,
      reasoningEffort: "medium" as const
    };
  }
  if (level === "balanced") {
    return {
      maxOutputTokens: Math.max(baseMaxOutputTokens, 1500),
      maxTranscriptChars: 90_000,
      reasoningEffort: "low" as const
    };
  }
  return {
    maxOutputTokens: Math.max(baseMaxOutputTokens, 1100),
    maxTranscriptChars: 60_000,
    reasoningEffort: "low" as const
  };
}
