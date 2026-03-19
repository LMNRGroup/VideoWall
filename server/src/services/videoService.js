import path from "node:path";
import { spawn } from "node:child_process";
import { v4 as uuidv4 } from "uuid";
import {
  FFMPEG_CRF,
  FFMPEG_PRESET,
  FFMPEG_THREADS,
  OUTPUT_DIR,
  TARGET_SLICE_HEIGHT,
  TARGET_SLICE_WIDTH,
  UPLOAD_DIR
} from "../config/constants.js";
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
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const detail = stderr || stdout || "No process output captured.";
      if (signal) {
        reject(
          new Error(
            `${command} was terminated by signal ${signal}. This usually means the container ran out of memory or CPU while processing the media.\n${detail}`
          )
        );
        return;
      }

      reject(new Error(`${command} exited with code ${code}: ${detail}`));
    });
  });
}

export async function probeMedia(filePath) {
  const { stdout } = await runProcess("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_type,width,height,duration:format=format_name",
    "-of",
    "json",
    filePath
  ]);

  const parsed = JSON.parse(stdout);
  const stream = parsed.streams?.find((entry) => entry.codec_type === "video") || parsed.streams?.[0];

  if (!stream) {
    throw new Error("Unable to detect media dimensions.");
  }

  const formatName = parsed.format?.format_name || "";
  const isVideo = formatName.includes("mp4") || path.extname(filePath).toLowerCase() === ".mp4";

  return {
    kind: isVideo ? "video" : "image",
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
    "-threads",
    String(FFMPEG_THREADS),
    "-i",
    inputPath,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    FFMPEG_PRESET,
    "-crf",
    String(FFMPEG_CRF),
    "-tune",
    "zerolatency",
    "-x264-params",
    `threads=${FFMPEG_THREADS}:lookahead-threads=1:sync-lookahead=0:rc-lookahead=0:ref=1`,
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    outputPath
  ]);
}

async function createImageSlice({ inputPath, outputPath, validation, index, autoFit }) {
  const baseFilter = getBaseVideoFilter(validation, autoFit);
  const cropX = index * TARGET_SLICE_WIDTH;
  const vf = `${baseFilter},crop=${TARGET_SLICE_WIDTH}:${TARGET_SLICE_HEIGHT}:${cropX}:0`;

  await runProcess("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    vf,
    "-frames:v",
    "1",
    outputPath
  ]);
}

async function createPreviewSlice({ inputPath, outputPath, validation, index, autoFit, mediaKind }) {
  const baseFilter = getBaseVideoFilter(validation, autoFit);
  const cropX = index * TARGET_SLICE_WIDTH;
  const vf = `${baseFilter},crop=${TARGET_SLICE_WIDTH}:${TARGET_SLICE_HEIGHT}:${cropX}:0,scale=220:-1`;
  const args = ["-y"];

  args.push("-i", inputPath, "-vf", vf, "-frames:v", "1", outputPath);
  await runProcess("ffmpeg", args);
}

function getImageOutputExtension(originalName) {
  const extension = path.extname(originalName).toLowerCase();
  if (extension === ".png") {
    return ".png";
  }

  return ".jpg";
}

export async function processVideoWall({ uploadId, originalName, mediaKind, validation, autoFit = false }) {
  const inputPath = path.join(UPLOAD_DIR, uploadId);
  const safeBaseName = getBaseNameWithoutExtension(originalName);
  const jobId = uuidv4();
  const jobDir = path.join(OUTPUT_DIR, jobId);
  const slicesDir = path.join(jobDir, "slices");
  const previewsDir = path.join(jobDir, "previews");
  const zipDir = path.join(jobDir, "zip");
  const zipName = `${safeBaseName}_Video_Wall.zip`;
  const imageExtension = getImageOutputExtension(originalName);
  const previews = [];

  try {
    await ensureDir(slicesDir);
    await ensureDir(previewsDir);

    for (let index = 0; index < validation.screens; index += 1) {
      const outputPath = path.join(
        slicesDir,
        `${safeBaseName}_s${index + 1}${mediaKind === "video" ? ".mp4" : imageExtension}`
      );
      const previewName = `${safeBaseName}_preview_${index + 1}.jpg`;
      const previewPath = path.join(previewsDir, previewName);

      if (mediaKind === "video") {
        await createSlice({
          inputPath,
          outputPath,
          validation,
          index,
          autoFit
        });
      } else {
        await createImageSlice({
          inputPath,
          outputPath,
          validation,
          index,
          autoFit
        });
      }

      if (mediaKind !== "video") {
        await createPreviewSlice({
          inputPath,
          outputPath: previewPath,
          validation,
          index,
          autoFit,
          mediaKind
        });

        previews.push(previewName);
      }
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
      cleanupDir: jobDir,
      previews
    };
  } catch (error) {
    await removePath(inputPath);
    await removePath(jobDir);
    throw error;
  }
}
