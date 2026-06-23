import type { CopilotApi } from "@meeting-copilot/contracts";

declare global {
  interface Window {
    copilot: CopilotApi;
  }
}

export {};
