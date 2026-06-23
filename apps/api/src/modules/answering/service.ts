import {
  AnswerSchema,
  type AnswerRequest,
  type AnswerResponse,
  type ContextProfile,
  type GlossaryTerm
} from "@meeting-copilot/contracts";
import type OpenAI from "openai";
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
    private readonly model: string,
    private readonly contextRepository: AnswerContextRepository,
    private readonly retrieval: RetrievalProvider,
    private readonly normalizer = new GlossaryNormalizer()
  ) {}

  async generate(request: AnswerRequest): Promise<AnswerResponse> {
    const [profile, glossaryTerms] = await Promise.all([
      this.contextRepository.findProfile(request.contextProfileId),
      this.contextRepository.listGlossaryTerms()
    ]);
    const normalized = this.normalizer.normalize(request.transcript, glossaryTerms);
    const snippets = await this.retrieval.search({
      query: normalized.normalized,
      contextProfileId: request.contextProfileId,
      limit: 6
    });

    const response = await this.openai.responses.parse({
      model: this.model,
      store: false,
      input: [
        {
          role: "system",
          content:
            "You are a silent technical meeting copilot. Answer the question directly and concisely. " +
            "Use supplied context when relevant, clearly state assumptions, and never invent project facts."
        },
        {
          role: "user",
          content: JSON.stringify({
            finalized_transcript: request.transcript,
            normalized_transcript: normalized.normalized,
            trailing_meeting_memory: request.meetingMemory,
            context_profile: profile,
            retrieved_knowledge: snippets
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
      rawTranscript: normalized.original,
      normalizedTranscript: normalized.normalized,
      retrievedSnippets: snippets
    };
  }
}
