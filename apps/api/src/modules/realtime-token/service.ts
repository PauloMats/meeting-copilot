import type { RealtimeTokenRequest, RealtimeTokenResponse } from "@meeting-copilot/contracts";

interface ClientSecretResponse {
  value: string;
  expires_at: number;
}

export class RealtimeTokenService {
  constructor(
    private readonly apiKey: string,
    private readonly transcriptionModel: string,
    private readonly fetchImplementation: typeof fetch = fetch
  ) {}

  async create(request: RealtimeTokenRequest): Promise<RealtimeTokenResponse> {
    const response = await this.fetchImplementation(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          expires_after: {
            anchor: "created_at",
            seconds: 600
          },
          session: {
            type: "transcription",
            audio: {
              input: {
                format: {
                  type: "audio/pcm",
                  rate: 24000
                },
                transcription: {
                  model: this.transcriptionModel,
                  language: request.language,
                  delay: request.delay
                },
                turn_detection: null
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const providerMessage = await response.text();
      throw new Error(
        `OpenAI realtime token request failed (${response.status}): ${providerMessage}`
      );
    }

    const secret = (await response.json()) as ClientSecretResponse;
    return {
      value: secret.value,
      expiresAt: secret.expires_at,
      websocketUrl: `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(this.transcriptionModel)}`
    };
  }
}
