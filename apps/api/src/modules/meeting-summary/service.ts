import {
  DailySummarySchema,
  MeetingResultSchema,
  MeetingSummarySchema,
  type IntelligenceLevel,
  type MeetingSummaryRequest,
  type MeetingSummaryResponse,
  type MeetingType
} from "@meeting-copilot/contracts";
import type { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ZodError, type ZodType } from "zod";

const GENERAL_MEETING_PROMPT =
  "You turn meeting transcripts into accurate, practical meeting notes. Write in the same language as the transcript. " +
  "Separate facts from commitments. Capture the meeting purpose, important context, decisions, action items, owners, deadlines, next steps, and unresolved questions. " +
  "Never invent an owner, deadline, decision, or fact. Use an empty string when an action owner or due date was not stated. " +
  "Consolidate duplicates, ignore transcription noise and small talk, and keep every text field concise. ";

const DAILY_PROMPT = `You transform software team daily stand-up transcripts into accurate, concise, person-by-person status reports.

Write in the language specified by \`requested_language\`. If it is not provided, use the same language as the transcript.

This is a DAILY STATUS REPORT, not general meeting minutes.

Your primary goals are:

1. Correctly attribute each update to the person who said it.
2. Summarize each participant's work, current progress, blockers, dependencies, and next steps.
3. Preserve technical context without turning the daily into a long meeting summary.

The input may contain:

* \`meeting_name\`: the name of the daily or project.
* \`meeting_date\`: the meeting date.
* \`ordered_participants\`: participants in their expected speaking order.
* \`speaker_hints\`: known speaker identifications or excerpts.
* \`meeting_transcript\`: the complete transcript.

Speaker attribution rules:

* Explicitly spoken names and direct handoffs such as “Igor, pode começar”, “beleza, Luiz” or “agora Rafaela” are the strongest evidence.
* Use \`speaker_hints\` as authoritative attribution evidence.
* Use \`ordered_participants\` as a likely speaking sequence when the transcript does not identify every speaker.
* When one speaker is explicitly identified, use that segment as an anchor to infer adjacent speakers from the provided order.
* Do not assume the participant order is definitive when the transcript contains evidence of a different order.
* Never merge updates from different speakers.
* A person mentioned inside an update is not necessarily the current speaker.
* A person mentioned as a dependency must not automatically receive an action item.
* If attribution remains uncertain, use an empty participant name and record the segment in \`unresolved_attributions\`.
* Set \`attribution_confidence\` to \`high\`, \`medium\`, or \`low\` according to the available evidence.

For each identified participant, extract only information explicitly supported by the transcript:

* \`summary\`: concise overview of the participant's update.
* \`completed\`: work explicitly described as finished.
* \`in_progress\`: work currently being performed.
* \`blockers\`: issues preventing or delaying progress.
* \`dependencies\`: work, approval, route, PR, environment, response, or correction expected from another person or team.
* \`next_steps\`: actions the participant explicitly said they will perform next.

Do not force information into a category. Use an empty array when a category was not mentioned.

Do not:

* Organize the result primarily by general meeting topics.
* Invent priorities.
* Invent deadlines.
* Invent owners.
* Invent decisions.
* Invent open questions.
* Convert every mentioned activity into an action item.
* Treat speculation as fact.
* Add recommendations that were not discussed.
* Repeat the same information in multiple fields.
* Include greetings, farewells, jokes, transcription noise, or irrelevant small talk.

When a participant says they are waiting for another person, record it as a dependency or blocker for the speaker. Do not create a separate participant update for the person being waited on unless that person also spoke.

Preserve names of people, products, systems, tickets, routes, endpoints, pull requests, environments, and technical terms whenever they are reasonably clear.

Keep every text field concise. Prefer one to four short items per field.

Return only valid structured JSON matching the required schema.`;

