import type { ContextProfile, GlossaryTerm } from "@meeting-copilot/contracts";
import { contextProfiles, glossaryTerms, users, type Database } from "@meeting-copilot/database";
import { and, eq } from "drizzle-orm";
import type { ContextRepository } from "./memory-repository.js";

export class PostgresContextRepository implements ContextRepository {
  private bootstrapUserId: string | null = null;

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
      this.bootstrapUserId = existing.id;
      return;
    }
    const [created] = await this.database
      .insert(users)
      .values({ email: this.userEmail })
      .returning({ id: users.id });
    if (!created) throw new Error("Could not bootstrap the local application user");
    this.bootstrapUserId = created.id;
  }

  async findProfile(userId: string, id: string | null): Promise<ContextProfile | null> {
    if (!id) return null;
    const [row] = await this.database
      .select()
      .from(contextProfiles)
      .where(
        and(eq(contextProfiles.id, id), eq(contextProfiles.userId, this.resolveUserId(userId)))
      )
      .limit(1);
    return row ? toProfile(row) : null;
  }

  async listProfiles(userId: string): Promise<ContextProfile[]> {
    const rows = await this.database
      .select()
      .from(contextProfiles)
      .where(eq(contextProfiles.userId, this.resolveUserId(userId)));
    return rows.map(toProfile);
  }

  async saveProfile(userId: string, profile: ContextProfile): Promise<ContextProfile> {
    const [row] = await this.database
      .insert(contextProfiles)
      .values({
        id: profile.id,
        userId: this.resolveUserId(userId),
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

  async deleteProfile(userId: string, id: string): Promise<boolean> {
    const rows = await this.database
      .delete(contextProfiles)
      .where(
        and(eq(contextProfiles.id, id), eq(contextProfiles.userId, this.resolveUserId(userId)))
      )
      .returning({ id: contextProfiles.id });
    return rows.length > 0;
  }

  async listGlossaryTerms(userId: string): Promise<GlossaryTerm[]> {
    const rows = await this.database
      .select()
      .from(glossaryTerms)
      .where(eq(glossaryTerms.userId, this.resolveUserId(userId)));
    return rows.map(toGlossaryTerm);
  }

  async saveGlossaryTerm(userId: string, term: GlossaryTerm): Promise<GlossaryTerm> {
    const [row] = await this.database
      .insert(glossaryTerms)
      .values({
        id: term.id,
        userId: this.resolveUserId(userId),
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

  async deleteGlossaryTerm(userId: string, id: string): Promise<boolean> {
    const rows = await this.database
      .delete(glossaryTerms)
      .where(and(eq(glossaryTerms.id, id), eq(glossaryTerms.userId, this.resolveUserId(userId))))
      .returning({ id: glossaryTerms.id });
    return rows.length > 0;
  }

  private resolveUserId(userId: string): string {
    if (userId !== "local") return userId;
    if (!this.bootstrapUserId) throw new Error("Repository has not been initialized");
    return this.bootstrapUserId;
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
