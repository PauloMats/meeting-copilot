import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const bundlePath = resolve(scriptDirectory, "../apps/desktop/out/main/index.js");
const bundle = await readFile(bundlePath, "utf8");

if (/from\s+["']@meeting-copilot\/contracts["']/.test(bundle)) {
  throw new Error(
    "Desktop main bundle externalizes @meeting-copilot/contracts; packaged builds may contain stale IPC channels."
  );
}

const requiredChannels = [
  "audio-devices:list",
  "audio-devices:select",
  "native-audio:start",
  "native-audio:stop",
  "native-audio:chunk",
  "native-audio:levels",
  "native-audio:error"
];

const missingChannels = requiredChannels.filter((channel) => !bundle.includes(channel));
if (missingChannels.length > 0) {
  throw new Error(`Desktop main bundle is missing IPC channels: ${missingChannels.join(", ")}`);
}

console.log("Desktop bundle contains the current native audio IPC contract.");
