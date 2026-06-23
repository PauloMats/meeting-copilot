export interface RetrievalQuery {
  query: string;
  contextProfileId: string | null;
  limit: number;
}

export interface RetrievedSnippet {
  id: string;
  content: string;
  source: string;
  score: number | null;
}

export interface RetrievalProvider {
  search(query: RetrievalQuery): Promise<RetrievedSnippet[]>;
}
