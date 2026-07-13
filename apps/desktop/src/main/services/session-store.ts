import type { SessionTokens } from "@meeting-copilot/contracts";
import { app, safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class SessionStore {
  private readonly path = join(app.getPath("userData"), "session.bin");
  private session: SessionTokens | null = null;

  constructor() {
    this.session = this.read();
  }

  get(): SessionTokens | null {
    return this.session;
  }

  set(session: SessionTokens): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Windows credential encryption is not available");
    }
    const encrypted = safeStorage.encryptString(JSON.stringify(session));
    writeFileSync(this.path, encrypted, { mode: 0o600 });
    this.session = session;
  }

  clear(): void {
    this.session = null;
    if (existsSync(this.path)) writeFileSync(this.path, Buffer.alloc(0), { mode: 0o600 });
  }

  private read(): SessionTokens | null {
    if (!existsSync(this.path) || !safeStorage.isEncryptionAvailable()) return null;
    try {
      const encrypted = readFileSync(this.path);
      if (encrypted.length === 0) return null;
      return JSON.parse(safeStorage.decryptString(encrypted)) as SessionTokens;
    } catch {
      return null;
    }
  }
}
