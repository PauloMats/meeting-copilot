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
});
