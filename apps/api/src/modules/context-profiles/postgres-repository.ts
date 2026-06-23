import type { ContextProfile, GlossaryTerm } from "@meeting-copilot/contracts";
import { contextProfiles, glossaryTerms, users, type Database } from "@meeting-copilot/database";
import { eq } from "drizzle-orm";
import type { ContextRepository } from "./memory-repository.js";

export class PostgresContextRepository implements ContextRepository {
  private userId: string | null = null;

  constructor(
    private readonly database: Database,
    private readonly userEmail: string
  ) {}

  async init(): Promise<void> {
    const [existing] = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, this.userEmail))
      .limit(1);
    if (existing) {
      this.userId = existing.id;
      return;
    }
    const [created] = await this.database
      .insert(users)
      .values({ email: this.userEmail })
      .returning({ id: users.id });
    if (!created) throw new Error("Could not bootstrap the local application user");
    this.userId = created.id;
  }

  async findProfile(id: string | null): Promise<ContextProfile | null> {
    if (!id) return null;
    const [row] = await this.database
      .select()
      .from(contextProfiles)
      .where(eq(contextProfiles.id, id))
      .limit(1);
    return row ? toProfile(row) : null;
  }

  async listProfiles(): Promise<ContextProfile[]> {
    const rows = await this.database
      .select()
      .from(contextProfiles)
      .where(eq(contextProfiles.userId, this.requireUserId()));
    return rows.map(toProfile);
  }

  async saveProfile(profile: ContextProfile): Promise<ContextProfile> {
    const [row] = await this.database
      .insert(contextProfiles)
      .values({
        id: profile.id,
        userId: this.requireUserId(),
        name: profile.name,
        projectDescription: profile.projectDescription,
        techStack: profile.techStack,
        businessContext: profile.businessContext,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date(profile.updatedAt)
      })
      .onConflictDoUpdate({
        target: contextProfiles.id,
        set: {
          name: profile.name,
          projectDescription: profile.projectDescription,
          techStack: profile.techStack,
          businessContext: profile.businessContext,
          updatedAt: new Date(profile.updatedAt)
        }
      })
      .returning();
    if (!row) throw new Error("Could not save context profile");
    return toProfile(row);
  }

  async deleteProfile(id: string): Promise<boolean> {
    const rows = await this.database
      .delete(contextProfiles)
      .where(eq(contextProfiles.id, id))
      .returning({ id: contextProfiles.id });
    return rows.length > 0;
  }

  async listGlossaryTerms(): Promise<GlossaryTerm[]> {
    const rows = await this.database
      .select()
      .from(glossaryTerms)
      .where(eq(glossaryTerms.userId, this.requireUserId()));
    return rows.map(toGlossaryTerm);
  }

  async saveGlossaryTerm(term: GlossaryTerm): Promise<GlossaryTerm> {
    const [row] = await this.database
      .insert(glossaryTerms)
      .values({
        id: term.id,
        userId: this.requireUserId(),
        source: term.source,
        replacement: term.replacement,
        kind: term.kind,
        caseSensitive: term.caseSensitive,
        createdAt: new Date(term.createdAt),
        updatedAt: new Date(term.updatedAt)
      })
      .onConflictDoUpdate({
        target: glossaryTerms.id,
        set: {
          source: term.source,
          replacement: term.replacement,
          kind: term.kind,
          caseSensitive: term.caseSensitive,
          updatedAt: new Date(term.updatedAt)
        }
      })
      .returning();
    if (!row) throw new Error("Could not save glossary term");
    return toGlossaryTerm(row);
  }

  async deleteGlossaryTerm(id: string): Promise<boolean> {
    const rows = await this.database
      .delete(glossaryTerms)
      .where(eq(glossaryTerms.id, id))
      .returning({ id: glossaryTerms.id });
    return rows.length > 0;
  }

  private requireUserId(): string {
    if (!this.userId) throw new Error("Repository has not been initialized");
    return this.userId;
  }
}

function toProfile(row: typeof contextProfiles.$inferSelect): ContextProfile {
  return {
    id: row.id,
    name: row.name,
    projectDescription: row.projectDescription,
    techStack: row.techStack,
    businessContext: row.businessContext,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toGlossaryTerm(row: typeof glossaryTerms.$inferSelect): GlossaryTerm {
  return {
    id: row.id,
    source: row.source,
    replacement: row.replacement,
    kind: row.kind,
    caseSensitive: row.caseSensitive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
