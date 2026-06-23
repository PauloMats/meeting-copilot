import {
  AnswerResponseSchema,
  RealtimeTokenResponseSchema,
  type AnswerRequest,
  type AnswerResponse,
  type RealtimeTokenRequest,
  type RealtimeTokenResponse
} from "@meeting-copilot/contracts";

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  createRealtimeToken(request: RealtimeTokenRequest): Promise<RealtimeTokenResponse> {
    return this.post("/api/realtime/token", request, (value) =>
      RealtimeTokenResponseSchema.parse(value)
    );
  }

  generateAnswer(request: AnswerRequest): Promise<AnswerResponse> {
    return this.post("/api/answers", request, (value) => AnswerResponseSchema.parse(value));
  }

  private async post<T>(path: string, body: unknown, parse: (value: unknown) => T): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });
    if (!response.ok) {
      throw new Error(`Backend request failed (${response.status}): ${await response.text()}`);
    }
    return parse(await response.json());
  }
}
