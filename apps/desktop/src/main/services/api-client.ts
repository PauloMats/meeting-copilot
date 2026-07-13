import {
  AnswerResponseSchema,
  DeviceAuthorizationResponseSchema,
  RealtimeTokenResponseSchema,
  type AnswerRequest,
  type AnswerResponse,
  type RealtimeTokenRequest,
  type RealtimeTokenResponse,
  type SessionTokens
} from "@meeting-copilot/contracts";
import type { SessionStore } from "./session-store.js";

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly desktopApiKey?: string,
    private readonly sessionStore?: SessionStore
  ) {}

  createRealtimeToken(request: RealtimeTokenRequest): Promise<RealtimeTokenResponse> {
    return this.post("/api/realtime/token", request, (value) =>
      RealtimeTokenResponseSchema.parse(value)
    );
  }

  generateAnswer(request: AnswerRequest): Promise<AnswerResponse> {
    return this.post("/api/answers", request, (value) => AnswerResponseSchema.parse(value));
  }

  reportTranscriptionUsage(input: {
    idempotencyKey: string;
    audioSeconds: number;
    occurredAt: string;
  }): Promise<void> {
    return this.post("/api/usage/transcription", input, () => undefined);
  }

  startDeviceAuthorization(deviceName: string, platform: string) {
    return this.post(
      "/api/auth/device/start",
      { deviceName, platform },
      (value) => DeviceAuthorizationResponseSchema.parse(value),
      false
    );
  }

  pollDeviceAuthorization(
    deviceCode: string
  ): Promise<
    | { status: "pending" | "expired" | "consumed" | "denied" }
    | { status: "authorized"; session: SessionTokens }
  > {
    return this.post(
      "/api/auth/device/poll",
      { deviceCode },
      (value) =>
        value as
          | { status: "pending" | "expired" | "consumed" | "denied" }
          | { status: "authorized"; session: SessionTokens },
      false
    );
  }

  isAuthenticated(): boolean {
    return Boolean(this.sessionStore?.get()?.accessToken);
  }

  completeDeviceAuthorization(session: SessionTokens): void {
    if (!this.sessionStore) throw new Error("Secure session storage is unavailable");
    this.sessionStore.set(session);
  }

  private async post<T>(
    path: string,
    body: unknown,
    parse: (value: unknown) => T,
    retry = true
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.desktopApiKey) headers["x-meeting-copilot-key"] = this.desktopApiKey;
    const accessToken = this.sessionStore?.get()?.accessToken;
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });
    if (response.status === 401 && retry && (await this.refresh())) {
      return this.post(path, body, parse, false);
    }
    if (!response.ok) {
      throw new Error(`Backend request failed (${response.status}): ${await response.text()}`);
    }
    return parse(await response.json());
  }

  private async refresh(): Promise<boolean> {
    const refreshToken = this.sessionStore?.get()?.refreshToken;
    if (!refreshToken || !this.sessionStore) return false;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.desktopApiKey) headers["x-meeting-copilot-key"] = this.desktopApiKey;
    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      this.sessionStore.clear();
      return false;
    }
    this.sessionStore.set((await response.json()) as SessionTokens);
    return true;
  }
}
