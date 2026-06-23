import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

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
});
