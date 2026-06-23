import type OpenAI from "openai";
import type { RetrievalProvider, RetrievalQuery, RetrievedSnippet } from "./types.js";

export class NullRetrievalProvider implements RetrievalProvider {
  search(): Promise<RetrievedSnippet[]> {
    return Promise.resolve([]);
  }
}

export class OpenAIFileSearchProvider implements RetrievalProvider {
  constructor(
    private readonly client: OpenAI,
    private readonly vectorStoreId: string,
    private readonly model: string
  ) {}

  async search(query: RetrievalQuery): Promise<RetrievedSnippet[]> {
    const response = await this.client.responses.create({
      model: this.model,
      input: query.query,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [this.vectorStoreId],
          max_num_results: query.limit
        }
      ],
      include: ["file_search_call.results"],
      store: false
    });

    const snippets: RetrievedSnippet[] = [];
    for (const item of response.output) {
      if (item.type !== "file_search_call" || !item.results) continue;
      for (const result of item.results) {
        if (!result.file_id || !result.text || !result.filename) continue;
        snippets.push({
          id: result.file_id,
          content: result.text,
          source: result.filename,
          score: result.score ?? null
        });
      }
    }
    return snippets.slice(0, query.limit);
  }
}

export interface VectorSearchRepository {
  search(
    query: string,
    contextProfileId: string | null,
    limit: number
  ): Promise<RetrievedSnippet[]>;
}

export class PgVectorRetrievalProvider implements RetrievalProvider {
  constructor(private readonly repository: VectorSearchRepository) {}

  search(query: RetrievalQuery): Promise<RetrievedSnippet[]> {
    return this.repository.search(query.query, query.contextProfileId, query.limit);
  }
}
