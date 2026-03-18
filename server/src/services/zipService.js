import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { ensureDir } from "../utils/fs.js";

export async function createZipArchive({ sourceDir, outputDir, zipName }) {
  await ensureDir(outputDir);
  const zipPath = path.join(outputDir, zipName);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(zipPath));
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}
