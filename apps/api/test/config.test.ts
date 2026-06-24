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
      PORT: "8080"
    });

    expect(config.API_HOST).toBe("0.0.0.0");
    expect(config.API_PORT).toBe(8080);
  });

  it("prefers explicit API_PORT over PORT", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      API_PORT: "3333",
      PORT: "8080"
    });

    expect(config.API_PORT).toBe(3333);
  });
});