const DAILY_RETRY_PROMPT = `A previous structured daily report was truncated or invalid.

Return a new, complete, valid, and more compact JSON response matching the required schema.

Preserve:

Correct speaker attribution.
Explicit blockers.
Explicit dependencies.
Explicit next steps.
Important technical terms.
Explicitly absent participants.

Reduce verbosity by:

Limiting each participant summary to one sentence.
Limiting completed, in-progress, blockers, dependencies, and next steps to four items each.
Limiting team blockers and team next steps to six items each.
Removing repeated context.
Omitting minor details before removing explicit commitments or blockers.

Return only valid JSON. Do not include Markdown or explanatory text.`;

export class MeetingSummaryService {
  constructor(
    private readonly openai: OpenAI,
    private readonly models: Record<IntelligenceLevel, string>,
    private readonly baseMaxOutputTokens: number
  ) {}

  async generate(request: MeetingSummaryRequest): Promise<MeetingSummaryResponse> {
    const preset = getSummaryPreset(request.intelligenceLevel, this.baseMaxOutputTokens);
    const model = this.models[request.intelligenceLevel];
    const processor = getProcessor(request.meetingType);
    let parsed: unknown;

    try {
      const response = await this.requestSummary(request, preset, model, processor, false);
      parsed = processor.responseSchema.parse(response.output_parsed);
    } catch (error) {
      if (!isRetryableStructuredOutputError(error)) throw error;
      const response = await this.requestSummary(request, preset, model, processor, true);
      parsed = processor.responseSchema.parse(response.output_parsed);
    }

    return {
      summary: MeetingResultSchema.parse(parsed),
      meetingType: request.meetingType,
      model,
      intelligenceLevel: request.intelligenceLevel
    };
  }

  private requestSummary(
    request: MeetingSummaryRequest,
    preset: SummaryPreset,
    model: string,
    processor: SummaryProcessor,
    compactRetry: boolean
  ) {
    const instructions =
      request.meetingType === "daily"
        ? compactRetry
          ? `${processor.systemPrompt}\n\n${DAILY_RETRY_PROMPT}`
          : processor.systemPrompt
        : `${processor.systemPrompt}${
            compactRetry
              ? "A previous structured response was truncated. Return a more compact summary while preserving explicit decisions and commitments. " +
                "Limit key topics, decisions, next steps, and open questions to 8 items each, and action items to 12. "
              : "Limit key topics, decisions, next steps, and open questions to 12 items each, and action items to 20. "
          }`;

    return this.openai.responses.parse({
      model,
      store: false,
      reasoning: { effort: preset.reasoningEffort },
      max_output_tokens: preset.maxOutputTokens,
      input: [
        {
          role: "system",
          content: instructions
        },
        {
          role: "user",
          content: JSON.stringify(buildModelInput(request, preset.maxTranscriptChars))
        }
      ],
      text: {
        format: zodTextFormat(processor.responseSchema, processor.schemaName)
      }
    });
  }
}

interface SummaryProcessor {
  systemPrompt: string;
  responseSchema: ZodType;
  schemaName: string;
}

function getProcessor(meetingType: MeetingType): SummaryProcessor {
  return meetingType === "daily"
    ? {
        systemPrompt: DAILY_PROMPT,
        responseSchema: DailySummarySchema,
        schemaName: "daily_status_report"
      }
    : {
        systemPrompt: GENERAL_MEETING_PROMPT,
        responseSchema: MeetingSummarySchema,
        schemaName: "meeting_summary"
      };
}

function buildModelInput(request: MeetingSummaryRequest, maxTranscriptChars: number) {
  const common = {
    requested_language: request.language,
    meeting_transcript: truncate(request.transcript, maxTranscriptChars)
  };
  if (request.meetingType !== "daily") return common;
  return {
    requested_language: request.language,
    meeting_name: request.meetingName,
    meeting_date: request.meetingDate,
    ordered_participants: request.orderedParticipants,
    speaker_hints: request.speakerHints,
    meeting_transcript: common.meeting_transcript
  };
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

function getSummaryPreset(level: IntelligenceLevel, baseMaxOutputTokens: number): SummaryPreset {
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

function isRetryableStructuredOutputError(error: unknown): boolean {
  return (
    error instanceof ZodError ||
    (error instanceof SyntaxError && /unterminated string|unexpected end|json/i.test(error.message))
  );
}
