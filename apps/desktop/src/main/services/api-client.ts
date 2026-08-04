import {
  AnswerResponseSchema,
  CloudMeetingListResponseSchema,
  CloudMeetingNoteSchema,
  DeleteCloudMeetingResponseSchema,
  MeetingSummaryResponseSchema,
  RealtimeTokenResponseSchema,
  type AnswerRequest,
  type AnswerResponse,
  type CloudMeetingEntry,
  type CloudMeetingNote,
  type MeetingSummaryRequest,
  type MeetingSummaryResponse,
  type RealtimeTokenRequest,
  type RealtimeTokenResponse,
  type UpsertCloudMeetingRequest
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

  async listCloudMeetings(): Promise<CloudMeetingEntry[]> {
    const response = await this.request("GET", "/api/cloud-meetings", undefined, (value) =>
      CloudMeetingListResponseSchema.parse(value)
    );
    return response.meetings;
  }

  readCloudMeeting(id: string): Promise<CloudMeetingNote> {
    return this.request(
      "GET",
      `/api/cloud-meetings/${encodeURIComponent(id)}`,
      undefined,
      (value) => CloudMeetingNoteSchema.parse(value)
    );
  }

  upsertCloudMeeting(request: UpsertCloudMeetingRequest): Promise<CloudMeetingNote> {
    return this.request("POST", "/api/cloud-meetings", request, (value) =>
      CloudMeetingNoteSchema.parse(value)
    );
  }

  async deleteCloudMeeting(clientMeetingId: string): Promise<boolean> {
    const response = await this.request(
      "DELETE",
      `/api/cloud-meetings/by-client/${encodeURIComponent(clientMeetingId)}`,
      undefined,
      (value) => DeleteCloudMeetingResponseSchema.parse(value)
    );
    return response.deleted;
  }

  private async post<T>(path: string, body: unknown, parse: (value: unknown) => T): Promise<T> {
    return this.request("POST", path, body, parse);
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body: unknown,
    parse: (value: unknown) => T
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.desktopApiKey) headers["x-meeting-copilot-key"] = this.desktopApiKey;
    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(60_000)
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`Backend request failed (${response.status}): ${await response.text()}`);
    }
    return parse(await response.json());
  }
}
