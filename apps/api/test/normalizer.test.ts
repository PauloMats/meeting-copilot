import type { GlossaryTerm } from "@meeting-copilot/contracts";
import { describe, expect, it } from "vitest";
import { GlossaryNormalizer } from "../src/modules/glossary/normalizer.js";

const term = (source: string, replacement: string): GlossaryTerm => ({
  id: crypto.randomUUID(),
  source,
  replacement,
  kind: "synonym",
  caseSensitive: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

describe("GlossaryNormalizer", () => {
  it("replaces longest terms first and preserves the original", () => {
    const result = new GlossaryNormalizer().normalize("Use Postgres and PG.", [
      term("PG", "PostgreSQL"),
      term("Postgres", "PostgreSQL")
    ]);

    expect(result.original).toBe("Use Postgres and PG.");
    expect(result.normalized).toBe("Use PostgreSQL and PostgreSQL.");
    expect(result.replacements).toHaveLength(2);
  });
});
