import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./crypto.js";

describe("authentication crypto", () => {
  it("hashes and verifies passwords without storing the password", async () => {
    const encoded = await hashPassword("correct horse battery staple");
    expect(encoded).not.toContain("correct horse");
    await expect(verifyPassword("correct horse battery staple", encoded)).resolves.toBe(true);
    await expect(verifyPassword("incorrect", encoded)).resolves.toBe(false);
  });

  it("creates opaque tokens and hashes them with a deployment pepper", () => {
    const token = createOpaqueToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hashToken(token, "pepper-a")).not.toBe(hashToken(token, "pepper-b"));
  });
});
