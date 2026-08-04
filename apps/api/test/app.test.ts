import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { MemoryCloudMeetingRepository } from "../src/modules/cloud-meetings/repository.js";

describe("api", () => {
  it("reports provider readiness without exposing secrets", async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" }));
    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      providers: { openai: false, database: false, retrieval: "none" }
    });
    await app.close();
  });

  it("returns 503 when realtime credentials are unavailable", async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" }));
    const response = await app.inject({
      method: "POST",
      url: "/api/realtime/token",
      payload: { language: "en", delay: "low" }
    });

    expect(response.statusCode).toBe(503);
    await app.close();
  });

  it("returns 503 when meeting summary generation is unavailable", async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" }));
    const response = await app.inject({
      method: "POST",
      url: "/api/meeting-summaries",
      payload: { transcript: "A short meeting transcript", language: "en" }
    });

    expect(response.statusCode).toBe(503);
    await app.close();
  });

  it("preserves client error status codes", async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" }));
    const response = await app.inject({
      method: "POST",
      url: "/api/context-profiles",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("requires the desktop API key when configured", async () => {
    const app = await buildApp(
      loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent", DESKTOP_API_KEY: "secret" })
    );

    const unauthorized = await app.inject({
      method: "POST",
      url: "/api/realtime/token",
      payload: { language: "en", delay: "low" }
    });
    const authorized = await app.inject({
      method: "POST",
      url: "/api/realtime/token",
      headers: { "x-meeting-copilot-key": "secret" },
      payload: { language: "en", delay: "low" }
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(authorized.statusCode).toBe(503);
    await app.close();
  });

  it("creates, updates, lists, restores, and deletes cloud meetings", async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" }), {
      cloudMeetingRepository: new MemoryCloudMeetingRepository()
    });
    const clientMeetingId = "62909848-504f-4b03-bc40-1bdc85ca50d2";
    const payload = {
      clientMeetingId,
      transcript: "Paulo apresentou o status da entrega.",
      summary: null,
      meetingType: "general_meeting",
      meetingName: "Planejamento",
      meetingDate: "2026-08-04",
      orderedParticipants: [],
      speakerHints: [],
      speakerSegments: [],
      language: "pt",
      startedAt: "2026-08-04T12:00:00.000Z",
      endedAt: "2026-08-04T12:20:00.000Z"
    };

    const created = await app.inject({
      method: "POST",
      url: "/api/cloud-meetings",
      payload
    });
    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      clientMeetingId,
      title: "Planejamento",
      hasSummary: false,
      transcript: payload.transcript
    });
    const id = created.json<{ id: string }>().id;

    const updated = await app.inject({
      method: "POST",
      url: "/api/cloud-meetings",
      payload: {
        ...payload,
        summary: {
          title: "Planejamento resumido",
          overview: "A entrega foi revisada.",
          key_topics: [],
          decisions: [],
          action_items: [],
          next_steps: [],
          open_questions: []
        }
      }
    });
    expect(updated.json()).toMatchObject({ id, hasSummary: true });

    const list = await app.inject({ method: "GET", url: "/api/cloud-meetings" });
    expect(list.json()).toMatchObject({
      meetings: [{ id, clientMeetingId, title: "Planejamento resumido", hasSummary: true }]
    });
    expect(
      list.json<{ meetings: Array<Record<string, unknown>> }>().meetings[0]
    ).not.toHaveProperty("transcript");

    const restored = await app.inject({ method: "GET", url: `/api/cloud-meetings/${id}` });
    expect(restored.json()).toMatchObject({ id, transcript: payload.transcript, hasSummary: true });

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/cloud-meetings/by-client/${clientMeetingId}`
    });
    expect(deleted.json()).toEqual({ deleted: true });
    expect((await app.inject({ method: "GET", url: `/api/cloud-meetings/${id}` })).statusCode).toBe(
      404
    );
    await app.close();
  });

  it("returns 503 for cloud storage when PostgreSQL is not configured", async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" }));
    const response = await app.inject({ method: "GET", url: "/api/cloud-meetings" });

    expect(response.statusCode).toBe(503);
    await app.close();
  });
});
