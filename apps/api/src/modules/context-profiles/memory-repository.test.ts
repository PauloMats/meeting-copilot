import type { ContextProfile } from "@meeting-copilot/contracts";
import { describe, expect, it } from "vitest";
import { MemoryContextRepository } from "./memory-repository.js";

const profile: ContextProfile = {
  id: "e87e8fe3-6ce7-40c5-9f3e-03f915804a93",
  name: "Private project",
  projectDescription: "",
  techStack: [],
  businessContext: "",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString()
};

describe("context ownership", () => {
  it("does not expose one user's profile to another user", async () => {
    const repository = new MemoryContextRepository();
    await repository.saveProfile("user-a", profile);

    await expect(repository.findProfile("user-a", profile.id)).resolves.toEqual(profile);
    await expect(repository.findProfile("user-b", profile.id)).resolves.toBeNull();
    await expect(repository.listProfiles("user-b")).resolves.toEqual([]);
    await expect(repository.deleteProfile("user-b", profile.id)).resolves.toBe(false);
  });
});
