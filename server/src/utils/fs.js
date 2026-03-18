import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function removePath(targetPath) {
  if (!targetPath) {
    return;
  }

  await fs.rm(targetPath, { recursive: true, force: true });
}

export function getBaseNameWithoutExtension(filename) {
  return path.parse(filename).name.replace(/[^a-zA-Z0-9_-]+/g, "_");
}
