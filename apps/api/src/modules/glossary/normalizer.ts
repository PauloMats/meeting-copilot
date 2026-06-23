import type { GlossaryTerm } from "@meeting-copilot/contracts";

export interface NormalizationResult {
  original: string;
  normalized: string;
  replacements: Array<{ source: string; replacement: string }>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class GlossaryNormalizer {
  normalize(transcript: string, terms: GlossaryTerm[]): NormalizationResult {
    const orderedTerms = [...terms].sort((left, right) => right.source.length - left.source.length);
    const replacements: NormalizationResult["replacements"] = [];
    let normalized = transcript;

    for (const term of orderedTerms) {
      const flags = term.caseSensitive ? "g" : "gi";
      const pattern = new RegExp(`\\b${escapeRegExp(term.source)}\\b`, flags);
      let matched = false;
      normalized = normalized.replace(pattern, () => {
        matched = true;
        return term.replacement;
      });
      if (matched) {
        replacements.push({ source: term.source, replacement: term.replacement });
      }
    }

    return { original: transcript, normalized, replacements };
  }
}
