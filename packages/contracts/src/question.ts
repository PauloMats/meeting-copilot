import { z } from "zod";

export const QuestionDetectionResultSchema = z.object({
  accepted: z.boolean(),
  question: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  reason: z.string()
});
export type QuestionDetectionResult = z.infer<typeof QuestionDetectionResultSchema>;

const MIN_QUESTION_CHARS = 12;

const ignoredPrompts = [
  "alguma pergunta",
  "alguma dúvida",
  "alguém tem pergunta",
  "alguém tem alguma dúvida",
  "any questions",
  "any question",
  "does anyone have questions"
];

const interrogativePatterns = [
  /\?/,
  /\b(como|qual|quais|quando|onde|por que|porque|pra que|para que|quanto|quantos|quem)\b/i,
  /\b(o que|oque|me explica|você pode|consegue|daria para|dá para)\b/i,
  /\b(how|what|when|where|why|which|who|can you|could you|would you|should we|do we|does it|is it)\b/i
];

export function detectQuestionCandidate(transcript: string): QuestionDetectionResult {
  const question = normalizeQuestionText(transcript);

  if (question.length < MIN_QUESTION_CHARS) {
    return {
      accepted: false,
      question,
      confidence: "low",
      reason: "too_short"
    };
  }

  const lower = question.toLowerCase();
  if (ignoredPrompts.some((prompt) => lower.includes(prompt))) {
    return {
      accepted: false,
      question,
      confidence: "low",
      reason: "generic_meeting_prompt"
    };
  }

  const matches = interrogativePatterns.filter((pattern) => pattern.test(question)).length;
  if (matches >= 2) {
    return {
      accepted: true,
      question,
      confidence: "high",
      reason: "multiple_question_signals"
    };
  }

  if (matches === 1) {
    return {
      accepted: true,
      question,
      confidence: question.endsWith("?") ? "high" : "medium",
      reason: "question_signal"
    };
  }

  return {
    accepted: false,
    question,
    confidence: "low",
    reason: "no_question_signal"
  };
}

export function normalizeQuestionText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function questionFingerprint(value: string): string {
  return normalizeQuestionText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export class RecentQuestionDeduplicator {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs = 90_000) {}

  isDuplicate(value: string, nowMs: number): boolean {
    const fingerprint = questionFingerprint(value);
    this.prune(nowMs);
    const seenAt = this.seen.get(fingerprint);
    if (seenAt !== undefined && nowMs - seenAt <= this.ttlMs) {
      return true;
    }
    this.seen.set(fingerprint, nowMs);
    return false;
  }

  clear(): void {
    this.seen.clear();
  }

  private prune(nowMs: number): void {
    for (const [fingerprint, seenAt] of this.seen) {
      if (nowMs - seenAt > this.ttlMs) {
        this.seen.delete(fingerprint);
      }
    }
  }
}
