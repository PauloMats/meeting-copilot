import { z } from "zod";
import {
  AnswerSchema,
  AppSettingsSchema,
  ContextProfileSchema,
  GlossaryTermSchema,
  IntelligenceLevelSchema
} from "./domain.js";

export const RealtimeTokenRequestSchema = z.object({
  language: z.string().min(2).max(10),
  delay: z.enum(["minimal", "low", "medium", "high", "xhigh"])
});

export const RealtimeTokenResponseSchema = z.object({
  value: z.string().min(1),
  expiresAt: z.number().int(),
  websocketUrl: z.string().url()
});

export const AnswerRequestSchema = z.object({
  transcript: z.string().min(1).max(50_000),
  intelligenceLevel: IntelligenceLevelSchema.default("basic"),
  contextProfileId: z.string().uuid().nullable().default(null),
  meetingMemory: z
    .array(
      z.object({
        transcript: z.string(),
        directAnswer: z.string()
      })
    )
    .max(10)
    .default([])
});

export const AnswerResponseSchema = z.object({
  answer: AnswerSchema,
  model: z.string(),
  intelligenceLevel: IntelligenceLevelSchema,
  rawTranscript: z.string(),
  normalizedTranscript: z.string(),
  retrievedSnippets: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      source: z.string(),
      score: z.number().nullable()
    })
  )
});

export const CreateContextProfileSchema = ContextProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const UpdateContextProfileSchema = CreateContextProfileSchema.partial();

export const CreateGlossaryTermSchema = GlossaryTermSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const UpdateGlossaryTermSchema = CreateGlossaryTermSchema.partial();

export const UpdateSettingsSchema = AppSettingsSchema.partial();

export type RealtimeTokenRequest = z.infer<typeof RealtimeTokenRequestSchema>;
export type RealtimeTokenResponse = z.infer<typeof RealtimeTokenResponseSchema>;
export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;
export type AnswerResponse = z.infer<typeof AnswerResponseSchema>;
