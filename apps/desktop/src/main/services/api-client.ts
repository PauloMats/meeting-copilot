import {
  AnswerResponseSchema,
  MeetingSummaryResponseSchema,
  RealtimeTokenResponseSchema,
  type AnswerRequest,
  type AnswerResponse,
  type MeetingSummaryRequest,
  type MeetingSummaryResponse,
  type RealtimeTokenRequest,
  type RealtimeTokenResponse
} from "@meeting-copilot/contracts";

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly desktopApiKey?: string
  ) {}

  createRealtimeToken(request: RealtimeTokenRequest): Promise<RealtimeTokenResponse> {
    return this.post("/api/realtime/token", request, (value) =>
      RealtimeTokenResponseSchema.parse(value)
    );
  }

  generateAnswer(request: AnswerRequest): Promise<AnswerResponse> {
    return this.post("/api/answers", request, (value) => AnswerResponseSchema.parse(value));
  }

  generateMeetingSummary(request: MeetingSummaryRequest): Promise<MeetingSummaryResponse> {
    return this.post("/api/meeting-summaries", request, (value) =>
      MeetingSummaryResponseSchema.parse(value)
    );
  }

  private async post<T>(path: string, body: unknown, parse: (value: unknown) => T): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.desktopApiKey) headers["x-meeting-copilot-key"] = this.desktopApiKey;
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });
    if (!response.ok) {
      throw new Error(`Backend request failed (${response.status}): ${await response.text()}`);
    }
    return parse(await response.json());
  }
}
