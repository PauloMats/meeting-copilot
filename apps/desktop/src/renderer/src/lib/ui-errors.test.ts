import { describe, expect, it } from "vitest";
import { classifyUiError } from "./ui-errors.js";

describe("user-facing error classification", () => {
  it("maps raw backend failures without exposing the provider body", () => {
    const result = classifyUiError(
      new Error("Backend request failed (503): secret upstream provider details")
    );

    expect(result.kind).toBe("offline");
    expect(JSON.stringify(result)).not.toContain("secret upstream provider details");
  });

  it("gives audio permission recovery guidance", () => {
    const result = classifyUiError(new DOMException("denied", "NotAllowedError"));

    expect(result.kind).toBe("permission_denied");
    expect(result.action).toContain("Windows");
  });
});
