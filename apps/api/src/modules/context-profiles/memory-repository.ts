import type { ContextProfile, GlossaryTerm } from "@meeting-copilot/contracts";
import type { AnswerContextRepository } from "../answering/service.js";

export interface ContextRepository extends AnswerContextRepository {
  init(): Promise<void>;
  listProfiles(userId: string): Promise<ContextProfile[]>;
  saveProfile(userId: string, profile: ContextProfile): Promise<ContextProfile>;
  deleteProfile(userId: string, id: string): Promise<boolean>;
  saveGlossaryTerm(userId: string, term: GlossaryTerm): Promise<GlossaryTerm>;
  deleteGlossaryTerm(userId: string, id: string): Promise<boolean>;
}

export class MemoryContextRepository implements ContextRepository {
  private readonly profiles = new Map<string, Map<string, ContextProfile>>();
  private readonly terms = new Map<string, Map<string, GlossaryTerm>>();

  init(): Promise<void> {
    return Promise.resolve();
  }

  findProfile(userId: string, id: string | null): Promise<ContextProfile | null> {
    return Promise.resolve(id ? (this.profiles.get(userId)?.get(id) ?? null) : null);
  }

  listProfiles(userId: string): Promise<ContextProfile[]> {
    return Promise.resolve([...(this.profiles.get(userId)?.values() ?? [])]);
  }

  saveProfile(userId: string, profile: ContextProfile): Promise<ContextProfile> {
    const profiles = this.profiles.get(userId) ?? new Map<string, ContextProfile>();
    profiles.set(profile.id, profile);
    this.profiles.set(userId, profiles);
    return Promise.resolve(profile);
  }

  deleteProfile(userId: string, id: string): Promise<boolean> {
    return Promise.resolve(this.profiles.get(userId)?.delete(id) ?? false);
  }

  listGlossaryTerms(userId: string): Promise<GlossaryTerm[]> {
    return Promise.resolve([...(this.terms.get(userId)?.values() ?? [])]);
  }

  saveGlossaryTerm(userId: string, term: GlossaryTerm): Promise<GlossaryTerm> {
    const terms = this.terms.get(userId) ?? new Map<string, GlossaryTerm>();
    terms.set(term.id, term);
    this.terms.set(userId, terms);
    return Promise.resolve(term);
  }

  deleteGlossaryTerm(userId: string, id: string): Promise<boolean> {
    return Promise.resolve(this.terms.get(userId)?.delete(id) ?? false);
  }
}
