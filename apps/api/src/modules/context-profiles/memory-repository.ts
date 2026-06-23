import type { ContextProfile, GlossaryTerm } from "@meeting-copilot/contracts";
import type { AnswerContextRepository } from "../answering/service.js";

export interface ContextRepository extends AnswerContextRepository {
  init(): Promise<void>;
  listProfiles(): Promise<ContextProfile[]>;
  saveProfile(profile: ContextProfile): Promise<ContextProfile>;
  deleteProfile(id: string): Promise<boolean>;
  saveGlossaryTerm(term: GlossaryTerm): Promise<GlossaryTerm>;
  deleteGlossaryTerm(id: string): Promise<boolean>;
}

export class MemoryContextRepository implements ContextRepository {
  private readonly profiles = new Map<string, ContextProfile>();
  private readonly terms = new Map<string, GlossaryTerm>();

  init(): Promise<void> {
    return Promise.resolve();
  }

  findProfile(id: string | null): Promise<ContextProfile | null> {
    return Promise.resolve(id ? (this.profiles.get(id) ?? null) : null);
  }

  listProfiles(): Promise<ContextProfile[]> {
    return Promise.resolve([...this.profiles.values()]);
  }

  saveProfile(profile: ContextProfile): Promise<ContextProfile> {
    this.profiles.set(profile.id, profile);
    return Promise.resolve(profile);
  }

  deleteProfile(id: string): Promise<boolean> {
    return Promise.resolve(this.profiles.delete(id));
  }

  listGlossaryTerms(): Promise<GlossaryTerm[]> {
    return Promise.resolve([...this.terms.values()]);
  }

  saveGlossaryTerm(term: GlossaryTerm): Promise<GlossaryTerm> {
    this.terms.set(term.id, term);
    return Promise.resolve(term);
  }

  deleteGlossaryTerm(id: string): Promise<boolean> {
    return Promise.resolve(this.terms.delete(id));
  }
}
