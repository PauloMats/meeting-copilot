import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repositoryRoot, "apps/web/public/assets/assets-manifest.json");
const inventoryPath = path.join(repositoryRoot, "docs/ASSET-INVENTORY.md");
const reportOnly = process.argv.includes("--report-only");
const allowedStatuses = new Set([
  "existing",
  "needs-review",
  "needs-redesign",
  "missing",
  "ready",
  "deprecated",
  "not-needed"
]);
const allowedPriorities = new Set(["P0", "P1", "P2", "P3"]);
const ignoredFiles = new Set([path.normalize("apps/web/public/assets/assets-manifest.json")]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];
const warnings = [];
const missing = [];
const registeredPaths = new Set();
const ids = new Set();
const repoPaths = new Set();
const inventory = await readFile(inventoryPath, "utf8");
const documentedInventoryIds = new Set(
  [...inventory.matchAll(/\| (AS-\d{3}) \|/g)].map((match) => match[1])
);

for (const asset of manifest.assets) {
  validateManifestEntry(asset);

  const normalizedPath = path.normalize(asset.repoPath);
  registeredPaths.add(normalizedPath);
  const absolutePath = path.join(repositoryRoot, normalizedPath);

  let fileStats;
  try {
    fileStats = await stat(absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    missing.push(asset);
    if (asset.priority === "P0" || asset.priority === "P1") {
      errors.push(`${asset.inventoryId} ${asset.repoPath} is required for ${asset.priority}.`);
    }
    continue;
  }

  if (!fileStats.isFile()) {
    errors.push(`${asset.inventoryId} ${asset.repoPath} is not a file.`);
    continue;
  }

  if (fileStats.size > asset.maximumBytes) {
    errors.push(
      `${asset.inventoryId} ${asset.repoPath} is ${fileStats.size} bytes; maximum is ${asset.maximumBytes}.`
    );
  }
}

for (const inventoryId of documentedInventoryIds) {
  if (!manifest.assets.some((asset) => asset.inventoryId === inventoryId)) {
    errors.push(`${inventoryId} is documented but absent from the manifest.`);
  }
}

for (const root of manifest.assetRoots) {
  const files = await listFiles(path.join(repositoryRoot, root));
  for (const absolutePath of files) {
    const repoPath = path.normalize(path.relative(repositoryRoot, absolutePath));
    if (!registeredPaths.has(repoPath) && !ignoredFiles.has(repoPath)) {
      warnings.push(`Unregistered asset: ${repoPath}`);
    }
  }
}

console.log(`Asset manifest v${manifest.version}`);
console.log(`Registered: ${manifest.assets.length}`);
console.log(`Present: ${manifest.assets.length - missing.length}`);
console.log(`Missing: ${missing.length}`);

if (missing.length > 0) {
  console.log("\nMissing assets:");
  for (const asset of missing) {
    console.log(`- ${asset.priority} ${asset.inventoryId} ${asset.repoPath}`);
  }
}

if (warnings.length > 0) {
  console.warn("\nWarnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("\nBlocking errors:");
  for (const error of errors) console.error(`- ${error}`);
  if (!reportOnly) process.exitCode = 1;
}

if (reportOnly && errors.length > 0) {
  console.log("\nReport-only mode: blocking errors did not change the exit code.");
}

function validateManifestEntry(asset) {
  if (ids.has(asset.id)) errors.push(`Duplicate asset id: ${asset.id}.`);
  ids.add(asset.id);

  if (repoPaths.has(asset.repoPath)) errors.push(`Duplicate repoPath: ${asset.repoPath}.`);
  repoPaths.add(asset.repoPath);

  if (!documentedInventoryIds.has(asset.inventoryId)) {
    errors.push(`${asset.inventoryId} is in the manifest but absent from the inventory.`);
  }
  if (!inventory.includes(`\`${asset.filename}\``)) {
    errors.push(`${asset.inventoryId} filename ${asset.filename} is absent from the inventory.`);
  }

  if (!allowedStatuses.has(asset.status)) {
    errors.push(`${asset.inventoryId} has invalid status ${asset.status}.`);
  }
  if (!allowedPriorities.has(asset.priority)) {
    errors.push(`${asset.inventoryId} has invalid priority ${asset.priority}.`);
  }
  if (!Number.isInteger(asset.maximumBytes) || asset.maximumBytes <= 0) {
    errors.push(`${asset.inventoryId} has invalid maximumBytes.`);
  }

  const filenameExtension = path.extname(asset.filename).slice(1).toLowerCase();
  const pathExtension = path.extname(asset.repoPath).slice(1).toLowerCase();
  if (filenameExtension !== asset.format || pathExtension !== asset.format) {
    errors.push(
      `${asset.inventoryId} declares ${asset.format} but filename/path use ${filenameExtension}/${pathExtension}.`
    );
  }
  if (path.basename(asset.repoPath) !== asset.filename) {
    errors.push(`${asset.inventoryId} filename does not match repoPath.`);
  }
}

async function listFiles(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolutePath)));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}
