import path from "node:path";
import { spawn } from "node:child_process";
import { v4 as uuidv4 } from "uuid";
import { OUTPUT_DIR, TARGET_SLICE_HEIGHT, TARGET_SLICE_WIDTH, UPLOAD_DIR } from "../config/constants.js";
import { createZipArchive } from "./zipService.js";
import { ensureDir, getBaseNameWithoutExtension, removePath } from "../utils/fs.js";

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stderr = "";
    let stdout = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} exited with code ${code}: ${stderr || stdout}`));
    });
  });
}

export async function probeVideo(filePath) {
  const { stdout } = await runProcess("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,duration",
    "-of",
    "json",
    filePath
  ]);

  const parsed = JSON.parse(stdout);
  const stream = parsed.streams?.[0];

  if (!stream) {
    throw new Error("Unable to detect MP4 video stream.");
  }

  return {
    width: Number(stream.width),
    height: Number(stream.height),
    duration: Number(stream.duration || 0)
  };
}

function getBaseVideoFilter(validation, autoFit) {
  if (autoFit || validation.caseType === "invalid") {
    return `scale=-2:${TARGET_SLICE_HEIGHT},crop=${validation.targetWidth}:${TARGET_SLICE_HEIGHT}`;
  }

  return `scale=${validation.targetWidth}:${TARGET_SLICE_HEIGHT}`;
}

async function createSlice({ inputPath, outputPath, validation, index, autoFit }) {
  const baseFilter = getBaseVideoFilter(validation, autoFit);
  const cropX = index * TARGET_SLICE_WIDTH;
  const vf = `${baseFilter},crop=${TARGET_SLICE_WIDTH}:${TARGET_SLICE_HEIGHT}:${cropX}:0,setsar=1`;

  await runProcess("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath
  ]);
}

export async function processVideoWall({ uploadId, originalName, validation, autoFit = false }) {
  const inputPath = path.join(UPLOAD_DIR, uploadId);
  const safeBaseName = getBaseNameWithoutExtension(originalName);
  const jobId = uuidv4();
  const jobDir = path.join(OUTPUT_DIR, jobId);
  const slicesDir = path.join(jobDir, "slices");
  const zipDir = path.join(jobDir, "zip");
  const zipName = `${safeBaseName}_Video_Wall.zip`;

  await ensureDir(slicesDir);

  for (let index = 0; index < validation.screens; index += 1) {
    const outputPath = path.join(slicesDir, `${safeBaseName}_s${index + 1}.mp4`);
    await createSlice({
      inputPath,
      outputPath,
      validation,
      index,
      autoFit
    });
  }

  const zipPath = await createZipArchive({
    sourceDir: slicesDir,
    outputDir: zipDir,
    zipName
  });

  await removePath(slicesDir);
  await removePath(inputPath);

  return {
    jobId,
    zipName,
    zipPath,
    cleanupDir: jobDir
  };
}
