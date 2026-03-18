import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { UPLOAD_DIR } from "../config/constants.js";
import { upload } from "../middleware/upload.js";
import { getJob, saveJob, deleteJob } from "../services/jobStore.js";
import { analyzeVideoDimensions } from "../services/validationService.js";
import { processVideoWall, probeVideo } from "../services/videoService.js";
import { removePath } from "../utils/fs.js";

const router = express.Router();

router.post("/upload", upload.single("video"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No video uploaded." });
      return;
    }

    const metadata = await probeVideo(req.file.path);
    const validation = analyzeVideoDimensions(metadata.width, metadata.height);

    res.json({
      uploadId: req.file.filename,
      originalName: req.file.originalname,
      metadata,
      validation
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.rm(req.file.path, { force: true }).catch(() => {});
    }
    next(error);
  }
});

router.post("/process", async (req, res, next) => {
  try {
    const { uploadId, originalName, autoFit = false } = req.body;

    if (!uploadId) {
      res.status(400).json({ error: "uploadId is required." });
      return;
    }

    const inputPath = path.join(UPLOAD_DIR, uploadId);
    const exists = await fs
      .access(inputPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      res.status(404).json({ error: "Uploaded video was not found. Upload again and retry." });
      return;
    }

    const metadata = await probeVideo(inputPath);
    const validation = analyzeVideoDimensions(metadata.width, metadata.height);

    if (validation.needsAutoFit && !autoFit) {
      res.status(400).json({
        error: "This video requires Auto-Fit before it can be sliced.",
        validation
      });
      return;
    }

    const job = await processVideoWall({
      uploadId,
      originalName: originalName || uploadId,
      validation,
      autoFit
    });

    saveJob(job.jobId, job);

    res.json({
      validation: {
        ...validation,
        caseType: autoFit ? "auto-fit" : validation.caseType,
        needsAutoFit: false,
        message: autoFit
          ? "Auto-Fit applied successfully. Video has been centered, optimized, and sliced for your wall."
          : validation.message,
        status: validation.caseType === "smaller" ? "warning" : "ready"
      },
      job: {
        id: job.jobId,
        zipName: job.zipName,
        downloadUrl: `/download/${job.jobId}`
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/download/:jobId", async (req, res, next) => {
  try {
    const job = getJob(req.params.jobId);

    if (!job) {
      res.status(404).json({ error: "Download has expired or does not exist." });
      return;
    }

    res.download(job.zipPath, job.zipName, async (error) => {
      const cleanup = async () => {
        deleteJob(job.jobId);
        await removePath(job.cleanupDir);
      };

      if (error) {
        next(error);
        await cleanup();
        return;
      }

      await cleanup();
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/upload/:uploadId", async (req, res, next) => {
  try {
    await removePath(path.join(UPLOAD_DIR, req.params.uploadId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

export default router;
