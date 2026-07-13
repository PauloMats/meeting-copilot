import {
  AnswerSchema,
  type AnswerRequest,
  type AnswerResponse,
  type ContextProfile,
  type GlossaryTerm,
  type IntelligenceLevel
} from "@meeting-copilot/contracts";
import type { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { GlossaryNormalizer } from "../glossary/normalizer.js";
import type { RetrievalProvider } from "../retrieval/types.js";

export interface AnswerContextRepository {
  findProfile(id: string | null): Promise<ContextProfile | null>;
  listGlossaryTerms(): Promise<GlossaryTerm[]>;
}

export class AnswerService {
  constructor(
    private readonly openai: OpenAI,
    private readonly models: Record<IntelligenceLevel, string>,
    private readonly contextRepository: AnswerContextRepository,
    private readonly retrieval: RetrievalProvider,
    private readonly baseOptions: AnswerOptions,
    private readonly normalizer = new GlossaryNormalizer()
  ) {}

  async generate(request: AnswerRequest): Promise<AnswerResponse> {
    const [profile, glossaryTerms] = await Promise.all([
      this.contextRepository.findProfile(request.contextProfileId),
      this.contextRepository.listGlossaryTerms()
    ]);
    const normalized = this.normalizer.normalize(request.transcript, glossaryTerms);
    const preset = getPreset(request.intelligenceLevel, this.baseOptions);
    const model = this.models[request.intelligenceLevel];
    const snippets =
      preset.retrievalLimit > 0
        ? await this.retrieval.search({
            query: normalized.normalized,
            contextProfileId: request.contextProfileId,
            limit: preset.retrievalLimit
          })
        : [];
    const compactSnippets = snippets.map((snippet) => ({
      id: snippet.id,
      source: snippet.source,
      score: snippet.score,
      content: truncate(snippet.content, 900)
    }));

    const response = await this.openai.responses.parse({
      model,
      store: false,
      reasoning: { effort: preset.reasoningEffort },
      max_output_tokens: preset.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "You are a fast silent technical meeting copilot. Return a short practical answer in the same language as the transcript. " +
            "Prioritize speed over depth. The field sayThis must be a concise phrase the user can say out loud immediately. " +
            "Keep sayThis under 70 words, keyPoints short, details under 140 words, and example minimal. " +
            "If uncertain, state the assumption briefly. Do not produce long research-style answers."
        },
        {
          role: "user",
          content: JSON.stringify({
            finalized_transcript: truncate(request.transcript, preset.contextChars),
            normalized_transcript: truncate(normalized.normalized, preset.contextChars),
            trailing_meeting_memory: request.meetingMemory.slice(-preset.memoryTurns),
            context_profile: profile ? compactProfile(profile) : null,
            retrieved_knowledge: compactSnippets
          })
        }
      ],
      text: {
        format: zodTextFormat(AnswerSchema, "technical_meeting_answer")
      }
    });

    if (!response.output_parsed) {
      throw new Error("Answer model returned no structured output");
    }

    return {
      answer: AnswerSchema.parse(response.output_parsed),
      model,
      intelligenceLevel: request.intelligenceLevel,
      rawTranscript: normalized.original,
      normalizedTranscript: normalized.normalized,
      retrievedSnippets: snippets
    };
  }
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

function compactProfile(
  profile: ContextProfile
): Pick<ContextProfile, "id" | "name" | "projectDescription" | "techStack" | "businessContext"> {
  return {
    id: profile.id,
    name: profile.name,
    projectDescription: truncate(profile.projectDescription, 1200),
    techStack: profile.techStack.slice(0, 20),
    businessContext: truncate(profile.businessContext, 1200)
  };
}

type AnswerOptions = {
  maxOutputTokens: number;
  contextChars: number;
  retrievalLimit: number;
};

type AnswerPreset = AnswerOptions & {
  reasoningEffort: "minimal" | "low" | "medium";
  memoryTurns: number;
};

function getPreset(level: IntelligenceLevel, base: AnswerOptions): AnswerPreset {
  if (level === "advanced") {
    return {
      maxOutputTokens: Math.max(base.maxOutputTokens, 900),
      contextChars: Math.max(base.contextChars, 10000),
      retrievalLimit: Math.max(base.retrievalLimit, 3),
      reasoningEffort: "medium",
      memoryTurns: 5
    };
  }
  if (level === "balanced") {
    return {
      maxOutputTokens: Math.max(base.maxOutputTokens, 700),
      contextChars: Math.max(base.contextChars, 8000),
      retrievalLimit: Math.max(base.retrievalLimit, 1),
      reasoningEffort: "low",
      memoryTurns: 4
    };
  }
  return {
    maxOutputTokens: base.maxOutputTokens,
    contextChars: base.contextChars,
    retrievalLimit: base.retrievalLimit,
    reasoningEffort: "minimal",
    memoryTurns: 3
  };
}
