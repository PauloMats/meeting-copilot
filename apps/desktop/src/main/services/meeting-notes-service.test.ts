import type { MeetingSummary } from "@meeting-copilot/contracts";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
      clientMeetingId: "6d47f399-4ee4-4f79-a7b8-1b5d68e9ed9e",
      transcript: "Ana will prepare the release notes by Friday.",
      meetingType: "general_meeting" as const,
      meetingName: "",
      meetingDate: "",
      orderedParticipants: [],
      speakerHints: [],
      speakerSegments: [],
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
    const structured: unknown = JSON.parse(
      await readFile(completed.filePath.replace(/\.md$/, ".json"), "utf8")
    ) as unknown;

    expect(completed.filePath).toBe(draft.filePath);
    expect(markdown).toContain("# Release planning");
    expect(markdown).toContain("- [ ] Prepare the release notes");
    expect(markdown).toContain("## Transcript");
    expect(markdown).toContain("- Language: en");
    expect(structured).toMatchObject({
      schema_version: 1,
      meeting: {
        type: "general_meeting",
        language: "en",
        started_at: baseRequest.startedAt
      },
      ai_result: {
        title: "Release planning"
      }
    });
    expect(service.isManagedFile(completed.filePath)).toBe(true);
  });

  it("deletes both the local Markdown draft and its structured sidecar", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "meeting-copilot-"));
    const service = new MeetingNotesService(testDirectory);
    const saved = await service.save({
      clientMeetingId: "1efe8e04-12f8-4368-9151-ac7b64d55f9e",
      transcript: "Rascunho que deve ser apagado.",
      summary: null,
      meetingType: "general_meeting",
      meetingName: "",
      meetingDate: "",
      orderedParticipants: [],
      speakerHints: [],
      speakerSegments: [],
      language: "pt",
      startedAt: "2026-08-04T12:00:00.000Z",
      endedAt: "2026-08-04T12:05:00.000Z"
    });
    const dataFilePath = saved.filePath.replace(/\.md$/, ".json");

    await service.delete(saved.filePath);

    await expect(readFile(saved.filePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(dataFilePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("lists saved transcripts and reads the full transcript for retry", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "meeting-copilot-"));
    const service = new MeetingNotesService(testDirectory);
    const first = await service.save({
      clientMeetingId: null,
      transcript: "Primeira transcrição sem resumo.",
      summary: null,
      meetingType: "general_meeting",
      meetingName: "",
      meetingDate: "",
      orderedParticipants: [],
      speakerHints: [],
      speakerSegments: [],
      language: "pt",
      startedAt: "2026-07-17T12:00:00.000Z",
      endedAt: "2026-07-17T12:10:00.000Z"
    });
    await service.save({
      clientMeetingId: null,
      transcript: "Second transcript.",
      summary: {
        title: "Second meeting",
        overview: "Already summarized.",
        key_topics: [],
        decisions: [],
        action_items: [],
        next_steps: [],
        open_questions: []
      },
      meetingType: "general_meeting",
      meetingName: "",
      meetingDate: "",
      orderedParticipants: [],
      speakerHints: [],
      speakerSegments: [],
      language: "en",
      startedAt: "2026-07-18T12:00:00.000Z",
      endedAt: "2026-07-18T12:10:00.000Z"
    });

    const notes = await service.list();
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({
      title: "Second meeting",
      language: "en",
      hasSummary: true,
      hasStructuredResult: true
    });
    expect(notes[1]).toMatchObject({
      filePath: first.filePath,
      title: "Ata da reunião",
      language: "pt",
      hasSummary: false,
      hasStructuredResult: false,
      transcriptPreview: "Primeira transcrição sem resumo."
    });

    const loaded = await service.read(first.filePath);
    expect(loaded.transcript).toBe("Primeira transcrição sem resumo.");
    expect(loaded.structuredResult).toBeNull();
    expect(loaded.dataFilePath).toBe(first.filePath.replace(/\.md$/, ".json"));
  });

  it("keeps old saved notes without explicit language compatible", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "meeting-copilot-"));
    const service = new MeetingNotesService(testDirectory);
    const notesDirectory = join(testDirectory, "Meeting Copilot");
    await mkdir(notesDirectory, { recursive: true });
    const filePath = join(notesDirectory, "meeting-legacy.md");
    await writeFile(
      filePath,
      [
        "# Ata da reunião",
        "",
        "- Início: 2026-07-17T12:00:00.000Z",
        "- Fim: 2026-07-17T12:10:00.000Z",
        "",
        "_O resumo da IA ainda está sendo gerado._",
        "",
        "## Transcrição",
        "",
        "Uma transcrição antiga."
      ].join("\n"),
      "utf8"
    );

    const [loaded] = await service.list();
    expect(loaded).toMatchObject({
      language: "pt",
      hasSummary: false,
      hasStructuredResult: false,
      transcriptPreview: "Uma transcrição antiga."
    });

    await service.update(filePath, {
      clientMeetingId: null,
      transcript: "Uma transcrição antiga.",
      summary: {
        title: "Resumo recuperado",
        overview: "A transcrição antiga foi reenviada.",
        key_topics: [],
        decisions: [],
        action_items: [],
        next_steps: [],
        open_questions: []
      },
      meetingType: "general_meeting",
      meetingName: "",
      meetingDate: "",
      orderedParticipants: [],
      speakerHints: [],
      speakerSegments: [],
      language: "pt",
      startedAt: "2026-07-17T12:00:00.000Z",
      endedAt: "2026-07-17T12:10:00.000Z"
    });

    const updated = await service.list();
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      filePath,
      title: "Resumo recuperado",
      hasSummary: true,
      hasStructuredResult: true
    });
    const migrated = await service.read(filePath);
    expect(migrated.structuredResult).toMatchObject({ title: "Resumo recuperado" });
    expect(migrated.dataFilePath).toBe(filePath.replace(/\.md$/, ".json"));
  });

  it("persists daily context and renders participant dependencies", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "meeting-copilot-"));
    const service = new MeetingNotesService(testDirectory);
    const saved = await service.save({
      clientMeetingId: "bca9945d-3e2a-4edf-a4a5-fc16df3ec8a8",
      transcript: "Igor está aguardando uma rota do Victor.",
      summary: {
        title: "Daily Dourado — 23/07/2026",
        participant_updates: [
          {
            participant: "Igor",
            attribution_confidence: "high",
            updates: [
              "Está ajustando os testes da funcionalidade de procura.",
              "O problema já foi repassado ao Victor."
            ],
            blockers: ["A rota padrão de procura está com erro."],
            next_steps: ["Finalizar a tarefa após a liberação da rota."]
          }
        ],
        unresolved_attributions: []
      },
      meetingType: "daily",
      meetingName: "Daily Dourado",
      meetingDate: "2026-07-23",
      orderedParticipants: ["Igor", "Rafaela"],
      speakerHints: [
        {
          participant: "Igor",
          evidence: "A primeira atualização começa após Igor, pode começar."
        }
      ],
      speakerSegments: [
        {
          position: 1,
          participant: "Igor",
          transcript: "Estou aguardando uma rota do Victor."
        }
      ],
      language: "pt",
      startedAt: "2026-07-23T12:00:00.000Z",
      endedAt: "2026-07-23T12:10:00.000Z"
    });

    const markdown = await readFile(saved.filePath, "utf8");
    expect(markdown).toContain("## Igor");
    expect(markdown).toContain("* Está ajustando os testes da funcionalidade de procura.");
    expect(markdown).toContain("**Bloqueio:** A rota padrão de procura está com erro.");
    expect(markdown).toContain("**Próximo passo:** Finalizar a tarefa após a liberação da rota.");
    expect(markdown).not.toContain("Confiança da atribuição");
    expect(markdown).not.toContain("## Visão geral");

    const loaded = await service.read(saved.filePath);
    expect(loaded).toMatchObject({
      meetingType: "daily",
      meetingName: "Daily Dourado",
      meetingDate: "2026-07-23",
      orderedParticipants: ["Igor", "Rafaela"],
      hasSummary: true,
      hasStructuredResult: true
    });
    expect(loaded.speakerHints[0]?.participant).toBe("Igor");
    expect(loaded.speakerSegments[0]).toMatchObject({
      position: 1,
      participant: "Igor"
    });
    expect(loaded.structuredResult).toMatchObject({
      participant_updates: [
        {
          participant: "Igor",
          updates: [
            "Está ajustando os testes da funcionalidade de procura.",
            "O problema já foi repassado ao Victor."
          ]
        }
      ]
    });
  });
});
