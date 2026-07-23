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
    let response;
    try {
      response = await this.requestSummary(request, preset, model, false);
    } catch (error) {
      if (!isIncompleteStructuredOutput(error)) throw error;
      response = await this.requestSummary(request, preset, model, true);
    }

    if (!response.output_parsed) {
      throw new Error("Meeting summary model returned no structured output");
    }

    return {
      summary: MeetingSummarySchema.parse(response.output_parsed),
      model,
      intelligenceLevel: request.intelligenceLevel
    };
  }

  private requestSummary(
    request: MeetingSummaryRequest,
    preset: SummaryPreset,
    model: string,
    compactRetry: boolean
  ) {
    const compactInstruction = compactRetry
      ? "A previous structured response was truncated. Return a more compact summary while preserving explicit decisions and commitments. " +
        "Limit key topics, decisions, next steps, and open questions to 8 items each, and action items to 12. "
      : "Limit key topics, decisions, next steps, and open questions to 12 items each, and action items to 20. ";

    return this.openai.responses.parse({
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
            "Consolidate duplicates, ignore transcription noise and small talk, and keep every text field concise. " +
            compactInstruction
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
  }
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

interface SummaryPreset {
  maxOutputTokens: number;
  maxTranscriptChars: number;
  reasoningEffort: "low" | "medium";
}

function getSummaryPreset(
  level: IntelligenceLevel,
  baseMaxOutputTokens: number
): SummaryPreset {
  if (level === "advanced") {
    return {
      maxOutputTokens: Math.max(baseMaxOutputTokens, 2000),
      maxTranscriptChars: 120_000,
      reasoningEffort: "medium" as const
    };
  }
  if (level === "balanced") {
    return {
      maxOutputTokens: Math.max(baseMaxOutputTokens, 2000),
      maxTranscriptChars: 90_000,
      reasoningEffort: "low" as const
    };
  }
  return {
    maxOutputTokens: Math.max(baseMaxOutputTokens, 2000),
    maxTranscriptChars: 60_000,
    reasoningEffort: "low"
  };
}

function isIncompleteStructuredOutput(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    /unterminated string|unexpected end|json/i.test(error.message)
  );
}
