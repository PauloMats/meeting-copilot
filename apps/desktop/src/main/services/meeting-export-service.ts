import type { MeetingExportResult } from "@meeting-copilot/contracts";
import { BrowserWindow, clipboard, dialog } from "electron";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { renderMeetingExport } from "./meeting-export-renderer.js";
import type { MeetingNotesService } from "./meeting-notes-service.js";

export class MeetingExportService {
  constructor(
    private readonly meetingNotes: MeetingNotesService,
    private readonly getParentWindow: () => BrowserWindow | null
  ) {}

  async exportHtml(filePath: string): Promise<MeetingExportResult> {
    const note = await this.meetingNotes.read(filePath);
    const rendered = renderMeetingExport(note);
    const destination = await this.chooseDestination(filePath, note.title, "html", "HTML", [
      "html",
      "htm"
    ]);
    if (!destination) return { status: "cancelled", filePath: null };
    await writeFile(destination, rendered.documentHtml, "utf8");
    return { status: "saved", filePath: destination };
  }

  async exportPdf(filePath: string): Promise<MeetingExportResult> {
    const note = await this.meetingNotes.read(filePath);
    const rendered = renderMeetingExport(note);
    const destination = await this.chooseDestination(filePath, note.title, "pdf", "PDF", ["pdf"]);
    if (!destination) return { status: "cancelled", filePath: null };

    const printWindow = new BrowserWindow({
      show: false,
      width: 900,
      height: 1200,
      backgroundColor: "#ffffff",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    try {
      await printWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(rendered.documentHtml)}`
      );
      const pdf = await printWindow.webContents.printToPDF({
        pageSize: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        landscape: false,
        margins: {
          top: 0.35,
          bottom: 0.35,
          left: 0.35,
          right: 0.35
        }
      });
      await writeFile(destination, pdf);
      return { status: "saved", filePath: destination };
    } finally {
      if (!printWindow.isDestroyed()) printWindow.destroy();
    }
  }

  async copyFormatted(filePath: string): Promise<MeetingExportResult> {
    const note = await this.meetingNotes.read(filePath);
    const rendered = renderMeetingExport(note);
    clipboard.write({
      html: rendered.fragmentHtml,
      text: rendered.plainText
    });
    return { status: "copied", filePath: null };
  }

  private async chooseDestination(
    sourceFilePath: string,
    title: string,
    extension: string,
    filterName: string,
    extensions: string[]
  ): Promise<string | null> {
    const options = {
      title: `Export ${filterName}`,
      defaultPath: join(dirname(sourceFilePath), `${safeFilename(title)}.${extension}`),
      filters: [{ name: filterName, extensions }]
    };
    const parent = this.getParentWindow();
    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options);
    return result.canceled || !result.filePath ? null : result.filePath;
  }
}

function safeFilename(value: string): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*]/g, "")
    .split("")
    .filter((character) => character.charCodeAt(0) >= 32)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return cleaned || "meeting-notes";
}
