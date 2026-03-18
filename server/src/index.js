import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { CLIENT_DIST_DIR, CLIENT_ORIGIN, OUTPUT_DIR, PORT, UPLOAD_DIR } from "./config/constants.js";
import videoRoutes from "./routes/videoRoutes.js";
import { ensureDir } from "./utils/fs.js";

const app = express();

await ensureDir(UPLOAD_DIR);
await ensureDir(OUTPUT_DIR);

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", videoRoutes);

if (fs.existsSync(CLIENT_DIST_DIR)) {
  app.use(express.static(CLIENT_DIST_DIR));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST_DIR, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  const status = error.message?.includes("File too large") ? 413 : 500;
  res.status(status).json({
    error: error.message || "Unexpected server error."
  });
});

app.listen(PORT, () => {
  console.log(`Video Wall Optimizer server running on http://localhost:${PORT}`);
});
