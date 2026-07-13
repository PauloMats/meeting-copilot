import type {
  AppSettings,
  CaptureState,
  TranscriptDelta,
  TranscriptFinal
} from "@meeting-copilot/contracts";
import { randomUUID } from "node:crypto";
import WebSocket, { type RawData } from "ws";
import type { ApiClient } from "./api-client.js";

type ProviderEvent =
  | { type: "session.created" | "session.updated" }
  | {
      type: "conversation.item.input_audio_transcription.delta";
      item_id: string;
      delta: string;
    }
  | {
      type: "conversation.item.input_audio_transcription.completed";
      item_id: string;
      transcript: string;
    }
  | { type: "error"; error?: { message?: string } };

export interface TranscriptionEvents {
  state(state: CaptureState): void;
  delta(event: TranscriptDelta): void;
  final(event: TranscriptFinal): void;
  error(message: string): void;
}

export class RealtimeTranscriptionService {
  private socket: WebSocket | null = null;
  private committed = false;
  private failed = false;
  private startedAt: number | null = null;
  private usageKey: string | null = null;

  constructor(
    private readonly apiClient: ApiClient,
    private readonly events: TranscriptionEvents
  ) {}

  async start(settings: AppSettings): Promise<void> {
    if (this.socket) throw new Error("A transcription session is already active");
    this.events.state("transcribing");
    const secret = await this.apiClient.createRealtimeToken({
      language: settings.language,
      delay: settings.transcriptionDelay
    });

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(secret.websocketUrl, {
        headers: { Authorization: `Bearer ${secret.value}` }
      });
      const timeout = setTimeout(() => reject(new Error("Realtime connection timed out")), 10_000);

      socket.once("open", () => {
        clearTimeout(timeout);
        this.socket = socket;
        this.committed = false;
        this.failed = false;
        this.startedAt = Date.now();
        this.usageKey = `transcription:${randomUUID()}`;
        this.events.state("listening");
        resolve();
      });
      socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      socket.on("message", (data) => this.handleProviderEvent(rawDataToString(data)));
      socket.on("close", () => {
        this.socket = null;
        if (!this.committed && !this.failed) this.events.state("idle");
      });
    });
  }

  append(chunk: ArrayBuffer): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.committed) return;
    this.socket.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: Buffer.from(chunk).toString("base64")
      })
    );
  }

  commit(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.committed) return;
    this.committed = true;
    this.events.state("transcribing");
    this.socket.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
  }

  cancel(): void {
    this.committed = false;
    this.socket?.close(1000, "cancelled");
    this.socket = null;
    this.events.state("idle");
  }

  private handleProviderEvent(payload: string): void {
    let event: ProviderEvent;
    try {
      event = JSON.parse(payload) as ProviderEvent;
    } catch {
      this.events.error("Received an invalid event from the transcription provider");
      return;
    }

    if (event.type === "conversation.item.input_audio_transcription.delta") {
      this.events.delta({ itemId: event.item_id, delta: event.delta });
      return;
    }
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const startedAt = this.startedAt;
      const usageKey = this.usageKey;
      if (startedAt && usageKey) {
        void this.apiClient
          .reportTranscriptionUsage({
            idempotencyKey: usageKey,
            audioSeconds: Math.max(1, Math.ceil((Date.now() - startedAt) / 1_000)),
            occurredAt: new Date(startedAt).toISOString()
          })
          .catch((error: unknown) => {
            this.events.error(
              error instanceof Error
                ? `Usage accounting failed: ${error.message}`
                : "Usage accounting failed"
            );
          });
      }
      this.events.state("ready_to_send");
      this.events.final({ itemId: event.item_id, transcript: event.transcript });
      this.socket?.close(1000, "turn complete");
      return;
    }
    if (event.type === "error") {
      this.failed = true;
      this.events.error(event.error?.message ?? "Realtime transcription failed");
      this.events.state("error");
    }
  }
}

function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  return data.toString("utf8");
}
