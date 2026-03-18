import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { MEDIA_TTL_MS, UPLOAD_DIR } from "../config/constants.js";
import { upload } from "../middleware/upload.js";
import { deleteJob, deleteUpload, getJob, getUpload, saveJob, saveUpload } from "../services/jobStore.js";
import { analyzeVideoDimensions } from "../services/validationService.js";
import { processVideoWall, probeMedia } from "../services/videoService.js";
import { removePath } from "../utils/fs.js";

const router = express.Router();

router.post("/upload", upload.single("media"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No media uploaded." });
      return;
    }

    const metadata = await probeMedia(req.file.path);
    const validation = analyzeVideoDimensions(metadata.width, metadata.height);
    const timer = setTimeout(async () => {
      deleteUpload(req.file.filename);
      await removePath(req.file.path);
    }, MEDIA_TTL_MS);

    saveUpload(req.file.filename, {
      path: req.file.path,
      originalName: req.file.originalname,
      mediaKind: metadata.kind,
      timer
    });

    res.json({
      uploadId: req.file.filename,
      originalName: req.file.originalname,
      metadata,
      validation,
      mediaKind: metadata.kind
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

    const uploadEntry = getUpload(uploadId);

    if (!uploadEntry) {
      res.status(404).json({ error: "Uploaded media was not found. Upload again and retry." });
      return;
    }

    const metadata = await probeMedia(uploadEntry.path);
    const validation = analyzeVideoDimensions(metadata.width, metadata.height);

    if (validation.needsAutoFit && !autoFit) {
      res.status(400).json({
        error: "This media requires Auto-Fit before it can be sliced.",
        validation
      });
      return;
    }

    deleteUpload(uploadId);

    const job = await processVideoWall({
      uploadId,
      originalName: originalName || uploadEntry.originalName || uploadId,
      mediaKind: uploadEntry.mediaKind,
      validation,
      autoFit
    });

    const timer = setTimeout(async () => {
      deleteJob(job.jobId);
      await removePath(job.cleanupDir);
    }, MEDIA_TTL_MS);

    saveJob(job.jobId, { ...job, timer });

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
      },
      mediaKind: uploadEntry.mediaKind
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
    deleteUpload(req.params.uploadId);
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
