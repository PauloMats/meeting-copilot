import type { MeetingSummary } from "@meeting-copilot/contracts";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MeetingNotesService } from "./meeting-notes-service.js";

let testDirectory: string | null = null;

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = null;
});

describe("MeetingNotesService", () => {
  it("persists the transcript first and enriches the same Markdown file with the summary", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "meeting-copilot-"));
    const service = new MeetingNotesService(testDirectory);
    const baseRequest = {
      transcript: "Ana will prepare the release notes by Friday.",
      language: "en",
      startedAt: "2026-07-17T12:00:00.000Z",
      endedAt: "2026-07-17T12:30:00.000Z"
    };

    const draft = await service.save({ ...baseRequest, summary: null });
    expect(await readFile(draft.filePath, "utf8")).toContain(baseRequest.transcript);

    const summary: MeetingSummary = {
      title: "Release planning",
      overview: "The release was planned.",
      key_topics: [],
      decisions: [],
      action_items: [
        {
          task: "Prepare the release notes",
          owner: "Ana",
          due_date: "Friday",
          priority: "high"
        }
      ],
      next_steps: [],
      open_questions: []
    };
    const completed = await service.save({ ...baseRequest, summary });
    const markdown = await readFile(completed.filePath, "utf8");

    expect(completed.filePath).toBe(draft.filePath);
    expect(markdown).toContain("# Release planning");
    expect(markdown).toContain("- [ ] Prepare the release notes");
    expect(markdown).toContain("## Transcript");
    expect(service.isManagedFile(completed.filePath)).toBe(true);
  });
});
