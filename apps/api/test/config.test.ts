import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("treats blank optional secrets as not configured", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      OPENAI_API_KEY: "",
      OPENAI_VECTOR_STORE_ID: ""
    });

    expect(config.OPENAI_API_KEY).toBeUndefined();
    expect(config.OPENAI_VECTOR_STORE_ID).toBeUndefined();
  });

  it("uses Railway PORT when API_PORT is not set", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      RAILWAY_ENVIRONMENT: "production",
      PORT: "8080"
    });

    expect(config.API_HOST).toBe("0.0.0.0");
    expect(config.API_PORT).toBe(8080);
  });

  it("uses Railway PORT and public host even when development values are copied", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      RAILWAY_ENVIRONMENT: "production",
      API_HOST: "127.0.0.1",
      API_PORT: "3333",
      PORT: "8080"
    });

    expect(config.API_HOST).toBe("0.0.0.0");
    expect(config.API_PORT).toBe(8080);
  });

  it("prefers explicit API_PORT over PORT outside Railway", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      API_PORT: "3333",
      PORT: "8080"
    });

    expect(config.API_PORT).toBe(3333);
  });

  it("defaults answer generation to fast production settings", () => {
    const config = loadConfig({ NODE_ENV: "test" });

    expect(config.OPENAI_ANSWER_MODEL).toBe("gpt-5.4-nano");
    expect(config.OPENAI_ANSWER_MODEL_BASIC).toBe("gpt-5.4-nano");
    expect(config.OPENAI_ANSWER_MODEL_BALANCED).toBe("gpt-5.4-mini");
    expect(config.OPENAI_ANSWER_MODEL_ADVANCED).toBe("gpt-5.4");
    expect(config.OPENAI_ANSWER_MAX_OUTPUT_TOKENS).toBe(520);
    expect(config.OPENAI_ANSWER_CONTEXT_CHARS).toBe(6000);
    expect(config.OPENAI_RETRIEVAL_LIMIT).toBe(0);
  });

  it("requires explicit approval before accepting a live Stripe key", () => {
    expect(() => loadConfig({ NODE_ENV: "test", STRIPE_SECRET_KEY: "sk_live_example" })).toThrow(
      /live Stripe key was rejected/
    );
    expect(
      loadConfig({
        NODE_ENV: "test",
        STRIPE_SECRET_KEY: "sk_live_example",
        STRIPE_LIVE_MODE_ENABLED: "true"
      }).STRIPE_SECRET_KEY
    ).toBe("sk_live_example");
  });

  it("requires individual auth by default only in production", () => {
    expect(loadConfig({ NODE_ENV: "test" }).AUTH_REQUIRED).toBe(false);
    expect(loadConfig({ NODE_ENV: "production" }).AUTH_REQUIRED).toBe(true);
  });
});
