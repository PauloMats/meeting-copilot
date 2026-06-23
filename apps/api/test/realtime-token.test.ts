import { describe, expect, it, vi } from "vitest";
import { RealtimeTokenService } from "../src/modules/realtime-token/service.js";

describe("RealtimeTokenService", () => {
  it("does not add a model query parameter to transcription WebSocket URLs", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ value: "ephemeral-secret", expires_at: 123456 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    const service = new RealtimeTokenService(
      "server-secret",
      "gpt-realtime-whisper",
      fetchImplementation
    );

    const result = await service.create({ language: "pt", delay: "low" });

    expect(result.websocketUrl).toBe("wss://api.openai.com/v1/realtime");
    expect(result.websocketUrl).not.toContain("model=");
  });
});
